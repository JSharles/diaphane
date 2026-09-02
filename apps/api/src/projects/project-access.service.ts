import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectMember } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const HIDDEN_NOT_FOUND = { code: 'NOT_FOUND' } as const;

// The one place that turns "who is asking" into "may they act on this
// project". Access comes from the membership row; what the member may do
// comes from their account (User.accountKind) — see docs/PRODUCT.md « Les
// deux publics ». A refused caller always gets the same 404 as a
// non-member, so the response never says whether the project exists.
@Injectable()
export class ProjectAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireMember(
    userId: string,
    projectId: string,
  ): Promise<ProjectMember> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!membership) {
      this.hideProject();
    }
    return membership;
  }

  // Every write on a project (documents, rubriques, roadmap, settings,
  // connections) goes through here. A client member is hidden the project
  // exactly like a non-member.
  async requireDeveloper(
    userId: string,
    projectId: string,
  ): Promise<ProjectMember> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      include: { user: { select: { accountKind: true } } },
    });
    if (!membership || membership.user.accountKind !== 'developer') {
      this.hideProject();
    }
    return membership;
  }

  private hideProject(): never {
    throw new NotFoundException(HIDDEN_NOT_FOUND);
  }
}
