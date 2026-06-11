'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { apiFetch } from '../lib/auth';

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [filteredCommunities, setFilteredCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [joinedCommunities, setJoinedCommunities] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiFetch('/api/communities');
        const data = await res.json();
        setCommunities(data);
        setFilteredCommunities(data);

        const uniqueCategories = Array.from(new Set(data.map((c: any) => c.category).filter(Boolean)));
        setCategories(uniqueCategories as string[]);

        const authRes = await apiFetch('/api/auth/me');
        if (authRes.ok) {
          const user = await authRes.json();
          setIsAuthenticated(true);
          data.forEach(async (community: any) => {
            try {
              const memberRes = await apiFetch(`/api/engagement/community/members/${community.id}`);
              if (memberRes.ok) {
                const members = await memberRes.json();
                if (members.some((m: any) => m.id === user.id)) {
                  setJoinedCommunities((prev) => new Set([...prev, community.id]));
                }
              }
            } catch (err) {}
          });
        }
      } catch (err) {
        console.error('Failed to load communities');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = communities;
    if (searchQuery) {
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedCategory) {
      filtered = filtered.filter((c) => c.category === selectedCategory);
    }
    setFilteredCommunities(filtered);
  }, [searchQuery, selectedCategory, communities]);

  const handleJoinCommunity = async (communityId: number) => {
    const authRes = await apiFetch('/api/auth/me');
    if (!authRes.ok) { window.location.href = '/login'; return; }
    try {
      const res = await apiFetch(`/api/engagement/community/join/${communityId}`, { method: 'POST' });
      if (res.ok) setJoinedCommunities((prev) => new Set([...prev, communityId]));
    } catch (err) { console.error('Failed to join community'); }
  };

  if (loading) return <div className="min-h-screen" />;

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        <div className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-800">Communities</h1>
              <p className="mt-2 text-slate-500">Browse active communities from the platform.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row">
            <input
              type="text"
              placeholder="Search communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-600 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {filteredCommunities.length > 0 ? (
              filteredCommunities.map((community: any, i: number) => (
                <article
                  key={community.id}
                  className="card-hover rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <h2 className="text-xl font-bold text-slate-700">{community.name}</h2>
                  <p className="mt-3 text-slate-500">{community.description}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                    <span className="rounded-full bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-1 font-medium text-orange-600">
                      {community.category || 'General'}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-orange-400" />
                      {community.member_count || 0} members
                    </span>
                    {community.website && (
                      <a href={community.website} target="_blank" rel="noreferrer" className="font-medium text-orange-600 hover:text-orange-500">
                        Visit website
                      </a>
                    )}
                  </div>
                  <div className="mt-5 flex gap-2">
                    <Link
                      href={`/communities/${community.id}`}
                      className="flex-1 inline-flex justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
                    >
                      View details
                    </Link>
                    {isAuthenticated && !joinedCommunities.has(community.id) && (
                      <button
                        onClick={() => handleJoinCommunity(community.id)}
                        className="flex-1 rounded-full border-2 border-orange-500 px-4 py-2 text-sm font-semibold text-orange-600 transition-all hover:bg-orange-50 hover:shadow-sm"
                      >
                        Join
                      </button>
                    )}
                    {joinedCommunities.has(community.id) && (
                      <span className="flex-1 flex justify-center rounded-full border-2 border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400">
                        ✓ Joined
                      </span>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <p className="col-span-full text-center py-8 text-slate-400">No communities found. Try adjusting your filters.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
