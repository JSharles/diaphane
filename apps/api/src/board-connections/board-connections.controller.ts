import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionGuard } from '../auth/session.guard';
import { BoardConnectionsService } from './board-connections.service';
import { CreateBoardConnectionDto } from './dto/create-board-connection.dto';
import { UpdateBoardConnectionDto } from './dto/update-board-connection.dto';

// The project's board choice. No token travels through here: the boards are
// listed and read with the GitHub connection the developer gave at login.
@Controller('projects/:projectId/board-connection')
@UseGuards(SessionGuard)
export class BoardConnectionsController {
  constructor(
    private readonly boardConnectionsService: BoardConnectionsService,
  ) {}

  @Get()
  findOne(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    return this.boardConnectionsService.findForProject(user.id, projectId);
  }

  @Get('boards')
  listBoards(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    return this.boardConnectionsService.listBoards(user.id, projectId);
  }

  @Post()
  connect(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Body() dto: CreateBoardConnectionDto,
  ) {
    return this.boardConnectionsService.connect(user.id, projectId, {
      ownerLogin: dto.ownerLogin,
      ownerType: dto.ownerType,
      number: dto.number,
      estimateUnit: dto.estimateUnit,
    });
  }

  // The estimate unit is a reading of the board, not part of choosing it: it
  // changes here, in place, and takes effect at the next sweep.
  @Patch()
  update(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateBoardConnectionDto,
  ) {
    return this.boardConnectionsService.updateEstimateUnit(
      user.id,
      projectId,
      dto.estimateUnit,
    );
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnect(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    return this.boardConnectionsService.disconnect(user.id, projectId);
  }
}
