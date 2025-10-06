// src/pages/ContactUs.jsx
import React, { useState } from "react";
import { Mail, Phone, MapPin, Send, Loader2 } from "lucide-react";
import { sendContact } from "../services/api";

export default function ContactUs() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

 const submit = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    const { name, email, subject, message } = form;
    const resp = await sendContact({ name, email, subject, message });
    if (resp?.ok) {
      alert("Thanks! We’ll get back within 24–48h.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } else {
      alert(resp?.error || "Could not send. Try again.");
    }
  } catch (err) {
    alert("Network error. Please try again.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gaming-dark text-white">
      <section className="relative mx-auto max-w-5xl px-6 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Contact Us</h1>
          <p className="mt-2 text-sm text-white/70">
            Queries, partnerships, or support—hum yahin hain.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-5">
          <div className="md:col-span-3 rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-semibold">Send a Message</h2>
            <form className="space-y-4" onSubmit={submit}>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Name" name="name" value={form.name} onChange={onChange} />
                <Input label="Email" name="email" type="email" value={form.email} onChange={onChange} />
              </div>
              <Input label="Subject" name="subject" value={form.subject} onChange={onChange} />
              <div>
                <label className="mb-1.5 block text-xs text-white/70">Message</label>
                <textarea
                  name="message"
                  rows={5}
                  value={form.message}
                  onChange={onChange}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="How can we help?"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 font-semibold hover:bg-indigo-600 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                {loading ? "Sending…" : "Send Message"}
              </button>
            </form>
          </div>

          <div className="md:col-span-2 grid gap-4">
            <Tile icon={Mail} title="Email">
              <a className="text-indigo-300 hover:text-indigo-200" href="mailto:support@thearenapulse.xyz">
                support@thearenapulse.xyz
              </a>
            </Tile>
            <Tile icon={Phone} title="Phone">
              <p className="text-white/80">+91-XXXXXXXXXX (10:00–18:00 IST)</p>
            </Tile>
            <Tile icon={MapPin} title="Address">
              <p className="text-white/80">ArenaPulse, Gurgaon, Haryana, India</p>
            </Tile>
          </div>
        </div>
      </section>
    </div>
  );
}

function Input({ label, ...rest }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-white/70">{label}</label>
      <input
        {...rest}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30"
        required
      />
    </div>
  );
}

function Tile({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-5 w-5 text-white/80" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
