// frontend/src/pages/VerifyOrg.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Badge,
  Camera,
  UploadCloud,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Info,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { organizationsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import SEO from "../components/SEO"

/**
 * VerifyOrg — polished UI w/ verified lock
 * - If org is already verified, the form is read-only and submit is disabled
 * - Better status ribbon + small visual refinements
 */
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

  // local validation state
  const [errors, setErrors] = useState({});

  // previews
  const aadhaarPreview = useObjectUrl(aadhaarImage);
  const selfiePreview = useObjectUrl(selfieImage);

  // Prefill email once
  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  // Load existing KYC status
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
        setStatus("unsubmitted");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Derived
  const isApproved = verified || status === "approved";
  const isPending = status === "pending";

  const aadhaarDigits = aadhaar.replace(/\D/g, "").slice(0, 12);
  const aadhaarValid = /^\d{12}$/.test(aadhaarDigits);
  const aadhaarPretty = aadhaarDigits.replace(
    /(\d{4})(\d{0,4})(\d{0,4})/,
    (_, a, b, c) => [a, b, c].filter(Boolean).join(" ")
  );

  const stepCount = useMemo(() => {
    let filled = 0;
    if (legalName.trim()) filled++;
    if (email.trim()) filled++;
    if (dob) filled++;
    if (aadhaarValid) filled++;
    if (aadhaarImage) filled++;
    if (selfieImage) filled++;
    if (consent) filled++;
    return filled;
  }, [legalName, email, dob, aadhaarValid, aadhaarImage, selfieImage, consent]);

  const canSubmit = useMemo(() => {
    const all =
      legalName.trim() &&
      email.trim() &&
      dob &&
      aadhaarValid &&
      aadhaarImage &&
      selfieImage &&
      consent;
    // Disable if already verified OR pending review
    return Boolean(all) && !isApproved && !isPending;
  }, [
    legalName,
    email,
    dob,
    aadhaarValid,
    aadhaarImage,
    selfieImage,
    consent,
    isApproved,
    isPending,
  ]);

  const validate = () => {
    const next = {};
    if (!legalName.trim()) next.legalName = "Required";
    if (!email.trim()) next.email = "Required";
    if (!dob) next.dob = "Required";
    if (!aadhaarValid) next.aadhaar = "Must be 12 digits";
    if (!aadhaarImage) next.aadhaarImage = "Required";
    if (!selfieImage) next.selfieImage = "Required";
    if (!consent) next.consent = "Consent is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("legalName", legalName.trim());
      fd.append("email", email.trim());
      fd.append("dob", dob);
      fd.append("aadhaarNumber", aadhaarDigits);
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
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Loading…
        </div>
      </Page>
    );
  }

  const progress = Math.round((stepCount / 7) * 100);
  const submitLabel = isApproved
    ? "Organization already verified"
    : isPending
    ? "Under review…"
    : submitting
    ? "Submitting…"
    : "Submit for review";

  const formDisabled = isApproved || isPending;

  return (
    <>
      <SEO
        title="Verify Your Esports Organization | ArenaPulse"
        description="Submit your KYC and verification details to become a verified organizer on ArenaPulse. Gain credibility and access to hosting tools."
        keywords="verify organization, esports verification, organizer KYC"
        canonical="https://thearenapulse.xyz/org/verify"
      />

      <Page>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 border border-gray-700"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold">
              Verify your organization
            </h1>
            {isApproved && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-700/40">
                <ShieldCheck className="w-4 h-4" />
                Verified
              </span>
            )}
          </div>
        </div>

        {/* Success ribbon when verified */}
        {isApproved && (
          <div className="mb-6 rounded-2xl border border-emerald-700/40 bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3 text-emerald-200">
              <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold">You’re verified 🎉</div>
                <div className="text-sm opacity-90">
                  Your organizer tools are fully unlocked. The form below is now
                  read-only.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status strip */}
        <StatusStrip status={status} verified={verified} />

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-400">Completion</div>
            <div className="text-sm text-gray-300">{progress}%</div>
          </div>
          <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
            <div
              className={`h-full transition-[width] duration-300 ${
                isApproved
                  ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                  : "bg-gradient-to-r from-gaming-purple to-gaming-cyan"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <StepChip done={!!legalName}>Owner name</StepChip>
            <StepChip done={!!email}>Email</StepChip>
            <StepChip done={!!dob}>DOB</StepChip>
            <StepChip done={aadhaarValid}>Aadhaar</StepChip>
            <StepChip done={!!aadhaarImage}>Aadhaar photo</StepChip>
            <StepChip done={!!selfieImage}>Selfie</StepChip>
            <StepChip done={!!consent}>Consent</StepChip>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: form */}
          <div className="lg:col-span-2">
            <Card>
              <form
                onSubmit={onSubmit}
                className={`space-y-6 ${formDisabled ? "opacity-80" : ""}`}
              >
                <SectionHeader icon={<ShieldCheck className="w-5 h-5" />}>
                  Organization owner details
                </SectionHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextInput
                    label="Legal name"
                    placeholder="Full name as per ID"
                    value={legalName}
                    onChange={(v) => {
                      setLegalName(v);
                      setErrors((e) => ({ ...e, legalName: undefined }));
                    }}
                    required
                    error={errors.legalName}
                    disabled={formDisabled}
                  />
                  <TextInput
                    label="Email"
                    type="email"
                    placeholder="owner@org.com"
                    value={email}
                    onChange={(v) => {
                      setEmail(v);
                      setErrors((e) => ({ ...e, email: undefined }));
                    }}
                    required
                    error={errors.email}
                    disabled={formDisabled}
                  />
                  <TextInput
                    label="Date of birth"
                    type="date"
                    value={dob}
                    onChange={(v) => {
                      setDob(v);
                      setErrors((e) => ({ ...e, dob: undefined }));
                    }}
                    required
                    error={errors.dob}
                    disabled={formDisabled}
                  />
                  <TextInput
                    label="Aadhaar number"
                    placeholder="XXXX XXXX XXXX"
                    value={aadhaarPretty}
                    onChange={(v) => {
                      const digits = v.replace(/\D/g, "").slice(0, 12);
                      setAadhaar(digits);
                      setErrors((e) => ({ ...e, aadhaar: undefined }));
                    }}
                    inputMode="numeric"
                    maxLength={14}
                    hint={aadhaarValid ? "Looks good." : "12 digits required."}
                    status={aadhaarValid ? "ok" : "warn"}
                    required
                    error={errors.aadhaar}
                    disabled={formDisabled}
                  />
                </div>

                <Divider />

                <SectionHeader icon={<Badge className="w-5 h-5" />}>
                  Identity images
                </SectionHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DropZone
                    label="Aadhaar card photo"
                    file={aadhaarImage}
                    preview={aadhaarPreview}
                    onFile={(f) => {
                      const checked = validateImageFile(f);
                      if (checked) {
                        setAadhaarImage(checked);
                        setErrors((e) => ({ ...e, aadhaarImage: undefined }));
                      }
                    }}
                    tips={[
                      "Clear photo of the front side",
                      "Ensure all details are readable",
                    ]}
                    error={errors.aadhaarImage}
                    disabled={formDisabled}
                  />
                  <DropZone
                    label="Selfie holding Aadhaar"
                    file={selfieImage}
                    preview={selfiePreview}
                    onFile={(f) => {
                      const checked = validateImageFile(f);
                      if (checked) {
                        setSelfieImage(checked);
                        setErrors((e) => ({ ...e, selfieImage: undefined }));
                      }
                    }}
                    tips={[
                      "Your face and Aadhaar must be visible",
                      "Avoid glare and blur",
                    ]}
                    error={errors.selfieImage}
                    disabled={formDisabled}
                  />
                </div>

                <div className="flex items-start gap-3 bg-gray-800/60 border border-gray-800/80 rounded-xl p-3">
                  <Info className="w-5 h-5 text-blue-300 mt-0.5" />
                  <p className="text-sm text-gray-300">
                    Your data is used only for verification by admins and isn’t
                    shared publicly. Images are kept in a restricted folder.
                  </p>
                </div>

                <label className="flex items-start gap-2">
                  <input
                    id="consent"
                    type="checkbox"
                    className="mt-1 accent-gaming-purple"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      setErrors((er) => ({ ...er, consent: undefined }));
                    }}
                    disabled={formDisabled}
                  />
                  <span className="text-sm text-gray-300">
                    I confirm the above details are correct and I consent to
                    verification.
                    {errors.consent && (
                      <span className="block text-xs text-red-400 mt-1">
                        {errors.consent}
                      </span>
                    )}
                  </span>
                </label>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="btn-secondary"
                  >
                    {isApproved ? "Close" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={`btn-primary inline-flex items-center justify-center ${
                      !canSubmit || isApproved || isPending
                        ? "opacity-70 cursor-not-allowed"
                        : ""
                    }`}
                    title={
                      isApproved
                        ? "Your organization is already verified"
                        : isPending
                        ? "Your submission is under review"
                        : "Submit for review"
                    }
                  >
                    {submitting && !isApproved && !isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                        {submitLabel}
                      </>
                    ) : (
                      submitLabel
                    )}
                  </button>
                </div>
              </form>
            </Card>
          </div>

          {/* Right column: sticky tips */}
          <div className="space-y-6 lg:sticky lg:top-6 h-fit">
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
                <li>
                  Selfie: hold the card next to your face, both clearly visible.
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </Page>
    </>
  );
}

/* ----------------------------- UI primitives ----------------------------- */

function Page({ children }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-black via-gaming-dark to-[#0c0c14] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">{children}</div>
    </div>
  );
}

function Card({ children }) {
  return (
    <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-2xl shadow-xl p-5">
      {children}
    </div>
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
  return <div className="border-t border-gray-800 my-4" />;
}

function StepChip({ children, done }) {
  return (
    <span
      className={[
        "px-2.5 py-0.5 rounded-full text-xs font-medium border",
        done
          ? "bg-emerald-500/15 text-emerald-300 border-emerald-700/40"
          : "bg-gray-800/70 text-gray-300 border-gray-700",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function TextInput({
  label,
  hint,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  inputMode,
  maxLength,
  status, // "ok" | "warn"
  error,
  disabled,
}) {
  const ring = error
    ? "ring-1 ring-red-500/40"
    : status === "ok"
    ? "ring-1 ring-emerald-500/30"
    : "";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>
      <input
        className={`input w-full ${ring} ${
          disabled ? "opacity-70 cursor-not-allowed" : ""
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        required={required}
        disabled={disabled}
      />
      {error ? (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      ) : hint ? (
        <p
          className={`text-xs mt-1 ${
            status === "ok" ? "text-emerald-300" : "text-gray-400"
          }`}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function DropZone({
  label,
  file,
  preview,
  onFile,
  tips = [],
  error,
  disabled,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const onDrop = (e) => {
    e.preventDefault();
    if (disabled) return;
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
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={[
          "rounded-2xl border-2 border-dashed p-4 transition-colors",
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
          dragOver
            ? "border-gaming-purple bg-gaming-purple/10"
            : "border-gray-700 hover:border-gray-600",
          error ? "border-red-500/60" : "",
        ].join(" ")}
        onClick={() => !disabled && inputRef.current?.click()}
        title={disabled ? "Form is read-only" : "Click or drag-and-drop"}
      >
        {!file ? (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-800 border border-gray-700">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium">
                {disabled ? "Uploads disabled" : "Click to upload"}
              </div>
              <div className="text-sm text-gray-400">
                {disabled
                  ? "Already verified / under review"
                  : "or drag and drop an image file (JPG/PNG/WEBP, ≤ 5MB)"}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <img
              src={preview}
              alt="preview"
              className="w-20 h-20 object-cover rounded-xl border border-gray-700"
            />
            <div className="space-y-1">
              <div className="text-sm text-gray-300 truncate max-w-[22ch]">
                {file.name}
              </div>
              <div className="text-xs text-gray-500">
                {Math.round(file.size / 1024)} KB
              </div>
              {!disabled && (
                <button
                  type="button"
                  className="text-xs text-red-300 hover:text-red-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFile(null);
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] || null)}
          disabled={disabled}
        />
      </div>
      {error ? (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      ) : tips?.length ? (
        <ul className="mt-2 text-xs text-gray-400 space-y-1 list-disc pl-4">
          {tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function StatusStrip({ status, verified }) {
  const chip = (text, cls) => (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}
    >
      {text}
    </span>
  );

  let node = chip(
    "Not submitted",
    "bg-gray-800 border border-gray-700 text-gray-300"
  );
  if (status === "pending")
    node = chip(
      "Under review",
      "bg-yellow-500/15 text-yellow-300 border border-yellow-700/40"
    );
  if (status === "approved")
    node = chip(
      "Approved",
      "bg-emerald-500/15 text-emerald-300 border-emerald-700/40"
    );
  if (status === "rejected")
    node = chip(
      "Rejected — edit & resubmit",
      "bg-red-500/15 text-red-300 border-red-700/40"
    );

  return (
    <div className="flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-800 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-3">
        {status === "approved" ? (
          <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-700/40">
            <CheckCircle2 className="w-5 h-5" />
          </span>
        ) : status === "rejected" ? (
          <span className="p-2 rounded-xl bg-red-500/15 text-red-300 border border-red-700/40">
            <XCircle className="w-5 h-5" />
          </span>
        ) : (
          <span className="p-2 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-700/40">
            <Camera className="w-5 h-5" />
          </span>
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

/* ------------------------------- helpers ------------------------------- */
function useObjectUrl(file) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

function validateImageFile(file) {
  if (!file) return null;
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  const tooBig = file.size > 5 * 1024 * 1024;
  if (!validTypes.includes(file.type)) {
    toast.error("Please upload JPG/PNG/WEBP images only.");
    return null;
  }
  if (tooBig) {
    toast.error("Image must be 5MB or less.");
    return null;
  }
  return file;
}