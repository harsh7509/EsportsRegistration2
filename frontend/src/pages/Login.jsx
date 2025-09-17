import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gamepad2, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { user, isAuthenticated, login, loading } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const redirectByRole = (role) => {
    switch (role) {
      case 'organization': navigate('/dashboard/org', { replace: true }); break;
      case 'player':       navigate('/scrims',        { replace: true }); break;
      case 'admin':        navigate('/admin',         { replace: true }); break;
      default:             navigate('/',              { replace: true });
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role) redirectByRole(user.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await login({ email: form.email, password: form.password });
    setSubmitting(false);

    if (result.success) {
      toast.success('Welcome back!');
      // user is now in context; let the effect redirect
    } else {
      toast.error(result.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Gamepad2 className="h-12 w-12 text-gaming-purple" />
          </div>
          <h2 className="mt-6 text-3xl font-bold">Welcome Back</h2>
          <p className="mt-2 text-gray-400">Sign in to continue competing</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
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
                  className="input pl-10 w-full" placeholder="Password"
                  value={form.password} onChange={onChange}
                />
              </div>
            </div>
          </div>

          <button type="submit" disabled={submitting || loading} className="w-full btn-primary py-3 text-lg">
            {submitting || loading ? 'Signing in…' : 'Sign In'}
          </button>

          <div className="text-center">
            <p className="text-gray-400">
              Don’t have an account?{' '}
              <Link to="/signup" className="text-gaming-purple hover:text-gaming-purple/80 font-medium">
                Sign up here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
