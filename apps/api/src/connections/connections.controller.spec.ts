import type { User } from '@prisma/client';
import type { Request, Response } from 'express';
import { AuthService } from '../auth/auth.service';
import { GithubConnectionService } from '../auth/github-connection.service';
import {
  oauthFlowCookieName,
  serializeOAuthFlowCookie,
} from '../auth/oauth-state-cookie';
import { SESSION_COOKIE_NAME } from '../auth/session-cookie';
import { NotionConnectionService } from '../notion-connection/notion-connection.service';
import {
  NotionOauthClient,
  NotionOauthError,
} from '../notion-connection/notion-oauth.client';
import { ConnectionsController } from './connections.controller';

const fakeUser = { id: 'user-1', accountKind: 'developer' } as User;
const NOTION_COOKIE = oauthFlowCookieName('notion');

const grant = {
  accessToken: 'ntn_access',
  refreshToken: 'ntn_refresh',
  workspaceId: 'ws-1',
  workspaceName: 'Acme',
};

function mockResponse() {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    redirect: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<Response, 'cookie' | 'clearCookie' | 'redirect'>
  >;
}

describe('ConnectionsController', () => {
  let githubConnections: jest.Mocked<
    Pick<GithubConnectionService, 'findForUser' | 'disconnect'>
  >;
  let notionConnections: jest.Mocked<
    Pick<
      NotionConnectionService,
      'findForUser' | 'disconnect' | 'saveFromAuthorization'
    >
  >;
  let notionOauth: jest.Mocked<
    Pick<NotionOauthClient, 'buildAuthorizeUrl' | 'exchangeCode'>
  >;
  let authService: jest.Mocked<Pick<AuthService, 'validateSession'>>;
  let controller: ConnectionsController;

  beforeEach(() => {
    process.env.WEB_ORIGIN = 'http://localhost:3000';
    githubConnections = { findForUser: jest.fn(), disconnect: jest.fn() };
    notionConnections = {
      findForUser: jest.fn(),
      disconnect: jest.fn(),
      saveFromAuthorization: jest.fn(),
    };
    notionOauth = {
      buildAuthorizeUrl: jest.fn().mockReturnValue('https://notion/authorize'),
      exchangeCode: jest.fn(),
    };
    authService = { validateSession: jest.fn() };
    controller = new ConnectionsController(
      githubConnections as unknown as GithubConnectionService,
      notionConnections as unknown as NotionConnectionService,
      notionOauth as unknown as NotionOauthClient,
      authService as unknown as AuthService,
    );
  });

  it('findAll returns the state of both connections for the current user', async () => {
    githubConnections.findForUser.mockResolvedValue({
      connected: true,
      needsReconnect: false,
    });
    notionConnections.findForUser.mockResolvedValue({
      connected: false,
      needsReconnect: false,
      workspaceName: null,
    });

    await expect(controller.findAll(fakeUser)).resolves.toEqual({
      github: { connected: true, needsReconnect: false },
      notion: { connected: false, needsReconnect: false, workspaceName: null },
    });
    expect(githubConnections.findForUser).toHaveBeenCalledWith('user-1');
    expect(notionConnections.findForUser).toHaveBeenCalledWith('user-1');
  });

  it('disconnectGithub cuts the current user’s connection', async () => {
    githubConnections.disconnect.mockResolvedValue(undefined);

    await controller.disconnectGithub(fakeUser);

    expect(githubConnections.disconnect).toHaveBeenCalledWith('user-1');
  });

  it('disconnectNotion cuts the current user’s connection', async () => {
    notionConnections.disconnect.mockResolvedValue(undefined);

    await controller.disconnectNotion(fakeUser);

    expect(notionConnections.disconnect).toHaveBeenCalledWith('user-1');
  });

  describe('notionStart', () => {
    const signedIn = {
      cookies: { [SESSION_COOKIE_NAME]: 'session-1' },
    } as unknown as Request;

    beforeEach(() => {
      authService.validateSession.mockResolvedValue(fakeUser);
    });

    it('sets the flow cookie with where to come back and opens Notion’s page picker', async () => {
      const res = mockResponse();

      await controller.notionStart(
        'fr',
        '/projects/p-1',
        signedIn,
        res as unknown as Response,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        NOTION_COOKIE,
        expect.any(String),
        expect.objectContaining({ path: '/connections/notion' }),
      );
      const [, cookieValue] = res.cookie.mock.calls[0] as [string, string];
      expect(JSON.parse(cookieValue)).toMatchObject({
        locale: 'fr',
        returnTo: '/projects/p-1',
      });
      const state = (JSON.parse(cookieValue) as { state: string }).state;
      expect(notionOauth.buildAuthorizeUrl).toHaveBeenCalledWith(state);
      expect(res.redirect).toHaveBeenCalledWith('https://notion/authorize');
    });

    it('refuses a return path outside the app and falls back to the profile', async () => {
      const res = mockResponse();

      await controller.notionStart(
        'en',
        'https://evil.example',
        signedIn,
        res as unknown as Response,
      );

      const [, cookieValue] = res.cookie.mock.calls[0] as [string, string];
      expect(JSON.parse(cookieValue)).not.toHaveProperty('returnTo');
    });

    it('sends a developer without a session to the login instead of to Notion', async () => {
      const res = mockResponse();
      authService.validateSession.mockResolvedValue(null);

      await controller.notionStart(
        'en',
        '/profile',
        { cookies: {} } as unknown as Request,
        res as unknown as Response,
      );

      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/en/login',
      );
    });
  });

  describe('notionCallback', () => {
    function request(cookies: Record<string, string>) {
      return { cookies } as unknown as Request;
    }
    const flowCookie = (returnTo?: string) =>
      serializeOAuthFlowCookie({ state: 'good-state', locale: 'fr', returnTo });

    beforeEach(() => {
      authService.validateSession.mockResolvedValue(fakeUser);
    });

    it('stores the grant on the account and sends the developer back where they were', async () => {
      const res = mockResponse();
      notionOauth.exchangeCode.mockResolvedValue(grant);

      await controller.notionCallback(
        'the-code',
        'good-state',
        undefined,
        request({
          [NOTION_COOKIE]: flowCookie('/projects/p-1'),
          [SESSION_COOKIE_NAME]: 'session-1',
        }),
        res as unknown as Response,
      );

      expect(res.clearCookie).toHaveBeenCalledWith(
        NOTION_COOKIE,
        expect.objectContaining({ path: '/connections/notion' }),
      );
      expect(notionOauth.exchangeCode).toHaveBeenCalledWith('the-code');
      expect(notionConnections.saveFromAuthorization).toHaveBeenCalledWith(
        'user-1',
        grant,
      );
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/fr/projects/p-1',
      );
    });

    it('returns to the profile when the flow carried no return path', async () => {
      const res = mockResponse();
      notionOauth.exchangeCode.mockResolvedValue(grant);

      await controller.notionCallback(
        'the-code',
        'good-state',
        undefined,
        request({
          [NOTION_COOKIE]: flowCookie(),
          [SESSION_COOKIE_NAME]: 'session-1',
        }),
        res as unknown as Response,
      );

      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/fr/profile',
      );
    });

    it('keeps a query the return path already carries', async () => {
      const res = mockResponse();

      await controller.notionCallback(
        undefined,
        'good-state',
        'access_denied',
        request({
          [NOTION_COOKIE]: flowCookie('/projects/p-1?tab=docs'),
          [SESSION_COOKIE_NAME]: 'session-1',
        }),
        res as unknown as Response,
      );

      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/fr/projects/p-1?tab=docs&notion_error=denied',
      );
    });

    it('stores nothing when the state does not match the flow cookie', async () => {
      const res = mockResponse();

      await controller.notionCallback(
        'the-code',
        'other-state',
        undefined,
        request({
          [NOTION_COOKIE]: flowCookie('/projects/p-1'),
          [SESSION_COOKIE_NAME]: 'session-1',
        }),
        res as unknown as Response,
      );

      expect(notionOauth.exchangeCode).not.toHaveBeenCalled();
      expect(notionConnections.saveFromAuthorization).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/fr/projects/p-1?notion_error=failed',
      );
    });

    it('stores nothing and names the refusal when the developer cancelled in Notion', async () => {
      const res = mockResponse();

      await controller.notionCallback(
        undefined,
        'good-state',
        'access_denied',
        request({
          [NOTION_COOKIE]: flowCookie(),
          [SESSION_COOKIE_NAME]: 'session-1',
        }),
        res as unknown as Response,
      );

      expect(notionOauth.exchangeCode).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/fr/profile?notion_error=denied',
      );
    });

    it('reports a failed exchange without storing anything', async () => {
      const res = mockResponse();
      notionOauth.exchangeCode.mockRejectedValue(
        new NotionOauthError('invalid_grant', 'bad code'),
      );

      await controller.notionCallback(
        'bad-code',
        'good-state',
        undefined,
        request({
          [NOTION_COOKIE]: flowCookie(),
          [SESSION_COOKIE_NAME]: 'session-1',
        }),
        res as unknown as Response,
      );

      expect(notionConnections.saveFromAuthorization).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/fr/profile?notion_error=failed',
      );
    });

    it('sends a developer whose session ended to the login, without exchanging the code', async () => {
      const res = mockResponse();
      authService.validateSession.mockResolvedValue(null);

      await controller.notionCallback(
        'the-code',
        'good-state',
        undefined,
        request({ [NOTION_COOKIE]: flowCookie() }),
        res as unknown as Response,
      );

      expect(notionOauth.exchangeCode).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/fr/login',
      );
    });
  });
});
