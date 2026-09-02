import { BadRequestException } from '@nestjs/common';
import {
  asPrismaService,
  createPrismaMock,
  PrismaMock,
} from '../test/prisma-mock';
import { GithubConnectionService } from './github-connection.service';
import { decryptToken, encryptToken } from './token-encryption';

const ORIGINAL_ENV = process.env.BOARD_CONNECTION_ENCRYPTION_KEY;

describe('GithubConnectionService', () => {
  let prisma: PrismaMock;
  let service: GithubConnectionService;

  beforeEach(() => {
    process.env.BOARD_CONNECTION_ENCRYPTION_KEY =
      '0000000000000000000000000000000000000000000000000000000000000000';
    prisma = createPrismaMock();
    service = new GithubConnectionService(asPrismaService(prisma));
  });

  afterAll(() => {
    process.env.BOARD_CONNECTION_ENCRYPTION_KEY = ORIGINAL_ENV;
  });

  it('saveFromLogin stores the token encrypted and clears any reconnect flag', async () => {
    await service.saveFromLogin('user-1', 'gho_fresh');

    const call = prisma.githubConnection.upsert.mock.calls[0][0] as {
      where: unknown;
      create: {
        userId: string;
        encryptedToken: string;
        needsReconnect: boolean;
      };
      update: { encryptedToken: string; needsReconnect: boolean };
    };
    expect(call.where).toEqual({ userId: 'user-1' });
    expect(call.create.userId).toBe('user-1');
    expect(call.create.needsReconnect).toBe(false);
    expect(call.update.needsReconnect).toBe(false);
    expect(call.create.encryptedToken).not.toBe('gho_fresh');
    expect(decryptToken(call.create.encryptedToken)).toBe('gho_fresh');
  });

  it('findForUser reports not connected when there is no row', async () => {
    prisma.githubConnection.findUnique.mockResolvedValue(null);

    await expect(service.findForUser('user-1')).resolves.toEqual({
      connected: false,
      needsReconnect: false,
    });
  });

  it('findForUser reports the reconnect flag when connected', async () => {
    prisma.githubConnection.findUnique.mockResolvedValue({
      needsReconnect: true,
    });

    await expect(service.findForUser('user-1')).resolves.toEqual({
      connected: true,
      needsReconnect: true,
    });
  });

  it('getToken decrypts the stored token', async () => {
    prisma.githubConnection.findUnique.mockResolvedValue({
      encryptedToken: encryptToken('gho_stored'),
    });

    await expect(service.getToken('user-1')).resolves.toBe('gho_stored');
  });

  it('getToken raises a named 400 when GitHub is not connected', async () => {
    prisma.githubConnection.findUnique.mockResolvedValue(null);

    const error = await service.getToken('user-1').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: 'GITHUB_NOT_CONNECTED',
    });
  });

  it('disconnect deletes the row and tolerates there being none', async () => {
    prisma.githubConnection.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.disconnect('user-1')).resolves.toBeUndefined();
    expect(prisma.githubConnection.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
  });
});
