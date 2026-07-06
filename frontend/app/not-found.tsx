'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-amber-500/5 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-orange-500/5 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-amber-500/3 blur-3xl" />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className={`relative flex flex-col items-center text-center max-w-lg mx-auto px-6 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Large 404 */}
        <h1 className="text-[140px] md:text-[200px] font-black tracking-tighter leading-none select-none">
          <span className="bg-gradient-to-b from-amber-400 via-orange-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]">
            404
          </span>
        </h1>

        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/5 flex items-center justify-center mb-6 -mt-6 shadow-lg shadow-amber-500/5">
          <svg className="w-10 h-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-slate-100 mb-3">Page not found</h2>
        <p className="text-slate-400 max-w-sm leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved to another dimension.
        </p>

        {/* Actions */}
        <div className="flex gap-4 mt-8">
          <Link
            href="/"
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-[1.02] transition-all"
          >
            Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl px-6 py-3 text-sm font-medium text-slate-300 hover:text-amber-400 hover:border-amber-500/20 transition-all"
          >
            Go Back
          </button>
        </div>

        {/* Decorative dots */}
        <div className="flex gap-2 mt-12">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-500/30 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
        </div>
      </div>
    </main>
  );
}
