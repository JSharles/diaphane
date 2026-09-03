import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectAccessService } from '../../projects/project-access.service';
import { GenerationService } from '../../generation/generation.service';
import { ClientPublicationService } from '../publication/client-publication.service';
import {
  SECTION_COMPOSITION_OUTPUT_CONTRACT,
  SECTION_COMPOSITION_PROMPT_VERSION,
} from './composition-output.schema';
import {
  ROADMAP_COMPOSITION_OUTPUT_CONTRACT,
  ROADMAP_COMPOSITION_PROMPT_VERSION,
} from './roadmap-output.schema';
import { ReplaceMilestonesDto } from '../dto/client-section.dto';
import { roadmapAfterEdit } from './roadmap-recomposition';
import { compositionFingerprint } from './section-composition.handler';

// Every id a roadmap holds, at both levels. Where the project stands may name
// a milestone or one of its sub-steps, so anything checking "does this id still
// exist" has to walk the whole tree.
export function milestoneIds(structuredContent: unknown): Set<string> {
  const milestones = (structuredContent ?? []) as {
    id?: string;
    substeps?: { id?: string }[];
  }[];
  return new Set(
    milestones
      .flatMap((milestone) => [
        milestone.id,
        ...(milestone.substeps ?? []).map((substep) => substep.id),
      ])
      .filter((id): id is string => typeof id === 'string'),
  );
}

// The states a proposal can still move out of. A section holding one of these
// is busy; anything else has released it.
const LIVE_PROPOSAL_STATUSES = ['composing', 'pending_review'] as const;

const FALLBACK_LOCALE = 'en';

