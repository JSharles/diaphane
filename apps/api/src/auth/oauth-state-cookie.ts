import { CookieOptions } from 'express';

// Short-lived, sibling to session-cookie.ts's long-lived session cookie — not
// to be confused with it. Carries the CSRF `state` token and the developer's
// current locale across the redirect to GitHub and back, then is cleared on
// callback.
export const OAUTH_FLOW_COOKIE_NAME = 'github_oauth_flow';
export const OAUTH_FLOW_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface OAuthFlowCookiePayload {
  state: string;
  locale: string;
}

export function oauthFlowCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: OAUTH_FLOW_TTL_MS,
    path: '/auth/github',
  };
}

export function serializeOAuthFlowCookie(
  payload: OAuthFlowCookiePayload,
): string {
  return JSON.stringify(payload);
}

// Returns null for a missing, malformed, or incomplete cookie — callers treat
// that identically to a state mismatch (see auth.controller.ts).
export function parseOAuthFlowCookie(
  raw: string | undefined,
): OAuthFlowCookiePayload | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const candidate = parsed as Record<string, unknown>;
    if (
      typeof candidate.state !== 'string' ||
      typeof candidate.locale !== 'string'
    ) {
      return null;
    }

    return { state: candidate.state, locale: candidate.locale };
  } catch {
    return null;
  }
}
