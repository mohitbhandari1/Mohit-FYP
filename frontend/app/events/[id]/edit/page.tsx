'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import { apiFetch } from '../../../lib/auth';

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [event, setEvent] = useState<any>(null);
  const [formData, setFormData] = useState({ title: '', description: '', event_date: '', location: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await apiFetch(`/api/events/${eventId}`);
        if (!res.ok) { if (res.status === 401) { router.push('/login'); return; } throw new Error('Event not found'); }
        const data = await res.json();
        setEvent(data);
        const eventDate = new Date(data.event_date);
        setFormData({ title: data.title, description: data.description, event_date: eventDate.toISOString().slice(0, 16), location: data.location });
      } catch (err) { setError('Failed to load event'); }
      finally { setLoading(false); }
    };
    fetchEvent();
  }, [eventId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/events/${eventId}`, { method: 'PUT', body: JSON.stringify(formData) });
      if (!res.ok) { const data = await res.json(); setError(data.error || 'Failed to update'); return; }
      router.push('/events');
    } catch (err) { setError('An error occurred'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      const res = await apiFetch(`/api/events/${eventId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/events');
    } catch (err) { setError('Failed to delete event'); }
  };

  if (loading) return <div className="min-h-screen" />;

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-2xl px-6 py-16 sm:px-8">
        <Link href="/events" className="text-sm font-medium text-orange-600 hover:text-orange-500">← Back to Events</Link>
        <div className="mt-8 animate-fade-in-up rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg">
          <h1 className="text-4xl font-bold text-slate-800">Edit Event</h1>
          {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-600">Event Title</label>
              <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required rows={4}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Date & Time</label>
              <input type="datetime-local" value={formData.event_date} onChange={(e) => setFormData({ ...formData, event_date: e.target.value })} required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Location</label>
              <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
            </div>
            <div className="flex gap-4">
              <button type="submit" disabled={submitting}
                className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-2.5 font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02] disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" onClick={handleDelete}
                className="rounded-xl border-2 border-red-300 px-6 py-2.5 font-semibold text-red-500 transition-all hover:bg-red-50">
                Delete
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
