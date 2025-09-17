import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Badge, Camera, UploadCloud, CheckCircle2, XCircle, ArrowLeft, Info } from "lucide-react";
import toast from "react-hot-toast";
import { organizationsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function VerifyOrg() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // "unsubmitted" | "pending" | "approved" | "rejected"
  const [verified, setVerified] = useState(false);

  // Form state
  const [legalName, setLegalName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [aadhaarImage, setAadhaarImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [consent, setConsent] = useState(false);

  const aadhaarPreview = useObjectUrl(aadhaarImage);
  const selfiePreview  = useObjectUrl(selfieImage);

  // Prefill email from user once on mount
  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await organizationsAPI.myKyc();
        if (!mounted) return;
        const k = res?.data?.orgKyc;
        setVerified(!!res?.data?.verified);
        setStatus(k?.status || "unsubmitted");
      } catch {
        // first time user – ignore
        setStatus("unsubmitted");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const canSubmit = useMemo(() => {
    const all = legalName && email && dob && aadhaar && aadhaarImage && selfieImage && consent;
    return Boolean(all) && status !== "pending" && status !== "approved";
  }, [legalName, email, dob, aadhaar, aadhaarImage, selfieImage, consent, status]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("legalName", legalName.trim());
      fd.append("email", email.trim());
      fd.append("dob", dob);
      fd.append("aadhaarNumber", aadhaar.trim());
      if (aadhaarImage) fd.append("aadhaarImage", aadhaarImage);
      if (selfieImage) fd.append("selfieImage", selfieImage);

      const res = await organizationsAPI.submitKyc(fd);
      setStatus(res?.data?.orgKyc?.status || "pending");
      toast.success("KYC submitted. We'll notify you after review.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Page>
        <div className="flex items-center justify-center py-24 text-gray-400">Loading…</div>
      </Page>
    );
  }

  return (
    <Page>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Verify your organization</h1>
          <p className="text-gray-400">Submit KYC to get a verified badge and unlock organizer tools.</p>
        </div>
      </div>

      {/* Status strip */}
      <StatusStrip status={status} verified={verified} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: form */}
        <div className="lg:col-span-2">
          <Card>
            <form onSubmit={onSubmit} className="space-y-5">
              <SectionHeader icon={<ShieldCheck className="w-5 h-5" />}>Organization owner details</SectionHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput label="Legal name" placeholder="Full name as per ID" value={legalName} onChange={setLegalName} required />
                <TextInput label="Email" type="email" placeholder="owner@org.com" value={email} onChange={setEmail} required />
                <TextInput label="Date of birth" type="date" value={dob} onChange={setDob} required />
                <TextInput
                  label="Aadhaar number"
                  placeholder="XXXX XXXX XXXX"
                  value={aadhaar}
                  onChange={setAadhaar}
                  inputMode="numeric"
                  maxLength={12}
                  hint="We store this securely. Only admins can view."
                  required
                />
              </div>

              <Divider />

              <SectionHeader icon={<Badge className="w-5 h-5" />}>Identity images</SectionHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DropZone
                  label="Aadhaar card photo"
                  file={aadhaarImage}
                  preview={aadhaarPreview}
                  onFile={setAadhaarImage}
                  tips={[
                    "Clear photo of the front side",
                    "Ensure all details are readable",
                  ]}
                />
                <DropZone
                  label="Selfie holding Aadhaar"
                  file={selfieImage}
                  preview={selfiePreview}
                  onFile={setSelfieImage}
                  tips={[
                    "Your face and Aadhaar must be visible",
                    "Avoid glare and blur",
                  ]}
                />
              </div>

              <div className="flex items-start gap-3 bg-gray-800/60 border border-gray-700 rounded-xl p-3">
                <Info className="w-5 h-5 text-blue-300 mt-0.5" />
                <p className="text-sm text-gray-300">
                  Your data is used only for verification by admins and isn’t shared publicly. Images are kept in a restricted folder.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="consent"
                  type="checkbox"
                  className="accent-gaming-purple"
                  checked={consent}
                  onChange={(e)=>setConsent(e.target.checked)}
                />
                <label htmlFor="consent" className="text-sm text-gray-300">
                  I confirm the above details are correct and I consent to verification.
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={!canSubmit || submitting} className="btn-primary">
                  {submitting ? "Submitting…" : "Submit for review"}
                </button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right column: tips & what happens next */}
        <div className="space-y-6">
          <Card>
            <SectionHeader>Why verify?</SectionHeader>
            <ul className="list-disc pl-5 space-y-2 text-gray-300 text-sm">
              <li>Get a visible verified badge on your org profile.</li>
              <li>Increase trust with players and partners.</li>
              <li>Unlock access to advanced organizer tools.</li>
            </ul>
          </Card>
          <Card>
            <SectionHeader>Photo guidelines</SectionHeader>
            <ul className="list-disc pl-5 space-y-2 text-gray-300 text-sm">
              <li>Use good lighting; avoid shadows and glare.</li>
              <li>Ensure the Aadhaar number and your name are readable.</li>
              <li>Selfie: hold the card next to your face, both clearly visible.</li>
            </ul>
          </Card>
        </div>
      </div>
    </Page>
  );
}

