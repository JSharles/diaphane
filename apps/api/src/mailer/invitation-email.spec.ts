import { invitationEmail } from './invitation-email';

// The email a client receives, in the project's language. Its body carries
// the link to the invitation page and the project's title as the developer
// wrote it, and nothing the developer did not write.
describe('the invitation email', () => {
  const link = 'https://app.diaphane.fr/fr/invite/abc';

  it('is written in French when the project is', () => {
    const email = invitationEmail({
      projectTitle: 'Site vitrine',
      link,
      language: 'fr',
    });

    expect(email.subject).toBe(
      'Invitation à suivre le projet « Site vitrine »',
    );
    expect(email.text).toContain(link);
    expect(email.text).toContain('sept jours');
    expect(email.html).toContain(`href="${link}"`);
    expect(email.html).toContain('Site vitrine');
  });

  it('is written in English when the project is', () => {
    const email = invitationEmail({
      projectTitle: 'Showcase site',
      link,
      language: 'en',
    });

    expect(email.subject).toBe(
      'Invitation to follow the project “Showcase site”',
    );
    expect(email.text).toContain(link);
    expect(email.text).toContain('seven days');
    expect(email.html).toContain(`href="${link}"`);
  });

  // A title is the developer's text, not markup: what they typed is what the
  // client reads, and it cannot break out of the page.
  it('escapes the project title in the HTML body', () => {
    const email = invitationEmail({
      projectTitle: 'Tom & Jerry <script>',
      link,
      language: 'en',
    });

    expect(email.html).toContain('Tom &amp; Jerry &lt;script&gt;');
    expect(email.html).not.toContain('<script>');
    expect(email.text).toContain('Tom & Jerry <script>');
  });
});
