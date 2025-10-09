import express from "express";
import fetch from "node-fetch";
import { randomUUID } from "crypto";

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

router.post("/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR", customer, bookingId, scrimId, playerId } = req.body;

    const APP_ID = requireEnv("CASHFREE_APP_ID");
    const APP_SECRET = requireEnv("CASHFREE_SECRET_KEY");

    const orderId = `AP_${Date.now()}_${Math.floor(Math.random() * 9999)}`;

    const resp = await fetch(`${CF_BASE}/orders`, {
      method: "POST",
      headers: {
        "x-client-id": APP_ID,
        "x-client-secret": APP_SECRET,
        "x-api-version": "2022-09-01",
        "x-idempotency-key": randomUUID(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: Number(amount),
        order_currency: currency,
        customer_details: {
          customer_id: customer?.id || String(Date.now()),
          customer_name: customer?.name || "Guest",
          customer_email: customer?.email || "guest@example.com",
          customer_phone: customer?.phone || "9999999999",
        },
        order_meta: {
          return_url: process.env.CF_RETURN_URL, // ...?order_id={order_id}
          notify_url: `${process.env.BACKEND_PUBLIC_URL}/api/payments/cf/webhook`,
          payment_methods: "upi",
        },
        order_note: "ArenaPulse booking",
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return res.status(400).json({
        ok: false,
        error: data?.message || data?.error || "Cashfree error",
        details: data,
      });
    }

    // 🔧 FIX: सही relative path (routes -> ../models)
    try {
      const Payment = (await import("../models/Payment.js")).default;
      await Payment.findOneAndUpdate(
        { orderId },
        {
          scrimId: scrimId || null,
          playerId: playerId || customer?.id || null,
          amount: Number(amount),
          currency,
          status: "pending",
          provider: "cashfree",
          orderId,
          bookingId: bookingId || null,
          paymentSessionId: data?.payment_session_id,
        },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn("Payment persist warn:", e?.message);
    }

    res.json({ ok: true, order_id: orderId, ...data });
  } catch (e) {
    console.error("CF create-order error", e);
    res.status(500).json({ ok: false, error: e.message || "server_error" });
  }
});

router.get("/status/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const resp = await fetch(`${CF_BASE}/orders/${orderId}`, {
      headers: {
        "x-client-id": requireEnv("CASHFREE_APP_ID"),
        "x-client-secret": requireEnv("CASHFREE_SECRET_KEY"),
        "x-api-version": "2022-09-01",
      },
    });
    const data = await resp.json();
    res.status(resp.ok ? 200 : 400).json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "server_error" });
  }
});

export default router;
