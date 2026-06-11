'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Chatbot from './components/Chatbot';
import { useAuth } from './lib/AuthContext';
import { apiFetch, BACKEND_URL } from './lib/auth';

const stats = [
  { value: '100+', label: 'Active Communities' },
  { value: '500+', label: 'Events Hosted' },
  { value: '2K+', label: 'Members Connected' },
  { value: '95%', label: 'Satisfaction Rate' },
];

export default function Home() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [userInterests, setUserInterests] = useState('');
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [topCommunities, setTopCommunities] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await (await fetch(`${BACKEND_URL}/api/auth/me`, { credentials: 'include' }).catch(() => null))?.json();
      setIsAuthenticated(!!user);
    };
    checkAuth();

    apiFetch('/api/events?upcoming=true')
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setUpcomingEvents(data || []))
      .catch(() => {});

    apiFetch('/api/communities')
      .then((res) => res.ok ? res.json() : [])
      .then((data) => {
        const sorted = (data || []).sort((a: any, b: any) => (b.member_count || 0) - (a.member_count || 0));
        setTopCommunities(sorted.slice(0, 4));
      })
      .catch(() => {});

    apiFetch('/api/recommendations')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          setRecommendations(data.recommendations || []);
          setUserInterests(data.interests || '');
          setIsAuthenticated(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRecs(false));
  }, []);

  return (
    <main className="min-h-screen">
      <Navbar />
      <Chatbot />

      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-amber-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 opacity-60 dark:opacity-80" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-gradient-to-br from-orange-200/30 to-amber-200/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-tr from-indigo-200/20 to-purple-200/20 blur-3xl" />
        
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-12 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
            <div className="animate-fade-in-up">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                Nepal's #1 Community Platform
              </span>
              <h1 className="text-5xl font-bold tracking-tight text-slate-800 sm:text-6xl lg:text-7xl">
                Find the right{' '}
                <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  community
                </span>{' '}
                around you.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-500">
                Discover clubs, organizations, and events that match your interests. Connect with people who share your passion.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/communities"
                  className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105"
                >
                  Browse communities
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="/events"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-slate-200 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:border-orange-300 hover:text-orange-600 hover:shadow-md"
                >
                  View events
                </Link>
              </div>
            </div>

            {/* Hero Image */}
            <div className="animate-fade-in-up animate-delay-200 flex items-center justify-center">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-orange-200/40 to-amber-200/40 blur-2xl" />
                <img
                  src="/smart-connects-circular.png"
                  alt="Smart Connects"
                  className="relative h-auto w-full max-w-md rounded-full shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats Section ─── */}
      <section className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-sm md:grid-cols-4 animate-fade-in-up">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Upcoming Events ─── */}
      {upcomingEvents.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-8 sm:px-8 animate-fade-in-up">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">📅 Upcoming Events</h2>
              <Link href="/events" className="text-sm font-medium text-orange-600 hover:text-orange-500 transition-colors">
                View all <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {upcomingEvents.map((event: any, i: number) => (
                <Link href={`/events/${event.id}`} key={event.id}>
                  <article
                    className="card-hover group rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <h3 className="font-semibold text-slate-700 group-hover:text-orange-600 transition-colors">
                      {event.title}
                    </h3>
                    <p className="mt-2 text-xs text-slate-400 line-clamp-2">{event.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-600">
                        📅 {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                        📍 {event.location || 'Online'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-medium text-orange-500">{event.community_name}</p>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Featured Communities ─── */}
      <section className="mx-auto max-w-6xl px-6 py-8 sm:px-8 animate-fade-in-up">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">🏆 Featured Communities</h2>
            <Link href="/communities" className="text-sm font-medium text-orange-600 hover:text-orange-500 transition-colors">
              Browse all <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {topCommunities.length > 0 ? (
              topCommunities.map((community: any, i: number) => (
                <Link href={`/communities/${community.id}`} key={community.id}>
                  <article
                    className="card-hover group rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-bold text-slate-700 group-hover:text-orange-600 transition-colors">
                        {community.name}
                      </h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                        {community.category || 'General'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400 line-clamp-2">{community.description}</p>
                    <div className="mt-4 flex items-center gap-3 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-orange-400" />
                        {community.member_count || 0} members
                      </span>
                    </div>
                  </article>
                </Link>
              ))
            ) : (
              <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
                <p className="text-slate-400">No communities yet. Be the first to create one!</p>
                <Link
                  href={isAuthenticated ? '/organizer' : '/register'}
                  className="mt-4 inline-block rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-105"
                >
                  {isAuthenticated ? 'Create Community' : 'Sign up to get started'}
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Recommendations ─── */}
      {isAuthenticated && (
        <section className="mx-auto max-w-6xl px-6 py-8 pb-16 sm:px-8 animate-fade-in-up">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">✨ Recommended for you</h2>
                {userInterests && (
                  <p className="mt-1 text-sm text-slate-400">
                    Based on your interests: <span className="font-medium text-orange-600">{userInterests}</span>
                  </p>
                )}
              </div>
              <Link href="/profile" className="text-sm font-medium text-orange-600 hover:text-orange-500">
                Update interests <span aria-hidden="true">→</span>
              </Link>
            </div>

            {loadingRecs ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-6">
                    <div className="h-5 w-3/4 rounded bg-slate-200" />
                    <div className="mt-3 h-4 w-full rounded bg-slate-200" />
                    <div className="mt-2 h-4 w-1/2 rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            ) : recommendations.length > 0 ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {recommendations.map((rec: any, i: number) => (
                  <Link href={`/communities/${rec.id}`} key={rec.id}>
                    <article
                      className="card-hover group rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-bold text-slate-700 group-hover:text-orange-600 transition-colors">
                          {rec.name}
                        </h3>
                        {rec.score > 0 && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            rec.score >= 3
                              ? 'bg-orange-50 text-orange-600'
                              : 'bg-amber-50 text-amber-600'
                          }`}>
                            {rec.score >= 3 ? '🔥 High match' : '👍 Good match'}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-slate-400 line-clamp-2">{rec.description}</p>
                      <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-500">
                          {rec.category || 'General'}
                        </span>
                        <span>{rec.member_count || 0} members</span>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                <p className="text-slate-400">
                  {userInterests
                    ? 'No matching communities found. Try different interests!'
                    : 'Set your interests in your profile to get personalized recommendations!'}
                </p>
                <Link
                  href={userInterests ? '/communities' : '/profile'}
                  className="mt-4 inline-block rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-105"
                >
                  {userInterests ? 'Browse all communities' : 'Set up profile'}
                </Link>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
