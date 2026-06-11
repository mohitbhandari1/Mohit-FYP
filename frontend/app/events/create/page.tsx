'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { apiFetch } from '../../lib/auth';
import { useAuth } from '../../lib/AuthContext';

export default function CreateEventPage() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [formData, setFormData] = useState({ title: '', description: '', event_date: '', location: '', community_id: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const meRes = await apiFetch('/api/auth/me');
        if (!meRes.ok) { router.push('/login'); return; }
        const currentUser = await meRes.json();
        const res = await apiFetch('/api/communities');
        const data = await res.json();
        setCommunities(data.filter((c: any) => c.owner_id === currentUser.id));
      } catch (err) { setError('Failed to load communities'); }
      finally { setLoading(false); }
    };
    fetchCommunities();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/events', {
        method: 'POST',
        body: JSON.stringify({ ...formData, community_id: parseInt(formData.community_id) }),
      });
      if (!res.ok) { const data = await res.json(); setError(data.error || 'Failed to create event'); return; }
      router.push('/events');
    } catch (err) { setError('An error occurred'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen" />;

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-2xl px-6 py-16 sm:px-8">
        <Link href="/events" className="text-sm font-medium text-orange-600 hover:text-orange-500">← Back to Events</Link>
        <div className="mt-8 animate-fade-in-up rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg">
          <h1 className="text-4xl font-bold text-slate-800">Create Event</h1>
          {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>}

          {communities.length === 0 ? (
            <p className="mt-6 text-slate-400">You must create a community first before creating an event.</p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <InputField label="Community" required>
                <select value={formData.community_id} onChange={(e) => setFormData({ ...formData, community_id: e.target.value })} required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20">
                  <option value="">Select a community</option>
                  {communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </InputField>
              <InputField label="Event Title" required>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
              </InputField>
              <InputField label="Description" required>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
              </InputField>
              <InputField label="Date & Time" required>
                <input type="datetime-local" value={formData.event_date} onChange={(e) => setFormData({ ...formData, event_date: e.target.value })} required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
              </InputField>
              <InputField label="Location" required>
                <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
              </InputField>
              <button type="submit" disabled={submitting}
                className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02] disabled:opacity-50">
                {submitting ? 'Creating...' : 'Create Event'}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

function InputField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600">{label}{required && <span className="text-red-400">*</span>}</label>
      {children}
    </div>
  );
}
