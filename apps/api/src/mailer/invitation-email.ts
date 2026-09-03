import type { ProjectLanguage } from '@prisma/client';

// The email a client receives when invited (docs/PRODUCT.md « Les invitations
// et l'email »), in the project's language. Plain text and a minimal HTML
// twin: the link is the whole point, and a client's mail reader that strips
// markup must still show it.

export interface InvitationEmailInput {
  projectTitle: string;
  link: string;
  language: ProjectLanguage;
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

// The project title is the developer's text, not markup.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const COPY: Record<
  ProjectLanguage,
  {
    subject: (title: string) => string;
    greeting: string;
    intro: (title: string) => string;
    action: string;
    expiry: string;
    ignore: string;
  }
> = {
  fr: {
    subject: (title) => `Invitation à suivre le projet « ${title} »`,
    greeting: 'Bonjour,',
    intro: (title) =>
      `Vous êtes invité à suivre l'avancement du projet « ${title} » sur Diaphane.`,
    action: 'Ouvrir l’invitation',
    expiry: 'Ce lien est valable sept jours et ne sert qu’une fois.',
    ignore:
      'Si vous n’attendiez pas cette invitation, vous pouvez ignorer cet email.',
  },
  en: {
    subject: (title) => `Invitation to follow the project “${title}”`,
    greeting: 'Hello,',
    intro: (title) =>
      `You are invited to follow the progress of the project “${title}” on Diaphane.`,
    action: 'Open the invitation',
    expiry: 'This link is valid for seven days and can be used once.',
    ignore:
      'If you were not expecting this invitation, you can ignore this email.',
  },
};

export function invitationEmail(input: InvitationEmailInput): EmailContent {
  const copy = COPY[input.language];
  const title = input.projectTitle;

  const text = [
    copy.greeting,
    '',
    copy.intro(title),
    '',
    `${copy.action} : ${input.link}`,
    '',
    copy.expiry,
    copy.ignore,
  ].join('\n');

  const html = [
    `<p>${copy.greeting}</p>`,
    `<p>${escapeHtml(copy.intro(title))}</p>`,
    `<p><a href="${escapeHtml(input.link)}">${copy.action}</a></p>`,
    `<p>${copy.expiry}<br>${copy.ignore}</p>`,
  ].join('\n');

  return { subject: copy.subject(title), text, html };
}
