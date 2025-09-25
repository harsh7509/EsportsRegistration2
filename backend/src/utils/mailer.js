// src/utils/mailer.js
import 'dotenv/config';
import nodemailer from 'nodemailer';

/* ----------------- Provider 1: Resend (HTTPS API) ----------------- */
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

/* ---------------- Provider 2: SendGrid (HTTPS API) ---------------- */
async function sendWithSendGrid({ to, subject, text, html, from }) {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return false;

  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from || process.env.MAIL_FROM || process.env.SENDGRID_FROM },
    subject,
    content: [
      html
        ? { type: 'text/html', value: html }
        : { type: 'text/plain', value: text || '' },
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

/* ---------------------- Provider 3: SMTP (fallback) ---------------------- */
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
      pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''), // strip spaces just in case
    },
    // keep simple; pooling can cause timeouts on cold starts
    pool: false,
    // fail fast instead of hanging for 30+ seconds
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    // TLS: Gmail on 587 upgrades, on 465 already secure
    requireTLS: !secure,
    tls: { minVersion: 'TLSv1.2' },
  });

  return smtpTransport;
}

async function sendWithSMTP({ to, subject, text, html, from }) {
  const canSmtp = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (!canSmtp) return false;

  const transport = getSmtpTransport();
  // verify is non-blocking failure; we still try sendMail
  await transport.verify().catch(() => {});

  await transport.sendMail({
    from: from || process.env.MAIL_FROM || process.env.SMTP_USER, // with Gmail this MUST equal SMTP_USER
    to,
    subject,
    text,
    html: html || (text ? `<pre>${text}</pre>` : undefined),
  });

  return true;
}

/* ---------------------- Public: sendEmail with fallback ---------------------- */
export async function sendEmail({ to, subject, text, html, from }) {
  // Prefer HTTPS APIs (no blocked ports), then SMTP
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
      // continue to next provider
    }
  }

  if (lastErr) throw lastErr;
  throw new Error('No email provider configured');
}

/* ---------------------- Optional: initMailer (boot-time verify) ---------------------- */
export async function initMailer() {
  try {
    // If SMTP is configured, verify once at boot (non-fatal)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const t = getSmtpTransport();
      await t.verify();
      console.log('✉️  SMTP ready');
    } else {
      console.log('✉️  SMTP not configured; will use HTTP email provider if available.');
    }

    if (process.env.RESEND_API_KEY) {
      console.log('✉️  Resend configured (HTTP API).');
    }
    if (process.env.SENDGRID_API_KEY) {
      console.log('✉️  SendGrid configured (HTTP API).');
    }
  } catch (err) {
    // Don’t crash the app—just log. Email send will still try other providers.
    console.error('✉️  Mailer initialization warning:', err?.message || err);
  }
}
