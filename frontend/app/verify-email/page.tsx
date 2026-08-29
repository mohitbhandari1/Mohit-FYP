'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Chatbot from '../components/Chatbot';

export default function VerifyEmailPage() {
  const router = useRouter();

  useEffect(() => {
    // Email verification is now handled via code during registration
    // Redirect to login after a brief moment
    const timer = setTimeout(() => router.replace('/login'), 3000);
    return () => clearTimeout(timer);
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
                <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-100 mb-2">Email Verification</h1>
              <p className="text-sm text-slate-400 mb-8">
                Email verification is now handled during registration via a verification code.
                <br /><br />
                If you&apos;re trying to verify your email, please register again or log in.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/register"
                  className="btn-primary inline-flex items-center justify-center gap-2 py-3 px-8 rounded-xl font-semibold"
                >
                  Register
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 py-3 px-8 rounded-xl font-semibold border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Chatbot />
    </>
  );
}
