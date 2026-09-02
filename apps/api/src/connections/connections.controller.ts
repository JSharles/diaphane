import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { GithubConnectionService } from '../auth/github-connection.service';
import { DEFAULT_LOCALE, resolveLocale } from '../auth/locale';
import {
  oauthFlowCookieName,
  oauthFlowCookieOptions,
  parseOAuthFlowCookie,
  safeReturnTo,
  serializeOAuthFlowCookie,
} from '../auth/oauth-state-cookie';
import { SESSION_COOKIE_NAME } from '../auth/session-cookie';
import { SessionGuard } from '../auth/session.guard';
import { NotionConnectionService } from '../notion-connection/notion-connection.service';
import { NotionOauthClient } from '../notion-connection/notion-oauth.client';

const NOTION = 'notion' as const;
const DEFAULT_RETURN_TO = '/profile';

// The developer's connections, as the profile shows them. Connecting GitHub
// is the login itself (GET /auth/github); connecting Notion is the button
// below, which opens Notion's own page picker and comes back here.
@Controller('connections')
export class ConnectionsController {
  constructor(
    private readonly githubConnections: GithubConnectionService,
    private readonly notionConnections: NotionConnectionService,
    private readonly notionOauth: NotionOauthClient,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @UseGuards(SessionGuard)
  async findAll(@CurrentUser() user: User) {
    const [github, notion] = await Promise.all([
      this.githubConnections.findForUser(user.id),
      this.notionConnections.findForUser(user.id),
    ]);
    return { github, notion };
  }

  @Delete('github')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnectGithub(@CurrentUser() user: User) {
    return this.githubConnections.disconnect(user.id);
  }

  @Delete('notion')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnectNotion(@CurrentUser() user: User) {
    return this.notionConnections.disconnect(user.id);
  }

  // « Connecter Notion »: the same button connects, reconnects, and ticks
  // more pages — every authorization replaces the stored pair. `returnTo`
  // is the in-app path the button lives on, so the developer lands back on
  // the card they pressed. Start and callback are browser navigations, not
  // fetches: a session that ended is sent to the login rather than shown a
  // 401 body, which is why neither is guarded.
  @Get('notion')
  async notionStart(
    @Query('locale') locale: string | undefined,
    @Query('returnTo') returnTo: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const resolvedLocale = resolveLocale(locale);
    if (!(await this.currentUser(req))) {
      return res.redirect(this.webUrl(resolvedLocale, '/login'));
    }

    const state = randomBytes(16).toString('hex');
    res.cookie(
      oauthFlowCookieName(NOTION),
      serializeOAuthFlowCookie({
        state,
        locale: resolvedLocale,
        returnTo: safeReturnTo(returnTo),
      }),
      oauthFlowCookieOptions(NOTION),
    );
    return res.redirect(this.notionOauth.buildAuthorizeUrl(state));
  }

  @Get('notion/callback')
  async notionCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') notionError: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
    const oauthFlow = parseOAuthFlowCookie(
      cookies[oauthFlowCookieName(NOTION)],
    );
    res.clearCookie(
      oauthFlowCookieName(NOTION),
      oauthFlowCookieOptions(NOTION),
    );
    const locale = oauthFlow?.locale ?? DEFAULT_LOCALE;
    const returnTo = oauthFlow?.returnTo ?? DEFAULT_RETURN_TO;

    const user = await this.currentUser(req);
    if (!user) {
      return res.redirect(this.webUrl(locale, '/login'));
    }

    // No flow cookie, or a state that doesn't match what we generated, means
    // this callback is not trusted: no token exchange, nothing stored.
    if (!oauthFlow || oauthFlow.state !== state || !code) {
      const reason = notionError === 'access_denied' ? 'denied' : 'failed';
      return res.redirect(this.webUrl(locale, returnTo, reason));
    }

    try {
      const grant = await this.notionOauth.exchangeCode(code);
      await this.notionConnections.saveFromAuthorization(user.id, grant);
    } catch {
      return res.redirect(this.webUrl(locale, returnTo, 'failed'));
    }
    return res.redirect(this.webUrl(locale, returnTo));
  }

  private async currentUser(req: Request): Promise<User | null> {
    const sessionId = (req.cookies as Record<string, string | undefined>)?.[
      SESSION_COOKIE_NAME
    ];
    return sessionId ? this.authService.validateSession(sessionId) : null;
  }

  // Built as a URL so a return path that already carries a query keeps it.
  private webUrl(
    locale: string,
    path: string,
    notionError?: 'denied' | 'failed',
  ): string {
    const url = new URL(`/${locale}${path}`, process.env.WEB_ORIGIN);
    if (notionError) {
      url.searchParams.set('notion_error', notionError);
    }
    return url.toString();
  }
}
