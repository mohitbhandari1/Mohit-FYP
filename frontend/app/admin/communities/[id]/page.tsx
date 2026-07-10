'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import Chatbot from '../../../components/Chatbot';
import { apiFetch, BACKEND_URL } from '../../../lib/auth';
import { SkeletonDetailPage } from '../../../components/Skeleton';

interface CommunityDetail {
  id: number;
  name: string;
  description: string;
  category: string;
  website: string;
  location: string;
  is_verified: boolean;
  is_private: boolean;
  member_approval: boolean;
  banner_image: string;
  logo: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  tiktok: string;
  created_at: string;
  owner: {
    id: number;
    name: string;
    email: string;
    avatar_url: string;
  };
  stats: {
    total_members: number;
    total_events: number;
    upcoming_events: number;
    total_announcements: number;
    total_discussions: number;
    average_rating: number | null;
    review_count: number;
    members_with_gender: number;
    gender_breakdown: Record<string, number>;
  };
  recent_members: Array<{
    id: number;
    name: string;
    avatar_url: string;
    gender: string;
    joined_at: string;
  }>;
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="text-amber-400/70">{icon}</div>
        <span className="text-xs text-slate-500 truncate">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
    </div>
  );
}

export default function AdminCommunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [community, setCommunity] = useState<CommunityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const meRes = await apiFetch('/api/auth/me');
        if (!meRes.ok) { router.push('/login'); return; }
        const currentUser = await meRes.json();
        if (!currentUser.is_admin && currentUser.role !== 'admin') { router.push('/'); return; }

        const res = await apiFetch(`/api/admin/communities/${id}/details`);
        if (res.ok) {
          setCommunity(await res.json());
        } else {
          router.push('/admin');
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchData();
  }, [id, router]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/admin/communities/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/admin');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Failed to move to trash: ${data.error || res.statusText}`);
        setDeleting(false);
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      alert('Network error. Please try again.');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950">
        <Navbar />
        <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 pt-24">
          <SkeletonDetailPage />
        </section>
        <Chatbot />
      </main>
    );
  }

  if (!community) {
    return (
      <main className="min-h-screen bg-slate-950">
        <Navbar />
        <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 pt-24">
          <div className="text-center glass rounded-2xl p-10">
            <div className="text-5xl mb-4">🏘️</div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Community not found</h2>
            <Link href="/admin" className="btn-primary px-6 py-2.5 rounded-xl text-sm inline-block mt-4">
              Back to Admin
            </Link>
          </div>
        </section>
        <Chatbot />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 pt-24">
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="glow-orb glow-orb-amber w-[500px] h-[500px] -top-40 right-0 opacity-10" />
          <div className="glow-orb glow-orb-orange w-[300px] h-[300px] bottom-20 -left-10 opacity-10" />
        </div>

        <div className="animate-fade-in-up">
          {/* Back button */}
          <Link href="/admin" className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-400 transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Admin Dashboard
          </Link>

          {/* Banner */}
          {community.banner_image && (
            <div className="rounded-2xl overflow-hidden aspect-video bg-gradient-to-br from-orange-900/40 to-amber-900/20 mb-8">
              <img src={`${BACKEND_URL}${community.banner_image}`} alt={community.name} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Community name & badges */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{community.name}</h1>
                {community.is_verified && (
                  <svg className="w-6 h-6 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2">
                {community.category && (
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
                    {community.category}
                  </span>
                )}
                <span className="text-xs text-slate-500">Created {formatDate(community.created_at)}</span>
              </div>
            </div>
            {community.logo && (
              <img src={`${BACKEND_URL}${community.logo}`} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-white/10 flex-shrink-0" />
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <StatCard label="Total Members" value={community.stats.total_members} icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
            } />
            <StatCard label="Total Events" value={community.stats.total_events} icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            } />
            <StatCard label="Upcoming Events" value={community.stats.upcoming_events} icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            } />
            <StatCard label="Discussions" value={community.stats.total_discussions} icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            } />
            <StatCard label="Announcements" value={community.stats.total_announcements} icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
            } />
            <StatCard label="Avg Rating" value={community.stats.average_rating ? `${community.stats.average_rating}` : 'N/A'} icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
            } />
            <StatCard label="Reviews" value={community.stats.review_count} icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
            } />
            <StatCard label={`${community.is_private ? 'Private' : 'Public'}`} value={community.member_approval ? 'Approval Req.' : 'Open Join'} icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={community.is_private ? "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" : "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"} /></svg>
            } />
          </div>

          {/* Gender Breakdown */}
          {Object.keys(community.stats.gender_breakdown).length > 0 && (
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 mb-8">
              <h3 className="text-base font-semibold text-slate-200 mb-4">Gender Demographics</h3>
              <div className="space-y-3">
                {Object.entries(community.stats.gender_breakdown).map(([gender, count]) => {
                  const total = community.stats.total_members;
                  const pct = total > 0 ? ((count as number) / total * 100).toFixed(1) : '0';
                  return (
                    <div key={gender}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-slate-300 capitalize font-medium">{gender}</span>
                        <span className="text-slate-400">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${
                          gender === 'male' ? 'bg-blue-500' : gender === 'female' ? 'bg-pink-500' : 'bg-purple-500'
                        }`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* About */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 mb-8">
            <h3 className="text-base font-semibold text-slate-200 mb-3">About</h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {community.description || 'No description provided.'}
            </p>
          </div>

          {/* Owner Info */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 mb-8">
            <h3 className="text-base font-semibold text-slate-200 mb-4">Community Leader / Organizer</h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                {community.owner.avatar_url ? (
                  <img src={`${BACKEND_URL}${community.owner.avatar_url}`} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-lg font-medium text-amber-400">{community.owner.name?.charAt(0)?.toUpperCase() || '?'}</span>
                )}
              </div>
              <div>
                <p className="text-base font-medium text-slate-200">{community.owner.name}</p>
                <p className="text-sm text-slate-400">{community.owner.email}</p>
              </div>
            </div>
          </div>

          {/* Location & Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {community.location && (
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Location</span>
                <p className="text-sm text-slate-200 mt-1.5">{community.location}</p>
              </div>
            )}
            {community.website && (
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Website</span>
                <a href={community.website} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-amber-400 hover:text-amber-300 mt-1.5 block transition-colors underline underline-offset-2">
                  {community.website}
                </a>
              </div>
            )}
          </div>

          {/* Social Links */}
          {(community.facebook || community.instagram || community.linkedin || community.tiktok) && (
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 mb-8">
              <h3 className="text-base font-semibold text-slate-200 mb-4">Social Media</h3>
              <div className="flex flex-wrap gap-2">
                {community.facebook && (
                  <a href={community.facebook} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-sm text-slate-300 hover:border-amber-500/30 hover:text-amber-400 transition-all">
                    Facebook
                  </a>
                )}
                {community.instagram && (
                  <a href={community.instagram} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-sm text-slate-300 hover:border-amber-500/30 hover:text-amber-400 transition-all">
                    Instagram
                  </a>
                )}
                {community.linkedin && (
                  <a href={community.linkedin} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-sm text-slate-300 hover:border-amber-500/30 hover:text-amber-400 transition-all">
                    LinkedIn
                  </a>
                )}
                {community.tiktok && (
                  <a href={community.tiktok} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-sm text-slate-300 hover:border-amber-500/30 hover:text-amber-400 transition-all">
                    TikTok
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Recent Members */}
          {community.recent_members.length > 0 && (
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <h3 className="text-base font-semibold text-slate-200 mb-4">Recent Members (Latest 5)</h3>
              <div className="space-y-3">
                {community.recent_members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-amber-400">{m.name?.charAt(0)?.toUpperCase() || '?'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{m.name}</p>
                      <p className="text-xs text-slate-500">
                        {m.gender && <span className="capitalize">{m.gender}</span>}
                        {m.gender && m.joined_at && <span> · </span>}
                        {m.joined_at && `Joined ${formatDate(m.joined_at)}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Danger Zone */}
          <div className="mt-10 p-5 rounded-2xl border border-red-500/20 bg-red-500/5">
            <h3 className="text-base font-semibold text-red-400 mb-2">Danger Zone</h3>
            <p className="text-sm text-slate-400 mb-4">Moving this community to trash will hide it immediately. It will be auto-deleted after 30 days. You can restore it from the Trash tab in the admin dashboard.</p>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm text-slate-300">Are you sure you want to move this to trash?</p>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-500 text-black hover:bg-amber-600 transition-all disabled:opacity-50"
                >
                  {deleting ? 'Moving...' : 'Yes, Move to Trash'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
              >
                Move to Trash
              </button>
            )}
          </div>
        </div>
      </section>
      <Chatbot />
    </main>
  );
}
