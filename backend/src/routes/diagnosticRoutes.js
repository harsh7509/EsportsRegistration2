import express from "express";
import { sendEmail } from "../utils/mailer.js";

const router = express.Router();

router.get("/mail", async (req, res) => {
  try {
    const to = process.env.TEST_EMAIL || process.env.MAIL_FROM || process.env.SMTP_USER;
    if (!to) {
      return res.status(400).json({ ok: false, error: "Set TEST_EMAIL or MAIL_FROM in env" });
    }

    await sendEmail({
      to,
      subject: "ArenaPulse mail test",
      text: "Diagnostic email from production.",
      html: "<p>Diagnostic email from <b>production</b>.</p>",
    });

    res.json({ ok: true, to });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

export default router;
