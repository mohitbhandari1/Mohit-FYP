'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { apiFetch } from '../lib/auth';
import { useAuth } from '../lib/AuthContext';

export default function OrganizerDashboard() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [application, setApplication] = useState<any>(null);
  const [loadingApp, setLoadingApp] = useState(true);
  const [showNewCommunity, setShowNewCommunity] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', category: '', website: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const { user: authUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const meRes = await apiFetch('/api/auth/me');
        if (!meRes.ok) { router.push('/login'); return; }
        const currentUser = await meRes.json();
        const appRes = await apiFetch('/api/applications/my');
        if (appRes.ok) { const appData = await appRes.json(); setApplication(appData.application); }
      } catch (err) {}
      finally { setLoadingApp(false); }
      try {
        const res = await apiFetch('/api/communities');
        const data = await res.json();
        const meRes = await apiFetch('/api/auth/me');
        if (meRes.ok) {
          const currentUser = await meRes.json();
          setCommunities(data.filter((c: any) => c.owner_id === currentUser.id));
        }
      } catch (err) { setError('Failed to load communities'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [router]);

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/communities', { method: 'POST', body: JSON.stringify(formData) });
      if (!res.ok) { const data = await res.json(); setError(data.error || 'Failed to create'); return; }
      const newCommunity = await res.json();
      setCommunities([...communities, newCommunity]);
      setFormData({ name: '', description: '', category: '', website: '' });
      setShowNewCommunity(false);
    } catch (err) { setError('An error occurred'); }
  };

  if (loading && loadingApp) return <div className="min-h-screen" />;

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        <div className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg">
          <h1 className="text-4xl font-bold text-slate-800">Organizer Dashboard</h1>
          {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>}

          {!loadingApp && !application && (
            <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-6">
              <h2 className="text-lg font-bold text-orange-700">Become a Community Organizer</h2>
              <p className="mt-2 text-orange-600">Apply to start a new community group. An admin will review it.</p>
              <Link href="/apply"
                className="mt-4 inline-block rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
                Start a New Group
              </Link>
            </div>
          )}

          {application?.status === 'pending' && (
            <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-3 w-3 rounded-full bg-yellow-400 animate-pulse" />
                <h2 className="text-lg font-bold text-yellow-700">Application Pending Review</h2>
              </div>
              <p className="mt-2 text-yellow-600">Your application for <strong>{application.community_name}</strong> is under review.</p>
              <Link href="/apply" className="mt-4 inline-block text-sm font-medium text-orange-600 hover:text-orange-500">View details →</Link>
            </div>
          )}

          {application?.status === 'rejected' && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6">
              <h2 className="text-lg font-bold text-red-700">Application Not Approved</h2>
              <p className="mt-2 text-red-600">Your application for <strong>{application.community_name}</strong> was not approved.</p>
              {application.admin_notes && <p className="mt-2 text-sm text-red-500">Notes: {application.admin_notes}</p>}
              <Link href="/apply" className="mt-4 inline-block text-sm font-medium text-orange-600 hover:text-orange-500">Submit a new application →</Link>
            </div>
          )}

          {(application?.status === 'approved' || communities.length > 0) && (
            <>
              <div className="mt-8 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-700">Your Communities</h2>
                <button onClick={() => setShowNewCommunity(!showNewCommunity)}
                  className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
                  {showNewCommunity ? 'Cancel' : '+ Create Community'}
                </button>
              </div>

              {showNewCommunity && (
                <form onSubmit={handleCreateCommunity} className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <input type="text" placeholder="Community Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  <input type="text" placeholder="Category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  <input type="url" placeholder="Website (optional)" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  <button type="submit"
                    className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
                    Create
                  </button>
                </form>
              )}

              <div className="mt-6 space-y-4">
                {communities.length === 0 ? (
                  <p className="text-slate-400">No communities yet. Create one to get started!</p>
                ) : (
                  communities.map((community, i) => (
                    <Link href={`/communities/${community.id}`} key={community.id}>
                      <article className="card-hover rounded-xl border border-slate-200 bg-white p-6 shadow-sm" style={{ animationDelay: `${i * 80}ms` }}>
                        <h3 className="text-xl font-bold text-slate-700">{community.name}</h3>
                        <p className="mt-2 text-slate-500">{community.description}</p>
                        <div className="mt-4 flex gap-3">
                          <span className="rounded-full bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-1 text-sm font-medium text-orange-600">{community.category}</span>
                          <span className="text-sm text-slate-400">{community.member_count} members</span>
                        </div>
                      </article>
                    </Link>
                  ))
                )}
              </div>
            </>
          )}

          {!loadingApp && !loading && !application && communities.length === 0 && (
            <div className="mt-8 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <p className="text-slate-400">Submit an application to become a community organizer!</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
