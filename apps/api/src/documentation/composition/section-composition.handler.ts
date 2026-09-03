import { Injectable, OnModuleInit } from '@nestjs/common';
import type { GenerationOperation, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import type { GenerationProviderResult } from '../../generation/adapters/generation-provider';
import type {
  GenerationHandler,
  GenerationRequestInput,
} from '../../generation/generation-handler.registry';
import { GenerationHandlerRegistry } from '../../generation/generation-handler.registry';
import { PrismaService } from '../../prisma/prisma.service';
import { buildCompositionPrompt } from '../sections/prompts/composition.prompt';
import type { CompositionPromptPart } from '../sections/prompts/composition.prompt';
import { buildRoadmapCompositionPrompt } from '../sections/prompts/roadmap-composition.prompt';
import {
  SECTION_COMPOSITION_JSON_SCHEMA,
  SECTION_COMPOSITION_OUTPUT_CONTRACT,
  SectionCompositionOutputSchema,
} from './composition-output.schema';
import {
  ROADMAP_COMPOSITION_JSON_SCHEMA,
  ROADMAP_COMPOSITION_OUTPUT_CONTRACT,
  RoadmapCompositionOutputSchema,
} from './roadmap-output.schema';
import {
  mergeRoadmapRecomposition,
  roadmapInPlaceForPrompt,
} from './roadmap-recomposition';

export interface CompositionInput {
  locale: string;
  sectionId: string;
  sectionKind: 'prose' | 'roadmap';
  sectionName: string;
  // Null on a roadmap, whose brief is fixed rather than authored.
  instructions: string | null;
  referenceDocumentId: string;
  referenceVersion: number;
  // The roadmap in place a recomposition starts from, pinned at the version
  // read when it was queued. Null on prose and on a first composition.
  roadmapInPlace: { proposalId: string; version: number } | null;
}

// One definition of what the input is, used both when the operation is queued
// and when its request is built. Two hand-kept copies of this shape is exactly
// how a stage starts refusing its own work for drift it invented itself.
export function compositionFingerprint(input: CompositionInput): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

// The document as the model should read it. A gap keeps its own kind, so the
// section can carry it forward as an open point instead of quietly writing a
// sentence that reads as settled.
export function compositionParts(
  structuredContent: unknown,
): CompositionPromptPart[] {
  const parts = (structuredContent ?? []) as {
    title: string;
    blocks: { kind: 'paragraph' | 'gap'; text: string }[];
  }[];
  return parts.map((part) => ({
    title: part.title,
    blocks: part.blocks.map((block) => ({
      kind: block.kind,
      text: block.text,
    })),
  }));
}

@Injectable()
export class SectionCompositionHandler
  implements GenerationHandler, OnModuleInit
{
  readonly type = 'section_composition' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: GenerationHandlerRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async buildRequest(
    operation: GenerationOperation,
  ): Promise<GenerationRequestInput> {
    const proposal = await this.prisma.sectionProposal.findUnique({
      where: { generationOperationId: operation.id },
      include: {
        section: true,
        referenceDocument: true,
        basedOn: {
          select: { id: true, version: true, structuredContent: true },
        },
      },
    });
    if (!proposal || proposal.status !== 'composing') {
      throw new Error('SECTION_COMPOSITION_NOT_CURRENT');
    }
    // A section archived while its composition was queued has nothing left to
    // compose for.
    if (proposal.section.archivedAt) {
      throw new Error('SECTION_COMPOSITION_NOT_CURRENT');
    }

    const input: CompositionInput = {
      locale: proposal.locale,
      sectionId: proposal.sectionId,
      sectionKind: proposal.section.kind,
      sectionName: proposal.section.name,
      instructions: proposal.section.instructions,
      referenceDocumentId: proposal.referenceDocumentId,
      referenceVersion: proposal.referenceDocument.version,
      roadmapInPlace: proposal.basedOn
        ? { proposalId: proposal.basedOn.id, version: proposal.basedOn.version }
        : null,
    };
    if (compositionFingerprint(input) !== operation.inputFingerprint) {
      throw new Error('SECTION_COMPOSITION_INPUT_DRIFT');
    }

    const parts = compositionParts(
      proposal.referenceDocument.structuredContent,
    );

    // The kind branches here rather than in a second handler: what surrounds
    // this call — the one composition slot, the lease, the retry and the
    // terminal-failure release — took three fixes to get right (5c4fbee,
    // ff11818, c9ae01a), and a second handler would be a second copy of it.
    if (input.sectionKind === 'roadmap') {
      return {
        parts: [
          {
            kind: 'text',
            text: buildRoadmapCompositionPrompt({
              locale: input.locale,
              sectionName: input.sectionName,
              parts,
              roadmapInPlace: roadmapInPlaceForPrompt(
                proposal.basedOn?.structuredContent,
              ),
            }),
          },
        ],
        outputContract: ROADMAP_COMPOSITION_OUTPUT_CONTRACT,
        outputSchema: ROADMAP_COMPOSITION_JSON_SCHEMA,
        maxOutputTokens: 8_000,
      };
    }

    if (input.instructions === null) {
      throw new Error('SECTION_COMPOSITION_BRIEF_MISSING');
    }

    return {
      parts: [
        {
          kind: 'text',
          text: buildCompositionPrompt({
            locale: input.locale,
            sectionName: input.sectionName,
            instructions: input.instructions,
            parts,
          }),
        },
      ],
      outputContract: SECTION_COMPOSITION_OUTPUT_CONTRACT,
      outputSchema: SECTION_COMPOSITION_JSON_SCHEMA,
      maxOutputTokens: 8_000,
    };
  }

  async apply(
    tx: Prisma.TransactionClient,
    operation: GenerationOperation,
    result: GenerationProviderResult,
  ): Promise<void> {
    const proposal = await tx.sectionProposal.findUnique({
      where: { generationOperationId: operation.id },
      include: {
        section: { select: { kind: true } },
        basedOn: { select: { structuredContent: true } },
      },
    });
    if (!proposal || proposal.status !== 'composing') {
      throw new Error('SECTION_COMPOSITION_NOT_CURRENT');
    }

    const composed =
      proposal.section.kind === 'roadmap'
        ? this.applyRoadmap(result, proposal.basedOn?.structuredContent)
        : this.applyProse(result);

    await tx.sectionProposal.update({
      where: { id: proposal.id },
      data: {
        status: 'pending_review',
        outcome: composed.outcome,
        structuredContent: composed.structuredContent,
        changeSummary: composed.changeSummary,
        failureCode: null,
        version: { increment: 1 },
      },
    });

    // The section has now been composed against the current reference document,
    // so it no longer needs a refresh. A later rewrite sets it again (FR-018).
    await tx.clientSection.update({
      where: { id: proposal.sectionId },
      data: { refreshNeeded: false, version: { increment: 1 } },
    });
  }

  private applyProse(result: GenerationProviderResult) {
    const output = SectionCompositionOutputSchema.parse(result.output);
    return {
      outcome: output.outcome,
      structuredContent: output.blocks as Prisma.InputJsonValue,
      changeSummary: output.changeSummary,
    };
  }

  // What the model proposed is folded into the roadmap in place: developer
  // steps come through untouched, document steps are corrected, removed or
  // added, and ids are minted here rather than asked of the model (45a13ac).
  private applyRoadmap(
    result: GenerationProviderResult,
    roadmapInPlace: unknown,
  ) {
    const output = RoadmapCompositionOutputSchema.parse(result.output);
    const milestones = mergeRoadmapRecomposition(
      roadmapInPlace,
      output.milestones,
    );
    return {
      outcome: output.outcome,
      structuredContent: milestones as unknown as Prisma.InputJsonValue,
      changeSummary: output.changeSummary,
    };
  }

  // A section holds one composition slot at a time. Nothing else releases it,
  // so a generation that dies has to hand it back here — otherwise the section
  // sits on "composing" forever and every later refresh finds the slot taken.
  // That is the failure that pinned three categories for a day on 2026-08-11.
  async onTerminalFailure(
    tx: Prisma.TransactionClient,
    operation: GenerationOperation,
    failureCode: string,
  ): Promise<void> {
    const proposal = await tx.sectionProposal.findFirst({
      where: { generationOperationId: operation.id, status: 'composing' },
      select: { id: true, sectionId: true },
    });
    if (!proposal) return;
    await tx.sectionProposal.update({
      where: { id: proposal.id },
      data: { status: 'failed', failureCode, version: { increment: 1 } },
    });
    // The section keeps whatever it had approved, so the client goes on reading
    // it while the contributor retries (Edge Cases).
    await tx.clientSection.updateMany({
      where: { id: proposal.sectionId, activeProposalId: proposal.id },
      data: { activeProposalId: null, version: { increment: 1 } },
    });
  }
}
