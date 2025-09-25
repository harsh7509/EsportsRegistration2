// src/utils/mailer.js
import 'dotenv/config';
import nodemailer from 'nodemailer';

// ---------- Provider 1: Resend (HTTPS) ----------
async function sendWithResend({ to, subject, text, html, from }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from || process.env.MAIL_FROM || process.env.RESEND_FROM,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => '');
    throw new Error(`Resend failed (${resp.status}): ${msg}`);
  }
  return true;
}

// ---------- Provider 2: SendGrid (HTTPS) ----------
async function sendWithSendGrid({ to, subject, text, html, from }) {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return false;

  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from || process.env.MAIL_FROM || process.env.SENDGRID_FROM },
    subject,
    content: [
      html ? { type: 'text/html', value: html } : { type: 'text/plain', value: text || '' },
    ],
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

// ---------- Provider 3: SMTP (fallback) ----------
let smtpTransport = null;
function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;

  // 465 => secure:true ; 587 => secure:false
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = port === 465;

  smtpTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''), // strip spaces
    },
    pool: false,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    requireTLS: !secure, // TLS upgrade on 587
    tls: { minVersion: 'TLSv1.2' },
  });

  return smtpTransport;
}

async function sendWithSMTP({ to, subject, text, html, from }) {
  const canSmtp = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (!canSmtp) return false;
  const transport = getSmtpTransport();
  await transport.verify().catch(() => {}); // non-fatal
  await transport.sendMail({
    from: from || process.env.MAIL_FROM || process.env.SMTP_USER, // MUST match Gmail user
    to,
    subject,
    text,
    html: html || (text ? `<pre>${text}</pre>` : undefined),
  });
  return true;
}

// ---------- Public: sendEmail with provider fallback ----------
export async function sendEmail({ to, subject, text, html, from }) {
  // try API providers first (no blocked ports)
  const steps = [
    () => sendWithResend({ to, subject, text, html, from }),
    () => sendWithSendGrid({ to, subject, text, html, from }),
    () => sendWithSMTP({ to, subject, text, html, from }),
  ];

  let lastErr;
  for (const s of steps) {
    try {
      const ok = await s();
      if (ok) return true;
    } catch (e) {
      lastErr = e;
      // continue to next provider
    }
  }
  if (lastErr) throw lastErr;
  throw new Error('No email provider configured');
}
