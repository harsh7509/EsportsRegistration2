// src/pages/PrivacyPolicy.jsx
import React from "react";
import { Shield, Lock, Cookie, Eye, Database, UserCheck, Globe2, AlertTriangle, RefreshCcw } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gaming-dark text-white">
      <section className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-8">
          <div className="inline-flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-2 ring-1 ring-white/10">
            <Shield className="h-5 w-5" />
            <h1 className="text-2xl font-bold">Privacy Policy</h1>
          </div>
          <p className="mt-3 text-sm text-white/70">Effective: 06 Oct 2025</p>
          <p className="mt-2 text-sm text-white/70">
            Yeh policy batati hai ki ArenaPulse aapke data ko kaise collect, use, aur protect karta hai.
          </p>
        </header>

        <Section title="We Collect (Minimal & Purposeful)" icon={Database}>
          <ul className="list-disc space-y-2 pl-5 text-white/85">
            <li><b>Account info:</b> name, email, phone (optional), role (player/org/admin).</li>
            <li><b>Org details:</b> org name, location, public profile info.</li>
            <li><b>Usage data:</b> pages visited, device info, rough location (city-level).</li>
            <li><b>Payments:</b> amount, status, gateway reference (card/UPI numbers <i>store</i> nahin karte).</li>
            <li><b>UGC:</b> chats, posts, uploads (community rules follow).</li>
          </ul>
        </Section>

        <Section title="How We Use Data" icon={Eye}>
          <ul className="list-disc space-y-2 pl-5">
            <li>Accounts manage karna, scrim/tournament bookings chalana.</li>
            <li>Fraud prevention, safety & moderation.</li>
            <li>Analytics/quality improvements (aggregated & anonymized where possible).</li>
            <li>Legal compliance (tax/GST invoices, disputes handling).</li>
          </ul>
        </Section>

        <Section title="Payments & Third Parties" icon={Lock}>
          <p className="text-white/85">
            Payments trusted gateways (e.g., UPI/cards via provider) ke through hote hain.
            Hum sensitive payment data (card details) store nahin karte. Gateways apni policies ke mutabik data
            process karte hain. Email/SMS delivery, analytics aur file storage ke liye limited third-party services
            use kar sakte hain (need-to-know basis).
          </p>
        </Section>

        <Section title="Cookies & Similar Tech" icon={Cookie}>
          <ul className="list-disc space-y-2 pl-5">
            <li><b>Essential:</b> login/session ke liye.</li>
            <li><b>Analytics:</b> usage ko samajhne ke liye (opt-out options browser/OS settings me).</li>
            <li><b>Attribution:</b> referral/partner links track karne ke liye (time-bound).</li>
          </ul>
        </Section>

        <Section title="Data Sharing (When & Why)" icon={Globe2}>
          <ul className="list-disc space-y-2 pl-5">
            <li>Service providers (email, storage, analytics) — contractually bound & limited access.</li>
            <li>Legal/regulatory requests jab required ho.</li>
            <li>Org listings/public profiles me jo aap share karte ho, woh public ho sakta hai.</li>
          </ul>
        </Section>

        <Section title="Your Controls & Rights" icon={UserCheck}>
          <ul className="list-disc space-y-2 pl-5">
            <li>Profile edit/update — app ke “Edit Profile” me.</li>
            <li>Data access/export/delete request — <a href="mailto:privacy@thearenapulse.xyz" className="text-indigo-300 hover:text-indigo-200">privacy@thearenapulse.xyz</a>.</li>
            <li>Marketing comms se opt-out — email footer/notification settings.</li>
          </ul>
        </Section>

        <Section title="Retention" icon={RefreshCcw}>
          <p className="text-white/85">
            Data utna hi time rakhte hain jitna service/ कानूनी कारणों ke liye zaroori ho.
            Close/delete request ke baad bhi certain records (invoices, fraud logs) law ke mutabik retain ho sakte hain.
          </p>
        </Section>

        <Section title="Security" icon={Lock}>
          <p className="text-white/85">
            Industry-standard security measures follow karte hain (encryption in transit, access controls).
            100% security guarantee possible nahin — users ko bhi apne credentials safe rakhne chahiye.
          </p>
        </Section>

        <Section title="Children" icon={AlertTriangle}>
          <p className="text-white/85">
            13 saal se kam ke users ke liye service intended nahin hai. Agar galti se minor data submit ho gaya ho
            to hume email karein; hum promptly delete karenge.
          </p>
        </Section>

        <Section title="International Transfers" icon={Globe2}>
          <p className="text-white/85">
            Services ke dauraan data India ke bahar bhi process ho sakta hai. Har transfer applicable laws aur
            safeguards ke saath hota hai.
          </p>
        </Section>

        <Section title="Updates to this Policy" icon={Shield}>
          <p className="text-white/85">
            Policy kabhi bhi update ho sakti hai. “Effective” date upar dekh sakte hain.
            Significant changes par in-app/email notice dene ki koshish karenge.
          </p>
        </Section>

        <Section title="Contact" icon={Shield}>
          <ul className="list-disc space-y-2 pl-5">
            <li>Email: <a href="mailto:privacy@thearenapulse.xyz" className="text-indigo-300 hover:text-indigo-200">privacy@thearenapulse.xyz</a></li>
            <li>Support: <a href="/contact" className="text-indigo-300 hover:text-indigo-200">/contact</a></li>
            <li>Legal Notices: <a href="/terms" className="text-indigo-300 hover:text-indigo-200">/terms</a></li>
          </ul>
        </Section>
      </section>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-2 flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-white/80" />}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="text-sm text-white/80">{children}</div>
    </div>
  );
}
