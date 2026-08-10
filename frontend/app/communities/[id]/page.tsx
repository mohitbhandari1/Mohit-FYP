'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import Chatbot from '../../components/Chatbot';
import Announcements from '../../components/Announcements';
import Discussions from '../../components/Discussions';
import SharePopup from '../../components/SharePopup';
import { apiFetch, BACKEND_URL } from '../../lib/auth';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/Toast';
import { SkeletonDetailPage } from '../../components/Skeleton';

type Tab = 'about' | 'events' | 'reviews' | 'discussions' | 'announcements' | 'members';

export default function CommunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user, isAuthenticated } = useAuth();

  const [community, setCommunity] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('about');
  const [joining, setJoining] = useState(false);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [membersError, setMembersError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const { addToast } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [communityRes, eventsRes, reviewsRes] = await Promise.all([
          apiFetch(`/api/communities/${id}`),
          apiFetch(`/api/communities/${id}/events`),
          // no-store → always fetch the latest reviewer name/avatar (profile updates show here)
          apiFetch(`/api/engagement/review/community/${id}`, { cache: 'no-store' }),
        ]);
        if (communityRes.ok) setCommunity(await communityRes.json());
        if (eventsRes.ok) setEvents(await eventsRes.json());
        if (reviewsRes.ok) {
          // API returns { reviews: [...], avg_rating, total_reviews } — extract the array
          const reviewData = await reviewsRes.json();
          setReviews(Array.isArray(reviewData) ? reviewData : (reviewData?.reviews || []));
        }

        if (isAuthenticated) {
          const memberRes = await apiFetch(`/api/communities/${id}/membership`);
          if (memberRes.ok) {
            const memberData = await memberRes.json();
            setIsMember(memberData.is_member || false);
          }
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchData();
  }, [id, isAuthenticated]);

  // Load members for the community owner (organizer)
  const isOwner = user && (user.id === community?.owner_id || user.role === 'admin');
  useEffect(() => {
    if (!isOwner) return;
    const fetchMembers = async () => {
      try {
        const res = await apiFetch(`/api/communities/${id}/members`);
        if (res.ok) setMembers(await res.json());
      } catch { /* ignore */ }
    };
    fetchMembers();
  }, [id, isOwner]);

  const handleDownloadMembers = async () => {
    setDownloading(true);
    setMembersError('');
    try {
      const res = await apiFetch(`/api/communities/${id}/export`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setMembersError(err?.error || 'Failed to download');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(community?.name || 'community').replace(/[^\w\s-]/g, '')}_members.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { setMembersError('Failed to download'); }
    finally { setDownloading(false); }
  };

  const handleJoinLeave = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    setJoining(true);
    try {
      const endpoint = isMember
        ? `/api/communities/${id}/leave`
        : `/api/communities/${id}/join`;
      const res = await apiFetch(endpoint, { method: 'POST' });
      if (res.ok) {
        setIsMember(!isMember);
        setCommunity((prev: any) => prev ? {
          ...prev,
          member_count: (prev.member_count || 0) + (isMember ? -1 : 1)
        } : prev);
        if (isMember) {
          addToast('info', 'You have left the community');
        } else {
          addToast('success', 'You have successfully joined this Community');
        }
      }
    } catch { /* ignore */ }
    setJoining(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    setSubmittingReview(true);
    try {
      const res = await apiFetch('/api/engagement/review', {
        method: 'POST',
        body: JSON.stringify({ community_id: parseInt(id), rating: reviewForm.rating, comment: reviewForm.comment }),
      });
      if (res.ok) {
        const newReview = await res.json();
        setReviews((prev) => [newReview, ...(Array.isArray(prev) ? prev : [])]);
        setReviewForm({ rating: 5, comment: '' });
        setShowReviewForm(false);
        addToast('success', 'Review submitted successfully!');
      } else {
        const err = await res.json().catch(() => null);
        addToast('error', err?.error || 'Failed to submit review');
      }
    } catch { addToast('error', 'Failed to submit review'); }
    setSubmittingReview(false);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-24 pb-16 px-4">
          <SkeletonDetailPage />
        </main>
      </>
    );
  }

  if (!community) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center">
          <div className="text-center glass rounded-2xl p-10">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Community not found</h2>
            <p className="text-slate-400 mb-6">This community may have been removed.</p>
            <Link href="/communities" className="btn-primary px-6 py-2.5 rounded-xl text-sm">
              Back to Communities
            </Link>
          </div>
        </main>
      </>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'about', label: 'About' },
    { id: 'events', label: 'Events' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'discussions', label: 'Discussions' },
    { id: 'announcements', label: 'Announcements' },
    ...(isOwner ? [{ id: 'members' as Tab, label: 'Members' }] : []),
  ];

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="glow-orb glow-orb-amber w-[500px] h-[500px] -top-40 right-0 opacity-10" />
          <div className="glow-orb glow-orb-orange w-[300px] h-[300px] bottom-20 -left-10 opacity-10" />
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Hero banner */}
          <div className="relative rounded-3xl overflow-hidden mb-8 opacity-0 animate-fade-in-up animate-fill-both">
            <div className="aspect-video bg-gradient-to-br from-orange-900/40 to-amber-900/20">
              {community.banner_image && (
                <img src={`${BACKEND_URL}${community.banner_image}`} alt={community.name} className="w-full h-full object-cover" />
              )}
              {!community.banner_image && community.logo && (
                <div className="w-full h-full flex items-center justify-center p-6">
                  <img src={`${BACKEND_URL}${community.logo}`} alt={community.name} className="max-h-full max-w-full object-contain opacity-40" />
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  {community.category && (
                    <span className="inline-block px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-medium text-orange-300 mb-3">
                      {community.category}
                    </span>
                  )}
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">{community.name}</h1>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowSharePopup(true)}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all"
                    aria-label="Share"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Info + Join bar */}
          <div className="glass rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 opacity-0 animate-fade-in-up animate-fill-both animate-delay-100">
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                {community.member_count || 0} members
              </span>
              {avgRating && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  {avgRating} ({reviews.length})
                </span>
              )}
              {community.website && (
                <a href={community.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
                  </svg>
                  Website
                </a>
              )}
            </div>              {isMember ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-white/20 transition-all"
                    aria-label="More options"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="5" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 bottom-full mb-2 w-48 rounded-xl border border-white/10 bg-slate-900 backdrop-blur-xl shadow-xl shadow-black/40 overflow-hidden z-50 animate-scale-in origin-bottom-right">
                      <button
                        onClick={() => { setShowMenu(false); handleJoinLeave(); }}
                        disabled={joining}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                        </svg>
                        {joining ? 'Leaving...' : 'Leave Community'}
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          addToast('info', 'Thank you. This community has been reported for review.');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 transition-colors border-t border-white/5"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
                        </svg>
                        Report Community
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleJoinLeave}
                  disabled={joining}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 btn-primary"
                >
                  {joining ? 'Processing...' : 'Join Community'}
                </button>
              )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/5 mb-8 overflow-x-auto opacity-0 animate-fade-in-up animate-fill-both animate-delay-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-fit px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="opacity-0 animate-fade-in-up animate-fill-both animate-delay-300">
            {activeTab === 'about' && (
              <div className="glass rounded-2xl p-6 sm:p-8">
                <h2 className="text-xl font-semibold text-slate-100 mb-4">About</h2>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {community.description || 'No description provided.'}
                </p>
              </div>
            )}

            {activeTab === 'events' && (
              <div className="space-y-4">
                {events.length === 0 ? (
                  <div className="glass rounded-2xl p-10 text-center">
                    <div className="text-4xl mb-3">📅</div>
                    <p className="text-slate-400">No events for this community yet.</p>
                  </div>
                ) : (
                  events.map((event) => (
                    <Link
                      href={`/events/${event.id}`}
                      key={event.id}
                      className="glass-card rounded-2xl p-5 flex items-center gap-4 group"
                    >
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/5 flex flex-col items-center justify-center flex-shrink-0">
                        {event.date && (
                          <>
                            <span className="text-xs text-amber-400 font-medium">
                              {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                            </span>
                            <span className="text-lg font-bold text-slate-100 leading-none">
                              {new Date(event.date).getDate()}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-slate-100 truncate group-hover:text-amber-300 transition-colors">
                          {event.title}
                        </h3>
                        <p className="text-sm text-slate-400 truncate">{event.location || 'Online'}</p>
                      </div>
                      <svg className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {/* Write review button */}
                {isAuthenticated && !showReviewForm && (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="btn-primary px-5 py-2.5 rounded-xl text-sm font-medium"
                  >
                    Write a Review
                  </button>
                )}

                {/* Review form */}
                {showReviewForm && (
                  <form onSubmit={handleSubmitReview} className="glass rounded-2xl p-6 space-y-4">
                    <h3 className="text-base font-semibold text-slate-100">Your Review</h3>
                    {/* Star rating */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                          className="p-0.5 transition-transform hover:scale-110"
                          aria-label={`Rate ${star} stars`}
                        >
                          <svg
                            className={`w-7 h-7 ${
                              star <= (hoverRating || reviewForm.rating)
                                ? 'text-amber-400'
                                : 'text-slate-600'
                            } transition-colors`}
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </button>
                      ))}
                      <span className="ml-2 text-sm text-slate-400">{reviewForm.rating}/5</span>
                    </div>
                    {/* Comment */}
                    <textarea
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                      rows={3}
                      placeholder="Share your experience..."
                      className="input-glass w-full rounded-xl resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="btn-primary px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                      >
                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowReviewForm(false)}
                        className="btn-ghost px-5 py-2.5 rounded-xl text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Reviews list — 3 cards per row */}
                {reviews.length === 0 ? (
                  <div className="glass rounded-2xl p-10 text-center">
                    <div className="text-4xl mb-3">⭐</div>
                    <p className="text-slate-400">No reviews yet. Be the first!</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {reviews.map((review, i) => (
                      <div key={review.id || i} className="glass rounded-2xl p-5 flex flex-col transition-all hover:border-amber-500/20 hover:bg-white/[0.04]">
                        <div className="flex items-center gap-3 mb-3">
                          {review.avatar_url ? (
                            <img src={`${BACKEND_URL}${review.avatar_url}`} alt={review.name || 'Reviewer'}
                              className="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-amber-300">
                                {(review.name || review.user_name || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-200 truncate">{review.name || review.user_name || 'Anonymous'}</p>
                            <div className="flex items-center gap-0.5 mt-0.5">
                              {Array.from({ length: 5 }).map((_, j) => (
                                <svg
                                  key={j}
                                  className={`w-3.5 h-3.5 ${j < (review.rating || 0) ? 'text-amber-400' : 'text-slate-700'}`}
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          {review.comment ? (
                            <p className="text-sm text-slate-300 leading-relaxed">{review.comment}</p>
                          ) : (
                            <p className="text-sm text-slate-600 italic">No comment.</p>
                          )}
                        </div>
                        {review.created_at && (
                          <div className="mt-3 pt-3 border-t border-white/5 text-xs text-slate-500">
                            {new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'discussions' && (
              <Discussions communityId={parseInt(id)} />
            )}

            {activeTab === 'announcements' && (
              <Announcements communityId={parseInt(id)} />
            )}

            {activeTab === 'members' && isOwner && (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-100">Members ({members.length})</h2>
                    <p className="text-sm text-slate-400 mt-0.5">Everyone who has joined this community</p>
                  </div>
                  <button onClick={handleDownloadMembers} disabled={downloading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-medium hover:bg-emerald-500/25 transition-all disabled:opacity-50">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {downloading ? 'Downloading...' : 'Download XLSX'}
                  </button>
                </div>

                {membersError && (
                  <div className="p-4 border-b border-white/5">
                    <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs">{membersError}</div>
                  </div>
                )}

                {members.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-slate-400">No members have joined yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 max-h-[480px] overflow-y-auto">
                    {members.map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between p-4 hover:bg-white/[0.01] transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-amber-400">{member.name?.charAt(0)?.toUpperCase() || '?'}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">{member.name}</p>
                            <p className="text-xs text-slate-500 truncate">{member.email}</p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          Joined {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Share popup */}
        <SharePopup
          isOpen={showSharePopup}
          url={typeof window !== 'undefined' ? window.location.href : ''}
          title={community.name}
          onClose={() => setShowSharePopup(false)}
        />
      </main>
      <Chatbot />
    </>
  );
}
