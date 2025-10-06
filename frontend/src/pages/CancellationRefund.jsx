// src/pages/CancellationRefund.jsx
import React from "react";
import { RotateCcw, BadgeCheck, AlertTriangle, Clock } from "lucide-react";

export default function CancellationRefund() {
  return (
    <div className="min-h-screen bg-gaming-dark text-white">
      <section className="relative mx-auto max-w-5xl px-6 py-12">
        <header className="mb-8">
          <div className="inline-flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-2 ring-1 ring-white/10">
            <RotateCcw className="h-5 w-5" />
            <h1 className="text-2xl font-bold">Cancellation & Refund Policy</h1>
          </div>
          <p className="mt-3 text-sm text-white/70">Effective: 06 Oct 2025</p>
        </header>

        <div className="grid gap-6">
          <Card title="Scope">
            <p>
              Yeh policy scrims, tournaments, aur in-app paid services par lagu hoti
              hai. Free/complimentary items par refund apply nahi hota.
            </p>
          </Card>

          <Card title="Cancellations">
            <ul className="list-disc space-y-2 pl-5 text-white/90">
              <li>
                <b>Player-side:</b> Paid scrim/tournament slot ko event se <b>24 hours</b> pehle
                cancel karoge to partial refund eligible ho sakta hai (fees minus processing).
              </li>
              <li>
                <b>Organization-side:</b> Agar host event cancel karta hai, full refund process hoga
                (processing fees bhi waive).
              </li>
              <li>
                <b>No-show:</b> Event start hone ke baad no-show par refund applicable nahi.
              </li>
            </ul>
          </Card>

          <Card title="Refund Eligibility">
            <ul className="list-disc space-y-2 pl-5">
              <li>Duplicate charge / technical failure proved → <b>100%</b> refund.</li>
              <li>Event reschedule aur naya time accept na karna → <b>100%</b> refund.</li>
              <li>Player cancel <b>&lt; 24h</b> window → refund nahi; <b>≥ 24h</b> → fee − gateway charges.</li>
            </ul>
          </Card>

          <Card title="Timelines">
            <div className="flex items-start gap-3">
              <Clock className="mt-1 h-5 w-5 text-indigo-300" />
              <p>
                Approved refunds ko initiate hum <b>3–5 business days</b> me karte hain. Bank/UPI
                settlement typically <b>5–7 business days</b> le sakta hai.
              </p>
            </div>
          </Card>

          <Card title="How to Request">
            <ol className="list-decimal space-y-2 pl-5">
              <li>App me: <b>Profile → Bookings</b> → select booking → <b>Request Refund</b>.</li>
              <li>Ya email: <b>support@thearenapulse.xyz</b> (booking ID, payment proof attach).</li>
            </ol>
          </Card>

          <Important />
          <Legal />
        </div>
      </section>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="text-sm text-white/80">{children}</div>
    </div>
  );
}

function Important() {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-300" />
        <h3 className="text-base font-semibold">Important</h3>
      </div>
      <ul className="list-disc space-y-2 pl-5 text-sm text-amber-100/90">
        <li>Gateway/processing charges non-refundable ho sakte hain.</li>
        <li>Abuse/fraud suspicion par account review/hold lag sakta hai.</li>
      </ul>
    </div>
  );
}

function Legal() {
  return (
    <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
      <div className="mb-2 flex items-center gap-2">
        <BadgeCheck className="h-5 w-5 text-green-300" />
        <h3 className="text-base font-semibold">Fair-Use & Compliance</h3>
      </div>
      <p className="text-sm text-green-50/90">
        Policy kabhi bhi update ho sakti hai. Latest version website/app par available hoga.
        Jurisdiction: India. Disputes → Gurgaon, Haryana courts (unless required otherwise).
      </p>
    </div>
  );
}
