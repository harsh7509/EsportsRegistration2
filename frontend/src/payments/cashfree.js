// src/payments/cashfree.js
import { API_BASE } from "../services/api";

/** Load Cashfree SDK exactly once for the chosen mode */
// Replace your ensureCFSDK/loadCashfree with this:
function ensureCFSDK(mode = "production") {
  const V3_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";
  const LEGACY_PROD = "https://sdk.cashfree.com/js/ui/2.0.0/cashfree.js";
  const LEGACY_SANDBOX = "https://sdk.cashfree.com/js/ui/2.0.0/cashfree.sandbox.js";

  return new Promise(async (resolve, reject) => {
    const id = "cashfree-sdk";
    const init = () => {
      try {
        const cf = window.Cashfree({ mode });
        resolve(cf);
      } catch (e) {
        reject(e);
      }
    };

    // already present?
    const existing = document.getElementById(id);
    if (existing) return init();

    // try v3 first
    const s = document.createElement("script");
    s.id = id;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.referrerPolicy = "no-referrer-when-downgrade";
    s.src = V3_URL;

    let triedFallback = false;

    s.onerror = () => {
      console.error("[Cashfree] SDK load failed (v3)", s.src);
      if (triedFallback) return reject(new Error("Failed to load Cashfree SDK"));
      triedFallback = true;

      // fallback to legacy UI path (mode-specific)
      s.remove();
      const f = document.createElement("script");
      f.id = id;
      f.async = true;
      f.crossOrigin = "anonymous";
      f.referrerPolicy = "no-referrer-when-downgrade";
      f.src = mode === "production" ? LEGACY_PROD : LEGACY_SANDBOX;
      f.onload = init;
      f.onerror = () => {
        console.error("[Cashfree] SDK load failed (legacy)", f.src);
        reject(new Error("Failed to load Cashfree SDK"));
      };
      document.body.appendChild(f);
    };

    s.onload = init;
    document.body.appendChild(s);
  });
}


/**
 * Create order on backend and open Cashfree checkout.
 * Returns { ok:true, orderId } if checkout was invoked.
 */
export async function startCFCheckout({ rupees, bookingId, scrimId, customer }) {
  const mode = import.meta.env.VITE_CF_MODE || "production";

  // 1) Create order (ALWAYS new session for each attempt)
  const resp = await fetch(`${API_BASE}/payments/cf/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      amount: Number(rupees),
      currency: "INR",
      customer: {
        id: customer?.id,
        name: customer?.name,
        email: customer?.email,
        phone: customer?.phone || "9999999999",
      },
      // bookingId is optional now (we'll book after payment),
      // but we still pass scrimId/playerId so webhook can finalize.
      scrimId,
      playerId: customer?.id,
      note: bookingId ? `Booking ${bookingId}` : `Scrim ${scrimId}`,
    }),
  });

  const order = await resp.json();
  if (!resp.ok || !order?.ok || !order?.payment_session_id) {
    // surface Cashfree’s message if present
    const msg =
      order?.details?.message ||
      order?.message ||
      order?.error ||
      "Failed to create order";
    throw new Error(msg);
  }

  // 2) Load the right SDK (prod/sandbox must match backend env)
  const cashfree = await ensureCFSDK(mode);

  // 3) Open checkout with the FRESH payment_session_id
  await cashfree.checkout({
    paymentSessionId: order.payment_session_id,
    redirectTarget: "_self",
  });

  return { ok: true, orderId: order.order_id };
}
