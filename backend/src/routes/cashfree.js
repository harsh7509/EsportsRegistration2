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

const FE = (process.env.FRONTEND_URL || "").replace(/\/+$/, "");

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
   // Force Cashfree to append these values when redirecting back
   return_url:
     `${process.env.BACKEND_PUBLIC_URL}/api/payments/cf/return`
     + `?scrim=${encodeURIComponent(scrimId || "")}`
     + `&player=${encodeURIComponent(playerId || customer?.id || "")}`
     + `&order_id={order_id}&order_token={order_token}&status={order_status}`,
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

router.get("/return", async (req, res) => {
  try {
    const FE = (process.env.FRONTEND_URL || "https://thearenapulse.xyz").replace(/\/+$/, "");
    const orderId = req.query.order_id || req.query.orderId;
    const scrimId = req.query.scrim || ""; // passed from return_url
    const playerId = req.query.player || "";
    if (!orderId) return res.status(400).send("Missing order_id");

    const headers = {
      "x-client-id": requireEnv("CASHFREE_APP_ID"),
      "x-client-secret": requireEnv("CASHFREE_SECRET_KEY"),
      "x-api-version": "2022-09-01",
    };

    // Order status
    const orderResp = await fetch(`${CF_BASE}/orders/${orderId}`, { headers });
    const orderJson = await orderResp.json();
    const orderStatus = orderJson?.order_status; // PAID / FAILED / PENDING...
    const amount = orderJson?.order_amount;

    // Try to get a cf_payment_id for display (best-effort)
    let cfPaymentId = "";
    try {
      const payResp = await fetch(`${CF_BASE}/orders/${orderId}/payments`, { headers });
      if (payResp.ok) {
        const arr = await payResp.json();
        if (Array.isArray(arr) && arr.length > 0) {
          // pick the last payment attempt
          cfPaymentId = arr[arr.length - 1]?.cf_payment_id || "";
        }
      }
    } catch {}

    // DB updates (idempotent, same as your code)
    const Payment = (await import("../models/Payment.js")).default;
    const Booking = (await import("../models/Booking.js")).default;
    const Scrim   = (await import("../models/Scrim.js")).default;

    const p = await Payment.findOne({ orderId });
    const scrimUrl = scrimId || p?.scrimId ? `${FE}/scrims/${scrimId || p.scrimId}` : `${FE}/scrims`;

    if (orderStatus === "PAID") {
      await Payment.updateOne(
        { orderId },
        { $set: {
            status: "completed",
            paidAt: new Date(),
            amount,
            transactionId: cfPaymentId || undefined,
            cfPaymentId: cfPaymentId || undefined,
          }
        }
      );

      const finalScrimId = scrimId || p?.scrimId;
      const finalPlayerId = playerId || p?.playerId;

      if (finalScrimId && finalPlayerId) {
        const booking = await Booking.findOneAndUpdate(
          { scrimId: finalScrimId, playerId: finalPlayerId },
          { $set: { paid: true, status: "active" }, $setOnInsert: { bookedAt: new Date() } },
          { upsert: true, new: true }
        );

        await Payment.updateOne({ orderId }, { $set: { bookingId: booking?._id } }).catch(() => {});
        await Scrim.updateOne(
          { _id: finalScrimId },
          { $addToSet: { participants: finalPlayerId } }
        );
      }

      // ✅ Success HTML: show Payment ID & auto-redirect to scrim in 5s
      const to = `${scrimUrl}?paid=1`;
      const displayId = cfPaymentId || orderId; // show cf id if we have it; else order id
      return res
        .status(200)
        .send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Payment Successful</title>
<meta http-equiv="refresh" content="5;url=${to}">
<style>
:root { color-scheme: dark; }
body{background:#0b0b12;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial;margin:0}
.wrap{max-width:560px;margin:18vh auto;padding:24px;border:1px solid #2c2c3a;border-radius:16px;background:#111422}
h1{font-size:22px;margin:0 0 8px} p{color:#aab;line-height:1.5;margin:8px 0}
.label{color:#aab;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.value{font-family:ui-monospace,Menlo,Consolas,monospace}
.row{margin-top:14px;display:flex;gap:8px;flex-wrap:wrap}
a{display:inline-block;padding:10px 14px;border-radius:10px;text-decoration:none}
.primary{background:#6366f1;color:#fff} .secondary{background:#1c2033;color:#dbe}
</style>
</head>
<body>
  <div class="wrap">
    <h1>✅ Payment successful</h1>
    <p>Thanks! Your payment${amount ? ` of <span class="value">₹${amount}</span>` : ""} is confirmed.</p>
    <div class="label">Payment ID</div>
    <div class="value">${displayId}</div>
    <p>You’ll be redirected to your scrim in <strong>5 seconds</strong>.</p>
    <div class="row">
      <a class="primary" href="${to}">Go now</a>
      <a class="secondary" href="${FE}/scrims">Browse scrims</a>
      <a class="secondary" href="${FE}">Home</a>
    </div>
  </div>
  <script>setTimeout(function(){ location.replace(${JSON.stringify(to)}); }, 5000);</script>
</body>
</html>`);
    }

    // Not paid → just bounce back with a status query so UI can message user
    const fallback = `${scrimUrl}?status=${encodeURIComponent(orderStatus || "UNKNOWN")}`;
    return res.redirect(fallback);
  } catch (e) {
    console.error("CF return error:", e);
    return res.status(500).send("server_error");
  }
});



export default router;
