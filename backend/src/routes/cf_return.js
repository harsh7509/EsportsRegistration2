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

    try {
      const Payment = (await import("../models/Payment.js")).default;
      if (data?.order_status === "PAID") {
        await Payment.findOneAndUpdate(
          { orderId },
          { status: "completed", paidAt: new Date(), amount: data?.order_amount },
          { new: true }
        );
      } else if (data?.order_status === "FAILED") {
        await Payment.findOneAndUpdate({ orderId }, { status: "failed" });
      }
    } catch (e) {
      console.warn("Return reconcile warn:", e?.message);
    }

    const to = `${process.env.FRONTEND_URL?.replace(/\/+$/,'') || ""}/payments/cf/result?order_id=${orderId}&status=${encodeURIComponent(data?.order_status || "UNKNOWN")}`;
    return res.redirect(to);
  } catch (e) {
    console.error("CF return error:", e);
    return res.status(500).send("server_error");
  }
});

export default router;
