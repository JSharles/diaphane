import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BoardProvider } from '@prisma/client';
import { GithubConnectionService } from '../auth/github-connection.service';
import {
  asPrismaService,
  createPrismaMock,
  PrismaMock,
} from '../test/prisma-mock';
import { BoardConnectionsService } from './board-connections.service';
import { GithubProjectsClient } from './github-projects.client';

const developerMembership = {
  id: 'member-1',
  projectId: 'project-1',
  userId: 'user-1',
  user: { accountKind: 'developer' as const },
  isAdmin: true,
  createdAt: new Date(),
};

const clientMembership = {
  ...developerMembership,
  user: { accountKind: 'client' as const },
  isAdmin: false,
};

const availableBoard = {
  ownerLogin: 'acme',
  ownerType: 'Organization' as const,
  number: 3,
  title: 'Roadmap',
  url: 'https://github.com/orgs/acme/projects/3',
};

const storedConnection = {
  id: 'connection-1',
  projectId: 'project-1',
  connectedById: 'user-1',
  provider: 'github' as const,
  boardOwnerLogin: 'acme',
  boardOwnerType: 'Organization',
  boardNumber: 3,
  boardTitle: 'Roadmap',
  boardUrl: 'https://github.com/orgs/acme/projects/3',
  estimateUnit: 'days' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const selection = {
  ownerLogin: 'acme',
  ownerType: 'Organization' as const,
  number: 3,
};

describe('BoardConnectionsService', () => {
  let prisma: PrismaMock;
  let githubClient: jest.Mocked<
    Pick<GithubProjectsClient, 'listAccessibleBoards' | 'verifyBoardAccess'>
  >;
  let githubConnections: jest.Mocked<Pick<GithubConnectionService, 'getToken'>>;
  let service: BoardConnectionsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    githubClient = {
      listAccessibleBoards: jest.fn(),
      verifyBoardAccess: jest.fn(),
    };
    githubConnections = { getToken: jest.fn().mockResolvedValue('gho_dev') };
    service = new BoardConnectionsService(
      asPrismaService(prisma),
      githubClient as unknown as GithubProjectsClient,
      githubConnections as unknown as GithubConnectionService,
    );
  });

  describe('listBoards', () => {
    it('lists the boards the developer’s own GitHub connection can see', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(developerMembership);
      githubClient.listAccessibleBoards.mockResolvedValue([availableBoard]);

      await expect(service.listBoards('user-1', 'project-1')).resolves.toEqual([
        availableBoard,
      ]);
      expect(githubConnections.getToken).toHaveBeenCalledWith('user-1');
      expect(githubClient.listAccessibleBoards).toHaveBeenCalledWith('gho_dev');
    });

    it('hides the project from a client member and never asks for a token', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(clientMembership);

      await expect(
        service.listBoards('user-1', 'project-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(githubConnections.getToken).not.toHaveBeenCalled();
    });

    it('hides the project from a non-member', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(null);

      await expect(
        service.listBoards('user-1', 'project-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lets a missing GitHub connection surface as the clean 400 the service raises', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(developerMembership);
      githubConnections.getToken.mockRejectedValue(
        new BadRequestException({ code: 'GITHUB_NOT_CONNECTED' }),
      );

      await expect(
        service.listBoards('user-1', 'project-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(githubClient.listAccessibleBoards).not.toHaveBeenCalled();
    });

    it('turns a GitHub failure into a clean 400', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(developerMembership);
      githubClient.listAccessibleBoards.mockRejectedValue(
        new Error('GitHub API request failed with status 401'),
      );

      await expect(
        service.listBoards('user-1', 'project-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('connect', () => {
    it('verifies access with the developer’s token, then stores the choice with no token and the chooser', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(developerMembership);
      githubClient.verifyBoardAccess.mockResolvedValue(availableBoard);
      prisma.boardConnection.upsert.mockResolvedValue(storedConnection);

      const result = await service.connect('user-1', 'project-1', {
        ...selection,
        estimateUnit: 'hours',
      });

      expect(githubClient.verifyBoardAccess).toHaveBeenCalledWith(
        'gho_dev',
        'acme',
        'Organization',
        3,
      );
      const upsert = prisma.boardConnection.upsert.mock.calls[0][0] as {
        where: unknown;
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      };
      expect(upsert.where).toEqual({ projectId: 'project-1' });
      expect(upsert.create).toMatchObject({
        projectId: 'project-1',
        connectedById: 'user-1',
        provider: BoardProvider.github,
        boardTitle: 'Roadmap',
        estimateUnit: 'hours',
      });
      expect(upsert.create).not.toHaveProperty('encryptedToken');
      expect(result).toEqual({
        provider: 'github',
        boardOwnerLogin: 'acme',
        boardOwnerType: 'Organization',
        boardNumber: 3,
        boardTitle: 'Roadmap',
        boardUrl: 'https://github.com/orgs/acme/projects/3',
        estimateUnit: 'days',
        needsReconnect: false,
      });
    });

    it('defaults the estimate unit to days', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(developerMembership);
      githubClient.verifyBoardAccess.mockResolvedValue(availableBoard);
      prisma.boardConnection.upsert.mockResolvedValue(storedConnection);

      await service.connect('user-1', 'project-1', selection);

      const upsert = prisma.boardConnection.upsert.mock.calls[0][0] as {
        create: Record<string, unknown>;
      };
      expect(upsert.create.estimateUnit).toBe('days');
    });

    it('refuses a board the developer cannot see', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(developerMembership);
      githubClient.verifyBoardAccess.mockResolvedValue(null);

      await expect(
        service.connect('user-1', 'project-1', selection),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.boardConnection.upsert).not.toHaveBeenCalled();
    });

    it('hides the project from a client member and never calls GitHub', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(clientMembership);

      await expect(
        service.connect('user-1', 'project-1', selection),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(githubClient.verifyBoardAccess).not.toHaveBeenCalled();
    });
  });

  describe('findForProject', () => {
    it('returns null when no board was chosen', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(developerMembership);
      prisma.boardConnection.findUnique.mockResolvedValue(null);

      await expect(
        service.findForProject('user-1', 'project-1'),
      ).resolves.toBeNull();
    });

    it('reads as live while the chooser’s GitHub connection is fine', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(developerMembership);
      prisma.boardConnection.findUnique.mockResolvedValue({
        ...storedConnection,
        connectedBy: { githubConnection: { needsReconnect: false } },
      });

      const result = await service.findForProject('user-1', 'project-1');

      expect(result).toMatchObject({
        boardTitle: 'Roadmap',
        needsReconnect: false,
      });
      expect(result).not.toHaveProperty('encryptedToken');
    });

    it('says reconnect when the chooser’s token was revoked', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(developerMembership);
      prisma.boardConnection.findUnique.mockResolvedValue({
        ...storedConnection,
        connectedBy: { githubConnection: { needsReconnect: true } },
      });

      await expect(
        service.findForProject('user-1', 'project-1'),
      ).resolves.toMatchObject({ needsReconnect: true });
    });

    it('says reconnect when the chooser cut their GitHub connection', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(developerMembership);
      prisma.boardConnection.findUnique.mockResolvedValue({
        ...storedConnection,
        connectedBy: { githubConnection: null },
      });

      await expect(
        service.findForProject('user-1', 'project-1'),
      ).resolves.toMatchObject({ needsReconnect: true });
    });

    it('hides the project from a client member', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(clientMembership);

      await expect(
        service.findForProject('user-1', 'project-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateEstimateUnit', () => {
    it('changes how the board’s Estimate is read without touching the board choice or calling GitHub', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(developerMembership);
      prisma.boardConnection.findUnique.mockResolvedValue({
        ...storedConnection,
        connectedBy: { githubConnection: { needsReconnect: false } },
      });
      prisma.boardConnection.update.mockResolvedValue({
        ...storedConnection,
        estimateUnit: 'hours',
      });

      const result = await service.updateEstimateUnit(
        'user-1',
        'project-1',
        'hours',
      );

      expect(prisma.boardConnection.update).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        data: { estimateUnit: 'hours' },
      });
      expect(githubClient.verifyBoardAccess).not.toHaveBeenCalled();
      expect(githubConnections.getToken).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        boardTitle: 'Roadmap',
        estimateUnit: 'hours',
        needsReconnect: false,
      });
    });

    it('keeps saying reconnect when the chooser’s GitHub connection is cut: the unit is stored, the board still is not read', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(developerMembership);
      prisma.boardConnection.findUnique.mockResolvedValue({
        ...storedConnection,
        connectedBy: { githubConnection: null },
      });
      prisma.boardConnection.update.mockResolvedValue({
        ...storedConnection,
        estimateUnit: 'hours',
      });

      const result = await service.updateEstimateUnit(
        'user-1',
        'project-1',
        'hours',
      );

      expect(result.needsReconnect).toBe(true);
    });

    it('is a 404 when no board is connected', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(developerMembership);
      prisma.boardConnection.findUnique.mockResolvedValue(null);

      await expect(
        service.updateEstimateUnit('user-1', 'project-1', 'hours'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.boardConnection.update).not.toHaveBeenCalled();
    });

    it('hides the project from a client member', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(clientMembership);

      await expect(
        service.updateEstimateUnit('user-1', 'project-1', 'hours'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.boardConnection.update).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('deletes the choice, and is a no-op when there is none', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(developerMembership);
      prisma.boardConnection.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        service.disconnect('user-1', 'project-1'),
      ).resolves.toBeUndefined();
      expect(prisma.boardConnection.deleteMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
      });
    });

    it('hides the project from a client member', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(clientMembership);

      await expect(
        service.disconnect('user-1', 'project-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.boardConnection.deleteMany).not.toHaveBeenCalled();
    });
  });
});
