import 'server-only';

import { escapeHtml, layout } from './templates';
import { sendEmail } from './send';

/** Password reset link from Better Auth. Without the e-mail module the request is only logged. */
export async function sendPasswordResetEmail(email: string, url: string): Promise<void> {
  const result = await sendEmail({
    to: email,
    subject: 'Nova lozinka',
    text: `Zatražili ste novu lozinku. Otvorite poveznicu i upišite novu lozinku:\n${url}\n\nAko niste vi zatražili promjenu, zanemarite ovu poruku.`,
    html: layout(
      'Nova lozinka',
      `<p>Zatražili ste novu lozinku.</p>
       <p><a href="${escapeHtml(url)}">Postavite novu lozinku</a></p>
       <p>Ako niste vi zatražili promjenu, zanemarite ovu poruku.</p>`,
    ),
  });
  if (!result.ok) {
    console.warn('[auth] password reset e-mail not sent:', result.skipped ? result.reason : result.error);
  }
}
