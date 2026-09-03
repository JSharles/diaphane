import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { SENSITIVE_RATE_LIMIT, THROTTLER_NAME } from './rate-limit.config';

// Marks a route where guessing pays (a password, an invitation token) so it
// gets the tighter per-address limit instead of the global one.
export const SensitiveRateLimit = () =>
  Throttle({ [THROTTLER_NAME]: { ...SENSITIVE_RATE_LIMIT } });

// Marks a route the web server calls on the client's behalf. Those requests
// all leave from the Next server's address, so a per-address limit would pool
// every logged-in person into one bucket and block them together. Only for
// routes already behind a session: guessing does not pay there.
export const ServerCallRateLimitExempt = () =>
  SkipThrottle({ [THROTTLER_NAME]: true });
