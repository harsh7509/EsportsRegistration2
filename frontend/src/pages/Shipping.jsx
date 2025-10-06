// src/pages/Shipping.jsx
import React from "react";
import { Truck, Package, Globe2, Info } from "lucide-react";

export default function Shipping() {
  return (
    <div className="min-h-screen bg-gaming-dark text-white">
      <section className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-8">
          <div className="inline-flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-2 ring-1 ring-white/10">
            <Truck className="h-5 w-5" />
            <h1 className="text-2xl font-bold">Shipping & Delivery</h1>
          </div>
          <p className="mt-3 text-sm text-white/70">Effective: 06 Oct 2025</p>
        </header>

        <Section title="Digital vs Physical">
          <p>
            ArenaPulse primarily digital services provide karta hai (scrims/tournaments).
            Agar kabhi merch, goodies, ya physical rewards ship kiye jate hain, to neeche
            wali terms apply hongi.
          </p>
        </Section>

        <Section title="Processing & Dispatch">
          <ul className="list-disc space-y-2 pl-5">
            <li>Order verification ke baad typical processing time: <b>2–4 business days</b>.</li>
            <li>Pre-orders/limited editions par alag timelines ho sakti hain (product page par mentioned).</li>
          </ul>
        </Section>

        <Section title="Delivery Timelines">
          <div className="grid gap-3 md:grid-cols-3">
            <Tile icon={Package} title="Metro Cities">3–5 business days</Tile>
            <Tile icon={Globe2} title="Non-Metro / Remote">5–10 business days</Tile>
            <Tile icon={Info} title="Delays">Weather/strikes/customs se delays possible</Tile>
          </div>
        </Section>

        <Section title="Shipping Charges">
          <p>
            Charges weight, pincode, aur carrier par depend karte hain. Final cost checkout
            par dikhega. COD (if enabled) per extra fee lag sakti hai.
          </p>
        </Section>

        <Section title="Tracking & Support">
          <ul className="list-disc space-y-2 pl-5">
            <li>Dispatch ke baad tracking link email/SMS par share hota hai.</li>
            <li>Lost/damaged parcel: <b>48 hours</b> ke andar{" "}
              <a className="text-indigo-300 hover:text-indigo-200" href="mailto:support@thearenapulse.xyz">
                support@thearenapulse.xyz
              </a>{" "}
              par report karein (unboxing video/photos helpful).
            </li>
          </ul>
        </Section>

        <Section title="Returns for Shipped Items">
          <p>
            Physical items returns/cancellations ke liye{" "}
            <a className="text-indigo-300 hover:text-indigo-200" href="/cancellation-refund">
              Cancellation & Refund
            </a>{" "}
            policy follow hogi. Opened/used items par return restrictions ho sakti hain.
          </p>
        </Section>
      </section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <div className="text-sm text-white/80">{children}</div>
    </div>
  );
}

function Tile({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-5 w-5 text-white/80" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-white/80">{children}</p>
    </div>
  );
}
