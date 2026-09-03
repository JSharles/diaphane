import { Module } from '@nestjs/common';
import { EMAIL_CLIENT } from './email-client';
import { MailerService } from './mailer.service';
import { ResendEmailClient } from './resend-email.client';

@Module({
  providers: [
    MailerService,
    { provide: EMAIL_CLIENT, useClass: ResendEmailClient },
  ],
  exports: [MailerService],
})
export class MailerModule {}
