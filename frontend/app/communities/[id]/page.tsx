'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Announcements from '../../components/Announcements';
import Discussions from '../../components/Discussions';
import { apiFetch } from '../../lib/auth';
import { useAuth } from '../../lib/AuthContext';

export default function CommunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [community, setCommunity] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isMember, setIsMember] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [communityRes, eventsRes, reviewsRes] = await Promise.all([
          apiFetch(`/api/communities/${id}`),
          apiFetch(`/api/events?communityId=${id}`),
          apiFetch(`/api/engagement/review/community/${id}`),
        ]);
        if (communityRes.ok) { const communityData = await communityRes.json(); setCommunity(communityData); }
        if (eventsRes.ok) { const eventsData = await eventsRes.json(); setEvents(eventsData); }
        if (reviewsRes.ok) { const reviewsData = await reviewsRes.json(); setReviews(reviewsData); }
        const meRes = await apiFetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          setIsAuthenticated(true); setUser(meData);
          const memberRes = await apiFetch(`/api/engagement/community/is-member/${id}`);
          if (memberRes.ok) { const memberData = await memberRes.json(); setIsMember(memberData.isMember); }
        }
      } catch (err) { console.error('Failed to load community details'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  const handleJoinToggle = async () => {
    const meRes = await apiFetch('/api/auth/me');
    if (!meRes.ok) { router.push('/login'); return; }
    try {
      const res = await apiFetch(`/api/engagement/community/join/${id}`, { method: 'POST' });
      if (res.ok) { setIsMember(true); setCommunity((prev: any) => ({ ...prev, member_count: (prev.member_count || 0) + 1 })); }
    } catch (err) { console.error('Failed to join community'); }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const meRes = await apiFetch('/api/auth/me');
      if (!meRes.ok) { router.push('/login'); return; }
      const res = await apiFetch('/api/engagement/review', { method: 'POST', body: JSON.stringify({ community_id: parseInt(id), rating: reviewForm.rating, comment: reviewForm.comment }) });
      if (res.ok) { const newReview = await res.json(); setReviews([...reviews, newReview]); setReviewForm({ rating: 5, comment: '' }); setShowReviewForm(false); }
    } catch (err) { console.error('Failed to add review'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen" />;

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        <div className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-800">{community?.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-1 text-sm font-medium text-orange-600">
                  {community?.category || 'General'}
                </span>
                <span className="flex items-center gap-1 text-sm text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-orange-400" />
                  {community?.member_count || 0} members
                </span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {isAuthenticated && !isMember && user?.id !== community?.owner_id && (
                <button onClick={handleJoinToggle}
                  className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
                  + Join Community
                </button>
              )}
              {isMember && (
                <span className="inline-flex items-center rounded-full border-2 border-orange-200 bg-orange-50 px-5 py-2 text-sm font-medium text-orange-600">
                  ✓ Member
                </span>
              )}
              {isAuthenticated && user?.id === community?.owner_id && (
                <Link href={`/communities/${id}/edit`}
                  className="rounded-full border-2 border-orange-200 bg-orange-50 px-5 py-2 text-sm font-medium text-orange-600 transition-all hover:bg-orange-100">
                  Edit
                </Link>
              )}
              <Link href="/communities"
                className="rounded-full border-2 border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-600 transition-all hover:border-slate-300 hover:text-slate-700">
                Back
              </Link>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-700">About this community</h2>
              <p className="mt-4 text-slate-600">{community?.description}</p>
              {community?.website && (
                <p className="mt-4 text-sm">
                  Website:{' '}
                  <a href={community.website} target="_blank" rel="noreferrer" className="font-medium text-orange-600 hover:text-orange-500">{community.website}</a>
                </p>
              )}
            </div>

            <Announcements communityId={community?.id} isOwner={user?.id === community?.owner_id} />

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-700">Upcoming events</h2>
              <div className="mt-4 space-y-4">
                {events.length > 0 ? (
                  events.map((event: any) => (
                    <article key={event.id} className="card-hover rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-700">{event.title}</h3>
                      <p className="mt-2 text-slate-500">{event.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-sm">
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 font-medium text-orange-600">
                          📅 {new Date(event.event_date).toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-600">
                          📍 {event.location || 'Online'}
                        </span>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-slate-400">No upcoming events for this community yet.</p>
                )}
              </div>
            </div>

            <Discussions communityId={community?.id} isAuthenticated={isAuthenticated} communityOwnerId={community?.owner_id} />

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-700">Reviews</h2>
                {isAuthenticated && (
                  <button onClick={() => setShowReviewForm(!showReviewForm)}
                    className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
                    {showReviewForm ? 'Cancel' : '+ Add Review'}
                  </button>
                )}
              </div>

              {showReviewForm && (
                <form onSubmit={handleAddReview} className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600">Rating</label>
                    <select value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: parseInt(e.target.value) })}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20">
                      <option value={5}>5 - Excellent</option><option value={4}>4 - Good</option>
                      <option value={3}>3 - Average</option><option value={2}>2 - Poor</option><option value={1}>1 - Very Poor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600">Comment</label>
                    <textarea value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} required rows={3}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </div>
                  <button type="submit" disabled={submitting}
                    className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02] disabled:opacity-50">
                    {submitting ? 'Posting...' : 'Post Review'}
                  </button>
                </form>
              )}

              <div className="mt-6 space-y-4">
                {reviews.length > 0 ? (
                  reviews.map((review: any) => (
                    <div key={review.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-700">{review.name || review.user_name}</p>
                          <p className="text-sm text-slate-400">{new Date(review.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex">
                          {Array.from({ length: review.rating }).map((_, i) => (<span key={i} className="text-yellow-400">★</span>))}
                          {Array.from({ length: 5 - review.rating }).map((_, i) => (<span key={`e-${i}`} className="text-slate-300">★</span>))}
                        </div>
                      </div>
                      <p className="mt-2 text-slate-600">{review.comment}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400">No reviews yet. Be the first to review!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
