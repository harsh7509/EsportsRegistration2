import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gamepad2, Mail, Lock, User, Building, ShieldCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI, setTokens } from '../services/api';

const Signup = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'player',
  });

  const [submitting, setSubmitting] = useState(false);

  // OTP step
  const [otpStep, setOtpStep] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const onChange = (e) => setForm(s => ({ ...s, [e.target.name]: e.target.value }));

  const redirectByRole = (role) => {
    switch (role) {
      case 'organization': navigate('/dashboard/org', { replace: true }); break;
      case 'player':       navigate('/scrims',        { replace: true }); break;
      case 'admin':        navigate('/admin',         { replace: true }); break;
      default:             navigate('/',              { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');

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
        toast.success('We sent you a verification code. Click “Send Email OTP” if you need it again.');
        return;
      }

      // If backend ever returns tokens immediately
      const access = res?.data?.accessToken || res?.data?.access_token || res?.data?.token;
      const refresh = res?.data?.refreshToken || res?.data?.refresh_token || null;
      if (access) {
        setTokens(access, refresh);
        const me = await authAPI.getMe();
        const role = me?.data?.user?.role || form.role;
        toast.success('Account created!');
        redirectByRole(role);
        return;
      }

      toast.success('Account created! Please verify your email.');
    } catch (err) {
      console.error('signup failed:', err);
      toast.error(err?.response?.data?.message || 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  };

  const sendEmailOtp = async () => {
    if (!tempToken) return;
    setSending(true);
    try {
      await authAPI.sendOtp({ tempToken }); // email-only
      toast.success('OTP sent to your email.');
    } catch (e) {
      console.error('sendOtp error:', e);
      toast.error(e?.response?.data?.message || 'Failed to send OTP');
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!tempToken || otp.length !== 6) return toast.error('Enter the 6-digit code');
    setVerifying(true);
    try {
      const res = await authAPI.verifyOtp({ tempToken, code: otp });

      const access = res?.data?.accessToken || res?.data?.access_token || res?.data?.token;
      const refresh = res?.data?.refreshToken || res?.data?.refresh_token || null;
      if (!access) throw new Error('No token returned');
      setTokens(access, refresh);

      const me = await authAPI.getMe();
      const role = me?.data?.user?.role || form.role;
      toast.success('Verified! Welcome 🎉');
      redirectByRole(role);
    } catch (e) {
      console.error('verifyOtp error:', e);
      toast.error(e?.response?.data?.message || 'Invalid or expired code');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Gamepad2 className="h-12 w-12 text-gaming-purple" />
          </div>
          <h2 className="mt-6 text-3xl font-bold">Join the Competition</h2>
          <p className="mt-2 text-gray-400">Create your account with verified email</p>
        </div>

        {!otpStep ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">I am a:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: 'player' })}
                  className={`flex items-center justify-center p-3 rounded-lg border transition-all ${
                    form.role === 'player'
                      ? 'border-gaming-purple bg-gaming-purple/20 text-gaming-purple'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <User className="h-5 w-5 mr-2" />
                  Player
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: 'organization' })}
                  className={`flex items-center justify-center p-3 rounded-lg border transition-all ${
                    form.role === 'organization'
                      ? 'border-gaming-purple bg-gaming-purple/20 text-gaming-purple'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <Building className="h-5 w-5 mr-2" />
                  Organization
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="sr-only">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    id="name" name="name" type="text" required
                    className="input pl-10 w-full"
                    placeholder={form.role === 'organization' ? 'Organization name' : 'Your name'}
                    value={form.name} onChange={onChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="sr-only">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    id="email" name="email" type="email" required
                    className="input pl-10 w-full" placeholder="Email address"
                    value={form.email} onChange={onChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    id="password" name="password" type="password" required
                    className="input pl-10 w-full" placeholder="Password (min. 6 characters)"
                    value={form.password} onChange={onChange}
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={submitting} className="w-full btn-primary py-3 text-lg">
              {submitting ? 'Creating Account…' : 'Create Account'}
            </button>

            <div className="text-center">
              <p className="text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="text-gaming-purple hover:text-gaming-purple/80 font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        ) : (
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-gaming-purple" />
              <div className="font-semibold">Verify your email</div>
            </div>

            <button
              type="button"
              disabled={sending}
              className="btn-secondary flex items-center justify-center gap-2"
              onClick={sendEmailOtp}
              title="Send email OTP"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Send Email OTP
            </button>

            <div>
              <input
                inputMode="numeric" pattern="[0-9]*" maxLength={6}
                className="input w-full text-center tracking-widest"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <button
                type="button"
                onClick={verifyOtp}
                disabled={verifying || otp.length !== 6}
                className="btn-primary w-full mt-3"
              >
                {verifying ? 'Verifying…' : 'Verify & Continue'}
              </button>
            </div>

            <div className="text-center text-sm text-gray-400">
              Didn’t get a code? Click “Send Email OTP” to resend.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Signup;
