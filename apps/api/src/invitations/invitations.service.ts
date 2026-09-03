import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Invitation, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { AuthService } from '../auth/auth.service';
import { MailerService } from '../mailer/mailer.service';
import { PrismaService } from '../prisma/prisma.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface InvitationDetails {
  email: string;
  projectTitle: string;
  accountExists: boolean;
  status: 'invited' | 'expired' | 'accepted' | 'cancelled';
}

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly mailer: MailerService,
  ) {}

  // Only a project admin can invite — is_admin is what governs member
  // management (see docs/PRODUCT.md "Business rules" § Access). The invitee
  // is always granted client, non-admin membership (FR-011) — a client is
  // never an admin by default in this feature.
  //
  // « La réponse à une invitation ne doit pas révéler si un compte existe »
  // (docs/PRODUCT.md « Les invitations et l'email »): the answer is the same
  // whatever the email. An email that belongs to a développeur is invited
  // like any other — same row, same email — and the refusal waits for
  // acceptance, where only the holder of the link learns it (decision #49).
  // A member of this project is the one exception, and no secret: the
  // inviter already reads the members list.
  async create(
    userId: string,
    projectId: string,
    dto: CreateInvitationDto,
  ): Promise<Invitation> {
    await this.assertIsAdmin(userId, projectId);
    const email = dto.email.toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const membership = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId, userId: existingUser.id },
        },
      });

      if (membership) {
        throw new ConflictException(
          'This person is already a member of the project',
        );
      }
    }

    // Re-inviting an email that already has a pending invitation on this
    // project is the same transition as resend (FR-008) — same link, reset
    // expiry, never a second row.
    const existingInvitation = await this.prisma.invitation.findFirst({
      where: { projectId, email, status: 'invited' },
    });

    const invitation = existingInvitation
      ? await this.extendInvitation(existingInvitation)
      : await this.prisma.invitation.create({
          data: {
            projectId,
            email,
            isAdmin: false,
            token: randomBytes(32).toString('hex'),
            status: 'invited',
            expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
          },
        });

    await this.sendInvitationEmail(invitation);
    return invitation;
  }

  // The invitation sends a real email (docs/PRODUCT.md « Les invitations et
  // l'email »): the link to the invitation page, in the project's language,
  // under the project's title. The row exists before the email leaves, so a
  // mail outage is reported rather than hidden — the developer copies the
  // link, or invites again, which sends again on the same invitation.
  private async sendInvitationEmail(invitation: Invitation): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: invitation.projectId },
      select: { title: true, language: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    // French is where a bare link lands too (apps/web/i18n/routing.ts).
    const language = project.language ?? 'fr';
    const link = new URL(
      `/${language}/invite/${invitation.token}`,
      process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    ).toString();

    try {
      await this.mailer.sendInvitation({
        to: invitation.email,
        projectTitle: project.title,
        link,
        language,
      });
    } catch (error) {
      this.logger.warn(
        `Invitation email to ${invitation.email} not sent: ${String(error)}`,
      );
      throw new ServiceUnavailableException(
        'The invitation was saved, but the email could not be sent',
      );
    }
  }

  // Pending-only (FR-018) — an invitation drops out once it's accepted,
  // cancelled, or time-expired, even though "expired" is never written to
  // `status` (see data-model.md — it's computed from `expiresAt`).
  async findAllForProject(
    userId: string,
    projectId: string,
  ): Promise<Invitation[]> {
    await this.assertIsAdmin(userId, projectId);

    return this.prisma.invitation.findMany({
      where: { projectId, status: 'invited', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // An admin can cancel a pending invitation regardless of whether it has
  // also time-expired in the meantime — cancel just guarantees the link can
  // never be used again.
  async cancel(
    userId: string,
    projectId: string,
    invitationId: string,
  ): Promise<Invitation> {
    await this.assertIsAdmin(userId, projectId);
    const invitation = await this.findPendingInvitationOrThrow(
      projectId,
      invitationId,
    );

    return this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'cancelled' },
    });
  }

  // Resend (and the create()-delegates-to-resend path above) reset the
  // expiry on the same row — the token is never rotated (research.md §2).
  // This also revives an invitation that has time-expired but wasn't
  // cancelled, which is the intended recovery path for a stale link.
  async resend(
    userId: string,
    projectId: string,
    invitationId: string,
  ): Promise<Invitation> {
    await this.assertIsAdmin(userId, projectId);
    const invitation = await this.findPendingInvitationOrThrow(
      projectId,
      invitationId,
    );

    const extended = await this.extendInvitation(invitation);
    await this.sendInvitationEmail(extended);
    return extended;
  }

  private async findPendingInvitationOrThrow(
    projectId: string,
    invitationId: string,
  ): Promise<Invitation> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.projectId !== projectId) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'invited') {
      throw new ConflictException('Invitation is not pending');
    }

    return invitation;
  }

  private extendInvitation(invitation: Invitation): Promise<Invitation> {
    return this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { expiresAt: new Date(Date.now() + INVITATION_TTL_MS) },
    });
  }

  // Public (no session) — read by the invite acceptance page before the
  // invitee has an account, so it can decide whether to show a signup or a
  // login form. Revealing account existence here is fine: only the holder
  // of this specific unguessable token learns it, about their own email.
  async getByToken(token: string): Promise<InvitationDetails> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: { project: { select: { title: true } } },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.email },
    });

    return {
      email: invitation.email,
      projectTitle: invitation.project.title,
      accountExists: !!existingUser,
      status:
        invitation.status === 'accepted'
          ? 'accepted'
          : invitation.status === 'cancelled'
            ? 'cancelled'
            : invitation.expiresAt < new Date()
              ? 'expired'
              : 'invited',
    };
  }

  // Signs the invitee in (creating their account first if this is their
  // first invitation anywhere) and grants them the role/admin flag decided
  // at invite time. Idempotent on membership: accepting twice never creates
  // a duplicate ProjectMember row.
  async accept(
    token: string,
    dto: AcceptInvitationDto,
  ): Promise<{ user: User; sessionId: string }> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status === 'accepted') {
      throw new GoneException('Invitation already accepted');
    }
    if (invitation.status === 'cancelled') {
      throw new GoneException('Invitation is no longer available');
    }
    if (invitation.expiresAt < new Date()) {
      throw new GoneException('Invitation has expired');
    }

    let user = await this.prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (user) {
      // The one place a développeur is refused, on purpose: refused at
      // creation, the answer told the inviter an account existed (decision
      // #49). Here only the holder of the link learns it, about their own
      // email. Checked before the password verify below: a GitHub-only
      // developer account (specs/009-developer-github-oauth) has no
      // passwordHash at all, so this order also avoids ever calling
      // argon2.verify with null.
      if (user.accountKind === 'developer') {
        throw new ForbiddenException(
          'Developer accounts cannot accept client invitations',
        );
      }
      if (!user.passwordHash) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const valid = await argon2.verify(user.passwordHash, dto.password);
      if (!valid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    } else {
      if (!dto.firstName || !dto.lastName) {
        throw new BadRequestException(
          'firstName and lastName are required to create an account',
        );
      }

      const passwordHash = await argon2.hash(dto.password);
      user = await this.prisma.user.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: invitation.email,
          passwordHash,
          accountKind: 'client',
        },
      });
    }

    const existingMembership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: invitation.projectId, userId: user.id },
      },
    });

    if (!existingMembership) {
      await this.prisma.projectMember.create({
        data: {
          projectId: invitation.projectId,
          userId: user.id,
          isAdmin: invitation.isAdmin,
        },
      });
    }

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    });

    const session = await this.authService.createSession(user.id);
    return { user, sessionId: session.id };
  }

  private async assertIsAdmin(
    userId: string,
    projectId: string,
  ): Promise<void> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!membership) {
      // Same response whether the project doesn't exist or the user isn't a
      // member — never confirm a project's existence to a non-member.
      throw new NotFoundException('Project not found');
    }

    if (!membership.isAdmin) {
      throw new ForbiddenException(
        'Only a project admin can manage invitations',
      );
    }
  }
}
