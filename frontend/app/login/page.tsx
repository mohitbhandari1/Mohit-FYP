'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '../components/Navbar';
import { useAuth } from '../lib/AuthContext';
import { BACKEND_URL, apiFetch } from '../lib/auth';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/profile';
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const { refresh } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Login failed');
        return;
      }

      const data = await res.json();
      // Keep localStorage for backward compatibility (Bearer token fallback)
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Refresh auth state from server (reads the httpOnly cookie)
      await refresh();

      if (data.needsPasswordChange) {
        setNeedsPasswordChange(true);
        return;
      }

      // Show success message and redirect after brief delay
      setSuccess('Logged in successfully!');
      setRedirecting(true);

      setTimeout(() => {
        // Use client-side navigation to preserve auth state in memory
        if (data.user?.role === 'admin') {
          router.push('/admin');
        } else {
          router.push(redirect);
        }
      }, 1200);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ current_password: password, new_password: newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to change password');
        return;
      }

      // Update token
      localStorage.setItem('token', data.token);
      // Refresh auth state (reads updated cookie)
      await refresh();
      router.push(redirect);
    } catch (err) {
      setError('An error occurred');
    } finally {
      setChangingPassword(false);
    }
  };

  if (needsPasswordChange) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <section className="mx-auto max-w-md px-6 py-16 sm:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg">
            <h1 className="text-3xl font-bold text-slate-800">Set Your Password</h1>
            <p className="mt-2 text-slate-500">
              Your organizer application was approved! Please set a new password to continue.
            </p>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
            )}

            <form onSubmit={handlePasswordChange} className="mt-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              <button
                type="submit"
                disabled={changingPassword}
                className="mt-6 w-full rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02] disabled:opacity-50"
              >
                {changingPassword ? 'Setting password...' : 'Set Password & Continue'}
              </button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-md px-6 py-16 sm:px-8">
        <div className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg">
          <div className="mb-6 text-center">
            <Image
              src="/logo.png"
              alt="Smart Connects"
              width={56}
              height={56}
              className="mx-auto mb-4 rounded-2xl shadow-md"
            />
            <h1 className="text-3xl font-bold text-slate-800">Welcome back</h1>
            <p className="mt-1 text-slate-500">Sign in to your Smart Connects account</p>
          </div>

          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>}
          {success && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-600 flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {success}
          </div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading || redirecting}
              className="mt-2 w-full rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02] disabled:opacity-50"
            >
              {redirecting ? 'Redirecting...' : loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-orange-600 hover:text-orange-500">
              Sign up
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
