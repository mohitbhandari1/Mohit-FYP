'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { apiFetch } from '../../lib/auth';
import { useAuth } from '../../lib/AuthContext';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [event, setEvent] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventRes, reviewsRes] = await Promise.all([
          apiFetch(`/api/events/${id}`),
          apiFetch(`/api/engagement/review/event/${id}`),
        ]);
        if (eventRes.ok) { const eventData = await eventRes.json(); setEvent(eventData); }
        else { router.push('/events'); return; }
        if (reviewsRes.ok) { const reviewsData = await reviewsRes.json(); setReviews(reviewsData); }
        const meRes = await apiFetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          setIsAuthenticated(true); setUser(meData);
          try {
            const rsvpRes = await apiFetch('/api/engagement/rsvp/user');
            if (rsvpRes.ok) {
              const rsvpData = await rsvpRes.json();
              const myRsvp = rsvpData.find((r: any) => r.event_id === parseInt(id));
              if (myRsvp) setRsvpStatus(myRsvp.status);
            }
          } catch (err) {}
        }
      } catch (err) { console.error('Failed to load event details'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id, router]);

  const handleRsvp = async (status: 'attending' | 'not_attending') => {
    const meRes = await apiFetch('/api/auth/me');
    if (!meRes.ok) { router.push('/login'); return; }
    try {
      const res = await apiFetch('/api/engagement/rsvp', { method: 'POST', body: JSON.stringify({ event_id: parseInt(id), status }) });
      if (res.ok) setRsvpStatus(status);
    } catch (err) { console.error('Failed to RSVP'); }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const meRes = await apiFetch('/api/auth/me');
      if (!meRes.ok) { router.push('/login'); return; }
      const meData = await meRes.json();
      const res = await apiFetch('/api/engagement/review', { method: 'POST', body: JSON.stringify({ event_id: parseInt(id), rating: reviewForm.rating, comment: reviewForm.comment }) });
      if (res.ok) {
        const newReview = await res.json();
        setReviews([...reviews, { ...newReview, name: meData.name }]);
        setReviewForm({ rating: 5, comment: '' });
        setShowReviewForm(false);
      }
    } catch (err) { console.error('Failed to add review'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen" />;

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-4xl px-6 py-16 sm:px-8">
        <div className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link href="/events" className="inline-block text-sm font-medium text-orange-600 hover:text-orange-500 mb-4">← Back to Events</Link>
              <h1 className="text-4xl font-bold text-slate-800">{event?.title}</h1>
              <p className="mt-1 text-sm text-slate-500">
                Hosted by{' '}
                <Link href={`/communities/${event?.community_id}`} className="font-medium text-orange-600 hover:text-orange-500">{event?.community_name}</Link>
              </p>
            </div>
            <div className="flex gap-2">
              {isAuthenticated && user?.id === event?.owner_id && (
                <Link href={`/events/${id}/edit`} className="rounded-full border-2 border-orange-200 bg-orange-50 px-5 py-2 text-sm font-medium text-orange-600 transition-all hover:bg-orange-100">Edit</Link>
              )}
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-700">About this event</h2>
              <p className="mt-4 text-slate-600 whitespace-pre-wrap">{event?.description}</p>
              <div className="mt-6 flex flex-wrap gap-4">
                <InfoChip label="Date" value={new Date(event?.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
                <InfoChip label="Time" value={new Date(event?.event_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} />
                <InfoChip label="Location" value={event?.location || 'Online'} />
                <InfoChip label="Attendees" value={`${event?.attendee_count || 0}`} />
              </div>
            </div>

            {isAuthenticated && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-700">Your RSVP</h2>
                <div className="mt-4 flex gap-3">
                  <button onClick={() => handleRsvp('attending')}
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                      rsvpStatus === 'attending' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm' : 'border-2 border-slate-200 text-slate-600 hover:border-orange-500 hover:text-orange-600'
                    }`}>
                    {rsvpStatus === 'attending' ? '✓ Attending' : 'Attending'}
                  </button>
                  <button onClick={() => handleRsvp('not_attending')}
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                      rsvpStatus === 'not_attending' ? 'bg-red-500 text-white shadow-sm' : 'border-2 border-slate-200 text-slate-600 hover:border-red-400 hover:text-red-500'
                    }`}>
                    {rsvpStatus === 'not_attending' ? '✗ Not Attending' : 'Not Attending'}
                  </button>
                </div>
              </div>
            )}

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

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="mt-1 font-semibold text-slate-700">{value}</p>
    </div>
  );
}
