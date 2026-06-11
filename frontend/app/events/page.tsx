'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { apiFetch } from '../lib/auth';

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<Record<number, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const eventsRes = await apiFetch('/api/events');
        const eventsData = await eventsRes.json();
        setEvents(eventsData);

        const authRes = await apiFetch('/api/auth/me');
        if (authRes.ok) {
          setIsAuthenticated(true);
          try {
            const rsvpRes = await apiFetch('/api/engagement/rsvp/user');
            if (rsvpRes.ok) {
              const rsvpData = await rsvpRes.json();
              const statusMap: Record<number, string> = {};
              rsvpData.forEach((item: any) => { statusMap[item.id] = item.status; });
              setRsvpStatus(statusMap);
            }
          } catch (err) {}
        }
      } catch (err) { console.error('Failed to load events'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleRsvp = async (eventId: number, status: 'attending' | 'not_attending') => {
    const authRes = await apiFetch('/api/auth/me');
    if (!authRes.ok) { window.location.href = '/login'; return; }
    try {
      const res = await apiFetch('/api/engagement/rsvp', {
        method: 'POST',
        body: JSON.stringify({ event_id: eventId, status }),
      });
      if (res.ok) setRsvpStatus((prev) => ({ ...prev, [eventId]: status }));
    } catch (err) { console.error('Failed to RSVP'); }
  };

  if (loading) return <div className="min-h-screen" />;

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        <div className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-800">Events</h1>
              <p className="mt-2 text-slate-500">See upcoming events across active communities.</p>
            </div>
            {isAuthenticated && (
              <Link href="/events/create" className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
                + Create Event
              </Link>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {events.length > 0 ? (
              events.map((event: any, i: number) => (
                <article key={event.id} className="card-hover rounded-xl border border-slate-200 bg-white p-6 shadow-sm" style={{ animationDelay: `${i * 80}ms` }}>
                  <h2 className="text-xl font-bold text-slate-700">{event.title}</h2>
                  <p className="mt-3 text-slate-500 line-clamp-2">{event.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-600">
                      📅 {new Date(event.event_date).toLocaleDateString()}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-600">
                      📍 {event.location || 'Online'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-orange-600">
                    Community: <Link href={`/communities/${event.community_id}`} className="text-orange-500 hover:text-orange-400">{event.community_name}</Link>
                  </p>
                  {isAuthenticated && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleRsvp(event.id, 'attending')}
                        className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                          rsvpStatus[event.id] === 'attending'
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                            : 'border-2 border-slate-200 text-slate-600 hover:border-orange-500 hover:text-orange-600'
                        }`}
                      >
                        {rsvpStatus[event.id] === 'attending' ? '✓ Attending' : 'Attending'}
                      </button>
                      <button
                        onClick={() => handleRsvp(event.id, 'not_attending')}
                        className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                          rsvpStatus[event.id] === 'not_attending'
                            ? 'bg-red-500 text-white shadow-sm'
                            : 'border-2 border-slate-200 text-slate-600 hover:border-red-400 hover:text-red-500'
                        }`}
                      >
                        {rsvpStatus[event.id] === 'not_attending' ? '✗ Not Attending' : 'Not Attending'}
                      </button>
                    </div>
                  )}
                </article>
              ))
            ) : (
              <p className="col-span-full text-center py-8 text-slate-400">No events are available yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
