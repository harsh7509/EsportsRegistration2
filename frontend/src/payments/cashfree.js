// src/payments/cashfree.js
import { API_BASE } from "../services/api";

/** Load Cashfree SDK exactly once for the chosen mode */
function ensureCFSDK(mode = "production") {
  const CDN_V3 = "https://sdk.cashfree.com/js/v3/cashfree.js";
  const LEGACY_PROD = "https://sdk.cashfree.com/js/ui/2.0.0/cashfree.js";
  const LEGACY_SB = "https://sdk.cashfree.com/js/ui/2.0.0/cashfree.sandbox.js";
  const PROXY = `${API_BASE}/payments/cf/sdk.js?mode=${mode}`;

  return new Promise((resolve, reject) => {
    const id = "cashfree-sdk";
    const init = () => {
      try { resolve(window.Cashfree({ mode })); } catch (e) { reject(e); }
    };
    if (document.getElementById(id)) return init();

    const tryLoad = (srcs, idx = 0) => {
      if (idx >= srcs.length) return reject(new Error("Failed to load Cashfree SDK"));
      const src = srcs[idx];
      const s = document.createElement("script");
      s.id = id;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.referrerPolicy = "no-referrer-when-downgrade";
      s.src = src;
      s.onload = init;
      s.onerror = () => {
        console.warn("[Cashfree SDK] load failed:", src);
        s.remove();
        tryLoad(srcs, idx + 1);
      };
      document.body.appendChild(s);
    };

    // Try CDN v3 → Legacy → Your proxy (last)
    tryLoad([
      CDN_V3,
      mode === "production" ? LEGACY_PROD : LEGACY_SB,
      PROXY,
    ]);
  });
}


/**
 * Create order on backend and open Cashfree checkout.
 * Returns { ok:true, orderId } if checkout was invoked.
 */
export async function startCFCheckout({ rupees, bookingId, scrimId, customer }) {
  const mode = import.meta.env.VITE_CF_MODE || "production";

  // 1) Create a fresh order (unchanged)
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
      scrimId,
      playerId: customer?.id,
      note: bookingId ? `Booking ${bookingId}` : `Scrim ${scrimId}`,
    }),
  });
  const order = await resp.json();
  if (!resp.ok || !order?.ok || !order?.payment_session_id) {
    const msg = order?.details?.message || order?.message || order?.error || "Failed to create order";
    throw new Error(msg);
  }

  // 2) Load SDK (now tries CDN, then legacy, then your proxy)
  const cashfree = await ensureCFSDK(mode);

  // 3) Open checkout with the FRESH session id
  await cashfree.checkout({
    paymentSessionId: order.payment_session_id,
    redirectTarget: "_self",
  });

  return { ok: true, orderId: order.order_id };
}



