import {
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';

export const TOO_MANY_REQUESTS_CODE = 'TOO_MANY_REQUESTS';

// The stock ThrottlerGuard, answering in the shape the rest of the API uses:
// a `code` the web can branch on, a `message` it can show as is. The delay
// lives in the `Retry-After` header, set by the base guard before this runs;
// the message repeats it for a human reader, the body does not.
@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected throwThrottlingException(
    _context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const retryAfterSeconds = Math.max(1, Math.ceil(detail.timeToBlockExpire));
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: TOO_MANY_REQUESTS_CODE,
        message: `Too many requests. Try again in ${retryAfterSeconds} seconds.`,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