/* ----------------------------- UI primitives ----------------------------- */

function Page({ children }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gaming-dark text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">{children}</div>
    </div>
  );
}

function Card({ children }) {
  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-2xl shadow-xl p-5">{children}</div>
  );
}

function SectionHeader({ children, icon }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      {icon ? <span className="text-gaming-purple">{icon}</span> : null}
      <h2 className="text-lg font-semibold">{children}</h2>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-gray-800 my-4"/>;
}

function TextInput({ label, hint, value, onChange, type = "text", required, placeholder, inputMode, maxLength }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label}{required && <span className="text-red-400"> *</span>}
      </label>
      <input
        className="input w-full"
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        required={required}
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function DropZone({ label, file, preview, onFile, tips = [] }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label} <span className="text-red-400">*</span>
      </label>
      <div
        onDragOver={(e)=>{ e.preventDefault(); setDragOver(true); }}
        onDragLeave={()=>setDragOver(false)}
        onDrop={onDrop}
        className={[
          "rounded-2xl border-2 border-dashed p-4 transition-colors cursor-pointer",
          dragOver ? "border-gaming-purple bg-gaming-purple/10" : "border-gray-700 hover:border-gray-600"
        ].join(" ")}
        onClick={()=> inputRef.current?.click()}
        title="Click or drag-and-drop"
      >
        {!file ? (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-800 border border-gray-700">
              <UploadCloud className="w-5 h-5"/>
            </div>
            <div>
              <div className="font-medium">Click to upload</div>
              <div className="text-sm text-gray-400">or drag and drop an image file (JPG/PNG)</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <img src={preview} alt="preview" className="w-20 h-20 object-cover rounded-xl border border-gray-700" />
            <div className="space-y-1">
              <div className="text-sm text-gray-300 truncate max-w-[22ch]">{file.name}</div>
              <div className="text-xs text-gray-500">{Math.round(file.size/1024)} KB</div>
              <button
                type="button"
                className="text-xs text-red-300 hover:text-red-200"
                onClick={(e)=>{e.stopPropagation(); onFile(null);}}
              >
                Remove
              </button>
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e)=> onFile(e.target.files?.[0] || null)}
        />
      </div>
      {tips?.length ? (
        <ul className="mt-2 text-xs text-gray-400 space-y-1 list-disc pl-4">
          {tips.map((t,i)=>(<li key={i}>{t}</li>))}
        </ul>
      ) : null}
    </div>
  );
}

function StatusStrip({ status, verified }) {
  const chip = (text, cls) => (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      {text}
    </span>
  );

  let node = chip("Not submitted", "bg-gray-800 border border-gray-700 text-gray-300");
  if (status === "pending") node = chip("Under review", "bg-yellow-500/15 text-yellow-300 border border-yellow-700/40");
  if (status === "approved") node = chip("Approved", "bg-emerald-500/15 text-emerald-300 border border-emerald-700/40");
  if (status === "rejected") node = chip("Rejected — edit & resubmit", "bg-red-500/15 text-red-300 border border-red-700/40");

  return (
    <div className="flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-800 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-3">
        {status === "approved" ? (
          <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-700/40"><CheckCircle2 className="w-5 h-5"/></span>
        ) : status === "rejected" ? (
          <span className="p-2 rounded-xl bg-red-500/15 text-red-300 border border-red-700/40"><XCircle className="w-5 h-5"/></span>
        ) : (
          <span className="p-2 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-700/40"><Camera className="w-5 h-5"/></span>
        )}
        <div>
          <div className="font-semibold">KYC status</div>
          <div className="text-sm text-gray-400">
            {status === "unsubmitted"
              ? "You haven't submitted any documents yet."
              : status === "pending"
              ? "Your submission is being reviewed by admins."
              : status === "approved"
              ? "You're fully verified."
              : "Your submission was rejected. Update details and resubmit."}
          </div>
        </div>
      </div>
      <div className="hidden md:block">{node}</div>
    </div>
  );
}

/* ------------------------------- hooks ------------------------------- */
function useObjectUrl(file) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) { setUrl(""); return; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}
