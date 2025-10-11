// backend/src/routes/payments.return.js
import express from "express";
import Scrim from "../models/Scrim.js";           // <-- add this
const router = express.Router();

const CF_BASE =
  process.env.CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

function requireEnv(name) {
  const v = (process.env[name] || "").trim();
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

router.get("/return", async (req, res) => {
  try {
    const orderId = req.query.order_id || req.query.orderId;
    if (!orderId) return res.status(400).send("Missing order_id");

    const resp = await fetch(`${CF_BASE}/orders/${orderId}`, {
      headers: {
        "x-client-id": requireEnv("CASHFREE_APP_ID"),
        "x-client-secret": requireEnv("CASHFREE_SECRET_KEY"),
        "x-api-version": "2022-09-01",
      },
    });
    const data = await resp.json();
    const status = data?.order_status; // PAID / FAILED / ...

    const Payment = (await import("../models/Payment.js")).default;
    const Booking = (await import("../models/Booking.js")).default;

    // Identify payment → scrim & player
    const p = await Payment.findOne({ orderId });
    const FE = (process.env.FRONTEND_URL || "").replace(/\/+$/, "");
    const toList = `${FE}/scrims`;
    const toScrim = p?.scrimId ? `${FE}/scrims/${p.scrimId}` : toList;

    if (status === "PAID" && p?.scrimId && p?.playerId) {
      // 1) Mark payment paid
      await Payment.updateOne(
        { orderId },
        { $set: { status: "completed", paidAt: new Date(), amount: data?.order_amount } }
      );

      // 2) Upsert booking as paid/active
      const booking = await Booking.findOneAndUpdate(
        { scrimId: p.scrimId, playerId: p.playerId },
        { $set: { paid: true, status: "active" }, $setOnInsert: { bookedAt: new Date() } },
        { upsert: true, new: true }
      );
      if (booking && !p?.bookingId) {
        await Payment.updateOne({ orderId }, { $set: { bookingId: booking._id } });
      }

      // 3) Ensure scrim.participants contains the player (so isBooked checks pass)
      await Scrim.updateOne(
        { _id: p.scrimId },
        {
          $addToSet: { participants: p.playerId },
          // keep meta optional; you can enrich later when you collect IGN
        }
      );

      // 4) Redirect the user straight to the scrim with a success flag
      return res.redirect(`${toScrim}?paid=1`);
    }

    // Non-PAID → bounce back with status so UI can show a message
    return res.redirect(`${toScrim}?status=${encodeURIComponent(status || "UNKNOWN")}`);
  } catch (e) {
    console.error("CF return error:", e);
    return res.status(500).send("server_error");
  }
});

export default router;
