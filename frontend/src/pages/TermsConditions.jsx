// src/pages/TermsConditions.jsx
import React from "react";
import { Scale, Shield, UserCheck } from "lucide-react";

export default function TermsConditions() {
  return (
    <div className="min-h-screen bg-gaming-dark text-white">
      <section className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-8">
          <div className="inline-flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-2 ring-1 ring-white/10">
            <Scale className="h-5 w-5" />
            <h1 className="text-2xl font-bold">Terms & Conditions</h1>
          </div>
          <p className="mt-3 text-sm text-white/70">Effective: 06 Oct 2025</p>
        </header>

        <Section title="Acceptance of Terms">
          ArenaPulse app/website use karke aap in T&C se agree karte ho. Hum en terms ko
          kabhi bhi update kar sakte hai—latest version website par hoga.
        </Section>

        <Section title="User Accounts & Eligibility">
          <ul className="list-disc space-y-2 pl-5">
            <li>Minimum age 13+; jurisdiction ke rules follow honge.</li>
            <li>Registration data true, accurate, aur updated rehna chahiye.</li>
            <li>Security: apne credentials safe rakho; unauthorized use turant report karo.</li>
          </ul>
        </Section>

        <Section title="Platform Usage">
          <ul className="list-disc space-y-2 pl-5">
            <li>Abusive, hateful, cheating, ya exploitative behavior strictly prohibited.</li>
            <li>Match-fixing, smurfing, or fraudulent payments → account suspension/ban.</li>
            <li>Content uploads par aap confirm karte ho ki aapke paas necessary rights hain.</li>
          </ul>
        </Section>

        <Section title="Payments & Fees">
          <p>
            Payment gateways (UPI/cards/wallets) third-party hain; processing charges apply
            ho sakte hain. Refund rules ke liye{" "}
            <a className="text-indigo-300 hover:text-indigo-200" href="/cancellation-refund">
              Cancellation & Refund
            </a>{" "}
            page dekhiye.
          </p>
        </Section>

        <Section title="Tournaments & Scrims">
          <ul className="list-disc space-y-2 pl-5">
            <li>Rules, slots, timing aur prize details event page par define honge.</li>
            <li>Organizer ki rules-violation findings final ho sakti hain.</li>
            <li>No-show/late arrivals → disqualification possible, refund nahi.</li>
          </ul>
        </Section>

        <Section title="Privacy & Data">
          <div className="flex items-start gap-3">
            <Shield className="mt-1 h-5 w-5 text-indigo-300" />
            <p>
              Hum minimal data collect karte hain to deliver services. Security measures
              follow karte hain but 100% guarantee possible nahi. Legal requests per data
              disclose ho sakta hai.
            </p>
          </div>
        </Section>

        <Section title="Liability & Indemnity">
          <p>
            Service “as-is” basis par provide hota hai. ArenaPulse indirect, incidental, or
            consequential losses ke liye liable nahi hoga. Aap agree karte ho ki platform
            misuse se arising claims/charges se ArenaPulse ko indemnify karoge.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            Policy violations par hum account suspend/terminate kar sakte hain. Aap bhi kabhi
            account delete request kar sakte ho.
          </p>
        </Section>

        <Section title="Jurisdiction & Contact">
          <div className="flex items-start gap-3">
            <UserCheck className="mt-1 h-5 w-5 text-indigo-300" />
            <p>
              Governing law: India. Primary jurisdiction: Gurgaon, Haryana (unless required
              otherwise). Queries:{" "}
              <a className="text-indigo-300 hover:text-indigo-200" href="mailto:legal@thearenapulse.xyz">
                legal@thearenapulse.xyz
              </a>
              .
            </p>
          </div>
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
