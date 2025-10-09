import express from "express";
import crypto from "crypto";

const webhook = express.Router();

/**
 * Cashfree webhook must read the **raw** body.
 * इसलिए इस router को server.js में express.json() से पहले mount करना होगा.
 */
webhook.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const sigHeader = (req.header("x-webhook-signature") || "").trim();
    const tsHeader  = (req.header("x-webhook-timestamp") || "").trim();
    const rawBuf    = req.body;                 // Buffer
    const rawStr    = rawBuf.toString("utf8");

    const secret = (process.env.CF_WEBHOOK_SECRET || process.env.CASHFREE_SECRET_KEY || "").trim();
    if (!secret) {
      console.error("Missing HMAC secret. Set CF_WEBHOOK_SECRET or CASHFREE_SECRET_KEY.");
      return res.status(500).end();
    }

    const h = (data) => {
      const hmac = crypto.createHmac("sha256", secret).update(data);
      return {
        b64: hmac.digest("base64"),
        hex: crypto.createHmac("sha256", secret).update(data).digest("hex")
      };
    };

    const asBase64IfHex = (s) => {
      const hexRe = /^[0-9a-f]+$/i;
      if (hexRe.test(s.replace(/=+$/, "")) && s.length >= 32 && s.length % 2 === 0) {
        try { return Buffer.from(s, "hex").toString("base64"); } catch {}
      }
      return s;
    };

    const headerB64 = asBase64IfHex(sigHeader);

    const candidates = [];
    candidates.push(h(rawBuf).b64);       // raw buffer
    candidates.push(h(rawStr).b64);       // utf8 string
    if (tsHeader) {
      const dot = ".";
      candidates.push(h(tsHeader + rawStr).b64);
      candidates.push(h(tsHeader + dot + rawStr).b64);
      candidates.push(h(Buffer.concat([Buffer.from(tsHeader, "utf8"), rawBuf])).b64);
      candidates.push(h(Buffer.concat([Buffer.from(tsHeader, "utf8"), Buffer.from(dot), rawBuf])).b64);
    }

    const matchedIdx = candidates.findIndex((c) => c === headerB64);
    if (matchedIdx === -1) {
      console.warn("[CF] webhook signature mismatch");
      console.warn("Header (raw):", sigHeader);
      console.warn("Header (b64):", headerB64);
      console.warn("Timestamp   :", tsHeader || "<none>");
      candidates.forEach((c, i) => console.warn(`Cand #${i}:`, c));
      return res.status(401).end();
    }

    // ✅ verified
    const event = JSON.parse(rawStr);

    const type          = event?.type;
    const orderId       = event?.data?.order?.order_id;
    const paymentStatus = event?.data?.payment?.payment_status; // SUCCESS / FAILED / USER_DROPPED / ...
    const cfPaymentId   = event?.data?.payment?.cf_payment_id;
    const amount        = event?.data?.order?.order_amount;

    // 🔧 FIX: सही relative path (routes -> ../models)
    // ...inside your verified section, after reading event & loading models:

const Payment = (await import("../models/Payment.js")).default;
const Booking = (await import("../models/Booking.js")).default;

// log webhook
await Payment.updateOne(
  { orderId },
  { $push: { webhooks: { at: new Date(), type, paymentStatus } } },
  { upsert: true }
);

if (paymentStatus === "SUCCESS") {
  const p = await Payment.findOneAndUpdate(
    { orderId },
    {
      status: "completed",
      transactionId: cfPaymentId,
      cfPaymentId,
      paidAt: new Date(),
      amount,
    },
    { new: true }
  );

  if (p?.scrimId && p?.playerId) {
    // 1) ensure a booking exists and is paid
    const Booking = (await import("../models/Booking.js")).default;
    const booking = await Booking.findOneAndUpdate(
      { scrimId: p.scrimId, playerId: p.playerId },
      { $set: { paid: true, status: "active" } },
      { upsert: true, new: true }
    );

    // 2) (optional) keep bookingId on payment for easy lookup on return
    if (booking && !p.bookingId) {
      await Payment.updateOne({ _id: p._id }, { $set: { bookingId: booking._id } });
    }
  }
} else if (paymentStatus === "FAILED") {
  await Payment.updateOne({ orderId }, { status: "failed" });
}



    return res.status(200).end();
  } catch (e) {
    console.error("CF webhook error:", e);
    return res.status(500).end();
  }
});

export default webhook;
