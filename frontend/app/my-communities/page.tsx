'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Chatbot from '../components/Chatbot';
import ConfirmModal from '../components/ConfirmModal';
import { apiFetch, BACKEND_URL } from '../lib/auth';

export default function MyCommunitiesPage() {
  const [joinedCommunities, setJoinedCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leavingId, setLeavingId] = useState<number | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchJoinedCommunities = async () => {
      try {
        const res = await apiFetch('/api/engagement/community/my-joined');
        if (!res.ok) { if (res.status === 401) { router.push('/login'); return; } throw new Error('Failed to load'); }
        const data = await res.json();
        setJoinedCommunities(data);
      } catch (err) { setError('Failed to load your communities'); }
      finally { setLoading(false); }
    };
    fetchJoinedCommunities();
  }, [router]);

  const handleLeave = async () => {
    if (!leaveTarget) return;
    setLeavingId(leaveTarget.id);
    try {
      const res = await apiFetch(`/api/engagement/community/${leaveTarget.id}/leave`, { method: 'POST' });
      if (res.ok) {
        setJoinedCommunities((prev) => prev.filter((c) => c.id !== leaveTarget.id));
      }
    } catch (err) { console.error('Failed to leave community'); }
    finally { setLeavingId(null); setShowLeaveModal(false); setLeaveTarget(null); }
  };

  if (loading) return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-56 bg-white/5 rounded" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-52 bg-white/5 rounded-2xl" />)}
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
                My Communities
              </h1>
              <p className="mt-1 text-slate-400">Communities you&apos;ve joined</p>
            </div>
            <Link href="/communities" className="text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors">
              Browse All →
            </Link>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm">{error}</div>
          )}

          {/* Communities Grid */}
          {joinedCommunities.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {joinedCommunities.map((community: any, i: number) => (
                <div
                  key={community.id}
                  className="group rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-500 hover:-translate-y-1 opacity-0 animate-fade-in-up"
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}
                >
                  {/* Banner */}
                  <div className="relative aspect-video bg-gradient-to-br from-amber-900/30 to-orange-900/30 overflow-hidden">
                    {community.banner_image ? (
                      <img src={`${BACKEND_URL}${community.banner_image}`} alt={community.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-amber-600/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    )}
                    {/* Joined Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm">
                        ✓ Joined
                      </span>
                    </div>
                    {/* Logo */}
                    {community.logo && (
                      <div className="absolute -bottom-5 left-4">
                        <img src={`${BACKEND_URL}${community.logo}`} alt=""
                          className="w-10 h-10 rounded-lg border-2 border-slate-950 object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 pt-6">
                    <h3 className="font-semibold text-slate-100 group-hover:text-amber-400 transition-colors line-clamp-1">
                      {community.name}
                    </h3>
                    {community.category && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-xs text-slate-400 bg-white/5">
                        {community.category}
                      </span>
                    )}
                    {community.description && (
                      <p className="mt-2 text-sm text-slate-400 line-clamp-2">{community.description}</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                      <Link href={`/communities/${community.id}`}
                        className="flex-1 px-3 py-2 text-center text-xs font-medium rounded-lg bg-white/5 text-slate-300 border border-white/10 hover:text-amber-400 hover:border-amber-500/20 transition-all">
                        View
                      </Link>
                      <button
                        onClick={() => { setLeaveTarget(community); setShowLeaveModal(true); }}
                        disabled={leavingId === community.id}
                        className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-white/5 text-slate-400 border border-white/10 hover:text-red-400 hover:border-red-500/20 transition-all disabled:opacity-50"
                      >
                        {leavingId === community.id ? 'Leaving...' : 'Leave'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl">
              <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-300">No communities joined yet</h3>
              <p className="mt-2 text-sm text-slate-500">Explore and join communities that match your interests</p>
              <Link href="/communities" className="mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all">
                Browse Communities
              </Link>
            </div>
          )}
        </div>
      </section>

      {showLeaveModal && leaveTarget && (
        <ConfirmModal
          isOpen={showLeaveModal}
          title="Leave Community"
          message={`Are you sure you want to leave "${leaveTarget.name}"?`}
          confirmLabel="Leave"
          variant="danger"
          onConfirm={handleLeave}
          onClose={() => { setShowLeaveModal(false); setLeaveTarget(null); }}
        />
      )}
      <Chatbot />
    </main>
  );
}
