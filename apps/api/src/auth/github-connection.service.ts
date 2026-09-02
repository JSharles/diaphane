import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decryptToken, encryptToken } from './token-encryption';

export interface GithubConnectionState {
  connected: boolean;
  // The sweep found the token revoked; logging in again brings a fresh one.
  needsReconnect: boolean;
}

export const GITHUB_NOT_CONNECTED = {
  code: 'GITHUB_NOT_CONNECTED',
  message: 'Connect GitHub from your profile first.',
} as const;

// The developer's GitHub authorization: taken at login, kept encrypted on
// the account, read by every board they chose (docs/PRODUCT.md « Connexions
// et choix »). The token never leaves the API.
@Injectable()
export class GithubConnectionService {
  constructor(private readonly prisma: PrismaService) {}

  // Every login brings a fresh token, so a revoked one is healed by the one
  // gesture the developer already knows.
  async saveFromLogin(userId: string, accessToken: string): Promise<void> {
    const data = {
      encryptedToken: encryptToken(accessToken),
      needsReconnect: false,
    };
    await this.prisma.githubConnection.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  async findForUser(userId: string): Promise<GithubConnectionState> {
    const connection = await this.prisma.githubConnection.findUnique({
      where: { userId },
      select: { needsReconnect: true },
    });
    return {
      connected: connection !== null,
      needsReconnect: connection?.needsReconnect ?? false,
    };
  }

  // Throws a clean 400 the frontend can name, never a raw "no token".
  async getToken(userId: string): Promise<string> {
    const connection = await this.prisma.githubConnection.findUnique({
      where: { userId },
      select: { encryptedToken: true },
    });
    if (!connection) {
      throw new BadRequestException(GITHUB_NOT_CONNECTED);
    }
    return decryptToken(connection.encryptedToken);
  }

  // Idempotent: disconnecting twice is not an error. The boards the
  // developer chose keep their rows and simply stop being read until the
  // next login.
  async disconnect(userId: string): Promise<void> {
    await this.prisma.githubConnection.deleteMany({ where: { userId } });
  }
}
