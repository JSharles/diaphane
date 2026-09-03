import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectMember } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Locale } from '../task-vulgarization/locale';
import {
  CurrentTaskItem,
  TaskVulgarizationService,
} from '../task-vulgarization/task-vulgarization.service';

@Injectable()
export class CurrentTaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskVulgarizationService: TaskVulgarizationService,
  ) {}

  // Open to any project member, not contributor-only. Never touches GitHub or
  // the LLM — reads only what
  // TaskVulgarizationService's scheduled sweep has already persisted.
  async getCurrentTask(
    userId: string,
    projectId: string,
    locale: Locale,
  ): Promise<CurrentTaskItem[]> {
    await this.assertIsMember(userId, projectId);

    return this.taskVulgarizationService.getVulgarizedCurrentTask(
      projectId,
      locale,
    );
  }

  // Mirrors ProjectsService/BoardConnectionsService's own membership checks
  // — kept as a separate copy per Constitution III (Feature Isolation).
  private async assertIsMember(
    userId: string,
    projectId: string,
  ): Promise<ProjectMember> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!membership) {
      throw new NotFoundException('Project not found');
    }

    return membership;
  }
}
