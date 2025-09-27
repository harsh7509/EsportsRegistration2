// src/utils/mailer.js
import 'dotenv/config';
import nodemailer from 'nodemailer';

async function sendWithResend({ to, subject, text, html, from }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const body = {
    from: from || process.env.MAIL_FROM || process.env.RESEND_FROM || 'onboarding@resend.dev',
    to: [to],
    subject,
    text,
    html,
  };

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => '');
    throw new Error(`Resend failed (${resp.status}): ${msg}`);
  }
  return true;
}

async function sendWithSendGrid({ to, subject, text, html, from }) {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return false;

  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from || process.env.MAIL_FROM || process.env.SENDGRID_FROM },
    subject,
    content: [ html ? { type: 'text/html', value: html } : { type: 'text/plain', value: text || '' } ],
  };

  const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => '');
    throw new Error(`SendGrid failed (${resp.status}): ${msg}`);
  }
  return true;
}

/* ---- SMTP (fallback; fine for local dev, often blocked on Render) ---- */
let smtpTransport = null;
function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = port === 465;

  smtpTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
    },
    pool: false,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    requireTLS: !secure,
    tls: { minVersion: 'TLSv1.2' },
  });
  return smtpTransport;
}

async function sendWithSMTP({ to, subject, text, html, from }) {
  const canSmtp = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (!canSmtp) return false;

  const t = getSmtpTransport();
  await t.verify().catch(() => {}); // non-fatal
  await t.sendMail({
    from: from || process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html: html || (text ? `<pre>${text}</pre>` : undefined),
  });
  return true;
}

/* ---- Public helper; tries HTTPS providers first, then SMTP ---- */
export async function sendEmail({ to, subject, text, html, from }) {
  const steps = [
    () => sendWithResend({ to, subject, text, html, from }),
    () => sendWithSendGrid({ to, subject, text, html, from }),
    () => sendWithSMTP({ to, subject, text, html, from }),
  ];

  let lastErr;
  for (const trySend of steps) {
    try {
      const ok = await trySend();
      if (ok) return true;
    } catch (e) {
      lastErr = e;
      console.error('[mailer] provider error:', e?.message || e);
    }
  }
  if (lastErr) throw lastErr;
  throw new Error('No email provider configured');
}

export async function initMailer() {
  try {
    console.log('✉️  Mailer providers:',
      `RESEND=${process.env.RESEND_API_KEY ? 'yes' : 'no'},`,
      `SENDGRID=${process.env.SENDGRID_API_KEY ? 'yes' : 'no'},`,
      `SMTP=${process.env.SMTP_HOST && process.env.SMTP_USER ? 'yes' : 'no'}`
    );

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const t = getSmtpTransport();
      await t.verify().catch(() => {}); // ignore timeouts on Render
    }
  } catch (err) {
    console.warn('✉️  Mailer init warning:', err?.message || err);
  }
}
