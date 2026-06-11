'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import { apiFetch } from '../../../lib/auth';

export default function EditCommunityPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [community, setCommunity] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', description: '', category: '', website: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCommunity = async () => {
      try {
        const meRes = await apiFetch('/api/auth/me');
        if (!meRes.ok) { router.push('/login'); return; }
        const currentUser = await meRes.json();
        const res = await apiFetch(`/api/communities/${id}`);
        if (!res.ok) throw new Error('Community not found');
        const data = await res.json();
        if (data.owner_id !== currentUser.id) { router.push('/communities'); return; }
        setCommunity(data);
        setFormData({ name: data.name, description: data.description, category: data.category, website: data.website });
      } catch (err) { setError('Failed to load community'); }
      finally { setLoading(false); }
    };
    fetchCommunity();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/communities/${id}`, { method: 'PUT', body: JSON.stringify(formData) });
      if (!res.ok) { const data = await res.json(); setError(data.error || 'Failed to update'); return; }
      router.push(`/communities/${id}`);
    } catch (err) { setError('An error occurred'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this community permanently?')) return;
    try {
      const res = await apiFetch(`/api/communities/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/communities');
    } catch (err) { setError('Failed to delete'); }
  };

  if (loading) return <div className="min-h-screen" />;

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-2xl px-6 py-16 sm:px-8">
        <Link href={`/communities/${id}`} className="text-sm font-medium text-orange-600 hover:text-orange-500">← Back to Community</Link>
        <div className="mt-8 animate-fade-in-up rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg">
          <h1 className="text-4xl font-bold text-slate-800">Edit Community</h1>
          {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-600">Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required rows={4}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Category</label>
              <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Website</label>
              <input type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })}
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
