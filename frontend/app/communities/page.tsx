'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Chatbot from '../components/Chatbot';
import { apiFetch, BACKEND_URL } from '../lib/auth';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../components/Toast';
import { SkeletonCard } from '../components/Skeleton';

interface Community {
  id: number;
  name: string;
  description?: string;
  category?: string;
  member_count?: number;
  banner_image?: string;
  logo?: string;
  is_member?: boolean;
  website?: string;
}

const CATEGORIES = [
  'All',
  'Technology',
  'Sports',
  'Art',
  'Music',
  'Science',
  'Gaming',
  'Education',
  'Health',
  'Business',
  'Social',
  'Other',
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'name', label: 'Alphabetical' },
];

export default function CommunitiesPage() {
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('newest');
  const [joiningId, setJoiningId] = useState<number | null>(null);

  const fetchCommunities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category !== 'All') params.set('category', category);
      if (sort) params.set('sort', sort);

      const res = await apiFetch(`/api/communities?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCommunities(Array.isArray(data) ? data : data.communities || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [search, category, sort]);

  useEffect(() => {
    const timer = setTimeout(fetchCommunities, 300);
    return () => clearTimeout(timer);
  }, [fetchCommunities]);

  const handleJoin = async (communityId: number) => {
    if (!isAuthenticated) return;
    setJoiningId(communityId);
    try {
      const res = await apiFetch(`/api/communities/${communityId}/join`, { method: 'POST' });
      if (res.ok) {
        setCommunities((prev) =>
          prev.map((c) =>
            c.id === communityId
              ? { ...c, is_member: true, member_count: (c.member_count || 0) + 1 }
              : c
          )
        );
        addToast('success', 'You have successfully joined this Community');
      }
    } catch { /* ignore */ }
    setJoiningId(null);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 px-4">
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="glow-orb glow-orb-amber w-[500px] h-[500px] -top-40 right-0 opacity-10" />
          <div className="glow-orb glow-orb-orange w-[400px] h-[400px] bottom-0 -left-20 opacity-10" />
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-10 opacity-0 animate-fade-in-up animate-fill-both flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-100">
                Communities
              </h1>
              <p className="text-slate-400 mt-2">
                Find and join communities that match your interests
              </p>
            </div>
            {isAuthenticated && (
              <Link
                href="/apply"
                className="btn-primary px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 w-fit"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Community
              </Link>
            )}
          </div>

          {/* Filters bar */}
          <div className="glass rounded-2xl p-4 sm:p-5 mb-8 opacity-0 animate-fade-in-up animate-fill-both animate-delay-100">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search communities..."
                  className="input-glass w-full pl-12 pr-4 py-3 rounded-xl"
                />
              </div>

              {/* Category filter */}
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-glass appearance-none w-full sm:w-44 py-3 px-4 pr-10 rounded-xl text-sm cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-slate-900 text-slate-200">
                      {cat}
                    </option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Sort */}
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="input-glass appearance-none w-full sm:w-40 py-3 px-4 pr-10 rounded-xl text-sm cursor-pointer"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-200">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Communities grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} hasImage lines={3} />
              ))}
            </div>
          ) : communities.length === 0 ? (
            <div className="text-center py-20 glass rounded-2xl opacity-0 animate-fade-in-up animate-fill-both">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">No communities found</h3>
              <p className="text-slate-400 max-w-md mx-auto">
                {search || category !== 'All'
                  ? 'Try adjusting your filters or search terms.'
                  : 'Be the first to create a community!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {communities.map((community, i) => (
                <div
                  key={community.id}
                  className="glass-card rounded-2xl overflow-hidden group opacity-0 animate-fade-in-up animate-fill-both"
                  style={{ animationDelay: `${200 + i * 60}ms` }}
                >
                  {/* Community image/banner */}
                  <div className="aspect-video bg-gradient-to-br from-orange-900/30 to-amber-900/20 relative overflow-hidden">
                    {community.banner_image ? (
                      <img
                        src={`${BACKEND_URL}${community.banner_image}`}
                        alt={community.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800/50 to-slate-900/50">
                        <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    )}
                    {/* Category badge */}
                    {community.category && (
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-sm border border-white/10 text-xs font-medium text-orange-300">
                        {community.category}
                      </div>
                    )}
                  </div>

                  {/* Community info */}
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-slate-100 mb-1.5 line-clamp-1 group-hover:text-amber-300 transition-colors">
                      {community.name}
                    </h3>
                    {community.description && (
                      <p className="text-sm text-slate-400 line-clamp-2 mb-4">{community.description}</p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                        {community.member_count || 0} members
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/communities/${community.id}`}
                        className="flex-1 text-center py-2.5 rounded-xl text-sm font-medium border border-white/10 text-slate-300 hover:bg-white/5 hover:border-amber-500/30 transition-all"
                      >
                        View
                      </Link>
                      {isAuthenticated && !community.is_member && (
                        <button
                          onClick={() => handleJoin(community.id)}
                          disabled={joiningId === community.id}
                          className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                        >
                          {joiningId === community.id ? 'Joining...' : 'Join'}
                        </button>
                      )}
                      {community.is_member && (
                        <span className="flex-1 text-center py-2.5 rounded-xl text-sm font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          Joined ✓
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Chatbot />
    </>
  );
}
