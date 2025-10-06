import SupportMessage from "../models/SupportMessage.js";
import { sendEmail } from "../utils/mailer.js"; // tumhare project me mailer.js already hai

function isEmail(s=""){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }

export async function postContact(req, res) {
  try {
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ ok: false, error: "All fields are required." });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ ok: false, error: "Invalid email." });
    }

    // Save to DB (so nothing is lost even if email provider fails)
    const doc = await SupportMessage.create({
      name: String(name).trim(),
      email: String(email).trim(),
      subject: String(subject).trim(),
      message: String(message).trim(),
      userId: req.user?._id, // if you attach user via auth middleware
    });

    // Fire-and-forget email to support inbox (optional)
    try {
      const supportTo = process.env.SUPPORT_INBOX || "support@thearenapulse.xyz";
      await sendEmail({
        to: supportTo,
        subject: `New Support Message: ${doc.subject}`,
        text:
`From: ${doc.name} <${doc.email}>
ID: ${doc._id}
Time: ${new Date(doc.createdAt).toISOString()}

${doc.message}`,
        html:
`<p><b>From:</b> ${doc.name} &lt;${doc.email}&gt;</p>
<p><b>ID:</b> ${doc._id}</p>
<p><b>Time:</b> ${new Date(doc.createdAt).toISOString()}</p>
<hr/>
<p>${doc.message.replace(/\n/g, '<br/>')}</p>`,
        from: process.env.MAIL_FROM || `ArenaPulse Support <no-reply@thearenapulse.xyz>`,
      });
    } catch (e) {
      // log only; don’t fail the request if email bounces
      console.warn("support email send failed:", e?.message);
    }

    return res.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error("postContact error:", err);
    return res.status(500).json({ ok: false, error: "Server error." });
  }
}
