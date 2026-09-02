import { BadRequestException, Injectable } from '@nestjs/common';
import { decryptToken, encryptToken } from '../auth/token-encryption';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotionOauthClient,
  NotionOauthError,
  type NotionTokenGrant,
  type NotionTokenPair,
} from './notion-oauth.client';
import { NotionAccessError } from './notion.client';

export interface NotionConnectionState {
  connected: boolean;
  // Notion refused to refresh the pair; pressing the button again heals it.
  needsReconnect: boolean;
  workspaceName: string | null;
}

export const NOTION_NOT_CONNECTED = {
  code: 'NOTION_NOT_CONNECTED',
  message: 'Connect Notion from your profile first.',
} as const;

export const NOTION_NEEDS_RECONNECT = {
  code: 'NOTION_NEEDS_RECONNECT',
  message: 'Notion no longer accepts this connection. Connect Notion again.',
} as const;

// The developer's Notion authorization: taken with the « Connecter Notion »
// button, kept encrypted on the account, read by every project that chose
// roots in it (docs/PRODUCT.md « Connexions et choix »). Tokens never leave
// the API: callers hand over the call they want made, not a token they keep.
@Injectable()
export class NotionConnectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oauth: NotionOauthClient,
  ) {}

  // Every authorization mints a fresh pair (Notion changelog, 2026-06-08),
  // so pressing the button again — to tick more pages, or after a
  // revocation — always replaces what was stored.
  async saveFromAuthorization(
    userId: string,
    grant: NotionTokenGrant,
  ): Promise<void> {
    const data = {
      ...this.encryptedPair(grant),
      workspaceId: grant.workspaceId,
      workspaceName: grant.workspaceName,
      needsReconnect: false,
    };
    await this.prisma.notionConnection.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  async findForUser(userId: string): Promise<NotionConnectionState> {
    const connection = await this.prisma.notionConnection.findUnique({
      where: { userId },
      select: { needsReconnect: true, workspaceName: true },
    });
    return {
      connected: connection !== null,
      needsReconnect: connection?.needsReconnect ?? false,
      workspaceName: connection?.workspaceName ?? null,
    };
  }

  // Refresh on use: Notion documents no lifetime for the access token, only
  // a 401 once it stops working. The call runs with the stored token; a 401
  // refreshes the pair and retries once; a refresh Notion refuses
  // (`invalid_grant`: expired or revoked) flags the row and raises a 400 the
  // frontend can name. Any other refresh failure is a passing fault, not a
  // revocation, and reaches the caller as is.
  async withToken<T>(
    userId: string,
    call: (accessToken: string) => Promise<T>,
  ): Promise<T> {
    const stored = await this.storedTokens(userId);

    try {
      return await call(stored.accessToken);
    } catch (error) {
      if (!(error instanceof NotionAccessError) || error.status !== 401) {
        throw error;
      }
    }

    // Notion rotates the refresh token, so two calls refreshing at once
    // would see the second refused and a live connection flagged. Re-read
    // first: a pair another call already renewed is used, not refreshed.
    const current = await this.storedTokens(userId);
    if (current.accessToken !== stored.accessToken) {
      return call(current.accessToken);
    }

    let pair: NotionTokenPair;
    try {
      if (!current.refreshToken) {
        throw new NotionOauthError('invalid_grant', 'No refresh token');
      }
      pair = await this.oauth.refresh(current.refreshToken);
    } catch (error) {
      if (error instanceof NotionOauthError && error.code === 'invalid_grant') {
        await this.prisma.notionConnection.update({
          where: { userId },
          data: { needsReconnect: true },
        });
        throw new BadRequestException(NOTION_NEEDS_RECONNECT);
      }
      throw error;
    }

    await this.prisma.notionConnection.update({
      where: { userId },
      data: { ...this.encryptedPair(pair), needsReconnect: false },
    });
    return call(pair.accessToken);
  }

  private async storedTokens(
    userId: string,
  ): Promise<{ accessToken: string; refreshToken: string | null }> {
    const connection = await this.prisma.notionConnection.findUnique({
      where: { userId },
      select: {
        encryptedAccessToken: true,
        encryptedRefreshToken: true,
        needsReconnect: true,
      },
    });
    if (!connection) {
      throw new BadRequestException(NOTION_NOT_CONNECTED);
    }
    if (connection.needsReconnect) {
      throw new BadRequestException(NOTION_NEEDS_RECONNECT);
    }
    return {
      accessToken: decryptToken(connection.encryptedAccessToken),
      refreshToken: connection.encryptedRefreshToken
        ? decryptToken(connection.encryptedRefreshToken)
        : null,
    };
  }

  // Revocation at Notion is best effort: the row goes either way, and
  // disconnecting twice is not an error. Documents already taken from Notion
  // keep their snapshots.
  async disconnect(userId: string): Promise<void> {
    const connection = await this.prisma.notionConnection.findUnique({
      where: { userId },
      select: { encryptedAccessToken: true },
    });
    if (connection) {
      await this.oauth
        .revoke(decryptToken(connection.encryptedAccessToken))
        .catch(() => undefined);
    }
    await this.prisma.notionConnection.deleteMany({ where: { userId } });
  }

  private encryptedPair(pair: NotionTokenPair) {
    return {
      encryptedAccessToken: encryptToken(pair.accessToken),
      encryptedRefreshToken: pair.refreshToken
        ? encryptToken(pair.refreshToken)
        : null,
    };
  }
}
