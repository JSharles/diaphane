import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GithubConnectionService } from './github-connection.service';
import { GithubOauthClient } from './github-oauth.client';
import { SessionGuard } from './session.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionGuard,
    GithubOauthClient,
    GithubConnectionService,
  ],
  exports: [
    AuthService,
    SessionGuard,
    GithubOauthClient,
    GithubConnectionService,
  ],
})
export class AuthModule {}
