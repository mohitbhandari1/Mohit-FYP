'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Chatbot from '../components/Chatbot';
import { apiFetch, BACKEND_URL } from '../lib/auth';

export default function MyEventsPage() {
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [savedEvents, setSavedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'attending' | 'not-attending' | 'saved'>('attending');
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rsvpRes, savedRes] = await Promise.all([
          apiFetch('/api/engagement/rsvp/user'),
          apiFetch('/api/events/my-saved'),
        ]);
        if (!rsvpRes.ok) { if (rsvpRes.status === 401) { router.push('/login'); return; } throw new Error('Not authorized'); }
        setRsvps(await rsvpRes.json());
        if (savedRes.ok) setSavedEvents(await savedRes.json());
      } catch (err) { setError('Failed to load your events'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [router]);

  const attendingEvents = rsvps.filter((r) => r.status === 'attending');
  const notAttendingEvents = rsvps.filter((r) => r.status === 'not_attending');

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDisplayEvents = () => {
    switch (activeTab) {
      case 'attending': return attendingEvents;
      case 'not-attending': return notAttendingEvents;
      case 'saved': return savedEvents;
      default: return [];
    }
  };

  if (loading) return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-48 bg-white/5 rounded" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-48 bg-white/5 rounded-2xl" />)}
          </div>
        </div>
      </section>
      <Chatbot />
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                My Events
              </h1>
              <p className="mt-1 text-slate-400">Track your event RSVPs and saved events</p>
            </div>
            <Link href="/events" className="text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors">
              Browse Events →
            </Link>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm">{error}</div>
          )}

          {/* Tab Bar */}
          <div className="flex gap-1 mb-8 bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/10 p-1 w-fit">
            <button onClick={() => setActiveTab('attending')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'attending' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}>
              Attending
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'attending' ? 'bg-white/20' : 'bg-emerald-500/20 text-emerald-400'
              }`}>{attendingEvents.length}</span>
            </button>
            <button onClick={() => setActiveTab('not-attending')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'not-attending' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}>
              Not Attending
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'not-attending' ? 'bg-white/20' : 'bg-red-500/20 text-red-400'
              }`}>{notAttendingEvents.length}</span>
            </button>
            <button onClick={() => setActiveTab('saved')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'saved' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}>
              Saved
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'saved' ? 'bg-white/20' : 'bg-amber-500/20 text-amber-400'
              }`}>{savedEvents.length}</span>
            </button>
          </div>

          {/* Events Grid */}
          {getDisplayEvents().length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {getDisplayEvents().map((event: any, i: number) => (
                <Link key={event.id || event.event_id || i} href={`/events/${event.event_id || event.id}`}
                  className="group rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-500 hover:-translate-y-1 opacity-0 animate-fade-in-up"
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}>
                  {/* Banner */}
                  <div className="relative aspect-video bg-gradient-to-br from-amber-900/30 to-orange-900/30 overflow-hidden">
                    {event.banner_image ? (
                      <img src={`${BACKEND_URL}${event.banner_image}`} alt={event.title || event.event_title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-amber-600/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      {activeTab === 'attending' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm">
                          ✓ Attending
                        </span>
                      )}
                      {activeTab === 'not-attending' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30 backdrop-blur-sm">
                          ✗ Not Going
                        </span>
                      )}
                      {activeTab === 'saved' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 backdrop-blur-sm">
                          ♥ Saved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-100 group-hover:text-amber-400 transition-colors line-clamp-1">
                      {event.title || event.event_title}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(event.event_date || event.date) && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(event.event_date || event.date)}
                        </span>
                      )}
                      {event.location && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl">
              <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-300">No events here yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                {activeTab === 'attending' && "You haven't RSVP'd to any events yet."}
                {activeTab === 'not-attending' && "No events marked as not attending."}
                {activeTab === 'saved' && "You haven't saved any events yet."}
              </p>
              <Link href="/events" className="mt-4 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors">
                Browse Events →
              </Link>
            </div>
          )}
        </div>
      </section>
      <Chatbot />
    </main>
  );
}
