const send = jest.fn();
const resendConstructor = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation((key: unknown) => {
    resendConstructor(key);
    return { emails: { send } };
  }),
}));

import { ConfigService } from '@nestjs/config';
import { ResendEmailClient } from './resend-email.client';

// The one class that knows Resend, tested against a fake of the SDK.
describe('ResendEmailClient', () => {
  const email = {
    from: 'Diaphane <invitations@mail.diaphane.fr>',
    to: 'client@example.com',
    subject: 'Invitation',
    text: 'Follow the link.',
    html: '<p>Follow the link.</p>',
  };

  function setup(
    values: Record<string, string> = { RESEND_API_KEY: 're_test' },
  ) {
    const config = {
      get: (key: string) => values[key],
    } as unknown as ConfigService;
    return new ResendEmailClient(config);
  }

  beforeEach(() => jest.clearAllMocks());

  it('sends through the SDK with the configured key', async () => {
    send.mockResolvedValue({ data: { id: 'email-1' }, error: null });

    await setup().send(email);

    expect(resendConstructor).toHaveBeenCalledWith('re_test');
    expect(send).toHaveBeenCalledWith(email);
  });

  // The SDK reports a refusal as a value, not an exception; here it becomes
  // one, so the caller has one failure path rather than two.
  it('throws when Resend refuses the email', async () => {
    send.mockResolvedValue({
      data: null,
      error: {
        name: 'validation_error',
        message: 'Domain not verified',
        statusCode: 403,
      },
    });

    await expect(setup().send(email)).rejects.toThrow('Domain not verified');
  });

  it('refuses to send without an API key', async () => {
    await expect(setup({}).send(email)).rejects.toThrow('RESEND_API_KEY');
    expect(send).not.toHaveBeenCalled();
  });
});
