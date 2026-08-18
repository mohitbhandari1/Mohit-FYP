'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/* ────────────────────────────────────────────────────────────
   Content
   ──────────────────────────────────────────────────────────── */

const BENEFITS = [
  'Create your community profile',
  'Publish and manage events',
  'Reach new members',
  'Manage followers',
  'Track event participation',
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

const PARTICLE_COUNT = 3;

/* ────────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────────── */

export default function CommunityJourney() {
  const rootRef = useRef<HTMLDivElement>(null);
  const particleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [started, setStarted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const animating = started && !reducedMotion;
  const hiddenUntilStart = !started && !reducedMotion;

  /* Run the sequence once when the section enters the viewport */
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
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* Respect prefers-reduced-motion */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  /* Particles drifting down the journey path (direct DOM writes) */
  useEffect(() => {
    if (!animating) return;
    let raf = 0;
    const start = performance.now();
    const speeds = [0.055, 0.07, 0.09];
    const loop = (t: number) => {
      const elapsed = (t - start) / 1000;
      const travel = Math.max(0, elapsed - 1.4); // wait until the path is drawn
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const el = particleRefs.current[i];
        if (!el) continue;
        const cycle = (travel * speeds[i] + i * 0.33) % 1;
        const fade = Math.sin(Math.PI * Math.min(1, Math.max(0.0001, cycle)));
        el.style.top = `${cycle * 100}%`;
        el.style.opacity = String(fade);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [animating]);

  const lineOpacity = hiddenUntilStart ? 'opacity-0' : hoveredIndex !== null ? 'opacity-90' : 'opacity-50';

  return (
    <section className="relative py-20 overflow-hidden border-t border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_45%_at_85%_30%,rgba(245,158,11,0.05),transparent_60%)]" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-16 items-center">
          {/* ── LEFT: copy ── */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 leading-tight opacity-0 animate-fade-in-up animate-fill-both animate-delay-100">
              Have a Community to Share?
            </h2>

            <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed max-w-lg opacity-0 animate-fade-in-up animate-fill-both animate-delay-200">
              Bring your organization, club, or community to Smart Connects and reach people who share your interests.
            </p>

            <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 opacity-0 animate-fade-in-up animate-fill-both animate-delay-300">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2.5 text-sm text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 opacity-0 animate-fade-in-up animate-fill-both animate-delay-400">
              <Link
                href="/apply"
                className="btn-primary text-base px-7 py-3.5 rounded-xl flex items-center justify-center gap-2 group"
              >
                Start a New Group
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
              <a
                href="#community-journey"
                className="btn-ghost text-base px-7 py-3.5 rounded-xl flex items-center justify-center"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* ── RIGHT: interactive community journey ── */}
          <div id="community-journey" className="scroll-mt-24" ref={rootRef}>
            <div className="relative">
              {/* Static track */}
              <div className="absolute inset-y-3 left-6 lg:left-1/2 w-px -translate-x-1/2 bg-white/10" />

              {/* Animated connecting path (centering on the wrapper so the draw animation can't override it) */}
              <div className="absolute inset-y-3 left-6 lg:left-1/2 -translate-x-1/2">
                <div
                  className={`w-0.5 h-full rounded-full bg-gradient-to-b from-amber-400/80 via-amber-500/50 to-orange-500/40 transition-opacity duration-300 ${lineOpacity} ${
                    animating ? 'journey-line-draw' : ''
                  }`}
                />
              </div>

              {/* Travelling particles */}
              {animating && (
                <div className="pointer-events-none absolute inset-0 z-0 hidden sm:block">
                  {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
                    <span
                      key={i}
                      ref={(el) => {
                        particleRefs.current[i] = el;
                      }}
                      className="journey-particle absolute left-6 lg:left-1/2 -translate-x-1/2 top-0"
                      style={{ opacity: 0 }}
                    />
                  ))}
                </div>
              )}

              {/* Steps */}
              {STEPS.map((step, i) => {
                const left = i % 2 === 0;
                const hovered = hoveredIndex === i;
                return (
                  <div
                    key={step.num}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={`relative flex items-start lg:items-center py-3 lg:py-4 group ${
                      animating ? 'journey-step' : ''
                    } ${hiddenUntilStart ? 'opacity-0' : ''}`}
                    style={animating ? { animationDelay: `${0.2 + i * 0.18}s` } : undefined}
                  >
                    {/* Node — inline on mobile (aligned with the title), centered on desktop */}
                    <div
                      className={`relative z-10 flex-shrink-0 ml-1.5 mr-4 lg:ml-0 lg:mr-0 lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 ${
                        hovered
                          ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-black border-transparent shadow-lg shadow-amber-500/30 scale-110'
                          : 'bg-slate-900 border-amber-500/30 text-amber-300 group-hover:border-amber-400'
                      }`}
                    >
                      {step.num}
                    </div>

                    {/* Card */}
                    <div
                      className={`relative flex-1 min-w-0 lg:w-[calc(50%-3rem)] lg:flex-none ${
                        left ? 'lg:mr-auto' : 'lg:ml-auto'
                      }`}
                    >
                      <div
                        className={`rounded-xl border p-3.5 lg:p-4 transition-all duration-300 ${
                          hovered
                            ? 'border-amber-500/30 bg-white/[0.04] -translate-y-0.5 shadow-lg shadow-black/20'
                            : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                        }`}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-400/70">
                          Step {step.num}
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-slate-100 leading-snug">{step.title}</h3>
                        <p
                          className={`mt-1.5 text-[13px] lg:text-xs text-slate-400 leading-relaxed transition-all duration-300 ${
                            hovered ? 'lg:opacity-100 lg:translate-y-0' : 'lg:opacity-0 lg:-translate-y-1'
                          }`}
                        >
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Trust message */}
              <div
                className={`relative mt-6 flex items-center gap-2.5 pl-3 lg:pl-0 text-xs text-slate-400 ${
                  animating ? 'journey-step' : ''
                } ${hiddenUntilStart ? 'opacity-0' : ''}`}
                style={animating ? { animationDelay: '1.55s' } : undefined}
              >
                <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span>Every community application is reviewed before it becomes available on Smart Connects.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
