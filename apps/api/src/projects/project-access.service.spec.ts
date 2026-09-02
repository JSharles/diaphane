import { NotFoundException } from '@nestjs/common';
import {
  asPrismaService,
  createPrismaMock,
  PrismaMock,
} from '../test/prisma-mock';
import { ProjectAccessService } from './project-access.service';

// A membership row, joined with the one account field access depends on.
const developerMembership = {
  id: 'membership-1',
  projectId: 'project-1',
  userId: 'user-1',
  isAdmin: true,
  createdAt: new Date('2026-08-11T00:00:00.000Z'),
  user: { accountKind: 'developer' as const },
};
const clientMembership = {
  ...developerMembership,
  isAdmin: false,
  user: { accountKind: 'client' as const },
};

describe('ProjectAccessService', () => {
  let prisma: PrismaMock;
  let service: ProjectAccessService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ProjectAccessService(asPrismaService(prisma));
    prisma.user.findUnique.mockResolvedValue({ accountKind: 'developer' });
  });

  it('lets a developer member through with their membership', async () => {
    prisma.projectMember.findUnique.mockResolvedValue(developerMembership);

    await expect(
      service.requireDeveloper('user-1', 'project-1'),
    ).resolves.toMatchObject({ id: 'membership-1', isAdmin: true });
    expect(prisma.projectMember.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId_userId: { projectId: 'project-1', userId: 'user-1' },
        },
      }),
    );
  });

  it('hides the project from a client member: the account decides, not the membership', async () => {
    prisma.projectMember.findUnique.mockResolvedValue(clientMembership);
    prisma.user.findUnique.mockResolvedValue({ accountKind: 'client' });

    await expect(
      service.requireDeveloper('user-1', 'project-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('uses the identical safe not-found response for missing and unauthorized access', async () => {
    prisma.projectMember.findUnique.mockResolvedValueOnce(null);
    const missing = await service
      .requireDeveloper('user-1', 'missing-project')
      .catch((error: unknown) => error);

    prisma.projectMember.findUnique.mockResolvedValueOnce(clientMembership);
    prisma.user.findUnique.mockResolvedValue({ accountKind: 'client' });
    const unauthorized = await service
      .requireDeveloper('user-1', 'project-1')
      .catch((error: unknown) => error);

    expect(missing).toBeInstanceOf(NotFoundException);
    expect(unauthorized).toBeInstanceOf(NotFoundException);
    expect((missing as NotFoundException).getResponse()).toEqual(
      (unauthorized as NotFoundException).getResponse(),
    );
  });

  it('allows any project member, client included, through requireMember', async () => {
    prisma.projectMember.findUnique.mockResolvedValue(clientMembership);

    await expect(service.requireMember('user-1', 'project-1')).resolves.toEqual(
      clientMembership,
    );
  });

  it('hides a project from a non-member', async () => {
    prisma.projectMember.findUnique.mockResolvedValue(null);

    await expect(
      service.requireMember('user-1', 'project-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
