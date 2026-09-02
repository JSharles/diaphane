import { CookieOptions } from 'express';

// Short-lived, sibling to session-cookie.ts's long-lived session cookie — not
// to be confused with it. Carries the CSRF `state` token, the developer's
// current locale and, for a connection taken from inside the app, where to
// send them back, across the redirect to the provider and back; cleared on
// callback. One cookie per provider, scoped to that provider's own routes.
export type OAuthProvider = 'github' | 'notion';

export const OAUTH_FLOW_TTL_MS = 10 * 60 * 1000; // 10 minutes

const COOKIE_PATH: Record<OAuthProvider, string> = {
  github: '/auth/github',
  notion: '/connections/notion',
};

export interface OAuthFlowCookiePayload {
  state: string;
  locale: string;
  // An in-app path (`/projects/…`), never a full URL — see safeReturnTo.
  returnTo?: string;
}

export function oauthFlowCookieName(provider: OAuthProvider): string {
  return `${provider}_oauth_flow`;
}

export function oauthFlowCookieOptions(provider: OAuthProvider): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: OAUTH_FLOW_TTL_MS,
    path: COOKIE_PATH[provider],
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

    const returnTo = safeReturnTo(candidate.returnTo);
    return {
      state: candidate.state,
      locale: candidate.locale,
      ...(returnTo ? { returnTo } : {}),
    };
  } catch {
    return null;
  }
}

// Only a path inside the app is accepted: an absolute URL or a
// protocol-relative one (`//evil.example`) would turn the callback into an
// open redirect.
export function safeReturnTo(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return undefined;
  }
  if (value.startsWith('//') || value.startsWith('/\\')) {
    return undefined;
  }
  return value;
}
