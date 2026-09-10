'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/* ────────────────────────────────────────────────────────────
   Content
   ──────────────────────────────────────────────────────────── */

const BENEFITS = [
  'Create your community profile',
  'Reach new members',
  'Track event participation',
  'Publish and manage events',
  'Manage followers',
  'Download attendee and follower data',
];

const STEPS = [
  { num: '01', title: 'Apply', desc: 'Submit your community information and required documents.' },
  { num: '02', title: 'Verification', desc: 'Provide the required organization and verification details.' },
  { num: '03', title: 'Admin Review', desc: 'The Smart Connects administration reviews the submitted application.' },
  { num: '04', title: 'Approval', desc: 'Approved applications can continue to community creation.' },
  { num: '05', title: 'Community Created', desc: 'Your approved community becomes available on Smart Connects.' },
  { num: '06', title: 'Publish Events', desc: 'Create events and connect with your community members.' },
];

const PARTICLE_COUNT = 5;

/* ────────────────────────────────────────────────────────────
   Small reusable icon components (no extra deps)
   ──────────────────────────────────────────────────────────── */

/** Minimal shield icon for the trust message. */
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-5.93 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.19 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

/** Small check mark for benefit rows. */
function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────
   Ambient background particles
   ──────────────────────────────────────────────────────────── */

