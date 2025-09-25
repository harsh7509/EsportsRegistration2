// backend/src/utils/mailer.js
import nodemailer from 'nodemailer';

/**
 * Prefer Resend (HTTP API, no SMTP handshake) if available.
 * Falls back to SMTP (Gmail or any SMTP) with strict, short timeouts.
 */

const fromAddr = process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@example.com';

// ---------- Resend ----------
async function sendViaResend({ to, subject, text, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY missing');
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromAddr, to, subject, text, html }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Resend failed: ${resp.status} ${body}`);
  }
}

// ---------- SMTP ----------
let smtpTransporter = null;
function buildSmtpTransporter() {
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = port === 465; // true for 465, false for 587
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure,
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
      user: process.env.SMTP_USER,
      pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''), // strip any spaces from app password
    } : undefined,
    pool: false,                    // avoid pooled sockets on server cold start
    connectionTimeout: 10000,       // fail fast instead of hanging
    greetingTimeout: 10000,
    socketTimeout: 10000,
    requireTLS: port === 587 ? true : undefined,
    tls: { minVersion: 'TLSv1.2' },
  });
}

// tiny helper to avoid any stray long hang
const withTimeout = (p, ms = 12000) =>
  Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('SMTP timeout')), ms))]);

export async function initMailer() {
  if (process.env.RESEND_API_KEY) {
    console.log('✉️  Mailer ready: Resend API');
    return { provider: 'resend' };
  }
  smtpTransporter = buildSmtpTransporter();
  try {
    await withTimeout(smtpTransporter.verify());
    console.log('✉️  Mailer ready: SMTP verified');
    return { provider: 'smtp' };
  } catch (e) {
    console.error('✉️  SMTP verify failed:', e?.message || e);
    // We still keep running; sending will try again later
    return { provider: 'smtp', verified: false };
  }
}

export async function sendEmail({ to, subject, text, html }) {
  if (process.env.RESEND_API_KEY) {
    return sendViaResend({ to, subject, text, html });
  }
  if (!smtpTransporter) smtpTransporter = buildSmtpTransporter();
  return withTimeout(
    smtpTransporter.sendMail({ from: fromAddr, to, subject, text, html })
  );
}
