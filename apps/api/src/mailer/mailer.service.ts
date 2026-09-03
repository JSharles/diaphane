import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_CLIENT, type EmailClient } from './email-client';
import { invitationEmail, type InvitationEmailInput } from './invitation-email';

// What the rest of the API asks of email: one method per email the product
// sends. It writes the email and hands it to the client it was given, and
// knows nothing of the provider behind it.
@Injectable()
export class MailerService {
  constructor(
    @Inject(EMAIL_CLIENT) private readonly client: EmailClient,
    private readonly config: ConfigService,
  ) {}

  async sendInvitation(
    input: InvitationEmailInput & { to: string },
  ): Promise<void> {
    // Read at the first send rather than at boot, so an API without a mail
    // sender still runs everything else and the copy-link button remains.
    const from = this.config.get<string>('MAIL_FROM');
    if (!from) {
      throw new Error('MAIL_FROM is not configured.');
    }
    const { subject, text, html } = invitationEmail(input);
    await this.client.send({ from, to: input.to, subject, text, html });
  }
}
