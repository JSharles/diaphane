import { BadRequestException } from '@nestjs/common';
import { decryptToken, encryptToken } from '../auth/token-encryption';
import {
  asPrismaService,
  createPrismaMock,
  PrismaMock,
} from '../test/prisma-mock';
import { NotionConnectionService } from './notion-connection.service';
import { NotionOauthClient, NotionOauthError } from './notion-oauth.client';
import { NotionAccessError } from './notion.client';

const ORIGINAL_ENV = process.env.BOARD_CONNECTION_ENCRYPTION_KEY;

const grant = {
  accessToken: 'ntn_access',
  refreshToken: 'ntn_refresh',
  workspaceId: 'ws-1',
  workspaceName: 'Acme',
};

describe('NotionConnectionService', () => {
  let prisma: PrismaMock;
  let oauth: jest.Mocked<Pick<NotionOauthClient, 'refresh' | 'revoke'>>;
  let service: NotionConnectionService;

  beforeEach(() => {
    process.env.BOARD_CONNECTION_ENCRYPTION_KEY =
      '0000000000000000000000000000000000000000000000000000000000000000';
    prisma = createPrismaMock();
    oauth = { refresh: jest.fn(), revoke: jest.fn() };
    service = new NotionConnectionService(
      asPrismaService(prisma),
      oauth as unknown as NotionOauthClient,
    );
  });

  afterAll(() => {
    process.env.BOARD_CONNECTION_ENCRYPTION_KEY = ORIGINAL_ENV;
  });

  it('saveFromAuthorization stores the pair encrypted, on the account, and clears any reconnect flag', async () => {
    await service.saveFromAuthorization('user-1', grant);

    const call = prisma.notionConnection.upsert.mock.calls[0][0] as {
      where: unknown;
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(call.where).toEqual({ userId: 'user-1' });
    expect(call.create.userId).toBe('user-1');
    expect(call.create.workspaceId).toBe('ws-1');
    expect(call.create.workspaceName).toBe('Acme');
    expect(call.create.needsReconnect).toBe(false);
    expect(call.update.needsReconnect).toBe(false);
    expect(call.create.encryptedAccessToken).not.toBe('ntn_access');
    expect(decryptToken(call.create.encryptedAccessToken as string)).toBe(
      'ntn_access',
    );
    expect(decryptToken(call.create.encryptedRefreshToken as string)).toBe(
      'ntn_refresh',
    );
  });

  it('saveFromAuthorization keeps a null refresh token as null', async () => {
    await service.saveFromAuthorization('user-1', {
      ...grant,
      refreshToken: null,
    });

    const call = prisma.notionConnection.upsert.mock.calls[0][0] as {
      create: { encryptedRefreshToken: string | null };
    };
    expect(call.create.encryptedRefreshToken).toBeNull();
  });

  it('findForUser reports not connected when there is no row', async () => {
    prisma.notionConnection.findUnique.mockResolvedValue(null);

    await expect(service.findForUser('user-1')).resolves.toEqual({
      connected: false,
      needsReconnect: false,
      workspaceName: null,
    });
  });

  it('findForUser reports the workspace and the reconnect flag when connected', async () => {
    prisma.notionConnection.findUnique.mockResolvedValue({
      needsReconnect: true,
      workspaceName: 'Acme',
    });

    await expect(service.findForUser('user-1')).resolves.toEqual({
      connected: true,
      needsReconnect: true,
      workspaceName: 'Acme',
    });
  });

  describe('withToken', () => {
    function connected(overrides: Record<string, unknown> = {}) {
      prisma.notionConnection.findUnique.mockResolvedValue({
        encryptedAccessToken: encryptToken('ntn_stored'),
        encryptedRefreshToken: encryptToken('ntn_refresh'),
        needsReconnect: false,
        ...overrides,
      });
    }

    it('runs the call with the stored access token', async () => {
      connected();
      const call = jest.fn().mockResolvedValue('page');

      await expect(service.withToken('user-1', call)).resolves.toBe('page');
      expect(call).toHaveBeenCalledWith('ntn_stored');
      expect(oauth.refresh).not.toHaveBeenCalled();
    });

    it('refreshes the pair and retries once when Notion answers 401', async () => {
      connected();
      oauth.refresh.mockResolvedValue({
        accessToken: 'ntn_fresh',
        refreshToken: 'ntn_refresh_2',
      });
      const call = jest
        .fn()
        .mockRejectedValueOnce(new NotionAccessError('unauthorized', 401))
        .mockResolvedValueOnce('page');

      await expect(service.withToken('user-1', call)).resolves.toBe('page');

      expect(oauth.refresh).toHaveBeenCalledWith('ntn_refresh');
      expect(call).toHaveBeenLastCalledWith('ntn_fresh');
      const update = prisma.notionConnection.update.mock.calls[0][0] as {
        where: unknown;
        data: { encryptedAccessToken: string; needsReconnect: boolean };
      };
      expect(update.where).toEqual({ userId: 'user-1' });
      expect(decryptToken(update.data.encryptedAccessToken)).toBe('ntn_fresh');
    });

    it('marks the connection to reconnect and raises a named 400 when the refresh is refused', async () => {
      connected();
      oauth.refresh.mockRejectedValue(
        new NotionOauthError('invalid_grant', 'revoked'),
      );
      const call = jest
        .fn()
        .mockRejectedValue(new NotionAccessError('unauthorized', 401));

      const error = await service
        .withToken('user-1', call)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: 'NOTION_NEEDS_RECONNECT',
      });
      expect(prisma.notionConnection.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { needsReconnect: true },
      });
      expect(call).toHaveBeenCalledTimes(1);
    });

    it('does not refresh when there is no refresh token: marks to reconnect instead', async () => {
      connected({ encryptedRefreshToken: null });
      const call = jest
        .fn()
        .mockRejectedValue(new NotionAccessError('unauthorized', 401));

      await expect(service.withToken('user-1', call)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(oauth.refresh).not.toHaveBeenCalled();
      expect(prisma.notionConnection.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { needsReconnect: true },
      });
    });

    it('uses a pair another call already renewed instead of refreshing again', async () => {
      prisma.notionConnection.findUnique
        .mockResolvedValueOnce({
          encryptedAccessToken: encryptToken('ntn_stale'),
          encryptedRefreshToken: encryptToken('ntn_refresh'),
          needsReconnect: false,
        })
        .mockResolvedValueOnce({
          encryptedAccessToken: encryptToken('ntn_renewed'),
          encryptedRefreshToken: encryptToken('ntn_refresh_2'),
          needsReconnect: false,
        });
      const call = jest
        .fn()
        .mockRejectedValueOnce(new NotionAccessError('unauthorized', 401))
        .mockResolvedValueOnce('page');

      await expect(service.withToken('user-1', call)).resolves.toBe('page');

      expect(oauth.refresh).not.toHaveBeenCalled();
      expect(call).toHaveBeenLastCalledWith('ntn_renewed');
    });

    it('lets a passing refresh fault through without flagging the connection', async () => {
      connected();
      oauth.refresh.mockRejectedValue(new Error('network'));
      const call = jest
        .fn()
        .mockRejectedValue(new NotionAccessError('unauthorized', 401));

      await expect(service.withToken('user-1', call)).rejects.toThrow(
        'network',
      );
      expect(prisma.notionConnection.update).not.toHaveBeenCalled();
    });

    it('lets any other Notion error through untouched', async () => {
      connected();
      const call = jest
        .fn()
        .mockRejectedValue(new NotionAccessError('not found', 404));

      await expect(service.withToken('user-1', call)).rejects.toBeInstanceOf(
        NotionAccessError,
      );
      expect(oauth.refresh).not.toHaveBeenCalled();
    });

    it('raises a named 400 when Notion is not connected', async () => {
      prisma.notionConnection.findUnique.mockResolvedValue(null);

      const error = await service
        .withToken('user-1', jest.fn())
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: 'NOTION_NOT_CONNECTED',
      });
    });

    it('raises the reconnect 400 without calling Notion when already flagged', async () => {
      connected({ needsReconnect: true });
      const call = jest.fn();

      const error = await service
        .withToken('user-1', call)
        .catch((e: unknown) => e);

      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: 'NOTION_NEEDS_RECONNECT',
      });
      expect(call).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('revokes the token at Notion, then deletes the row', async () => {
      prisma.notionConnection.findUnique.mockResolvedValue({
        encryptedAccessToken: encryptToken('ntn_stored'),
      });
      oauth.revoke.mockResolvedValue(undefined);
      prisma.notionConnection.deleteMany.mockResolvedValue({ count: 1 });

      await service.disconnect('user-1');

      expect(oauth.revoke).toHaveBeenCalledWith('ntn_stored');
      expect(prisma.notionConnection.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('still cuts the connection when Notion refuses the revocation', async () => {
      prisma.notionConnection.findUnique.mockResolvedValue({
        encryptedAccessToken: encryptToken('ntn_stored'),
      });
      oauth.revoke.mockRejectedValue(new Error('network'));
      prisma.notionConnection.deleteMany.mockResolvedValue({ count: 1 });

      await expect(service.disconnect('user-1')).resolves.toBeUndefined();
      expect(prisma.notionConnection.deleteMany).toHaveBeenCalled();
    });

    it('tolerates there being nothing to disconnect', async () => {
      prisma.notionConnection.findUnique.mockResolvedValue(null);

      await expect(service.disconnect('user-1')).resolves.toBeUndefined();
      expect(oauth.revoke).not.toHaveBeenCalled();
    });
  });
});
