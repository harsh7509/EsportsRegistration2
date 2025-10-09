// src/components/CFPayButton.jsx
import React from "react";
import { startCFCheckout } from "@/payments/cashfree";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

export default function CFPayButton({ amount, bookingId }) {
  const { user } = useAuth();
  const onPay = async () => {
    try {
      if (!window.Cashfree) throw new Error("Cashfree SDK not loaded");
      await startCFCheckout({
        rupees: amount,
        bookingId,
        customer: {
          id: user?._id || user?.id,
          name: user?.name,
          email: user?.email,
          phone: user?.phone || "9999999999",
        },
      });
      // Cashfree will now redirect to UPI app / hosted page and come back to /payments/cf/return
    } catch (e) {
      toast.error(e.message || "Unable to start payment");
    }
  };

  return (
    <button className="btn-primary" onClick={onPay}>
      Pay ₹{amount} (UPI / GPay)
    </button>
  );
}
