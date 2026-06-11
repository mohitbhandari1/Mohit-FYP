'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { apiFetch } from '../lib/auth';

export default function MyEventsPage() {
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchRsvps = async () => {
      try {
        const res = await apiFetch('/api/engagement/rsvp/user');
        if (!res.ok) { if (res.status === 401) { router.push('/login'); return; } throw new Error('Not authorized'); }
        const data = await res.json();
        setRsvps(data);
      } catch (err) { setError('Failed to load your events'); }
      finally { setLoading(false); }
    };
    fetchRsvps();
  }, [router]);

  if (loading) return <div className="min-h-screen" />;

  const attendingEvents = rsvps.filter((r) => r.status === 'attending');
  const notAttendingEvents = rsvps.filter((r) => r.status === 'not_attending');

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        <div className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold text-slate-800">My Events</h1>
            <Link href="/events" className="text-sm font-medium text-orange-600 hover:text-orange-500">← Back to all events</Link>
          </div>
          {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>}

          <div className="mt-8 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-700 mb-4">Events I&apos;m Attending</h2>
              {attendingEvents.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {attendingEvents.map((event) => (
                    <article key={event.id} className="card-hover rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-700">{event.title}</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-600">
                          📅 {new Date(event.event_date).toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-600">
                          ✓ Attending
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">You haven&apos;t RSVP&apos;d to any events yet.</p>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-700 mb-4">Events I&apos;m Not Attending</h2>
              {notAttendingEvents.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {notAttendingEvents.map((event) => (
                    <article key={event.id} className="card-hover rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-700">{event.title}</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-600">
                          📅 {new Date(event.event_date).toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-500">
                          ✗ Not Attending
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">No entries.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
