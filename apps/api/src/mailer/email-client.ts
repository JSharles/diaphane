// What the mailer needs from whatever delivers its emails. One method, so a
// test hands in a fake and a provider change touches one class.
export interface OutgoingEmail {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailClient {
  send(email: OutgoingEmail): Promise<void>;
}

export const EMAIL_CLIENT = Symbol('EMAIL_CLIENT');
