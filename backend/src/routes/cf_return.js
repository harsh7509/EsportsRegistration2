import express from "express";

const router = express.Router();

const CF_BASE =
  process.env.CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

// GET /api/payments/cf/return?order_id=...
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
    const status = data?.order_status; // PAID / FAILED / etc.

    const Payment = (await import("../models/Payment.js")).default;
    const Booking = (await import("../models/Booking.js")).default;

    // Find the related payment to know which scrim/player/booking it was
    const p = await Payment.findOne({ orderId });

    if (status === "PAID") {
      // Mark payment + make sure booking exists & is paid
      await Payment.updateOne(
        { orderId },
        { $set: { status: "completed", paidAt: new Date(), amount: data?.order_amount } }
      );

      if (p?.scrimId && p?.playerId) {
        const booking = await Booking.findOneAndUpdate(
          { scrimId: p.scrimId, playerId: p.playerId },
          { $set: { paid: true, status: "active" } },
          { upsert: true, new: true }
        );
        if (booking && !p?.bookingId) {
          await Payment.updateOne({ orderId }, { $set: { bookingId: booking._id } });
        }
      }

      // ✅ Redirect straight to the scrim page
      const to = `${process.env.FRONTEND_URL?.replace(/\/+$/,'')}/scrims/${p?.scrimId}?paid=1`;
      return res.redirect(to);
    }

    // Non-PAID → redirect back with a status for UI to show message
    const fallback = `${process.env.FRONTEND_URL?.replace(/\/+$/,'')}/scrims/${p?.scrimId || ""}?status=${encodeURIComponent(status || "UNKNOWN")}`;
    return res.redirect(fallback);
  } catch (e) {
    console.error("CF return error:", e);
    return res.status(500).send("server_error");
  }
});


export default router;
