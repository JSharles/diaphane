import { Throttle } from '@nestjs/throttler';
import { SENSITIVE_RATE_LIMIT } from './rate-limit.config';

// Marks a route where guessing pays (a password, an invitation token) so it
// gets the tighter per-address limit instead of the global one.
export const SensitiveRateLimit = () =>
  Throttle({ default: { ...SENSITIVE_RATE_LIMIT } });
