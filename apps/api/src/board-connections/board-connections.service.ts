import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BoardProvider, EstimateUnit, ProjectMember } from '@prisma/client';
import { GithubConnectionService } from '../auth/github-connection.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AvailableBoard,
  GithubOwnerType,
  GithubProjectsClient,
} from './github-projects.client';

export interface BoardConnectionDetails {
  provider: BoardProvider;
  boardOwnerLogin: string;
  boardOwnerType: string;
  boardNumber: number;
  boardTitle: string;
  boardUrl: string;
  estimateUnit: EstimateUnit;
  // The developer who chose this board has no usable GitHub connection any
  // more (cut, or revoked): the board is named but no longer read.
  needsReconnect: boolean;
}

export interface BoardSelection {
  ownerLogin: string;
  ownerType: GithubOwnerType;
  number: number;
  estimateUnit?: EstimateUnit;
}

@Injectable()
export class BoardConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly githubClient: GithubProjectsClient,
    private readonly githubConnections: GithubConnectionService,
  ) {}

  // What the developer's GitHub connection can see, for them to pick from.
  // Nothing is persisted.
  async listBoards(
    userId: string,
    projectId: string,
  ): Promise<AvailableBoard[]> {
    await this.assertIsDeveloper(userId, projectId);
    const token = await this.githubConnections.getToken(userId);

    return this.callGithub(() => this.githubClient.listAccessibleBoards(token));
  }

  // Re-validates access even though listBoards() already showed this board:
  // the two calls are a real round-trip apart. Upserts on projectId so
  // choosing a new board always replaces the old one.
  async connect(
    userId: string,
    projectId: string,
    selection: BoardSelection,
  ): Promise<BoardConnectionDetails> {
    await this.assertIsDeveloper(userId, projectId);
    const token = await this.githubConnections.getToken(userId);

    const board = await this.callGithub(() =>
      this.githubClient.verifyBoardAccess(
        token,
        selection.ownerLogin,
        selection.ownerType,
        selection.number,
      ),
    );

    if (!board) {
      throw new ForbiddenException('You do not have access to this board');
    }

    const boardData = {
      connectedById: userId,
      provider: BoardProvider.github,
      boardOwnerLogin: board.ownerLogin,
      boardOwnerType: board.ownerType,
      boardNumber: board.number,
      boardTitle: board.title,
      boardUrl: board.url,
      estimateUnit: selection.estimateUnit ?? EstimateUnit.days,
    };

    const connection = await this.prisma.boardConnection.upsert({
      where: { projectId },
      create: { projectId, ...boardData },
      update: boardData,
    });

    return { ...this.toDetails(connection), needsReconnect: false };
  }

  async findForProject(
    userId: string,
    projectId: string,
  ): Promise<BoardConnectionDetails | null> {
    await this.assertIsDeveloper(userId, projectId);

    const connection = await this.prisma.boardConnection.findUnique({
      where: { projectId },
      include: {
        connectedBy: {
          select: { githubConnection: { select: { needsReconnect: true } } },
        },
      },
    });
    if (!connection) return null;

    const github = connection.connectedBy.githubConnection;
    return {
      ...this.toDetails(connection),
      needsReconnect: !github || github.needsReconnect,
    };
  }

  // Idempotent from the caller's point of view: disconnecting when nothing
  // is connected is not an error.
  async disconnect(userId: string, projectId: string): Promise<void> {
    await this.assertIsDeveloper(userId, projectId);

    await this.prisma.boardConnection.deleteMany({ where: { projectId } });
  }

  // Wraps every GithubProjectsClient call: a revoked token or a GitHub
  // outage must surface as a clean 4xx the caller can act on, never the
  // client's raw Error, which NestJS would turn into an opaque 500.
  private async callGithub<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch {
      throw new BadRequestException(
        'Unable to read your boards from GitHub. Reconnect GitHub from your profile and try again.',
      );
    }
  }

  private toDetails(
    connection: Omit<BoardConnectionDetails, 'needsReconnect'>,
  ): Omit<BoardConnectionDetails, 'needsReconnect'> {
    return {
      provider: connection.provider,
      boardOwnerLogin: connection.boardOwnerLogin,
      boardOwnerType: connection.boardOwnerType,
      boardNumber: connection.boardNumber,
      boardTitle: connection.boardTitle,
      boardUrl: connection.boardUrl,
      estimateUnit: connection.estimateUnit,
    };
  }

  // Mirrors ProjectAccessService.requireDeveloper. A client member gets the
  // exact same response as a non-member, never a distinct "forbidden" that
  // would confirm a connection exists.
  async assertIsDeveloper(
    userId: string,
    projectId: string,
  ): Promise<ProjectMember> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      include: { user: { select: { accountKind: true } } },
    });

    if (!membership || membership.user.accountKind !== 'developer') {
      throw new NotFoundException('Project not found');
    }

    return membership;
  }
}
