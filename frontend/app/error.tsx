'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.error('Application error:', error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-red-500/5 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-rose-500/5 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className={`relative flex flex-col items-center text-center max-w-lg mx-auto px-6 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Large Status */}
        <h1 className="text-[120px] md:text-[160px] font-black tracking-tighter leading-none select-none">
          <span className="bg-gradient-to-b from-red-400 via-rose-400 to-red-600 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            500
          </span>
        </h1>

        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/5 flex items-center justify-center mb-6 -mt-6 shadow-lg shadow-red-500/5">
          <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-slate-100 mb-3">Something went wrong</h2>
        <p className="text-slate-400 max-w-sm leading-relaxed">
          Our servers encountered an unexpected issue. Please try again or return home.
        </p>

        {/* Error details (dev only) */}
        {error?.message && (
          <div className="mt-4 max-w-sm p-3 rounded-lg border border-white/5 bg-white/[0.02]">
            <p className="text-xs text-slate-500 font-mono truncate">{error.message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 mt-8">
          <Link
            href="/"
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-[1.02] transition-all"
          >
            Go Home
          </Link>
          <button
            onClick={reset}
            className="rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl px-6 py-3 text-sm font-medium text-slate-300 hover:text-amber-400 hover:border-amber-500/20 transition-all"
          >
            Try Again
          </button>
        </div>

        {/* Decorative dots */}
        <div className="flex gap-2 mt-12">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-red-500/30 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
        </div>
      </div>
    </main>
  );
}
