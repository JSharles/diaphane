import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { rateLimitModuleOptions } from './rate-limit.config';
import { RateLimitGuard } from './rate-limit.guard';

// Importing this module rate-limits every route of the application that
// imports it; routes opt into the tighter limit with @SensitiveRateLimit().
@Module({
  imports: [ThrottlerModule.forRoot(rateLimitModuleOptions)],
  providers: [{ provide: APP_GUARD, useClass: RateLimitGuard }],
})
export class RateLimitModule {}
