'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Chatbot from '../components/Chatbot';

export default function ResetPasswordPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new forgot-password flow (which now handles code-based reset)
    router.replace('/forgot-password');
  }, [router]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen flex items-center justify-center relative px-4 py-20">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="glow-orb glow-orb-amber w-[400px] h-[400px] -top-20 -right-20 opacity-20" />
          <div className="glow-orb glow-orb-orange w-[300px] h-[300px] bottom-20 -left-20 opacity-15" />
        </div>

        <div className="relative w-full max-w-md opacity-0 animate-fade-in-up animate-fill-both">
          <div className="glass-strong rounded-3xl p-8 sm:p-10 text-center">
            <div className="py-8">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-400 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-100 mb-2">Redirecting...</h1>
              <p className="text-sm text-slate-400 mb-6">
                Password reset now uses verification codes. Redirecting you...
              </p>
              <Link
                href="/forgot-password"
                className="btn-primary inline-flex items-center gap-2 py-3 px-8 rounded-xl font-semibold"
              >
                Go to Password Reset
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Chatbot />
    </>
  );
}
