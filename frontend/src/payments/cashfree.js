// src/payments/cashfree.js
import { API_BASE } from "../services/api";

/** Load Cashfree SDK exactly once for the chosen mode */
function ensureCFSDK(mode = "production") {
  return new Promise((resolve, reject) => {
    const id = "cashfree-sdk";
    const init = () => {
      try {
        const cf = window.Cashfree({ mode });
        resolve(cf);
      } catch (e) {
        reject(e);
      }
    };

    const existing = document.getElementById(id);
    if (existing) return init();

    const s = document.createElement("script");
    s.id = id;
    s.async = true;
    s.src =
      mode === "production"
        ? "https://sdk.cashfree.com/js/ui/2.0.0/cashfree.js"
        : "https://sdk.cashfree.com/js/ui/2.0.0/cashfree.sandbox.js";
    s.onload = init;
    s.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
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