/** A single small orange spark that drifts along a subtle curved path. */
function Particle({ index, started }: { index: number; started: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const phaseRef = useRef(Math.random() * Math.PI * 2);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const start = performance.now();
    // Each particle has its own speed/amplitude for variety.
    const speed = 0.06 + index * 0.012;
    const amplitude = 18 + index * 7; // px of vertical wobble
    const baseY = 10 + index * 16; // starting vertical position (% from top)
    const xTravel = 65 + index * 4; // how far it travels horizontally (%)
    const duration = 14 + index * 2; // full loop duration (s)

    const tick = (t: number) => {
      const elapsed = (t - start) / 1000;
      const cycle = ((elapsed * speed) % 1 + 1) % 1; // 0..1 looping
      // Subtle horizontal drift + vertical sine wobble.
      const x = cycle * xTravel;
      const y = baseY + Math.sin(cycle * Math.PI * 2 + phaseRef.current) * amplitude;
      const opacity = 0.08 + 0.10 * (1 - Math.abs(cycle - 0.5) * 2); // peak in middle
      el.style.transform = `translateX(${x}%) translateY(${y}%)`;
      el.style.opacity = String(opacity);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [index]);

  return (
    <span
      ref={ref}
      className="journey-particle absolute left-0 top-0 pointer-events-none rounded-full bg-amber-400 will-change-transform"
      style={{
        width: `${2 + (index % 3) * 1.5}px`,
        height: `${2 + (index % 3) * 1.5}px`,
        opacity: started ? undefined : '0',
        boxShadow: '0 0 6px rgba(245,158,11,0.6)',
      }}
    />
  );
}

/* ────────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────────── */

export default function CommunityJourney() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const animating = started && !reducedMotion;

  // Trigger once when section enters viewport.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.18 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Respect prefers-reduced-motion.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  /* ── Shared classes ── */
  const hiddenUntilStart = !started && !reducedMotion;

  const benefitsListClasses = `
    grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-left max-w-lg mx-auto
    ${hiddenUntilStart ? 'opacity-0' : ''}
  `.trim();

  const ctaRowClasses = `
    mt-9 flex flex-col sm:flex-row items-center justify-center gap-4
    ${hiddenUntilStart ? 'opacity-0' : ''}
  `.trim();

  /* ── Desktop timeline line ── */
  const desktopLineClasses = `
    absolute top-[22px] left-0 right-0 h-[2px] rounded-full
    bg-gradient-to-r from-amber-400/80 via-amber-500/50 to-orange-500/40
    ${animating ? 'journey-line-draw-h' : ''}
    ${hiddenUntilStart ? 'opacity-0' : ''}
  `.trim();

  /* ── Mobile vertical line ── */
  const mobileLineClasses = `
    absolute inset-y-6 left-[21px] w-px
    bg-gradient-to-b from-amber-400/80 via-amber-500/50 to-orange-500/40
    ${animating ? 'journey-line-draw' : ''}
    ${hiddenUntilStart ? 'opacity-0' : ''}
  `.trim();

  /* Trust message */
  const trustClasses = `
    mt-10 text-center text-sm md:text-base leading-relaxed text-slate-400
    flex items-center justify-center gap-2.5 flex-wrap
    ${animating ? 'journey-step' : ''}
    ${hiddenUntilStart ? 'opacity-0' : ''}
  `.trim();

  return (
    <section
      ref={rootRef}
      className="relative py-20 md:py-28 overflow-hidden border-t border-white/5"
    >
      {/* Subtle radial warmth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_50%_at_85%_30%,rgba(245,158,11,0.06),transparent_60%)] pointer-events-none" />

      {/* Ambient particles (behind content, edges) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
        {/* Keep particles near outer edges: left & right margins */}
        <div className="absolute inset-y-0 left-[6%] w-[18%] h-full">
          {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
            <Particle key={i} index={i} started={animating} />
          ))}
        </div>
        <div className="absolute inset-y-0 right-[8%] w-[16%] h-full">
          {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
            <Particle key={`r${i}`} index={i + PARTICLE_COUNT} started={animating} />
          ))}
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* ── Top: heading + benefits + CTA ── */}
        <div className="text-center max-w-2xl mx-auto mb-16 md:mb-20">
          {/* Heading — orange accent on "Community" only */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-100 leading-[1.1] tracking-tight opacity-0 animate-fade-in-up animate-fill-both animate-delay-100">
            Have a{' '}
            <span className="text-gradient font-bold">Community</span>
            {' '}to Share?
          </h2>

          {/* Supporting text */}
          <p className="mt-4 text-base sm:text-lg md:text-base text-slate-400 leading-relaxed max-w-xl mx-auto opacity-0 animate-fade-in-up animate-fill-both animate-delay-200">
            Bring your organization, club, or community to Smart Connects and reach people
            who share your interests.
          </p>

          {/* Benefits — two columns, subtle cards */}
          <ul className={benefitsListClasses}>
            {BENEFITS.map((benefit) => (
              <li
                key={benefit}
                className="group flex items-start gap-3 px-4 py-3 rounded-xl border border-white/5 bg-white/[0.015] hover:border-white/10 hover:bg-white/[0.03] transition-all duration-300"
              >
                <span className="mt-0.5">
                  <CheckIcon />
                </span>
                <span className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors">
                  {benefit}
                </span>
              </li>
            ))}
          </ul>

          {/* CTA buttons */}
          <div className={ctaRowClasses}>
            <Link
              href="/apply"
              className="
                group relative inline-flex items-center justify-center gap-2
                px-8 py-3.5 rounded-xl text-base font-semibold text-black
                bg-gradient-to-r from-amber-400 to-orange-500
                shadow-lg shadow-amber-500/25
                transition-all duration-300
                hover:-translate-y-0.5 hover:shadow-amber-500/40 hover:shadow-xl
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
                active:translate-y-0 active:shadow-amber-500/25
              "
            >
              {/* Subtle orange glow behind button */}
              <span className="absolute inset-0 rounded-xl bg-amber-400/20 blur-xl -z-10 opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
              Start a New Group
              <span className="inline-flex items-center transition-transform duration-300 group-hover:translate-x-0.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </Link>

            <a
              href="#community-journey-steps"
              className="
                inline-flex items-center justify-center gap-2
                px-8 py-3.5 rounded-xl text-base font-medium text-slate-300
                border border-white/10 bg-white/[0.02]
                transition-all duration-300
                hover:-translate-y-0.5 hover:border-amber-500/30 hover:bg-white/[0.04] hover:text-slate-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
              "
            >
              Learn More
            </a>
          </div>
        </div>

        {/* ── Steps: timeline ── */}
        <div
          id="community-journey-steps"
          className="scroll-mt-24"
          aria-label="Community application process"
        >
          <div className="relative">
            {/* ═══ VERTICAL (mobile/tablet) ═══ */}
            <div className="block lg:hidden">
              {/* Vertical line — drawn on start */}
              <div className={mobileLineClasses} aria-hidden="true" />

              <div className="relative pl-12 space-y-6">
                {STEPS.map((step, i) => {
                  const isLast = i === STEPS.length - 1;
                  return (
                    <div
                      key={step.num}
                      className={`
                        relative flex items-start gap-5
                        ${animating ? 'journey-step' : ''}
                        ${hiddenUntilStart ? 'opacity-0' : ''}
                      `.trim()}
                      style={{
                        animationDelay: animating ? `${0.25 + i * 0.14}s` : undefined,
                      }}
                    >
                      {/* Node — on the line */}
                      <div
                        className="
                          relative z-10 flex-shrink-0 w-10 h-10 rounded-full
                          flex items-center justify-center text-sm font-bold
                          border-2 border-amber-500/30
                          bg-slate-950 text-amber-300
                          transition-all duration-300
                          hover:border-amber-400 hover:text-amber-200
                          hover:shadow-lg hover:shadow-amber-500/20
                          focus-within:shadow-amber-500/20
                        "
                        style={{
                          boxShadow: '0 0 0 4px rgba(245,158,11,0.08)',
                        }}
                        aria-hidden="true"
                      >
                        {step.num}
                      </div>

                      {/* Card */}
                      <div
                        className="
                          flex-1 min-w-0 rounded-xl border p-4 transition-all duration-300
                          border-white/5 bg-white/[0.02]
                          hover:border-amber-500/20 hover:bg-white/[0.035]
                          hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20
                          focus-within:border-amber-500/20
                        "
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/60">
                          Step {step.num}
                        </span>
                        <h3 className="mt-1.5 text-base font-semibold text-slate-100 leading-snug">
                          {step.title}
                        </h3>
                        <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
                          {step.desc}
                        </p>
                      </div>

                      {/* Connector line piece (between cards, not after last) */}
                      {!isLast && (
                        <div
                          className={`
                            absolute left-[19px] top-5 w-px h-10 bg-white/8
                            ${animating ? 'journey-step' : ''}
                          `.trim()}
                          style={{ animationDelay: `${0.35 + i * 0.14}s` }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ═══ HORIZONTAL (desktop) ═══ */}
            <div className="hidden lg:block">
              {/* Horizontal line — drawn left-to-right on start */}
              <div className={desktopLineClasses} aria-hidden="true" />

              <div className="grid grid-cols-6 gap-6 md:gap-8">
                {STEPS.map((step, i) => {
                  return (
                    <div
                      key={step.num}
                      className={`
                        relative flex flex-col items-center text-center
                        ${animating ? 'journey-step-horizontal' : ''}
                        ${hiddenUntilStart ? 'opacity-0' : ''}
                      `.trim()}
                      style={{
                        animationDelay: animating ? `${0.35 + i * 0.13}s` : undefined,
                      }}
                    >
                      {/* Node — sits ON the line */}
                      <div
                        className="
                          relative z-10 w-12 h-12 rounded-full
                          flex items-center justify-center text-sm font-bold
                          border-2 border-amber-500/30
                          bg-slate-950 text-amber-300
                          transition-all duration-300
                          hover:border-amber-400 hover:text-amber-200
                          hover:shadow-lg hover:shadow-amber-500/25
                          -translate-y-1
                        "
                        style={{
                          boxShadow: '0 0 0 4px rgba(245,158,11,0.08)',
                        }}
                        aria-hidden="true"
                      >
                        {step.num}
                      </div>

                      {/* Card below */}
                      <div
                        className="
                          mt-4 w-full rounded-xl border p-4 transition-all duration-300
                          border-white/5 bg-white/[0.02]
                          hover:border-amber-500/20 hover:bg-white/[0.035]
                          hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20
                          focus-within:border-amber-500/20
                        "
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/60">
                          Step {step.num}
                        </span>
                        <h3 className="mt-1.5 text-sm font-semibold text-slate-100 leading-snug">
                          {step.title}
                        </h3>
                        <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trust message — with shield icon, inside a subtle container */}
            <div
              className={`
                mt-11 md:mt-12
                ${animating ? 'journey-step' : ''}
                ${hiddenUntilStart ? 'opacity-0' : ''}
              `.trim()}
              style={{ animationDelay: animating ? '1.6s' : undefined }}
            >
              <div className="
                inline-flex items-center gap-3
                rounded-xl border border-white/5 bg-white/[0.02]
                px-5 py-3.5
                max-w-lg mx-auto
                hover:border-amber-500/20 hover:bg-white/[0.035] hover:text-slate-300
                transition-all duration-300
              ">
                <span className="
                  flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                  bg-emerald-500/10 border border-emerald-500/20 text-emerald-400
                " aria-hidden="true">
                  <ShieldIcon className="w-4 h-4" />
                </span>
                <span>
                  Every community application is reviewed before it becomes available on Smart Connects.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
