import type { ThrottlerModuleOptions } from '@nestjs/throttler';

// Per address, per minute. Fixed in code rather than env vars: there is one
// deployment and no reason for the limits to differ between environments.
//
// The global limit is a backstop for a runaway script, not a product limit:
// the web app never comes close to it in normal use.
export const GLOBAL_RATE_LIMIT = { ttl: 60_000, limit: 120 } as const;

// Login and invitation handling are the two places where guessing pays:
// a password on `POST /auth/login`, a token on `GET /invitations/:token` and
// `POST /invitations/:token/accept` (docs/audit-mvp-2026-08-31.md). Ten
// attempts a minute leaves room for a mistyped password, not for a
// dictionary.
export const SENSITIVE_RATE_LIMIT = { ttl: 60_000, limit: 10 } as const;

// The one named throttler. A route override (@SensitiveRateLimit) only
// replaces the global limit if it targets the same name, so both sides share
// this constant rather than spelling it twice.
export const THROTTLER_NAME = 'default';

export const rateLimitModuleOptions: ThrottlerModuleOptions = {
  throttlers: [{ name: THROTTLER_NAME, ...GLOBAL_RATE_LIMIT }],
};
