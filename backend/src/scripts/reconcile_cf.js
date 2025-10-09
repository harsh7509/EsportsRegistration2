import 'dotenv/config';
import mongoose from 'mongoose';

const CF_BASE =
  process.env.CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

async function main() {
  const MONGO = process.env.MONGODB_URI || process.env.MONGO_URL || "mongodb://127.0.0.1:27017/arenapulse";
  await mongoose.connect(MONGO);

  const Payment = (await import("../src/models/Payment.js")).default;

  // pending for >15 minutes
  const since = new Date(Date.now() - 15 * 60 * 1000);
  const pendings = await Payment.find({
    status: { $in: ["pending", "created"] },
    createdAt: { $lte: since }
  }).limit(50);

  for (const p of pendings) {
    try {
      const resp = await fetch(`${CF_BASE}/orders/${p.orderId}`, {
        headers: {
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY,
          "x-api-version": "2022-09-01",
        },
      });
      const data = await resp.json();
      const st = data?.order_status;

      if (st === "PAID") {
        await Payment.findByIdAndUpdate(p._id, { status: "completed", paidAt: new Date(), amount: data?.order_amount });
      } else if (st === "FAILED") {
        await Payment.findByIdAndUpdate(p._id, { status: "failed" });
      }
      console.log(`Reconciled ${p.orderId}: ${st}`);
    } catch (e) {
      console.warn(`Reconcile error ${p.orderId}:`, e?.message);
    }
  }

  await mongoose.disconnect();
}

main().then(()=>process.exit(0)).catch((e)=>{console.error(e); process.exit(1);});
