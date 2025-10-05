import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Gamepad2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import SEO from "../components/SEO"


const EMAIL_KEY = "login:rememberEmail";

export default function Login() {
  const navigate = useNavigate();
  const { user, isAuthenticated, login, loading } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});

  const busy = submitting || loading;

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
    // prefill remembered email
    const remembered = localStorage.getItem(EMAIL_KEY);
    if (remembered) setForm((s) => ({ ...s, email: remembered }));
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role) redirectByRole(user.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.role]);

  const validate = useMemo(() => {
    const e = {};
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email))
      e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6) e.password = "Minimum 6 characters";
    return e;
  }, [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate;
    setErrors(v);
    if (Object.keys(v).length) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    setSubmitting(true);
    const result = await login({
      email: form.email.trim(),
      password: form.password,
    });
    setSubmitting(false);

    if (result.success) {
      if (remember) localStorage.setItem(EMAIL_KEY, form.email.trim());
      else localStorage.removeItem(EMAIL_KEY);
      toast.success("Welcome back!");
      // effect will redirect by role
    } else {
      toast.error(result.error || "Login failed");
    }
  };

  return (
    <>
      <SEO
        title="Login to ArenaPulse – Access Your Esports Dashboard"
        description="Log in to your ArenaPulse account to manage your esports activities, join scrims, register for tournaments, and track your stats in one place."
        keywords="login, esports account login, ArenaPulse login, player dashboard, organization login"
        canonical="https://thearenapulse.xyz/login"
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Login",
          description: "Login page for ArenaPulse esports platform.",
        }}
      />

      <div className="min-h-screen relative flex items-center justify-center p-6">
        {/* background */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,#6d28d9_0,#111827_55%,#0b0f1a_100%)] opacity-70" />
        <div className="relative z-10 w-full max-w-md">
          {/* logo & heading */}
          <div className="mb-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10">
              <Gamepad2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">
              Welcome back to ArenaPulse
            </h1>
            <h2 className="mt-1 text-sm text-white/70">
              Sign in to continue competing
            </h2>
          </div>

          {/* card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              {/* Email */}
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
                    inputMode="email"
                    className={`w-full rounded-xl border px-10 py-2.75 text-sm text-white outline-none placeholder:text-white/40 bg-white/5
                    focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 border-white/10
                    ${
                      errors.email
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
                    <AlertCircle className="h-3.5 w-3.5" /> {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="text-xs text-white/70">
                    Password
                  </label>
                  {/* (Optional) Forgot password route if you add later */}
                  {/* <Link to="/forgot" className="text-xs text-indigo-300 hover:text-indigo-200">Forgot?</Link> */}
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <input
                    id="password"
                    name="password"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    className={`w-full rounded-xl border px-10 py-2.75 text-sm text-white outline-none placeholder:text-white/40 bg-white/5
                    focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 border-white/10
                    ${
                      errors.password
                        ? "ring-2 ring-rose-500/40 border-rose-500/40"
                        : ""
                    }`}
                    placeholder="••••••••"
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
                <div className="mt-1.5 flex items-center justify-between">
                  {errors.password ? (
                    <p className="flex items-center gap-1 text-xs text-rose-300">
                      <AlertCircle className="h-3.5 w-3.5" /> {errors.password}
                    </p>
                  ) : (
                    <div className="h-4" />
                  )}
                  {capsOn && (
                    <p className="flex items-center gap-1 text-xs text-amber-300">
                      <AlertCircle className="h-3.5 w-3.5" /> Caps Lock is ON
                    </p>
                  )}
                </div>
              </div>

              {/* Remember me */}
              <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-indigo-400"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember email on this device
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={busy}
                className="group relative w-full rounded-xl bg-indigo-500 py-3 text-lg font-semibold text-white hover:bg-indigo-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {busy ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 opacity-80" />
                      Sign In
                    </>
                  )}
                </span>
                <span className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-indigo-400/20 opacity-0 blur transition group-hover:opacity-100" />
              </button>

              {/* Footer link */}
              <p className="text-center text-sm text-white/70">
                Don’t have an account?{" "}
                <Link
                  to="/signup"
                  className="font-medium text-indigo-300 hover:text-indigo-200"
                >
                  Sign up
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}