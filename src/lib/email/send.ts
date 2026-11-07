import 'server-only';

import { envValue } from '@/lib/env';
import { emailAllowed } from '@/lib/live-guard';
import { isModuleReady } from '@/lib/modules';

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendResult =
  | { ok: true; id: string | null }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; error: string };

/**
 * Sends one e-mail through Resend (https://resend.com/docs/api-reference/emails/send-email).
 * To use another provider, replace the body of this function; callers only
 * depend on EmailMessage / SendResult.
 */
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  if (!isModuleReady('order_emails')) {
    return { ok: false, skipped: true, reason: 'E-mail modul nije uključen.' };
  }
  if (!emailAllowed(message.to)) {
    return { ok: false, skipped: true, reason: 'Testno okruženje: primatelj nije na PREVIEW_EMAIL_ALLOWLIST.' };
  }

  const replyTo = envValue('EMAIL_REPLY_TO');
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${envValue('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: envValue('EMAIL_FROM'),
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
    if (!response.ok) {
      return { ok: false, skipped: false, error: body?.message || `Resend HTTP ${response.status}` };
    }
    return { ok: true, id: body?.id ?? null };
  } catch (error) {
    return { ok: false, skipped: false, error: error instanceof Error ? error.message : String(error) };
  }
}