@Injectable()
export class SectionProposalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly generation: GenerationService,
    private readonly publication: ClientPublicationService,
  ) {}

  async compose(
    userId: string,
    projectId: string,
    sectionId: string,
    locale: string | null = null,
  ) {
    await this.access.requireDeveloper(userId, projectId);

    const section = await this.prisma.clientSection.findFirst({
      where: { id: sectionId, projectId, archivedAt: null },
    });
    if (!section) throw new NotFoundException({ code: 'NOT_FOUND' });

    // FR-013 is about two compositions at once, not about a deliberate second
    // go. A run already in flight is refused — asking twice pays twice — and
    // the unique constraint on `activeProposalId` refuses it again if two
    // callers get this far together. A proposal merely waiting to be read is
    // not in the way: pressing "write it" on one is the developer saying they
    // want another. Refusing that silently is what made the button look broken.
    let held: { id: string; status: string } | null = null;
    if (section.activeProposalId) {
      held = await this.prisma.sectionProposal.findFirst({
        where: {
          id: section.activeProposalId,
          status: { in: [...LIVE_PROPOSAL_STATUSES] },
        },
        select: { id: true, status: true },
      });
      if (held?.status === 'composing') {
        throw new ConflictException({ code: 'SECTION_COMPOSING' });
      }
      if (held) await this.supersede(sectionId, held.id);
    }

    const roadmap = section.kind === 'roadmap';

    // A roadmap is recomposed in place rather than from scratch: the model
    // receives the roadmap the developer has now — the proposal they were
    // reviewing, edits included, or else the one they last approved — and the
    // steps they wrote or corrected come back untouched (docs/PRODUCT.md « La
    // roadmap »). Read after the supersede, whose version bump would otherwise
    // read as drift.
    const roadmapInPlace = roadmap
      ? await this.roadmapInPlace(section.id, held?.id ?? null)
      : null;

    // A section is a view of the reference document, so there is nothing to
    // compose before one exists. Said plainly rather than failed downstream:
    // this is a real ordering constraint, not an error (plan, Decision 4).
    const reference = await this.prisma.referenceDocument.findFirst({
      where: { projectId, status: 'ready', outcome: 'written' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, version: true },
    });
    if (!reference) {
      throw new BadRequestException({ code: 'NO_REFERENCE_DOCUMENT' });
    }

    const inputFingerprint = compositionFingerprint({
      locale: locale ?? FALLBACK_LOCALE,
      sectionId: section.id,
      sectionKind: section.kind,
      sectionName: section.name,
      instructions: section.instructions,
      referenceDocumentId: reference.id,
      referenceVersion: reference.version,
      roadmapInPlace: roadmapInPlace
        ? { proposalId: roadmapInPlace.id, version: roadmapInPlace.version }
        : null,
    });

    const attempts = await this.prisma.sectionProposal.count({
      where: { sectionId: section.id },
    });

    return this.prisma.$transaction(async (tx) => {
      const operation = await this.generation.createInTransaction(tx, {
        projectId,
        type: 'section_composition',
        deduplicationKey: `composition:${projectId}:${section.id}:${reference.id}:${attempts}`,
        inputFingerprint,
        promptVersion: roadmap
          ? ROADMAP_COMPOSITION_PROMPT_VERSION
          : SECTION_COMPOSITION_PROMPT_VERSION,
        outputContractVersion: roadmap
          ? ROADMAP_COMPOSITION_OUTPUT_CONTRACT
          : SECTION_COMPOSITION_OUTPUT_CONTRACT,
      });
      const proposal = await tx.sectionProposal.create({
        data: {
          sectionId: section.id,
          referenceDocumentId: reference.id,
          locale: locale ?? FALLBACK_LOCALE,
          generationOperationId: operation.id,
          status: 'composing',
          basedOnProposalId: roadmapInPlace?.id ?? null,
        },
      });
      // Claiming the slot only from a section that still holds none is what
      // makes two simultaneous triggers produce one composition rather than two.
      await this.claimSlot(tx, section.id, proposal.id, 'SECTION_COMPOSING');
      return { proposalId: proposal.id, operationId: operation.id };
    });
  }

  // Hands the section the proposal it now holds, only if it holds none: the
  // unique constraint on `activeProposalId` refuses a second claim, and so does
  // this, with the code that says what lost the race.
  private async claimSlot(
    tx: Prisma.TransactionClient,
    sectionId: string,
    proposalId: string,
    code: 'SECTION_COMPOSING' | 'PROPOSAL_STALE',
  ) {
    const claimed = await tx.clientSection.updateMany({
      where: { id: sectionId, activeProposalId: null, archivedAt: null },
      data: { activeProposalId: proposalId, version: { increment: 1 } },
    });
    if (claimed.count !== 1) throw new ConflictException({ code });
  }

  // The roadmap the client reads (CONTEXT.md « Roadmap en place », when
  // nothing is under review): the proposal last approved, whole.
  private lastApproved(sectionId: string) {
    return this.prisma.sectionProposal.findFirst({
      where: { sectionId, status: 'approved' },
      orderBy: { approvedAt: 'desc' },
    });
  }

  // The roadmap the developer has now. The proposal they were reviewing wins
  // over the one they approved: whatever they edited there is theirs, and
  // starting over from the published one would lose it.
  private async roadmapInPlace(
    sectionId: string,
    heldId: string | null,
  ): Promise<{ id: string; version: number } | null> {
    if (heldId) {
      return this.prisma.sectionProposal.findUnique({
        where: { id: heldId },
        select: { id: true, version: true },
      });
    }
    return this.lastApproved(sectionId);
  }

  // Revising a section makes whatever it is holding obsolete: a proposal under
  // review was written for a brief that no longer exists, and a composition
  // still running is writing for it right now. Without this, editing a section
  // that had just been written did nothing at all — the slot was taken, the
  // conflict was swallowed, and the developer got a toast and no work.
  async releaseForRevision(projectId: string, sectionId: string) {
    const section = await this.prisma.clientSection.findFirst({
      where: { id: sectionId, projectId, archivedAt: null },
      select: { activeProposalId: true },
    });
    if (!section?.activeProposalId) return;

    const held = await this.prisma.sectionProposal.findFirst({
      where: {
        id: section.activeProposalId,
        status: { in: [...LIVE_PROPOSAL_STATUSES] },
      },
      select: { id: true, status: true, generationOperationId: true },
    });
    if (!held) return;

    // Stop the remote work before releasing the slot. Released first, the run
    // in flight could still land on a proposal the section had moved past.
    if (held.status === 'composing' && held.generationOperationId) {
      await this.generation.cancel(held.generationOperationId);
    }
    await this.supersede(sectionId, held.id);
  }

  // Retires a proposal and hands its section the slot back, both guarded on
  // what they still hold so a concurrent release cannot undo a newer one.
  private async supersede(sectionId: string, proposalId: string) {
    await this.prisma.sectionProposal.updateMany({
      where: { id: proposalId, status: { in: [...LIVE_PROPOSAL_STATUSES] } },
      data: { status: 'superseded', version: { increment: 1 } },
    });
    await this.prisma.clientSection.updateMany({
      where: { id: sectionId, activeProposalId: proposalId },
      data: { activeProposalId: null, version: { increment: 1 } },
    });
  }

  // A proposal is owned by its section, not by the operation that happened to
  // produce it. Re-running the dead operation would make a second one with no
  // proposal behind it, which could only fail — so a retry goes through the
  // section, which knows what still needs composing.
  async retryComposition(
    userId: string,
    projectId: string,
    operationId: string,
  ) {
    const proposal = await this.prisma.sectionProposal.findFirst({
      where: { generationOperationId: operationId, section: { projectId } },
      select: { sectionId: true, locale: true },
    });
    if (!proposal) return null;
    return this.compose(userId, projectId, proposal.sectionId, proposal.locale);
  }

  async current(userId: string, projectId: string, sectionId: string) {
    await this.access.requireDeveloper(userId, projectId);
    const section = await this.prisma.clientSection.findFirst({
      where: { id: sectionId, projectId, archivedAt: null },
      select: { id: true },
    });
    if (!section) throw new NotFoundException({ code: 'NOT_FOUND' });

    const latest = await this.prisma.sectionProposal.findFirst({
      where: { sectionId },
      orderBy: { createdAt: 'desc' },
      include: { section: { select: { kind: true } } },
    });
    if (!latest) return null;
    const roadmap = latest.section.kind === 'roadmap';

    // The editor opens on the roadmap the client reads (docs/PRODUCT.md « La
    // roadmap »), so a proposal retired without an approval — a recomposition
    // that never got queued — must not hide it. A failed one still shows: the
    // developer is told, and recomposes.
    const proposal =
      (roadmap && latest.status === 'superseded'
        ? await this.lastApproved(sectionId)
        : null) ?? latest;

    // Content stays empty until there is something to review, so a client of
    // this route cannot mistake "still composing" for "composed nothing".
    const readable =
      proposal.status === 'pending_review' || proposal.status === 'approved';
    const content = readable
      ? ((proposal.structuredContent ?? []) as unknown[])
      : [];

    return {
      id: proposal.id,
      sectionId: proposal.sectionId,
      referenceDocumentId: proposal.referenceDocumentId,
      status: proposal.status,
      outcome: proposal.outcome,
      version: proposal.version,
      changeSummary: proposal.changeSummary,
      createdAt: proposal.createdAt.toISOString(),
      // One of the two is always empty: the section's kind decides which, and it
      // cannot change once the section exists.
      blocks: roadmap ? [] : content,
      milestones: roadmap ? content : [],
      failureCode: proposal.failureCode,
    };
  }

  // The developer's edits land on the roadmap they have in front of them, not
  // on a recomposition: a wrong date is fixed by fixing it, not by writing a
  // note and asking for the whole roadmap again. On a proposal under review
  // the edit lands on the proposal; on the published roadmap it opens a
  // proposal prefilled with the corrected roadmap, without calling the model,
  // and approval publishes it as usual (docs/PRODUCT.md « La roadmap »).
  //
  // Every milestone travels, in order, so the result is never a function of
  // what the server already held. An id names one being kept; its absence
  // means a new one, which is why a new milestone can never collide with an
  // existing id or silently overwrite one.
  async replaceMilestones(
    userId: string,
    projectId: string,
    sectionId: string,
    input: ReplaceMilestonesDto,
  ) {
    await this.access.requireDeveloper(userId, projectId);
    const section = await this.prisma.clientSection.findFirst({
      where: { id: sectionId, projectId, archivedAt: null },
      select: { id: true, kind: true, activeProposalId: true },
    });
    if (!section) throw new NotFoundException({ code: 'NOT_FOUND' });
    if (section.kind !== 'roadmap') {
      throw new BadRequestException({ code: 'SECTION_NOT_ROADMAP' });
    }

    if (section.activeProposalId) {
      await this.editHeldProposal(section.activeProposalId, input);
    } else {
      await this.editPublishedRoadmap(section.id, input);
    }
    return this.current(userId, projectId, sectionId);
  }

  private async editHeldProposal(
    proposalId: string,
    input: ReplaceMilestonesDto,
  ) {
    const held = await this.prisma.sectionProposal.findUnique({
      where: { id: proposalId },
      select: { id: true, status: true, structuredContent: true },
    });
    // A composition still running will overwrite whatever is written here the
    // moment it lands, so the edit is refused rather than lost.
    if (!held || held.status !== 'pending_review') {
      throw new ConflictException({ code: 'PROPOSAL_STALE' });
    }

    const milestones = roadmapAfterEdit(
      held.structuredContent,
      input.milestones,
    );
    const { count } = await this.prisma.sectionProposal.updateMany({
      where: {
        id: held.id,
        status: 'pending_review',
        version: input.expectedProposalVersion,
      },
      data: {
        structuredContent: milestones as unknown as Prisma.InputJsonValue,
        // A roadmap the developer filled in by hand has composed something,
        // whatever the model found.
        outcome: milestones.length > 0 ? 'composed' : 'nothing_matched',
        version: { increment: 1 },
      },
    });
    if (count === 0) throw new ConflictException({ code: 'PROPOSAL_STALE' });
  }

  // Nothing is under review, so the roadmap the developer corrected is the one
  // the client reads. The correction becomes a proposal of its own: prefilled,
  // pinned to the reference document and language the approved one was written
  // in, based on it so the next recomposition starts from the correction, and
  // with no operation behind it because no model wrote it.
  private async editPublishedRoadmap(
    sectionId: string,
    input: ReplaceMilestonesDto,
  ) {
    const approved = await this.lastApproved(sectionId);
    // A roadmap never approved has nothing published to correct: it composes
    // first, and the developer edits the proposal.
    if (!approved) throw new NotFoundException({ code: 'NOT_FOUND' });
    // The correction was made against the roadmap the developer read, at the
    // version they read; one republished since is refused rather than edited
    // unseen.
    if (approved.version !== input.expectedProposalVersion) {
      throw new ConflictException({ code: 'PROPOSAL_STALE' });
    }

    const milestones = roadmapAfterEdit(
      approved.structuredContent,
      input.milestones,
    );
    await this.prisma.$transaction(async (tx) => {
      const proposal = await tx.sectionProposal.create({
        data: {
          sectionId,
          referenceDocumentId: approved.referenceDocumentId,
          locale: approved.locale,
          status: 'pending_review',
          outcome: milestones.length > 0 ? 'composed' : 'nothing_matched',
          structuredContent: milestones as unknown as Prisma.InputJsonValue,
          basedOnProposalId: approved.id,
        },
      });
      // A proposal opened meanwhile, by another edit or a recomposition, wins,
      // and this correction is refused rather than written beside it.
      await this.claimSlot(tx, sectionId, proposal.id, 'PROPOSAL_STALE');
    });
  }

  async approve(
    userId: string,
    projectId: string,
    sectionId: string,
    expectedVersion: number,
  ) {
    await this.access.requireDeveloper(userId, projectId);
    const section = await this.prisma.clientSection.findFirst({
      where: { id: sectionId, projectId, archivedAt: null },
      select: { id: true, kind: true, activeProposalId: true },
    });
    if (!section?.activeProposalId) {
      throw new NotFoundException({ code: 'NOT_FOUND' });
    }

    // Publishing an empty roadmap gives the client a tab with nothing in it and
    // no way to know why. A roadmap that found nothing is a starting point, not
    // something to approve — the developer fills it in first.
    if (section.kind === 'roadmap') {
      const held = await this.prisma.sectionProposal.findUnique({
        where: { id: section.activeProposalId },
        select: { structuredContent: true },
      });
      const milestones = (held?.structuredContent ?? []) as unknown[];
      if (milestones.length === 0) {
        throw new BadRequestException({ code: 'ROADMAP_EMPTY' });
      }
    }

    // FR-012: only a proposal the contributor has actually read can be
    // approved, and only at the version they read.
    const { count } = await this.prisma.sectionProposal.updateMany({
      where: {
        id: section.activeProposalId,
        sectionId,
        status: 'pending_review',
        version: expectedVersion,
      },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedByUserId: userId,
        version: { increment: 1 },
      },
    });
    if (count === 0) throw new ConflictException({ code: 'PROPOSAL_STALE' });

    // Approving releases the slot: the section is free to be refreshed, and its
    // approved proposal is what publication reads.
    await this.prisma.clientSection.updateMany({
      where: { id: sectionId, activeProposalId: section.activeProposalId },
      data: { activeProposalId: null, version: { increment: 1 } },
    });

    const approved = await this.prisma.sectionProposal.findUnique({
      where: { id: section.activeProposalId },
    });
    if (!approved) throw new NotFoundException({ code: 'NOT_FOUND' });

    await this.dropCurrentMilestoneIfGone(
      sectionId,
      approved.structuredContent,
    );
    // FR-022: publication replaces the whole set, so the client never reads a
    // mixture of approved and unapproved sections.
    const releaseId = await this.publication.queueApprovedProposal(approved);

    return {
      proposalId: section.activeProposalId,
      releaseId,
      approved: true as const,
    };
  }

  // Where the project stands survives a regeneration, because it has nothing to
  // do with what the documents say. What it cannot survive is the milestone it
  // names disappearing — then the honest answer is that no position is claimed.
  private async dropCurrentMilestoneIfGone(
    sectionId: string,
    structuredContent: unknown,
  ) {
    // Walked at both levels: the position may name a sub-step, and a sub-step
    // that disappears leaves the section pointing at nothing just as a
    // milestone does.
    const ids = milestoneIds(structuredContent);
    const section = await this.prisma.clientSection.findUnique({
      where: { id: sectionId },
      select: { currentMilestoneId: true },
    });
    if (!section?.currentMilestoneId) return;
    if (ids.has(section.currentMilestoneId)) return;
    await this.prisma.clientSection.update({
      where: { id: sectionId },
      data: { currentMilestoneId: null, version: { increment: 1 } },
    });
  }
}
