
import express from "express";
import { randomUUID } from "crypto";

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

router.post("/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR", customer, bookingId, scrimId, playerId, note } = req.body;

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
          return_url: process.env.CF_RETURN_URL,
          notify_url: `${process.env.BACKEND_PUBLIC_URL}/api/payments/cf/webhook`,
          payment_methods: "upi",
        },
        order_note: note || "ArenaPulse booking",
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error("CF /orders error:", resp.status, data);
      return res.status(400).json({
        ok: false,
        error: data?.message || data?.error || "Cashfree error",
        details: data,
      });
    }

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

// ---- optional diagnostic endpoint ----
const mask = (s = "") => (s.length <= 6 ? "***" : s.slice(0, 4) + "****" + s.slice(-3));

router.get("/_authcheck", async (req, res) => {
  try {
    const appId = requireEnv("CASHFREE_APP_ID");
    const secret = requireEnv("CASHFREE_SECRET_KEY");
    const fake = "AP_FAKE_" + Date.now();

    const resp = await fetch(`${CF_BASE}/orders/${fake}`, {
      headers: {
        "x-client-id": appId,
        "x-client-secret": secret,
        "x-api-version": "2022-09-01",
      },
    });
    const text = await resp.text();
    // 404 => auth OK; 401 => bad auth
    return res.status(200).json({
      ok: true,
      cashfree_env: process.env.CASHFREE_ENV || "sandbox(default)",
      cf_base: CF_BASE,
      app_id_sample: mask(appId),
      secret_sample: mask(secret),
      cf_status: resp.status,
      cf_body: text.slice(0, 240),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// --- Add this proxied SDK endpoint (so the browser can load it even if CDN is blocked) ---
router.get("/sdk.js", async (req, res) => {
  try {
    const mode = (req.query.mode || "").toString() === "sandbox" ? "sandbox" : "production";
    // Prefer v3 SDK
    const v3Url = "https://sdk.cashfree.com/js/v3/cashfree.js";
    // Legacy fallback (rarely needed)
    const legacyUrl = mode === "production"
      ? "https://sdk.cashfree.com/js/ui/2.0.0/cashfree.js"
      : "https://sdk.cashfree.com/js/ui/2.0.0/cashfree.sandbox.js";

    // Try v3
    let upstream = await fetch(v3Url, { redirect: "follow" });
    if (!upstream.ok) {
      // Try legacy
      upstream = await fetch(legacyUrl, { redirect: "follow" });
    }
    if (!upstream.ok) {
      console.error("CF SDK proxy upstream error:", upstream.status, upstream.statusText);
      return res.status(502).send("Failed to fetch Cashfree SDK");
    }

    // Pass JS back with safe headers
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300"); // 5 min
    // NOTE: We intentionally do NOT set Access-Control-Allow-Origin here
    // because <script> tags don't require CORS; this is a plain script.
    const body = await upstream.text();
    return res.status(200).send(body);
  } catch (e) {
    console.error("CF SDK proxy error:", e);
    return res.status(500).send("server_error");
  }
});


export default router;
