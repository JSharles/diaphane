import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { GithubConnectionService } from '../auth/github-connection.service';
import { SessionGuard } from '../auth/session.guard';

// The developer's connections, as the profile shows them. Connecting GitHub
// is the login itself (GET /auth/github); only reading and cutting live here.
@Controller('connections')
@UseGuards(SessionGuard)
export class ConnectionsController {
  constructor(private readonly githubConnections: GithubConnectionService) {}

  @Get()
  async findAll(@CurrentUser() user: User) {
    return { github: await this.githubConnections.findForUser(user.id) };
  }

  @Delete('github')
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnectGithub(@CurrentUser() user: User) {
    return this.githubConnections.disconnect(user.id);
  }
}
