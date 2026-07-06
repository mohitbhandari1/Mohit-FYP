'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Chatbot from '../components/Chatbot';
import { apiFetch } from '../lib/auth';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing verification token.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await apiFetch('/api/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok) {
          setStatus('error');
          setMessage(data.error || 'Verification failed. The link may have expired.');
          return;
        }

        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
      } catch {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <main className="min-h-screen flex items-center justify-center relative px-4 py-20">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="glow-orb glow-orb-amber w-[400px] h-[400px] -top-20 -right-20 opacity-20" />
        <div className="glow-orb glow-orb-orange w-[300px] h-[300px] bottom-20 -left-20 opacity-15" />
      </div>

      {/* Verification card */}
      <div className="relative w-full max-w-md opacity-0 animate-fade-in-up animate-fill-both">
        <div className="glass-strong rounded-3xl p-8 sm:p-10 text-center">
          {status === 'loading' && (
            <div className="py-8">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-400 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-100 mb-2">Verifying Your Email</h1>
              <p className="text-sm text-slate-400">Please wait while we verify your email address...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-100 mb-2">Email Verified! 🎉</h1>
              <p className="text-sm text-slate-400 mb-8">{message}</p>
              <Link
                href="/login"
                className="btn-primary inline-flex items-center gap-2 py-3.5 px-8 rounded-xl font-semibold"
              >
                Sign In
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="py-8">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-100 mb-2">Verification Failed</h1>
              <p className="text-sm text-red-300 mb-2">{message}</p>
              <p className="text-sm text-slate-400 mb-8">
                The verification link may have expired or is invalid.
              </p>
              <Link
                href="/login"
                className="btn-primary inline-flex items-center gap-2 py-3.5 px-8 rounded-xl font-semibold"
              >
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={
        <main className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        </main>
      }>
        <VerifyEmailContent />
      </Suspense>
      <Chatbot />
    </>
  );
}
