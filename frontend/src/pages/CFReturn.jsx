import React from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../services/api"; // your axios instance (default export at bottom)

export default function CFReturn() {
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const [state, setState] = React.useState({ loading: true, status: "PENDING", data: null, error: "" });

  React.useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const { data } = await api.get(`/payments/cf/status/${orderId}`);
        // Cashfree returns fields like order_status: ACTIVE | PAID | EXPIRED | CANCELLED
        if (!mounted) return;
        setState({ loading: false, status: data?.order_status || "UNKNOWN", data, error: "" });
      } catch (e) {
        if (!mounted) return;
        setState({ loading: false, status: "ERROR", data: null, error: e?.response?.data?.message || e.message });
      }
    }
    if (orderId) check();
    return () => { mounted = false; };
  }, [orderId]);

  if (!orderId) return <div className="p-8">Missing order_id.</div>;
  if (state.loading) return <div className="p-8">Checking payment status…</div>;

  const ok = state.status === "PAID";
  const bad = ["CANCELLED", "EXPIRED"].includes(state.status);

  return (
    <div className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-3">Payment {ok ? "Success" : bad ? "Failed" : "Pending"}</h1>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
        <p><b>Order ID:</b> {orderId}</p>
        <p><b>Status:</b> {state.status}</p>
        {state.data?.order_amount && <p><b>Amount:</b> ₹{state.data.order_amount}</p>}
      </div>

      <div className="mt-6 flex gap-3">
        <Link className="btn-primary" to="/">Go Home</Link>
        <Link className="btn-secondary" to="/scrims">Browse Scrims</Link>
      </div>
      {!ok && !bad && <p className="mt-3 text-xs text-white/60">If the status doesn’t update, we’ll confirm via webhook shortly.</p>}
    </div>
  );
}
