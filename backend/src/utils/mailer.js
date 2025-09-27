// src/utils/mailer.js
import 'dotenv/config';
import nodemailer from 'nodemailer';

let transport;

/**
 * Create (or reuse) a Gmail SMTP transporter.
 * Gmail requires an App Password (2-step verification enabled).
 */
function getTransport() {
  if (transport) return transport;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587); // 587 = STARTTLS
  const user = process.env.SMTP_USER || '';
  const pass = (process.env.SMTP_PASS || '').trim();

  transport = nodemailer.createTransport({
    host,
    port,
    secure: false,           // STARTTLS on 587
    auth: { user, pass },
    requireTLS: true,        // force TLS upgrade
    tls: { minVersion: 'TLSv1.2' },
    // keep these modest so we fail fast instead of “hanging”
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    pool: false,
  });

  return transport;
}

/**
 * (Optional) call once at boot; logs if SMTP is reachable.
 * Does not crash the app on failure.
 */
export async function initMailer() {
  try {
    const t = getTransport();
    await t.verify();
    console.log('✉️  Gmail SMTP is ready');
  } catch (err) {
    console.warn('✉️  Mailer initialization warning:', err?.message || err);
  }
}

/**
 * Send an email via Gmail SMTP.
 */
export async function sendEmail({ to, subject, text, html, from }) {
  const t = getTransport();

  await t.sendMail({
    from: from || process.env.MAIL_FROM || process.env.SMTP_USER, // must match Gmail account/sender
    to,
    subject,
    text,
    html: html || (text ? `<pre>${text}</pre>` : undefined),
  });

  return true;
}
