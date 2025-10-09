// src/payments/cashfree.js
// src/payments/cashfree.js  (FRONTEND)
import { API_BASE } from "../services/api";

export async function startCFCheckout({ rupees, bookingId, scrimId, customer }) {
  const order = await fetch(`${API_BASE}/payments/cf/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      amount: rupees,
       customer: {
        id: customer?.id,
        name: customer?.name,
        email: customer?.email,
        phone: customer?.phone,
      },
      bookingId,
      scrimId,
      playerId: customer?.id,
      note: `Booking ${bookingId}`,
    }),
  }).then((r) => r.json());

  if (!order?.ok) throw new Error(order?.error || "Failed to create order");

  const cashfree = window.Cashfree({
    mode: import.meta.env.VITE_CF_MODE || "sandbox",
  });

  const result = await cashfree.checkout({
    paymentSessionId: order.payment_session_id,
    redirectTarget: "_self",
  });

  return result;
}

