import { ConfigService } from '@nestjs/config';
import { MailerService } from './mailer.service';
import type { EmailClient } from './email-client';

// The mailer writes the invitation and hands it to whatever client it was
// given: no test here, or anywhere, reaches Resend.
describe('MailerService', () => {
  function setup(
    values: Record<string, string> = {
      MAIL_FROM: 'Diaphane <invitations@mail.diaphane.fr>',
    },
  ) {
    const client: jest.Mocked<EmailClient> = {
      send: jest.fn().mockResolvedValue(undefined),
    };
    const config = {
      get: (key: string) => values[key],
    } as unknown as ConfigService;
    return { client, service: new MailerService(client, config) };
  }

  it('sends the invitation from the configured sender, in the project language', async () => {
    const { client, service } = setup();

    await service.sendInvitation({
      to: 'client@example.com',
      projectTitle: 'Site vitrine',
      link: 'https://app.diaphane.fr/fr/invite/abc',
      language: 'fr',
    });

    expect(client.send).toHaveBeenCalledWith({
      from: 'Diaphane <invitations@mail.diaphane.fr>',
      to: 'client@example.com',
      subject: 'Invitation à suivre le projet « Site vitrine »',
      text: expect.stringContaining('https://app.diaphane.fr/fr/invite/abc'),
      html: expect.stringContaining('https://app.diaphane.fr/fr/invite/abc'),
    });
  });

  // Said at the first send rather than at boot, the way the R2 storage is:
  // a developer running the API without a mail sender still gets everything
  // else, and the copy-link button stays.
  it('refuses to send without a configured sender', async () => {
    const { client, service } = setup({});

    await expect(
      service.sendInvitation({
        to: 'client@example.com',
        projectTitle: 'Site vitrine',
        link: 'https://app.diaphane.fr/fr/invite/abc',
        language: 'en',
      }),
    ).rejects.toThrow('MAIL_FROM');
    expect(client.send).not.toHaveBeenCalled();
  });
});
