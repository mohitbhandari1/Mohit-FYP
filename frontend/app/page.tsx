'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Navbar from './components/Navbar';
import Chatbot from './components/Chatbot';
import { apiFetch, BACKEND_URL } from './lib/auth';
import { useAuth } from './lib/AuthContext';
import { SkeletonCard } from './components/Skeleton';
import CommunityJourney from './components/CommunityJourney';

interface Event {
  id: number;
  title: string;
  description?: string;
  date?: string;
  event_date?: string;
  start_time?: string;
  location?: string;
  banner_image?: string;
  community_name?: string;
  community_owner_name?: string;
  attendee_count?: number;
  avg_rating?: number;
}

interface Community {
  id: number;
  name: string;
  description?: string;
  category?: string;
  member_count?: number;
  banner_image?: string;
}

interface Recommendation {
  id: number;
  name?: string;
  title?: string;
  description?: string;
  type?: string;
  category?: string;
  score?: number;
}

// Count from zero when the stat card enters the viewport.
function useCounter(target: number, duration: number = 1800) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Show the final value immediately for people who reduce motion.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(target);
      setStarted(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [target]);

  useEffect(() => {
    if (!started) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    setCount(0);
    let animationFrame: number;
    let startTime: number | undefined;
    const step = (timestamp: number) => {
      if (startTime === undefined) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) animationFrame = requestAnimationFrame(step);
    };
    animationFrame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrame);
  }, [started, target, duration]);

  return { count, ref };
}

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [rsvpStatus, setRsvpStatus] = useState<Record<number, string>>({});
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // Dynamic stats from database
  const [stats, setStats] = useState({ totalUsers: 0, totalEvents: 0, totalCommunities: 0, totalConnections: 0 });

  const statUsers = useCounter(stats.totalUsers);
  const statEvents = useCounter(stats.totalEvents);
  const statCommunities = useCounter(stats.totalCommunities);
  const statConnections = useCounter(stats.totalConnections);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await apiFetch('/api/events?upcoming=true');
        if (res.ok) {
          const data = await res.json();
          const fetched = Array.isArray(data) ? data.slice(0, 6) : (data.events || []).slice(0, 6);
          setEvents(fetched);

          // Fetch user RSVPs if authenticated
          const meRes = await apiFetch('/api/auth/me');
          if (meRes.ok) {
            const rsvpRes = await apiFetch('/api/engagement/rsvp/user');
            if (rsvpRes.ok) {
              const rsvpData = await rsvpRes.json();
              const statusMap: Record<number, string> = {};
              rsvpData.forEach((item: any) => { statusMap[item.event_id || item.id] = item.status; });
              setRsvpStatus(statusMap);
            }
          }
        }
      } catch { /* ignore */ }
      setLoadingEvents(false);
    };

    const fetchCommunities = async () => {
      try {
        const res = await apiFetch('/api/communities');
        if (res.ok) {
          const data = await res.json();
          setCommunities(Array.isArray(data) ? data.slice(0, 6) : (data.communities || []).slice(0, 6));
        }
      } catch { /* ignore */ }
      setLoadingCommunities(false);
    };

    const fetchStats = async () => {
      try {
        const res = await apiFetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          setStats({
            totalUsers: data.totalUsers || 0,
            totalEvents: data.totalEvents || 0,
            totalCommunities: data.totalCommunities || 0,
            totalConnections: data.totalConnections || 0,
          });
        }
      } catch { /* ignore */ }
    };

    fetchEvents();
    fetchCommunities();
    fetchStats();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoadingRecommendations(true);
    const fetchRecs = async () => {
      try {
        const res = await apiFetch('/api/recommendations');
        if (res.ok) {
          const data = await res.json();
          setRecommendations(Array.isArray(data) ? data.slice(0, 6) : (data.recommendations || []).slice(0, 6));
        }
      } catch { /* ignore */ }
      setLoadingRecommendations(false);
    };
    fetchRecs();
  }, [isAuthenticated]);

  const formatDateTime = (dateStr: string, timeStr?: string) => {
    const d = new Date(dateStr);
    const datePart = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (timeStr) {
      const [h, m] = timeStr.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      return `${datePart} · ${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
    }
    try {
      const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      if (timePart !== '12:00 AM') return `${datePart} \u00b7 ${timePart}`;
    } catch {}
    return datePart;
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* ═══════════════════ HERO SECTION ═══════════════════ */}
        <section className="relative overflow-hidden min-h-[90vh] flex items-center justify-center">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-slate-950">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-950/40 via-slate-950 to-orange-950/30 animate-gradient" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(245,158,11,0.15),transparent_60%)]" />
          </div>

          {/* Floating orbs */}
          <div className="glow-orb glow-orb-amber w-[500px] h-[500px] -top-32 -left-32 animate-float" />
          <div className="glow-orb glow-orb-orange w-[400px] h-[400px] top-1/3 -right-20 animate-float" style={{ animationDelay: '2s' }} />
          <div className="glow-orb glow-orb-amber w-[300px] h-[300px] bottom-10 left-1/4 animate-float" style={{ animationDelay: '4s' }} />
          <div className="glow-orb glow-orb-orange w-[200px] h-[200px] top-20 right-1/3 animate-float" style={{ animationDelay: '3s' }} />

          {/* Grid background pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(245,158,11,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.3) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />

          {/* Hero content */}
          <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
            {/* Main heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6 opacity-0 animate-fade-in-up animate-fill-both animate-delay-100">
              <span className="text-slate-100">Connect. Discover.</span>
              <br />
              <span className="text-gradient-vibrant">Grow Together.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 opacity-0 animate-fade-in-up animate-fill-both animate-delay-200">
              Join vibrant communities, discover exciting events, and build meaningful connections
              with people who share your passions.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in-up animate-fill-both animate-delay-300">
              <Link
                href="/communities"
                className="btn-primary text-base px-8 py-3.5 rounded-xl flex items-center gap-2 group"
              >
                Explore Communities
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/events"
                className="btn-ghost text-base px-8 py-3.5 rounded-xl"
              >
                Browse Events
              </Link>
            </div>
          </div>

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
        </section>

        {/* ═══════════════════ UPCOMING EVENTS ═══════════════════ */}
        <section className="py-20 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 opacity-0 animate-fade-in-up animate-fill-both animate-delay-100">
                  Upcoming Events
                </h2>
                <p className="text-slate-400 mt-2 opacity-0 animate-fade-in-up animate-fill-both animate-delay-200">
                  Don&apos;t miss out on these exciting gatherings
                </p>
              </div>
              <Link
                href="/events"
                className="text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors hidden sm:block"
              >
                View all →
              </Link>
            </div>

            {loadingEvents ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} hasImage lines={3} />
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-16 glass rounded-2xl">
                <div className="text-4xl mb-4">📅</div>
                <p className="text-slate-400">No upcoming events yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event, i) => (
                  <Link
                    href={`/events/${event.id}`}
                    key={event.id}
                    className="glass-card rounded-2xl overflow-hidden group opacity-0 animate-fade-in-up animate-fill-both"
                    style={{ animationDelay: `${300 + i * 100}ms` }}
                  >
                    {/* Event image */}
                    <div className="aspect-video bg-gradient-to-br from-amber-900/30 to-orange-900/20 relative overflow-hidden">
                      {event.banner_image ? (
                        <img
                          src={`${BACKEND_URL}${event.banner_image}`}
                          alt={event.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {/* Date badge */}
                      {(event.event_date || event.date) && (
                        <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-white/10 text-xs font-medium text-slate-200">
                          {new Date(event.event_date || event.date!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      )}
                    </div>

                    {/* Event info */}
                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-slate-100 line-clamp-2 leading-snug group-hover:text-amber-300 transition-colors">
                        {event.title}
                      </h3>

                      {/* Date · Time · Location — one line */}
                      {(event.event_date || event.date || event.location) && (
                        <div className="mt-2 text-sm text-slate-300">
                          {(event.event_date || event.date) && (
                            <span>{formatDateTime(event.event_date || event.date!, event.start_time)}</span>
                          )}
                          {(event.event_date || event.date) && event.location && <span> </span>}
                          {event.location && <span>{event.location}</span>}
                        </div>
                      )}

                      {/* by Organizer */}
                      {event.community_owner_name && (
                        <div className="text-sm text-slate-400">by {event.community_owner_name}</div>
                      )}

                      {/* Rating */}
                      {event.avg_rating && (
                        <div className="text-sm text-amber-400">
                          <svg className="inline w-4 h-4 -mt-0.5 mr-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          {event.avg_rating}
                        </div>
                      )}

                      {/* Attendees & seats remaining */}
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {(event.attendee_count ?? 0) > 0 && (
                          <div className="text-sm text-slate-400">{event.attendee_count} attendees</div>
                        )}
                        {(event as any).seats_remaining != null && (event as any).seats_remaining <= 10 && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            (event as any).seats_remaining <= 0
                              ? 'bg-red-500/15 text-red-400 border-red-500/20'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                          }`}>
                            {(event as any).seats_remaining <= 0 ? 'Event Full' : `Only ${(event as any).seats_remaining} seat${(event as any).seats_remaining === 1 ? '' : 's'} left`}
                          </span>
                        )}
                      </div>

                      {/* RSVP badge */}
                      {rsvpStatus[event.id] === 'attending' && (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Going
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="text-center mt-8 sm:hidden">
              <Link href="/events" className="text-sm font-medium text-amber-400 hover:text-amber-300">
                View all events →
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════ FEATURED COMMUNITIES ═══════════════════ */}
        <section className="py-20 relative border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 opacity-0 animate-fade-in-up animate-fill-both animate-delay-100">
                  Featured Communities
                </h2>
                <p className="text-slate-400 mt-2 opacity-0 animate-fade-in-up animate-fill-both animate-delay-200">
                  Find your tribe and start connecting
                </p>
              </div>
              <Link
                href="/communities"
                className="text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors hidden sm:block"
              >
                View all →
              </Link>
            </div>

            {loadingCommunities ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} hasImage lines={2} />
                ))}
              </div>
            ) : communities.length === 0 ? (
              <div className="text-center py-16 glass rounded-2xl">
                <div className="text-4xl mb-4">🏘️</div>
                <p className="text-slate-400">No communities yet. Be the first to create one!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {communities.map((community, i) => (
                  <Link
                    href={`/communities/${community.id}`}
                    key={community.id}
                    className="glass-card rounded-2xl overflow-hidden group opacity-0 animate-fade-in-up animate-fill-both"
                    style={{ animationDelay: `${300 + i * 100}ms` }}
                  >
                    {/* Community header */}
                    <div className="aspect-video bg-gradient-to-br from-orange-900/30 to-amber-900/20 relative overflow-hidden">
                      {community.banner_image ? (
                        <img
                          src={`${BACKEND_URL}${community.banner_image}`}
                          alt={community.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                      )}
                      {/* Category badge */}
                      {community.category && (
                        <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-sm border border-white/10 text-xs font-medium text-amber-300">
                          {community.category}
                        </div>
                      )}
                    </div>

                    {/* Community info */}
                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-slate-100 mb-1.5 group-hover:text-amber-300 transition-colors">
                        {community.name}
                      </h3>
                      {community.description && (
                        <p className="text-sm text-slate-400 line-clamp-2 mb-3">{community.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                        <span>{community.member_count || 0} members</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="text-center mt-8 sm:hidden">
              <Link href="/communities" className="text-sm font-medium text-amber-400 hover:text-amber-300">
                View all communities →
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════ RECOMMENDATIONS (authenticated) ═══════════════════ */}
        {isAuthenticated && (
          <section className="py-20 relative border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6">
              <div className="mb-10">
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 opacity-0 animate-fade-in-up animate-fill-both animate-delay-100">
                  Recommended for You
                </h2>
                <p className="text-slate-400 mt-2 opacity-0 animate-fade-in-up animate-fill-both animate-delay-200">
                  Personalized picks based on your interests
                </p>
              </div>

              {loadingRecommendations ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonCard key={i} lines={3} />
                  ))}
                </div>
              ) : recommendations.length === 0 ? (
                <div className="text-center py-16 glass rounded-2xl">
                  <div className="text-4xl mb-4">✨</div>
                  <p className="text-slate-400">
                    Update your interests in your profile to get personalized recommendations!
                  </p>
                  <Link href="/profile" className="btn-primary inline-block mt-4 text-sm px-6 py-2.5">
                    Update Profile
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations.map((rec, i) => (
                    <Link
                      href={rec.type === 'event' ? `/events/${rec.id}` : `/communities/${rec.id}`}
                      key={`${rec.type}-${rec.id}`}
                      className="glass-card rounded-2xl p-5 group opacity-0 animate-fade-in-up animate-fill-both"
                      style={{ animationDelay: `${300 + i * 100}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0 border border-white/5">
                          {rec.type === 'event' ? (
                            <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {rec.type || 'community'}
                            </span>
                            {rec.score && (
                              <span className="text-[10px] text-slate-500">{Math.round(rec.score * 100)}% match</span>
                            )}
                          </div>
                          <h3 className="text-base font-semibold text-slate-100 truncate group-hover:text-amber-300 transition-colors">
                            {rec.name || rec.title}
                          </h3>
                          {rec.description && (
                            <p className="text-sm text-slate-400 line-clamp-2 mt-1">{rec.description}</p>
                          )}
                          {rec.category && (
                            <span className="inline-block mt-2 text-xs text-slate-500">{rec.category}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ═══════════════════ STATS SECTION ═══════════════════ */}
        <section className="relative py-20 border-t border-white/5">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 opacity-0 animate-fade-in-up animate-fill-both animate-delay-100">
                Smart Connects at a Glance
              </h2>
              <p className="text-slate-400 mt-2 opacity-0 animate-fade-in-up animate-fill-both animate-delay-200">
                Connecting people, communities, and opportunities in one platform.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                {
                  label: 'Active Users',
                  counter: statUsers,
                  suffix: '+',
                  icon: (
                    <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  ),
                },
                {
                  label: 'Events Hosted',
                  counter: statEvents,
                  suffix: '+',
                  icon: (
                    <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  ),
                },
                {
                  label: 'Communities',
                  counter: statCommunities,
                  suffix: '+',
                  icon: (
                    <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18M5 21V7a2 2 0 012-2h10a2 2 0 012 2v14M9 9h6m-6 4h6m-6 4h6" />
                    </svg>
                  ),
                },
                {
                  label: 'Connections Made',
                  counter: statConnections,
                  suffix: '+',
                  icon: (
                    <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                  ),
                },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  ref={stat.counter.ref}
                  className="text-center p-6 rounded-2xl glass opacity-0 animate-fade-in-up animate-fill-both transition-transform duration-300 hover:-translate-y-1"
                  style={{ animationDelay: `${400 + i * 100}ms` }}
                >
                  <div
                    className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-white/5 stat-icon-pulse"
                    style={{ animationDelay: `${1000 + i * 150}ms` }}
                  >
                    {stat.icon}
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-gradient mb-2">
                    {stat.counter.count.toLocaleString()}{stat.suffix}
                  </div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════ ORGANIZER / COMMUNITY JOURNEY SECTION ═══════════════════ */}
        <CommunityJourney />

        {/* ═══════════════════ CTA SECTION ═══════════════════ */}
        {!isAuthenticated && (
          <section className="py-24 relative border-t border-white/5">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(245,158,11,0.08),transparent_70%)]" />
            <div className="relative max-w-3xl mx-auto px-6 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-4">
                Ready to get started?
              </h2>
              <p className="text-lg text-slate-400 mb-8">
                Join thousands of people discovering communities and events that match their passions.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register" className="btn-primary text-base px-8 py-3.5 rounded-xl">
                  Create Account
                </Link>
                <Link href="/login" className="btn-ghost text-base px-8 py-3.5 rounded-xl">
                  Sign In
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>
      <Chatbot />
    </>
  );
}
