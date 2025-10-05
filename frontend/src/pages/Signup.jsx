import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Gamepad2,
  Mail,
  Lock,
  User,
  Building,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  TimerReset,
} from "lucide-react";
import toast from "react-hot-toast";
import { authAPI, setTokens } from "../services/api";
import { useAuth } from "../context/AuthContext";
import SEO from "../components/SEO"

const strengthMeta = (pwd = "") => {
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const labels = ["Very Weak", "Weak", "Okay", "Good", "Strong", "Excellent"];
  const colors = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#22c55e",
    "#16a34a",
    "#0ea5e9",
  ];
  return {
    score,
    label: labels[score] || labels[0],
    color: colors[score] || colors[0],
    pct: Math.min(100, (score / 5) * 100),
  };
};

const RoleCard = ({ active, icon: Icon, title, desc, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition
      ${active
        ? "border-indigo-500 bg-indigo-500/10"
        : "border-white/10 bg-white/5 hover:border-white/20"
      }`}
  >
    <div
      className={`grid h-10 w-10 place-items-center rounded-lg ${active ? "bg-indigo-500/20" : "bg-white/10"
        }`}
    >
      <Icon
        className={`${active ? "text-indigo-300" : "text-white/80"} h-5 w-5`}
      />
    </div>
    <div>
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-white/60">{desc}</div>
    </div>
    {active && <CheckCircle2 className="ml-auto h-5 w-5 text-indigo-300" />}
  </button>
);

const Signup = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "player",
  });

  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // OTP step
  const [otpStep, setOtpStep] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0); // seconds to resend
  const { user, isAuthenticated, adoptTokensAndLoadUser } = useAuth();

  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const onChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const redirectByRole = (role) => {
    switch (role) {
      case "organization":
        navigate("/dashboard/org", { replace: true });
        break;
      case "player":
        navigate("/scrims", { replace: true });
        break;
      case "admin":
        navigate("/admin", { replace: true });
        break;
      default:
        navigate("/", { replace: true });
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role) redirectByRole(user.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.role]);

  const validation = useMemo(() => {
    const e = {};
    if (!form.name.trim())
      e.name =
        form.role === "organization"
          ? "Organization name is required"
          : "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email))
      e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6) e.password = "Minimum 6 characters";
    return e;
  }, [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors(validation);
    if (Object.keys(validation).length) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await authAPI.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });

      if (res?.data?.otpRequired) {
        setTempToken(res.data.tempToken);
        setOtpStep(true);
        setCooldown(20); // start resend timer

        toast.success("We sent a verification code to your email.");
        return;
      }

      // If backend ever returns tokens immediately
      const access =
        res?.data?.accessToken || res?.data?.access_token || res?.data?.token;
      const refresh =
        res?.data?.refreshToken || res?.data?.refresh_token || null;
      if (access) {
        setTokens(access, refresh);
        const me = await authAPI.getMe();
        const role = me?.data?.user?.role || form.role;
        toast.success("Account created!");
        redirectByRole(role);
        return;
      }

      toast.success("Account created! Please verify your email.");
    } catch (err) {
      console.error("signup failed:", err);
      toast.error(err?.response?.data?.message || "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  const sendEmailOtp = async () => {
    if (!tempToken || cooldown) return;
    setSending(true);
    try {
      await authAPI.sendOtp({ tempToken }); // email-only
      setCooldown(20);
      toast.success("OTP sent to your email.");
    } catch (e) {
      console.error("sendOtp error:", e);
      toast.error(e?.response?.data?.message || "Failed to send OTP");
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!tempToken || otp.length !== 6)
      return toast.error("Enter the 6-digit code");
    setVerifying(true);
    try {
      const res = await authAPI.verifyOtp({ tempToken, code: otp });
      const access =
        res?.data?.accessToken || res?.data?.access_token || res?.data?.token;
      const refresh =
        res?.data?.refreshToken || res?.data?.refresh_token || null;
      if (!access) throw new Error("No token returned");
      const meUser = await adoptTokensAndLoadUser(access, refresh);
      const role = meUser?.role || form.role;
      toast.success("Verified! Welcome 🎉");
      redirectByRole(role);
    } catch (e) {
      console.error("verifyOtp error:", e);
      toast.error(e?.response?.data?.message || "Invalid or expired code");
    } finally {
      setVerifying(false);
    }
  };

  const { score, label, color, pct } = strengthMeta(form.password);

  return (
    <>
      <SEO
        title="Sign Up for ArenaPulse – Join the Ultimate Esports Platform"
        description="Create your free ArenaPulse account to join or host esports scrims and tournaments. Build your esports profile and connect with organizations across games."
        keywords="signup, register esports account, join ArenaPulse, create gaming profile"
        canonical="https://thearenapulse.xyz/signup"
        schema={{
          "@context": "https://schema.org",
          "@type": "RegisterAction",
          name: "Sign Up for ArenaPulse",
          target: "https://thearenapulse.xyz/signup",
        }}
      />

      <div className="min-h-screen relative flex items-center justify-center p-6">
        {/* background */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,#6d28d9_0,#111827_55%,#0b0f1a_100%)] opacity-70" />
        <div className="relative z-10 w-full max-w-md">
          {/* header */}
          <div className="mb-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10">
              <Gamepad2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">
              Join TheArenaPulse
            </h1>
            <h2 className="mt-1 text-sm text-white/70">
              Create your account with verified email
            </h2>
          </div>

          {/* card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            {!otpStep ? (
              <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                {/* role select */}
                <div>
                  <div className="mb-2 text-xs text-white/70">I am a</div>
                  <div className="grid grid-cols-2 gap-3">
                    <RoleCard
                      active={form.role === "player"}
                      icon={User}
                      title="Player"
                      desc="Join scrims & tournaments"
                      onClick={() => setForm((s) => ({ ...s, role: "player" }))}
                    />
                    <RoleCard
                      active={form.role === "organization"}
                      icon={Building}
                      title="Organization"
                      desc="Host and manage events"
                      onClick={() =>
                        setForm((s) => ({ ...s, role: "organization" }))
                      }
                    />
                  </div>
                </div>

                {/* name */}
                <div>
                  <label
                    htmlFor="name"
                    className="mb-1.5 block text-xs text-white/70"
                  >
                    {form.role === "organization"
                      ? "Organization name"
                      : "Your name"}
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      className={`w-full rounded-xl border bg-white/5 px-10 py-2.75 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 border-white/10 ${errors.name
                          ? "ring-2 ring-rose-500/40 border-rose-500/40"
                          : ""
                        }`}
                      placeholder={
                        form.role === "organization"
                          ? "e.g., TechOrg"
                          : "e.g., Ayaan Sharma"
                      }
                      value={form.name}
                      onChange={onChange}
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-300">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-xs text-white/70"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      className={`w-full rounded-xl border bg-white/5 px-10 py-2.75 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 border-white/10 ${errors.email
                          ? "ring-2 ring-rose-500/40 border-rose-500/40"
                          : ""
                        }`}
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={onChange}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-300">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* password */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="password" className="text-xs text-white/70">
                      Password
                    </label>
                    <span className="text-[11px] text-white/50">
                      min. 6 chars
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                    <input
                      id="password"
                      name="password"
                      type={showPass ? "text" : "password"}
                      autoComplete="new-password"
                      className={`w-full rounded-xl border bg-white/5 px-10 py-2.75 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 border-white/10 ${errors.password
                          ? "ring-2 ring-rose-500/40 border-rose-500/40"
                          : ""
                        }`}
                      placeholder="Create a password"
                      value={form.password}
                      onChange={onChange}
                      onKeyUp={(ev) =>
                        setCapsOn(
                          ev.getModifierState && ev.getModifierState("CapsLock")
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/70 hover:bg-white/10"
                      aria-label={showPass ? "Hide password" : "Show password"}
                    >
                      {showPass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* hints */}
                  <div className="mt-1.5 flex items-center justify-between">
                    {errors.password ? (
                      <p className="flex items-center gap-1 text-xs text-rose-300">
                        <AlertCircle className="h-3.5 w-3.5" />{" "}
                        {errors.password}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 text-[11px] text-white/60">
                        <span>Password strength:</span>
                        <span style={{ color }} className="font-medium">
                          {label}
                        </span>
                      </div>
                    )}
                    {capsOn && (
                      <p className="flex items-center gap-1 text-xs text-amber-300">
                        <AlertCircle className="h-3.5 w-3.5" /> Caps Lock is ON
                      </p>
                    )}
                  </div>

                  {/* strength bar */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>

                {/* submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="group relative w-full rounded-xl bg-indigo-500 py-3 text-lg font-semibold text-white hover:bg-indigo-600 active:scale-[0.99] disabled:opacity-70"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {submitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 opacity-80" />
                    )}
                    {submitting ? "Creating Account…" : "Create Account"}
                  </span>
                </button>

                <p className="text-center text-sm text-white/70">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-medium text-indigo-300 hover:text-indigo-200"
                  >
                    Sign in
                  </Link>
                </p>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-300" />
                  <div className="font-semibold">Verify your email</div>
                </div>

                {/* resend */}
                <button
                  type="button"
                  disabled={sending || cooldown > 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white hover:bg-white/10 disabled:opacity-60"
                  onClick={sendEmailOtp}
                  title="Send email OTP"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  {cooldown ? `Resend in ${cooldown}s` : "Send Email OTP"}
                </button>

                {/* otp input */}
                <div>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-lg tracking-[0.35em] text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30"
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                  />
                  <button
                    type="button"
                    onClick={verifyOtp}
                    disabled={verifying || otp.length !== 6}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.75 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-70"
                  >
                    {verifying ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-5 w-5" />
                    )}
                    {verifying ? "Verifying…" : "Verify & Continue"}
                  </button>
                </div>

                <div className="text-center text-sm text-white/60">
                  Didn’t get a code? Check spam or try again after the timer.
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-white/50">
                  <TimerReset className="h-4 w-4" />
                  OTP linked to your email — it expires shortly for security.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Signup;