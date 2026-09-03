import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { SensitiveRateLimit } from '../rate-limit/sensitive-rate-limit.decorator';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { GithubConnectionService } from './github-connection.service';
import { GithubOauthClient, type GithubProfile } from './github-oauth.client';
import { DEFAULT_LOCALE, resolveLocale } from './locale';
import {
  oauthFlowCookieName,
  oauthFlowCookieOptions,
  parseOAuthFlowCookie,
  serializeOAuthFlowCookie,
} from './oauth-state-cookie';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from './session-cookie';
import { SessionGuard } from './session.guard';
import { toPublicUser } from './to-public-user';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly githubOauthClient: GithubOauthClient,
    private readonly githubConnections: GithubConnectionService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @SensitiveRateLimit()
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, sessionId } = await this.authService.login(dto);
    res.cookie(SESSION_COOKIE_NAME, sessionId, sessionCookieOptions());
    return toPublicUser(user);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    if (sessionId) {
      await this.authService.logout(sessionId);
    }
    res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());
    return { success: true };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@CurrentUser() user: User) {
    return toPublicUser(user);
  }

  @Patch('me')
  @UseGuards(SessionGuard)
  async updateMe(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    const updated = await this.authService.updateProfile(user.id, dto);
    return toPublicUser(updated);
  }

  // The sole developer-facing entry point: one action serves sign-up, login
  // and the GitHub connection (identity + read access to Projects, one
  // consent). `locale` is passed by the frontend link and round-tripped
  // through the flow cookie so the callback knows where to send the
  // developer back.
  @Get('github')
  githubStart(
    @Query('locale') locale: string | undefined,
    @Res() res: Response,
  ) {
    const resolvedLocale = resolveLocale(locale);
    const state = randomBytes(16).toString('hex');

    res.cookie(
      oauthFlowCookieName('github'),
      serializeOAuthFlowCookie({ state, locale: resolvedLocale }),
      oauthFlowCookieOptions('github'),
    );
    res.redirect(this.githubOauthClient.buildAuthorizeUrl(state));
  }

  @Get('github/callback')
  async githubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const webOrigin = process.env.WEB_ORIGIN;
    const oauthFlow = parseOAuthFlowCookie(
      req.cookies?.[oauthFlowCookieName('github')] as string | undefined,
    );
    res.clearCookie(
      oauthFlowCookieName('github'),
      oauthFlowCookieOptions('github'),
    );
    const locale = oauthFlow?.locale ?? DEFAULT_LOCALE;

    // No flow cookie, or a state that doesn't match what we generated, means
    // this callback is not trusted: no token exchange, no account, no session.
    if (!oauthFlow || oauthFlow.state !== state) {
      return res.redirect(`${webOrigin}/${locale}/login?error=state_mismatch`);
    }

    let accessToken: string;
    let profile: GithubProfile;
    try {
      accessToken = await this.githubOauthClient.exchangeCodeForToken(code);
      profile = await this.githubOauthClient.fetchProfile(accessToken);
    } catch {
      return res.redirect(
        `${webOrigin}/${locale}/login?error=github_auth_failed`,
      );
    }

    // FR-006: no email/password fallback — block and ask the developer to
    // verify an email on GitHub, then retry.
    if (!profile.verifiedEmail) {
      return res.redirect(
        `${webOrigin}/${locale}/login?error=github_email_required`,
      );
    }

    const { user, sessionId } =
      await this.authService.findOrCreateFromGitHub(profile);
    // The same consent that identified the developer is what reads their
    // boards from now on: keep it on the account.
    await this.githubConnections.saveFromLogin(user.id, accessToken);
    res.cookie(SESSION_COOKIE_NAME, sessionId, sessionCookieOptions());
    return res.redirect(`${webOrigin}/${locale}/home`);
  }
}
