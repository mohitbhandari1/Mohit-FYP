'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { apiFetch } from '../lib/auth';

export default function MyCommunitiesPage() {
  const [joinedCommunities, setJoinedCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  if (loading) return <div className="min-h-screen" />;

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        <div className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-800">My Communities</h1>
              <p className="mt-2 text-slate-500">Communities you&apos;ve joined</p>
            </div>
            <Link href="/communities" className="text-sm font-medium text-orange-600 hover:text-orange-500">Browse all →</Link>
          </div>

          {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>}

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {joinedCommunities.length > 0 ? (
              joinedCommunities.map((community: any, i: number) => (
                <Link href={`/communities/${community.id}`} key={community.id}>
                  <article className="card-hover rounded-xl border border-slate-200 bg-white p-6 shadow-sm" style={{ animationDelay: `${i * 80}ms` }}>
                    <h3 className="text-xl font-bold text-slate-700">{community.name}</h3>
                    <p className="mt-2 text-slate-500 line-clamp-2">{community.description}</p>
                    <div className="mt-4 flex gap-2">
                      <span className="rounded-full bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-1 text-sm font-medium text-orange-600">
                        {community.category || 'General'}
                      </span>
                      <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-600">
                        ✓ Joined
                      </span>
                    </div>
                  </article>
                </Link>
              ))
            ) : (
              <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
                <p className="text-slate-400">You haven&apos;t joined any communities yet.</p>
                <Link href="/communities" className="mt-4 inline-block rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
                  Browse Communities
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
