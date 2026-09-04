import { NotFoundException } from '@nestjs/common';
import { GenerationService } from '../../generation/generation.service';
import { ClientPublicationService } from '../publication/client-publication.service';
import { ProjectAccessService } from '../../projects/project-access.service';
import { asPrismaService, createPrismaMock } from '../../test/prisma-mock';
import { SectionProposalService } from './section-proposal.service';

const projectId = '00000000-0000-4000-8000-000000000001';
const sectionId = '00000000-0000-4000-8000-000000000002';
const proposalId = '00000000-0000-4000-8000-000000000003';
const referenceId = '00000000-0000-4000-8000-000000000004';
const operationId = '00000000-0000-4000-8000-000000000005';
const userId = 'user-1';

const section = {
  id: sectionId,
  projectId,
  kind: 'prose' as const,
  name: 'What the client asked for',
  instructions: 'The request and its constraints.',
  activeProposalId: null,
  archivedAt: null,
};

const reference = { id: referenceId, version: 1 };

describe('SectionProposalService', () => {
  function setup() {
    const prisma = createPrismaMock();
    const access = {
      requireDeveloper: jest.fn().mockResolvedValue({ isAdmin: true }),
    };
    const generation = {
      createInTransaction: jest.fn().mockResolvedValue({ id: operationId }),
    };
    const publication = {
      queueApprovedProposal: jest.fn().mockResolvedValue('release-1'),
    };
    return {
      prisma,
      access,
      generation,
      publication,
      service: new SectionProposalService(
        asPrismaService(prisma),
        access as unknown as ProjectAccessService,
        generation as unknown as GenerationService,
        publication as unknown as ClientPublicationService,
      ),
    };
  }

  function readyToCompose(
    prisma: ReturnType<typeof createPrismaMock>,
    overrides: Record<string, unknown> = {},
  ) {
    prisma.clientSection.findFirst.mockResolvedValue({
      ...section,
      ...overrides,
    });
    prisma.referenceDocument.findFirst.mockResolvedValue(reference);
    prisma.sectionProposal.count.mockResolvedValue(0);
    prisma.sectionProposal.create.mockResolvedValue({ id: proposalId });
    prisma.clientSection.updateMany.mockResolvedValue({ count: 1 });
  }

  describe('triggering a composition', () => {
    it('queues the work and claims the section slot', async () => {
      const { prisma, generation, service } = setup();
      readyToCompose(prisma);

      await expect(
        service.compose(userId, projectId, sectionId),
      ).resolves.toEqual({ proposalId, operationId });

      expect(generation.createInTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'section_composition' }),
      );
      expect(prisma.clientSection.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ activeProposalId: null }),
          data: expect.objectContaining({ activeProposalId: proposalId }),
        }),
      );
    });

    it('pins the proposal to the reference document it composes from', async () => {
      const { prisma, service } = setup();
      readyToCompose(prisma);

      await service.compose(userId, projectId, sectionId);

      expect(prisma.sectionProposal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            referenceDocumentId: referenceId,
            status: 'composing',
            generationOperationId: operationId,
          }),
        }),
      );
    });

    // A proposal merely waiting to be read is not in the way: pressing "write
    // it" on one is the developer asking for another go, and refusing that
    // silently is what made the button look broken.
    it('retires a proposal awaiting review and writes another', async () => {
      const { prisma, service } = setup();
      readyToCompose(prisma);
      prisma.clientSection.findFirst.mockResolvedValue({
        ...section,
        activeProposalId: 'proposal-old',
      });
      prisma.sectionProposal.findFirst.mockResolvedValue({
        id: 'proposal-old',
        status: 'pending_review',
      });
      prisma.sectionProposal.updateMany.mockResolvedValue({ count: 1 });

      await expect(
        service.compose(userId, projectId, sectionId),
      ).resolves.toMatchObject({ proposalId });
      expect(prisma.sectionProposal.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'superseded' }),
        }),
      );
    });

    it('refuses a second composition while one is running (FR-013)', async () => {
      const { prisma, service } = setup();
      prisma.clientSection.findFirst.mockResolvedValue({
        ...section,
        activeProposalId: proposalId,
      });
      prisma.sectionProposal.findFirst.mockResolvedValue({
        id: proposalId,
        status: 'composing',
      });

      await expect(
        service.compose(userId, projectId, sectionId),
      ).rejects.toMatchObject({ response: { code: 'SECTION_COMPOSING' } });
      expect(prisma.sectionProposal.create).not.toHaveBeenCalled();
    });

    it('lets a section whose last proposal died compose again', async () => {
      const { prisma, service } = setup();
      readyToCompose(prisma, { activeProposalId: proposalId });
      // The slot points at a proposal that has reached an end, so nothing holds it.
      prisma.sectionProposal.findFirst.mockResolvedValue(null);

      await expect(
        service.compose(userId, projectId, sectionId),
      ).resolves.toMatchObject({ proposalId });
    });

    it('loses the race rather than composing twice', async () => {
      const { prisma, service } = setup();
      readyToCompose(prisma);
      prisma.clientSection.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.compose(userId, projectId, sectionId),
      ).rejects.toMatchObject({ response: { code: 'SECTION_COMPOSING' } });
    });

    // A section is a view of the reference document, so this
    // is a real ordering constraint rather than a failure.
    it('refuses to compose before a reference document exists', async () => {
      const { prisma, service } = setup();
      prisma.clientSection.findFirst.mockResolvedValue(section);
      prisma.referenceDocument.findFirst.mockResolvedValue(null);

      await expect(
        service.compose(userId, projectId, sectionId),
      ).rejects.toMatchObject({ response: { code: 'NO_REFERENCE_DOCUMENT' } });
    });

    it('hides a section from another project', async () => {
      const { prisma, service } = setup();
      prisma.clientSection.findFirst.mockResolvedValue(null);

      await expect(
        service.compose(userId, projectId, sectionId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('reading the current proposal', () => {
    it('withholds blocks while it is still composing', async () => {
      const { prisma, service } = setup();
      prisma.clientSection.findFirst.mockResolvedValue({ id: sectionId });
      prisma.sectionProposal.findFirst.mockResolvedValue({
        id: proposalId,
        sectionId,
        referenceDocumentId: referenceId,
        status: 'composing',
        outcome: null,
        version: 1,
        changeSummary: null,
        createdAt: new Date('2026-08-12T10:00:00.000Z'),
        structuredContent: null,
        failureCode: null,
        questions: [],
        section: { kind: 'prose' },
      });

      await expect(
        service.current(userId, projectId, sectionId),
      ).resolves.toMatchObject({ status: 'composing', blocks: [] });
    });

    it('returns the content once it awaits review', async () => {
      const { prisma, service } = setup();
      prisma.clientSection.findFirst.mockResolvedValue({ id: sectionId });
      prisma.sectionProposal.findFirst.mockResolvedValue({
        id: proposalId,
        sectionId,
        referenceDocumentId: referenceId,
        status: 'pending_review',
        outcome: 'composed',
        version: 2,
        changeSummary: 'First composition.',
        createdAt: new Date('2026-08-12T10:00:00.000Z'),
        structuredContent: [{ kind: 'paragraph', text: 'A paragraph.' }],
        failureCode: null,
        section: { kind: 'prose' },
      });

      const proposal = await service.current(userId, projectId, sectionId);

      expect(proposal?.blocks).toHaveLength(1);
    });

    it('reports a section that has never composed', async () => {
      const { prisma, service } = setup();
      prisma.clientSection.findFirst.mockResolvedValue({ id: sectionId });
      prisma.sectionProposal.findFirst.mockResolvedValue(null);

      await expect(
        service.current(userId, projectId, sectionId),
      ).resolves.toBeNull();
    });
  });

  describe('approving', () => {
    it('approves at the version the contributor read, and releases the slot', async () => {
      const { prisma, service } = setup();
      prisma.clientSection.findFirst.mockResolvedValue({
        id: sectionId,
        activeProposalId: proposalId,
      });
      prisma.sectionProposal.updateMany.mockResolvedValue({ count: 1 });
      prisma.clientSection.updateMany.mockResolvedValue({ count: 1 });
      prisma.sectionProposal.findUnique.mockResolvedValue({ id: proposalId });

      await expect(
        service.approve(userId, projectId, sectionId, 2),
      ).resolves.toEqual({
        proposalId,
        releaseId: 'release-1',
        approved: true,
      });

      expect(prisma.sectionProposal.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'pending_review',
            version: 2,
          }),
          data: expect.objectContaining({ approvedByUserId: userId }),
        }),
      );
      expect(prisma.clientSection.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ activeProposalId: null }),
        }),
      );
    });

    // Publishing an empty roadmap gives the client a tab with nothing in it and
    // no way to know why.
    it('refuses to publish a roadmap with nothing in it', async () => {
      const { prisma, service } = setup();
      prisma.clientSection.findFirst.mockResolvedValue({
        id: sectionId,
        kind: 'roadmap',
        activeProposalId: proposalId,
      });
      prisma.sectionProposal.findUnique.mockResolvedValue({
        structuredContent: [],
      });

      await expect(
        service.approve(userId, projectId, sectionId, 1),
      ).rejects.toMatchObject({ response: { code: 'ROADMAP_EMPTY' } });
      expect(prisma.sectionProposal.updateMany).not.toHaveBeenCalled();
    });

    it('refuses to approve a proposal that has since changed', async () => {
      const { prisma, service } = setup();
      prisma.clientSection.findFirst.mockResolvedValue({
        id: sectionId,
        activeProposalId: proposalId,
      });
      prisma.sectionProposal.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.approve(userId, projectId, sectionId, 1),
      ).rejects.toMatchObject({ response: { code: 'PROPOSAL_STALE' } });
      expect(prisma.clientSection.updateMany).not.toHaveBeenCalled();
    });

    it('refuses to approve a section holding no proposal', async () => {
      const { prisma, service } = setup();
      prisma.clientSection.findFirst.mockResolvedValue({
        id: sectionId,
        activeProposalId: null,
      });

      await expect(
        service.approve(userId, projectId, sectionId, 1),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // A roadmap is composed by the same machinery as prose — one slot, one lease,
  // one terminal-failure release — and differs only in what it asks for and
  // what comes back.
  describe('a roadmap section', () => {
    const milestoneId = '00000000-0000-4000-8000-00000000000a';

    function pendingRoadmap(
      prisma: ReturnType<typeof createPrismaMock>,
      milestones: unknown[],
    ) {
      prisma.clientSection.findFirst.mockResolvedValue({
        id: sectionId,
        kind: 'roadmap',
        activeProposalId: proposalId,
      });
      prisma.sectionProposal.findUnique.mockResolvedValue({
        id: proposalId,
        status: 'pending_review',
        structuredContent: milestones,
      });
      prisma.sectionProposal.updateMany.mockResolvedValue({ count: 1 });
      prisma.sectionProposal.findFirst.mockResolvedValue({
        id: proposalId,
        sectionId,
        referenceDocumentId: referenceId,
        status: 'pending_review',
        outcome: 'composed',
        version: 3,
        changeSummary: null,
        createdAt: new Date('2026-08-13T10:00:00.000Z'),
        structuredContent: milestones,
        failureCode: null,
        section: { kind: 'roadmap' },
      });
    }

    it('asks for a roadmap rather than prose', async () => {
      const { prisma, generation, service } = setup();
      readyToCompose(prisma, { kind: 'roadmap', instructions: null });

      await service.compose(userId, projectId, sectionId);

      expect(generation.createInTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          outputContractVersion: 'roadmap-composition-v4',
        }),
      );
    });

    // Recomposing starts from the roadmap the developer has now, so their
    // retouches travel into the next proposal rather than being lost.
    describe('recomposing in place', () => {
      const approvedId = '00000000-0000-4000-8000-00000000000c';
      const heldId = '00000000-0000-4000-8000-00000000000d';

      function pinned(prisma: ReturnType<typeof createPrismaMock>) {
        const created = prisma.sectionProposal.create.mock.calls[0][0] as {
          data: { basedOnProposalId: string | null };
        };
        const queued = prisma.sectionProposal.create.mock.calls.length;
        return { basedOnProposalId: created.data.basedOnProposalId, queued };
      }

      it('starts from the proposal under review, edits included', async () => {
        const { prisma, generation, service } = setup();
        readyToCompose(prisma, {
          kind: 'roadmap',
          instructions: null,
          activeProposalId: heldId,
        });
        prisma.sectionProposal.findFirst.mockResolvedValue({
          id: heldId,
          status: 'pending_review',
        });
        prisma.sectionProposal.updateMany.mockResolvedValue({ count: 1 });
        prisma.sectionProposal.findUnique.mockResolvedValue({
          id: heldId,
          version: 7,
        });

        await service.compose(userId, projectId, sectionId);

        expect(pinned(prisma).basedOnProposalId).toBe(heldId);
        // Read after the supersede, at the version it then holds.
        expect(prisma.sectionProposal.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: heldId } }),
        );
        expect(generation.createInTransaction).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            outputContractVersion: 'roadmap-composition-v4',
          }),
        );
      });

      it('starts from the roadmap last approved when nothing is under review', async () => {
        const { prisma, service } = setup();
        readyToCompose(prisma, { kind: 'roadmap', instructions: null });
        prisma.sectionProposal.findFirst.mockResolvedValue({
          id: approvedId,
          version: 3,
        });

        await service.compose(userId, projectId, sectionId);

        expect(prisma.sectionProposal.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { sectionId, status: 'approved' },
          }),
        );
        expect(pinned(prisma).basedOnProposalId).toBe(approvedId);
      });

      it('starts from nothing on a first composition', async () => {
        const { prisma, service } = setup();
        readyToCompose(prisma, { kind: 'roadmap', instructions: null });
        prisma.sectionProposal.findFirst.mockResolvedValue(null);

        await service.compose(userId, projectId, sectionId);

        expect(pinned(prisma).basedOnProposalId).toBeNull();
      });

      it('never gives prose a roadmap to start from', async () => {
        const { prisma, service } = setup();
        readyToCompose(prisma);

        await service.compose(userId, projectId, sectionId);

        expect(prisma.sectionProposal.findFirst).not.toHaveBeenCalled();
        expect(pinned(prisma).basedOnProposalId).toBeNull();
      });
    });

    it('reads milestones back rather than blocks', async () => {
      const { prisma, service } = setup();
      const milestones = [
        {
          id: milestoneId,
          when: 'Q3 2026',
          title: 'Recette',
          description: null,
          origin: 'document',
        },
      ];
      pendingRoadmap(prisma, milestones);

      const proposal = await service.current(userId, projectId, sectionId);

      expect(proposal?.milestones).toHaveLength(1);
      expect(proposal?.blocks).toEqual([]);
    });

    // US2.1 and US2.2: a wrong date is fixed by fixing it, not by writing a
    // note and asking for the whole roadmap again.
    it('keeps the ids of milestones the developer kept and mints ids for the rest', async () => {
      const { prisma, service } = setup();
      pendingRoadmap(prisma, [
        {
          id: milestoneId,
          when: 'Q3 2026',
          title: 'Recette',
          description: null,
          origin: 'document',
        },
      ]);

      await service.replaceMilestones(userId, projectId, sectionId, {
        milestones: [
          {
            id: milestoneId,
            when: 'mi-octobre',
            title: 'Recette',
            description: null,
          },
          {
            id: null,
            when: 'novembre',
            title: 'Mise en ligne',
            description: null,
          },
        ],
        expectedProposalVersion: 3,
      });

      const written = prisma.sectionProposal.updateMany.mock.calls[0][0] as {
        data: {
          structuredContent: { id: string; when: string; origin: string }[];
        };
      };
      expect(written.data.structuredContent[0]).toMatchObject({
        id: milestoneId,
        when: 'mi-octobre',
        // Retouched, so theirs from now on: the next recomposition hands it
        // back untouched rather than letting the model revert the date.
        origin: 'developer',
      });
      expect(written.data.structuredContent[1].id).not.toBe(milestoneId);
      expect(written.data.structuredContent[1].origin).toBe('developer');
    });

    // Reordering is not a retouch: a step sent back word for word stays what
    // it was, and the model may still correct it against the document.
    it('keeps a step the developer only moved as read from the document', async () => {
      const { prisma, service } = setup();
      const otherId = '00000000-0000-4000-8000-00000000000e';
      pendingRoadmap(prisma, [
        {
          id: milestoneId,
          when: 'Q3 2026',
          title: 'Recette',
          description: null,
          substeps: [],
          origin: 'document',
        },
        {
          id: otherId,
          when: null,
          title: 'Mise en ligne',
          description: null,
          substeps: [],
          origin: 'document',
        },
      ]);

      await service.replaceMilestones(userId, projectId, sectionId, {
        milestones: [
          {
            id: otherId,
            when: null,
            title: 'Mise en ligne',
            description: null,
          },
          {
            id: milestoneId,
            when: 'Q3 2026',
            title: 'Recette',
            description: null,
          },
        ],
        expectedProposalVersion: 3,
      });

      const written = prisma.sectionProposal.updateMany.mock.calls[0][0] as {
        data: { structuredContent: { id: string; origin: string }[] };
      };
      expect(written.data.structuredContent.map((m) => m.origin)).toEqual([
        'document',
        'document',
      ]);
    });

    // A published roadmap is no longer read-only (docs/PRODUCT.md « La
    // roadmap »): a correction to it becomes a proposal prefilled with the
    // corrected roadmap, without calling the model, and approval publishes it
    // as usual.
    describe('editing the published roadmap', () => {
      const approvedId = '00000000-0000-4000-8000-00000000000c';
      const newProposalId = '00000000-0000-4000-8000-00000000000f';
      const approved = {
        id: approvedId,
        status: 'approved',
        version: 3,
        referenceDocumentId: referenceId,
        locale: 'fr',
        structuredContent: [
          {
            id: milestoneId,
            when: 'Q3 2026',
            title: 'Recette',
            description: null,
            substeps: [],
            origin: 'document',
          },
        ],
      };

      function publishedRoadmap(prisma: ReturnType<typeof createPrismaMock>) {
        prisma.clientSection.findFirst.mockResolvedValue({
          id: sectionId,
          kind: 'roadmap',
          activeProposalId: null,
        });
        prisma.sectionProposal.findFirst
          .mockResolvedValueOnce(approved)
          .mockResolvedValue({
            id: newProposalId,
            sectionId,
            referenceDocumentId: referenceId,
            status: 'pending_review',
            outcome: 'composed',
            version: 1,
            changeSummary: null,
            createdAt: new Date('2026-09-03T10:00:00.000Z'),
            structuredContent: [],
            failureCode: null,
            section: { kind: 'roadmap' },
          });
        prisma.sectionProposal.create.mockResolvedValue({ id: newProposalId });
        prisma.clientSection.updateMany.mockResolvedValue({ count: 1 });
      }

      it('turns a correction into a prefilled proposal, without calling the model', async () => {
        const { prisma, generation, service } = setup();
        publishedRoadmap(prisma);

        const result = await service.replaceMilestones(
          userId,
          projectId,
          sectionId,
          {
            milestones: [
              {
                id: milestoneId,
                when: 'mi-octobre',
                title: 'Recette',
                description: null,
              },
            ],
            expectedProposalVersion: 3,
          },
        );

        expect(generation.createInTransaction).not.toHaveBeenCalled();
        const created = prisma.sectionProposal.create.mock.calls[0][0] as {
          data: Record<string, unknown> & {
            structuredContent: { id: string; when: string; origin: string }[];
          };
        };
        expect(created.data).toMatchObject({
          sectionId,
          status: 'pending_review',
          outcome: 'composed',
          referenceDocumentId: referenceId,
          locale: 'fr',
          basedOnProposalId: approvedId,
        });
        expect(created.data.generationOperationId).toBeUndefined();
        // Reconciled against the roadmap the client reads: the step keeps its
        // id, and the retouch makes it the developer's.
        expect(created.data.structuredContent[0]).toMatchObject({
          id: milestoneId,
          when: 'mi-octobre',
          origin: 'developer',
        });
        // The section holds it from here, so the next recomposition starts
        // from it and the approval finds it.
        expect(prisma.clientSection.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              id: sectionId,
              activeProposalId: null,
            }),
            data: expect.objectContaining({ activeProposalId: newProposalId }),
          }),
        );
        expect(result).toMatchObject({
          id: newProposalId,
          status: 'pending_review',
        });
      });

      it('refuses a correction made against a roadmap that has since been republished', async () => {
        const { prisma, service } = setup();
        publishedRoadmap(prisma);

        await expect(
          service.replaceMilestones(userId, projectId, sectionId, {
            milestones: [],
            expectedProposalVersion: 2,
          }),
        ).rejects.toMatchObject({ response: { code: 'PROPOSAL_STALE' } });
        expect(prisma.sectionProposal.create).not.toHaveBeenCalled();
      });

      it('loses the race to a proposal opened meanwhile rather than opening a second', async () => {
        const { prisma, service } = setup();
        publishedRoadmap(prisma);
        prisma.clientSection.updateMany.mockResolvedValue({ count: 0 });

        await expect(
          service.replaceMilestones(userId, projectId, sectionId, {
            milestones: [],
            expectedProposalVersion: 3,
          }),
        ).rejects.toMatchObject({ response: { code: 'PROPOSAL_STALE' } });
      });

      it('has nothing to correct before a roadmap was ever approved', async () => {
        const { prisma, service } = setup();
        publishedRoadmap(prisma);
        prisma.sectionProposal.findFirst.mockReset();
        prisma.sectionProposal.findFirst.mockResolvedValue(null);

        await expect(
          service.replaceMilestones(userId, projectId, sectionId, {
            milestones: [],
            expectedProposalVersion: 1,
          }),
        ).rejects.toMatchObject({ response: { code: 'NOT_FOUND' } });
      });
    });

    // The editor opens on the roadmap the client reads, so a proposal retired
    // without an approval must not hide it.
    it('reads the roadmap last approved when the last proposal was retired', async () => {
      const { prisma, service } = setup();
      prisma.clientSection.findFirst.mockResolvedValue({ id: sectionId });
      prisma.sectionProposal.findFirst
        .mockResolvedValueOnce({
          id: proposalId,
          sectionId,
          referenceDocumentId: referenceId,
          status: 'superseded',
          outcome: null,
          version: 2,
          changeSummary: null,
          createdAt: new Date('2026-09-03T10:00:00.000Z'),
          structuredContent: null,
          failureCode: null,
          section: { kind: 'roadmap' },
        })
        .mockResolvedValueOnce({
          id: '00000000-0000-4000-8000-00000000000c',
          sectionId,
          referenceDocumentId: referenceId,
          status: 'approved',
          outcome: 'composed',
          version: 3,
          changeSummary: null,
          createdAt: new Date('2026-09-01T10:00:00.000Z'),
          structuredContent: [{ id: milestoneId, title: 'Recette' }],
          failureCode: null,
        });

      const current = await service.current(userId, projectId, sectionId);

      expect(current).toMatchObject({ status: 'approved', version: 3 });
      expect(current?.milestones).toHaveLength(1);
      expect(prisma.sectionProposal.findFirst).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { sectionId, status: 'approved' },
          orderBy: { approvedAt: 'desc' },
        }),
      );
    });

    // A failed composition is not hidden behind the roadmap the client reads:
    // the developer is told, and recomposes.
    it('still reports a failed composition on a roadmap already approved', async () => {
      const { prisma, service } = setup();
      prisma.clientSection.findFirst.mockResolvedValue({ id: sectionId });
      prisma.sectionProposal.findFirst.mockResolvedValueOnce({
        id: proposalId,
        sectionId,
        referenceDocumentId: referenceId,
        status: 'failed',
        outcome: null,
        version: 2,
        changeSummary: null,
        createdAt: new Date('2026-09-03T10:00:00.000Z'),
        structuredContent: null,
        failureCode: 'PROVIDER_DOWN',
        section: { kind: 'roadmap' },
      });

      const current = await service.current(userId, projectId, sectionId);

      expect(current).toMatchObject({ status: 'failed', milestones: [] });
      expect(prisma.sectionProposal.findFirst).toHaveBeenCalledTimes(1);
    });

    it('refuses to edit milestones on a section that is not a roadmap', async () => {
      const { prisma, service } = setup();
      prisma.clientSection.findFirst.mockResolvedValue({
        id: sectionId,
        kind: 'prose',
        activeProposalId: proposalId,
      });

      await expect(
        service.replaceMilestones(userId, projectId, sectionId, {
          milestones: [],
          expectedProposalVersion: 1,
        }),
      ).rejects.toMatchObject({ response: { code: 'SECTION_NOT_ROADMAP' } });
    });

    // A composition still running overwrites whatever is written here the
    // moment it lands, so the edit is refused rather than lost.
    it('refuses an edit while a composition is still running', async () => {
      const { prisma, service } = setup();
      prisma.clientSection.findFirst.mockResolvedValue({
        id: sectionId,
        kind: 'roadmap',
        activeProposalId: proposalId,
      });
      prisma.sectionProposal.findUnique.mockResolvedValue({
        id: proposalId,
        status: 'composing',
        structuredContent: null,
      });

      await expect(
        service.replaceMilestones(userId, projectId, sectionId, {
          milestones: [],
          expectedProposalVersion: 1,
        }),
      ).rejects.toMatchObject({ response: { code: 'PROPOSAL_STALE' } });
    });

    // US4.4: where the project stands survives a regeneration, but not the
    // disappearance of the milestone it names.
    it('stops claiming a position when the milestone it named is gone', async () => {
      const { prisma, service } = setup();
      prisma.clientSection.findFirst.mockResolvedValue({
        id: sectionId,
        activeProposalId: proposalId,
      });
      prisma.sectionProposal.updateMany.mockResolvedValue({ count: 1 });
      prisma.clientSection.updateMany.mockResolvedValue({ count: 1 });
      prisma.sectionProposal.findUnique.mockResolvedValue({
        id: proposalId,
        sectionId,
        structuredContent: [{ id: 'another-milestone' }],
      });
      prisma.clientSection.findUnique.mockResolvedValue({
        currentMilestoneId: milestoneId,
      });

      await service.approve(userId, projectId, sectionId, 1);

      expect(prisma.clientSection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currentMilestoneId: null }),
        }),
      );
    });

    // Both levels are reconciled: a correction to a sub-step keeps its id and
    // its origin exactly as a correction to the milestone above it does.
    describe('what sits inside a milestone', () => {
      const substepId = '00000000-0000-4000-8000-00000000000b';

      it('keeps the ids of the steps kept and mints ids for the rest', async () => {
        const { prisma, service } = setup();
        pendingRoadmap(prisma, [
          {
            id: milestoneId,
            when: 'Q3 2026',
            title: 'Développement',
            description: null,
            substeps: [
              {
                id: substepId,
                when: null,
                title: 'Feature 1',
                description: null,
                origin: 'document',
              },
            ],
            origin: 'document',
          },
        ]);

        await service.replaceMilestones(userId, projectId, sectionId, {
          milestones: [
            {
              id: milestoneId,
              when: 'Q3 2026',
              title: 'Développement',
              description: null,
              substeps: [
                {
                  id: substepId,
                  when: 'juin',
                  title: 'Feature 1 — le panier',
                  description: null,
                },
                { id: null, when: null, title: 'Feature 2', description: null },
              ],
            },
          ],
          expectedProposalVersion: 3,
        });

        const written = prisma.sectionProposal.updateMany.mock.calls[0][0] as {
          data: {
            structuredContent: {
              substeps: {
                id: string;
                when: string | null;
                title: string;
                origin: string;
              }[];
            }[];
          };
        };
        const substeps = written.data.structuredContent[0].substeps;
        expect(substeps[0]).toMatchObject({
          id: substepId,
          when: 'juin',
          title: 'Feature 1 — le panier',
          // Retouched, so theirs: a recomposition hands it back untouched.
          origin: 'developer',
        });
        // The step around it was sent back word for word, so it is still the
        // document's to correct.
        expect(
          (written.data.structuredContent[0] as { origin?: string }).origin,
        ).toBe('document');
        expect(substeps[1].id).not.toBe(substepId);
        expect(substeps[1].origin).toBe('developer');
        // A step inside a phase often has no date of its own.
        expect(substeps[1].when).toBeNull();
      });

      // The position may name a sub-step, so a sub-step that disappears leaves
      // the section pointing at nothing just as a milestone does.
      it('stops claiming a position when the sub-step it named is gone', async () => {
        const { prisma, service } = setup();
        prisma.clientSection.findFirst.mockResolvedValue({
          id: sectionId,
          activeProposalId: proposalId,
        });
        prisma.sectionProposal.updateMany.mockResolvedValue({ count: 1 });
        prisma.clientSection.updateMany.mockResolvedValue({ count: 1 });
        prisma.sectionProposal.findUnique.mockResolvedValue({
          id: proposalId,
          sectionId,
          structuredContent: [
            { id: milestoneId, substeps: [{ id: 'another' }] },
          ],
        });
        prisma.clientSection.findUnique.mockResolvedValue({
          currentMilestoneId: substepId,
        });

        await service.approve(userId, projectId, sectionId, 1);

        expect(prisma.clientSection.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ currentMilestoneId: null }),
          }),
        );
      });

      it('keeps a position that names a sub-step still there', async () => {
        const { prisma, service } = setup();
        prisma.clientSection.findFirst.mockResolvedValue({
          id: sectionId,
          activeProposalId: proposalId,
        });
        prisma.sectionProposal.updateMany.mockResolvedValue({ count: 1 });
        prisma.clientSection.updateMany.mockResolvedValue({ count: 1 });
        prisma.sectionProposal.findUnique.mockResolvedValue({
          id: proposalId,
          sectionId,
          structuredContent: [
            { id: milestoneId, substeps: [{ id: substepId }] },
          ],
        });
        prisma.clientSection.findUnique.mockResolvedValue({
          currentMilestoneId: substepId,
        });

        await service.approve(userId, projectId, sectionId, 1);

        expect(prisma.clientSection.update).not.toHaveBeenCalled();
      });
    });
  });
});
