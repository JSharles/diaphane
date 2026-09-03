import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { EmailClient, OutgoingEmail } from './email-client';

// The only class that knows Resend (GitHub issue #50): its HTTPS SDK, because
// Railway blocks outgoing SMTP. The key is read at the first send rather than
// at boot, the way the R2 storage does it, so an API without a mail sender
// still runs everything else.
@Injectable()
export class ResendEmailClient implements EmailClient {
  constructor(private readonly config: ConfigService) {}

  async send(email: OutgoingEmail): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured.');
    }
    // The SDK reports a refusal as a value, not an exception; here it becomes
    // one, so the caller has one failure path rather than two.
    const { error } = await new Resend(apiKey).emails.send(email);
    if (error) {
      throw new Error(`Resend refused the email: ${error.message}`);
    }
  }
}
