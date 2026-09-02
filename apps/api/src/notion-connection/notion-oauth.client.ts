import { Injectable } from '@nestjs/common';

const NOTION_OAUTH_URL = 'https://api.notion.com/v1/oauth';

// What a refresh gives back. Narrowed here, at the boundary, and nowhere else.
export interface NotionTokenPair {
  accessToken: string;
  refreshToken: string | null;
}

// What one authorization gives back: the pair, scoped to the workspace the
// developer picked pages in.
export interface NotionTokenGrant extends NotionTokenPair {
  workspaceId: string;
  workspaceName: string | null;
}

// Notion's own error code travels with it (`invalid_grant` is the one that
// matters: the refresh token is expired or revoked, the developer must press
// the button again).
export class NotionOauthError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

interface NotionTokenResponse {
  access_token?: string;
  refresh_token?: string | null;
  workspace_id?: string;
  workspace_name?: string | null;
  error?: string;
  error_description?: string;
}

// Three plain HTTP calls, modelled on GithubOauthClient — no OAuth library.
// The authorize URL opens Notion's own page picker (`owner=user`): the pages
// the developer ticks there are the roots their projects may choose.
@Injectable()
export class NotionOauthClient {
  buildAuthorizeUrl(state: string): string {
    const url = new URL(`${NOTION_OAUTH_URL}/authorize`);
    url.searchParams.set('client_id', this.clientId());
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('owner', 'user');
    url.searchParams.set('redirect_uri', this.callbackUrl());
    url.searchParams.set('state', state);
    return url.toString();
  }

  async exchangeCode(code: string): Promise<NotionTokenGrant> {
    const { pair, data } = await this.token({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.callbackUrl(),
    });
    if (!data.workspace_id) {
      throw new NotionOauthError(
        'invalid_response',
        'Notion token response carries no workspace',
      );
    }
    return {
      ...pair,
      workspaceId: data.workspace_id,
      workspaceName: data.workspace_name ?? null,
    };
  }

  // Only the pair is read here: Notion documents the workspace fields on the
  // authorization response, not on the refresh one.
  async refresh(refreshToken: string): Promise<NotionTokenPair> {
    const { pair } = await this.token({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    return pair;
  }

  async revoke(token: string): Promise<void> {
    await fetch(`${NOTION_OAUTH_URL}/revoke`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ token }),
    });
  }

  private async token(
    body: Record<string, string>,
  ): Promise<{ pair: NotionTokenPair; data: NotionTokenResponse }> {
    const response = await fetch(`${NOTION_OAUTH_URL}/token`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as NotionTokenResponse;
    if (!response.ok || !data.access_token) {
      throw new NotionOauthError(
        data.error ?? 'invalid_response',
        data.error_description ?? 'Notion token request failed',
      );
    }
    return {
      pair: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
      },
      data,
    };
  }

  private headers(): Record<string, string> {
    const credentials = Buffer.from(
      `${this.clientId()}:${this.clientSecret()}`,
    ).toString('base64');
    return {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private clientId(): string {
    return process.env.NOTION_OAUTH_CLIENT_ID ?? '';
  }

  private clientSecret(): string {
    return process.env.NOTION_OAUTH_CLIENT_SECRET ?? '';
  }

  private callbackUrl(): string {
    return process.env.NOTION_OAUTH_CALLBACK_URL ?? '';
  }
}
