import { NotionOauthClient, NotionOauthError } from './notion-oauth.client';

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 400) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

const grantResponse = {
  access_token: 'ntn_access',
  refresh_token: 'ntn_refresh',
  token_type: 'bearer',
  bot_id: 'bot-1',
  workspace_id: 'ws-1',
  workspace_name: 'Acme',
  workspace_icon: null,
  owner: { type: 'user', user: { id: 'u-1' } },
  duplicated_template_id: null,
};

describe('NotionOauthClient', () => {
  let client: NotionOauthClient;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.NOTION_OAUTH_CLIENT_ID = 'client-id';
    process.env.NOTION_OAUTH_CLIENT_SECRET = 'client-secret';
    process.env.NOTION_OAUTH_CALLBACK_URL =
      'http://localhost:3001/connections/notion/callback';
    client = new NotionOauthClient();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it('builds the authorize URL that opens Notion’s page picker for the user', () => {
    const url = new URL(client.buildAuthorizeUrl('random-state'));

    expect(url.origin + url.pathname).toBe(
      'https://api.notion.com/v1/oauth/authorize',
    );
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('owner')).toBe('user');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3001/connections/notion/callback',
    );
    expect(url.searchParams.get('state')).toBe('random-state');
  });

  it('exchanges the code for a token pair and the workspace it belongs to', async () => {
    fetchMock.mockResolvedValue(jsonResponse(grantResponse));

    const grant = await client.exchangeCode('the-code');

    expect(grant).toEqual({
      accessToken: 'ntn_access',
      refreshToken: 'ntn_refresh',
      workspaceId: 'ws-1',
      workspaceName: 'Acme',
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.notion.com/v1/oauth/token');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from('client-id:client-secret').toString('base64')}`,
    );
    expect(JSON.parse(init.body as string)).toEqual({
      grant_type: 'authorization_code',
      code: 'the-code',
      redirect_uri: 'http://localhost:3001/connections/notion/callback',
    });
  });

  it('keeps a missing refresh token as null and a missing workspace name as null', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ...grantResponse,
        refresh_token: null,
        workspace_name: null,
      }),
    );

    const grant = await client.exchangeCode('the-code');

    expect(grant.refreshToken).toBeNull();
    expect(grant.workspaceName).toBeNull();
  });

  it('refreshes with the refresh_token grant and reads only the pair', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        access_token: 'ntn_access',
        refresh_token: 'ntn_refresh',
      }),
    );

    const pair = await client.refresh('ntn_old_refresh');

    expect(pair).toEqual({
      accessToken: 'ntn_access',
      refreshToken: 'ntn_refresh',
    });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      grant_type: 'refresh_token',
      refresh_token: 'ntn_old_refresh',
    });
  });

  it('raises a named error carrying Notion’s own code when the grant is refused', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: 'invalid_grant', error_description: 'expired' },
        false,
      ),
    );

    const error = await client.refresh('ntn_old').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotionOauthError);
    expect((error as NotionOauthError).code).toBe('invalid_grant');
  });

  it('raises when Notion answers without an access token or without a workspace', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    await expect(client.exchangeCode('bad')).rejects.toBeInstanceOf(
      NotionOauthError,
    );

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ...grantResponse, workspace_id: undefined }),
    );
    await expect(client.exchangeCode('bad')).rejects.toBeInstanceOf(
      NotionOauthError,
    );
  });

  it('revokes a token with the client credentials', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await client.revoke('ntn_access');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.notion.com/v1/oauth/revoke');
    expect(JSON.parse(init.body as string)).toEqual({ token: 'ntn_access' });
  });
});
