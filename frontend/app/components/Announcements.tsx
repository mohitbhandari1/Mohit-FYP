'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/auth';

interface Props {
  communityId: number;
  isOwner: boolean;
}

export default function Announcements({ communityId, isOwner }: Props) {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch(`/api/announcements/${communityId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAnnouncements(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [communityId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await apiFetch(`/api/announcements/${communityId}`, { method: 'POST', body: JSON.stringify(formData) });
      if (!res.ok) { const data = await res.json(); setError(data.error || 'Failed to create'); return; }
      const newAnnouncement = await res.json();
      const meRes = await apiFetch('/api/auth/me');
      if (meRes.ok) { const me = await meRes.json(); newAnnouncement.author_name = me.name; }
      setAnnouncements([newAnnouncement, ...announcements]);
      setFormData({ title: '', content: '' });
      setShowForm(false);
    } catch (err) { setError('An error occurred'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (announcementId: number) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      const res = await apiFetch(`/api/announcements/${communityId}/${announcementId}`, { method: 'DELETE' });
      if (res.ok) setAnnouncements(announcements.filter((a) => a.id !== announcementId));
    } catch (err) {}
  };

  if (loading) return <div className="h-20 animate-pulse rounded-xl bg-slate-200" />;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-700">📢 Announcements</h2>
        {isOwner && (
          <button onClick={() => setShowForm(!showForm)}
            className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
            {showForm ? 'Cancel' : '+ Post'}
          </button>
        )}
      </div>

      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <input type="text" placeholder="Announcement title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
          <textarea placeholder="Write your announcement..." value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} required rows={4}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
          <button type="submit" disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02] disabled:opacity-50">
            {submitting ? 'Posting...' : 'Post Announcement'}
          </button>
        </form>
      )}

      <div className="mt-6 space-y-4">
        {announcements.length === 0 ? (
          <p className="text-sm text-slate-400">No announcements yet.</p>
        ) : (
          announcements.map((ann) => (
            <div key={ann.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-700">{ann.title}</h3>
                  <p className="mt-1 text-xs text-slate-400">Posted by {ann.author_name} • {new Date(ann.created_at).toLocaleDateString()}</p>
                </div>
                {isOwner && (
                  <button onClick={() => handleDelete(ann.id)} className="text-xs text-red-400 hover:text-red-500">Delete</button>
                )}
              </div>
              <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">{ann.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
