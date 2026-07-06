'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Chatbot from '../../components/Chatbot';
import SharePopup from '../../components/SharePopup';
import { SkeletonDetailPage } from '../../components/Skeleton';
import { apiFetch, BACKEND_URL } from '../../lib/auth';
import { useAuth } from '../../lib/AuthContext';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventRes, reviewsRes] = await Promise.all([
          apiFetch(`/api/events/${id}`),
          apiFetch(`/api/engagement/review/event/${id}`),
        ]);
        if (eventRes.ok) {
          const eventData = await eventRes.json();
          setEvent(eventData);
          setAttendeeCount(eventData.attendee_count || eventData.attendees?.length || 0);

          const meRes = await apiFetch('/api/auth/me');
          if (meRes.ok) {
            setIsAuthenticated(true);
            const rsvpRes = await apiFetch('/api/engagement/rsvp/user');
            if (rsvpRes.ok) {
              const rsvpData = await rsvpRes.json();
              const myRsvp = rsvpData.find((r: any) => r.event_id === parseInt(id) || r.id === parseInt(id));
              if (myRsvp) setRsvpStatus(myRsvp.status);
            }
            const savedRes = await apiFetch(`/api/events/${id}/saved`);
            if (savedRes.ok) { const savedData = await savedRes.json(); setIsSaved(savedData.saved); }
          }
        } else { router.push('/events'); }
        if (reviewsRes.ok) setReviews(await reviewsRes.json());
      } catch (err) { console.error('Error fetching event details'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id, router]);

  const handleRsvp = async (status: 'attending' | 'not_attending') => {
    if (!isAuthenticated) { router.push('/login'); return; }
    try {
      const res = await apiFetch('/api/engagement/rsvp', {
        method: 'POST',
        body: JSON.stringify({ event_id: parseInt(id), status }),
      });
      if (res.ok) {
        setRsvpStatus(status);
        setAttendeeCount((prev) => status === 'attending' ? prev + 1 : Math.max(0, prev - 1));
      }
    } catch (err) { console.error('Failed to RSVP'); }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/engagement/review', {
        method: 'POST',
        body: JSON.stringify({ event_id: parseInt(id), ...reviewForm }),
      });
      if (res.ok) {
        const newReview = await res.json();
        setReviews((prev) => [newReview, ...prev]);
        setShowReviewForm(false);
        setReviewForm({ rating: 5, comment: '' });
      }
    } catch (err) { console.error('Failed to submit review'); }
    finally { setSubmitting(false); }
  };

  const handleSave = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    try {
      const res = await apiFetch(`/api/events/${id}/save`, { method: 'POST' });
      if (res.ok) { const data = await res.json(); setIsSaved(data.saved); }
    } catch (err) { console.error('Failed to save'); }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0';

  if (loading) return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <SkeletonDetailPage />
      </section>
      <Chatbot />
    </main>
  );

  if (!event) return null;

  const isOwner = user && (user.id === event.owner_id || user.id === event.organizer_id);

  return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-fade-in-up">
          {/* Back button */}
          <Link href="/events" className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-400 transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Events
          </Link>

          {/* Hero Banner */}
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/5 mb-8">
            {event.banner_image ? (
              <img src={`${BACKEND_URL}${event.banner_image}`} alt={event.title}
                className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-900/40 to-orange-900/40 flex items-center justify-center">
                <svg className="w-24 h-24 text-amber-600/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <h1 className="text-3xl sm:text-4xl font-bold text-white">{event.title}</h1>
              {event.community_name && (
                <p className="mt-2 text-amber-400 text-sm font-medium">by {event.community_name}</p>
              )}
            </div>
          </div>

          {/* Info Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-xs text-slate-500 mb-1">Date</p>
              <p className="text-sm font-medium text-slate-200">{event.event_date ? formatDate(event.event_date) : 'TBD'}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs text-slate-500 mb-1">Time</p>
              <p className="text-sm font-medium text-slate-200">{event.start_time || (event.event_date ? formatTime(event.event_date) : 'TBD')}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-xs text-slate-500 mb-1">Location</p>
              <p className="text-sm font-medium text-slate-200">{event.location || 'Online'}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-xs text-slate-500 mb-1">Attendees</p>
              <p className="text-sm font-medium text-slate-200">{attendeeCount}</p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6">
                <h2 className="text-xl font-semibold text-slate-100 mb-4">About this Event</h2>
                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{event.description || 'No description provided.'}</p>
                {event.agenda && (
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <h3 className="text-md font-semibold text-slate-200 mb-2">Agenda</h3>
                    <p className="text-slate-400 whitespace-pre-wrap">{event.agenda}</p>
                  </div>
                )}
                {event.requirements && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <h3 className="text-md font-semibold text-slate-200 mb-2">Requirements</h3>
                    <p className="text-slate-400 whitespace-pre-wrap">{event.requirements}</p>
                  </div>
                )}
              </div>

              {/* Reviews Section */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-100">Reviews</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg key={star} className={`w-4 h-4 ${star <= Math.round(Number(avgRating)) ? 'text-amber-400' : 'text-slate-600'}`}
                            fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm text-slate-400">{avgRating} ({reviews.length} reviews)</span>
                    </div>
                  </div>
                  {isAuthenticated && (
                    <button
                      onClick={() => setShowReviewForm(!showReviewForm)}
                      className="text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      {showReviewForm ? 'Cancel' : 'Write Review'}
                    </button>
                  )}
                </div>

                {/* Review Form */}
                {showReviewForm && (
                  <form onSubmit={handleReviewSubmit} className="mb-6 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                    <div className="mb-4">
                      <label className="text-sm text-slate-300 mb-2 block">Rating</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} type="button" onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                            className="p-1 transition-transform hover:scale-110">
                            <svg className={`w-6 h-6 ${star <= reviewForm.rating ? 'text-amber-400' : 'text-slate-600'}`}
                              fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                      placeholder="Share your experience..."
                      rows={3}
                      className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                    />
                    <button type="submit" disabled={submitting}
                      className="mt-3 px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-black font-medium text-sm hover:shadow-lg hover:shadow-amber-500/20 transition-all disabled:opacity-50">
                      {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </form>
                )}

                {/* Reviews List */}
                <div className="space-y-4">
                  {reviews.length > 0 ? reviews.map((review: any, i: number) => (
                    <div key={i} className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-200">{review.user_name || 'Anonymous'}</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg key={star} className={`w-3.5 h-3.5 ${star <= review.rating ? 'text-amber-400' : 'text-slate-700'}`}
                              fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      {review.comment && <p className="text-sm text-slate-400">{review.comment}</p>}
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500 text-center py-4">No reviews yet. Be the first to review!</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* RSVP Card */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6 sticky top-24">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">RSVP</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => handleRsvp('attending')}
                    className={`w-full px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                      rsvpStatus === 'attending'
                        ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                        : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                    }`}
                  >
                    ✓ I&apos;m Attending
                  </button>
                  <button
                    onClick={() => handleRsvp('not_attending')}
                    className={`w-full px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                      rsvpStatus === 'not_attending'
                        ? 'bg-red-500/20 text-red-400 border-2 border-red-500/40 shadow-lg shadow-red-500/10'
                        : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                    }`}
                  >
                    ✗ Not Attending
                  </button>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                  <button onClick={handleSave}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                      isSaved ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : 'border-white/10 text-slate-400 bg-white/5 hover:text-amber-400'
                    }`}>
                    <svg className={`w-4 h-4 ${isSaved ? 'fill-amber-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    {isSaved ? 'Saved' : 'Save Event'}
                  </button>
                  <button onClick={() => setShowSharePopup(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-slate-400 bg-white/5 hover:text-amber-400 hover:border-amber-500/20 transition-all">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    Share Event
                  </button>
                  {isOwner && (
                    <Link href={`/events/${id}/edit`}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-slate-400 bg-white/5 hover:text-amber-400 hover:border-amber-500/20 transition-all">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Event
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showSharePopup && (
        <SharePopup
          isOpen={showSharePopup}
          url={typeof window !== 'undefined' ? window.location.href : ''}
          title={event.title}
          onClose={() => setShowSharePopup(false)}
        />
      )}
      <Chatbot />
    </main>
  );
}
