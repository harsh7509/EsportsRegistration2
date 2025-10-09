// src/payments/cashfree.js (FRONTEND)
import { API_BASE } from "../services/api";

function loadCashfree(mode) {
  return new Promise((resolve, reject) => {
    const scriptId = "cashfree-sdk";
    const already = document.getElementById(scriptId);


       // ADD at top of src/payments/cashfree.js
function ensureCFSDK(mode) {
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
      (mode || "production") === "production"
        ? "https://sdk.cashfree.com/js/ui/2.0.0/cashfree.js"
        : "https://sdk.cashfree.com/js/ui/2.0.0/cashfree.sandbox.js";
    s.onload = init;
    s.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
    document.body.appendChild(s);
  });
}

    const init = () => {
      try {
        const cf = window.Cashfree({ mode });
        resolve(cf);
      } catch (e) {
        reject(e);
      }
    };

    if (already) {
      // if already loaded, just init
      return init();
    }
    const s = document.createElement("script");
    s.id = scriptId;
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
 * @param {Object} p
 * @param {number} p.rupees
 * @param {string} p.bookingId
 * @param {string} p.scrimId
 * @param {Object} p.customer {id,name,email,phone}
 */
export async function startCFCheckout({ rupees, bookingId, scrimId, customer }) {
  const mode = import.meta.env.VITE_CF_MODE || "production";

  // 1) create order on backend
  const res = await fetch(`${API_BASE}/payments/cf/create-order`, {
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
      bookingId,
      scrimId,
      playerId: customer?.id,
      note: `Booking ${bookingId}`,
    }),
  });
  const order = await res.json();
  if (!res.ok || !order?.ok) {
    throw new Error(order?.error || order?.details?.message || "Failed to create order");
  }

  // 2) load SDK for the right mode
  const cashfree = await loadCashfree(mode);

  // 3) open checkout with fresh payment_session_id
  await cashfree.checkout({
    paymentSessionId: order.payment_session_id,
    redirectTarget: "_self",
  });

  return { ok: true, orderId: order.order_id };
}
