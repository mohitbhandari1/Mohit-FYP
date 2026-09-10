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

type Tab = 'community' | 'discussions' | 'announcements' | 'members';

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
  const [activeTab, setActiveTab] = useState<Tab>('community');
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
  const [membershipStatus, setMembershipStatus] = useState<any>(null);
  const [showNoMembershipPopup, setShowNoMembershipPopup] = useState(false);
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
          const [memberRes, memAppRes] = await Promise.all([
            apiFetch(`/api/communities/${id}/membership`),
            apiFetch(`/api/communities/${id}/membership-application`),
          ]);
          if (memberRes.ok) {
            const memberData = await memberRes.json();
            setIsMember(memberData.is_member || false);
          }
          if (memAppRes.ok) {
            const appData = await memAppRes.json();
            setMembershipStatus(appData);
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

  // Separate events into upcoming and past
  const now = new Date();
  const upcomingEvents = events.filter((e) => new Date(e.event_date) >= now);
  const pastEvents = events.filter((e) => new Date(e.event_date) < now);

  // Collect social links
  const socialLinks: { platform: string; url: string; icon: JSX.Element }[] = [];
  if (community.facebook) {
    socialLinks.push({
      platform: 'Facebook',
      url: community.facebook.startsWith('http') ? community.facebook : `https://facebook.com/${community.facebook}`,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    });
  }
  if (community.instagram) {
    socialLinks.push({
      platform: 'Instagram',
      url: community.instagram.startsWith('http') ? community.instagram : `https://instagram.com/${community.instagram}`,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      ),
    });
  }
  if (community.linkedin) {
    socialLinks.push({
      platform: 'LinkedIn',
      url: community.linkedin.startsWith('http') ? community.linkedin : `https://linkedin.com/in/${community.linkedin}`,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    });
  }
  if (community.tiktok) {
    socialLinks.push({
      platform: 'TikTok',
      url: community.tiktok.startsWith('http') ? community.tiktok : `https://tiktok.com/@${community.tiktok}`,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      ),
    });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'community', label: 'Community' },
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
          {/* Hero banner — clean, no overlays */}
          <div className="relative rounded-3xl overflow-hidden mb-8 opacity-0 animate-fade-in-up animate-fill-both">
            <div className="aspect-video bg-gradient-to-br from-orange-900/40 to-amber-900/20">
              {community.banner_image && (
                <img src={`${BACKEND_URL}${community.banner_image}`} alt={community.name} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
            {/* Club logo chip — painted ABOVE the black gradient so it stays fully visible.
                Falls back to a default initial-letter logo when none is uploaded. */}
            <div
              className={`absolute bottom-4 right-4 sm:bottom-6 sm:right-8 z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-white/25 shadow-xl shadow-black/40 ring-1 ring-black/30 flex items-center justify-center ${
                community.logo ? 'bg-slate-900' : 'bg-gradient-to-br from-amber-500 to-orange-600'
              }`}
            >
              {community.logo ? (
                <img src={`${BACKEND_URL}${community.logo}`} alt={`${community.name} logo`} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl sm:text-2xl font-bold text-white select-none" aria-hidden="true">
                  {(community.name || 'C').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 pr-24 sm:pr-32">
              {community.category && (
                <span className="inline-block px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-medium text-orange-300 mb-3">
                  {community.category}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 truncate">{community.name}</h1>
            </div>
          </div>

          {/* Info bar — social icons + share/3-dot + members/rating/website + join */}
          <div className="glass rounded-2xl p-5 mb-6 opacity-0 animate-fade-in-up animate-fill-both animate-delay-100">
            {/* Top row: left = members, rating, social icons | right = share, 3-dot */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Left side: members, rating, website, social icons */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                {/* Members */}
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  {community.member_count || 0} members
                </span>
                {/* Rating */}
                {avgRating && (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {avgRating} ({reviews.length})
                  </span>
                )}
                {/* Website globe icon — same style as social icons */}
                {community.website && (
                  <a href={community.website} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all"
                    title="Website"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                  </a>
                )}
                {/* Location — clickable Google Maps link */}
                {community.location && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(community.location)}`} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all"
                    title={community.location}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </a>
                )}
                {/* Separator */}
                <span className="w-px h-4 bg-white/10" />
                {/* Social icons */}
                {socialLinks.map((link) => (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all"
                    title={link.platform}
                  >
                    {link.icon}
                  </a>
                ))}
              </div>

              {/* Right side: share + 3-dot */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowSharePopup(true)}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all"
                  aria-label="Share"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                  </svg>
                </button>
                {isMember && (
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
                            window.open(`/communities/${id}/apply`, '_blank', 'noopener,noreferrer');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 transition-colors border-t border-white/5"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Membership
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
                )}
              </div>
            </div>

            {/* Bottom row: Join Community (left) + Be a Member status (right) */}
            <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {!isMember ? (
                <button
                  onClick={handleJoinLeave}
                  disabled={joining}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 btn-primary"
                >
                  {joining ? 'Processing...' : 'Join Community'}
                </button>
              ) : (
                <span className="flex-1 sm:flex-none inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  You are a Member
                </span>
              )}
              {/* Be a Member — shown when organizer opened membership OR set a custom form URL */}
              {(community.membership_open || community.membership_form_url) ? (
                membershipStatus ? (
                  <Link
                    href={`/communities/${id}/apply`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 sm:flex-none inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                      membershipStatus.status === 'approved'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : membershipStatus.status === 'rejected'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {membershipStatus.status === 'approved' ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : membershipStatus.status === 'rejected' ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    Membership: {membershipStatus.status.charAt(0).toUpperCase() + membershipStatus.status.slice(1)}
                  </Link>
                ) : (
                  <Link
                    href={`/communities/${id}/apply`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold transition-all btn-ghost text-center"
                  >
                    Be a Member
                  </Link>
                )
              ) : (
                <button
                  onClick={() => setShowNoMembershipPopup(true)}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold transition-all btn-ghost text-center opacity-60"
                >
                  Be a Member
                </button>
              )}
            </div>
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
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* COMMUNITY TAB — About + Events + Reviews all in one scroll     */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'community' && (
              <div className="space-y-8">
                {/* ── About Section ── */}
                <section className="glass rounded-2xl p-6 sm:p-8">
                  <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    About
                  </h2>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {community.description || 'No description provided.'}
                  </p>

                  {/* Social Links in About */}
                  {socialLinks.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-white/5">
                      <h3 className="text-sm font-medium text-slate-400 mb-3">Connect with us</h3>
                      <div className="flex flex-wrap gap-2">
                        {socialLinks.map((link) => (
                          <a
                            key={link.platform}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all"
                          >
                            {link.icon}
                            {link.platform}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* ── Events Section ── */}
                <section>
                  <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    Events
                  </h2>
                  {events.length === 0 ? (
                    <div className="glass rounded-2xl p-10 text-center">
                      <div className="text-4xl mb-3">📅</div>
                      <p className="text-slate-400">No events for this community yet.</p>
                    </div>
                  ) : (
                    <>
                      {/* Upcoming Events */}
                      {upcomingEvents.length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Upcoming Events</h3>
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {upcomingEvents.map((event) => (
                              <Link
                                href={`/events/${event.id}`}
                                key={event.id}
                                className="glass-card rounded-2xl overflow-hidden group"
                              >
                                {/* Banner image */}
                                <div className="relative h-36 bg-gradient-to-br from-amber-900/30 to-orange-900/20 overflow-hidden">
                                  {event.banner_image ? (
                                    <img
                                      src={`${BACKEND_URL}${event.banner_image}`}
                                      alt={event.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                  )}
                                  {/* Date badge */}
                                  {event.event_date && (
                                    <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-white/10 text-xs font-medium text-slate-200">
                                      {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </div>
                                  )}
                                </div>
                                {/* Content */}
                                <div className="p-4">
                                  <h3 className="text-sm font-semibold text-slate-100 line-clamp-1 group-hover:text-amber-300 transition-colors">
                                    {event.title}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs text-slate-400 truncate">{event.location || 'Online'}</p>
                                    {event.start_time && (
                                      <span className="text-xs text-slate-500">· {event.start_time}</span>
                                    )}
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Past Events */}
                      {pastEvents.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Past Events
                          </h3>
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {pastEvents.map((event) => (
                              <Link
                                href={`/events/${event.id}`}
                                key={event.id}
                                className="glass-card rounded-2xl overflow-hidden group opacity-75 hover:opacity-100 transition-opacity"
                              >
                                <div className="relative h-36 bg-gradient-to-br from-slate-800/30 to-slate-900/20 overflow-hidden">
                                  {event.banner_image ? (
                                    <img
                                      src={`${BACKEND_URL}${event.banner_image}`}
                                      alt={event.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 grayscale-[30%]"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                  )}
                                  {event.event_date && (
                                    <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-white/10 text-xs font-medium text-slate-400">
                                      {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </div>
                                  )}
                                  <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-slate-800/80 backdrop-blur-sm border border-white/10 text-[10px] font-medium text-slate-500 uppercase">
                                    Ended
                                  </div>
                                </div>
                                <div className="p-4">
                                  <h3 className="text-sm font-semibold text-slate-300 line-clamp-1 group-hover:text-amber-300 transition-colors">
                                    {event.title}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs text-slate-500 truncate">{event.location || 'Online'}</p>
                                    {event.start_time && (
                                      <span className="text-xs text-slate-600">· {event.start_time}</span>
                                    )}
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </section>

                {/* ── Reviews Section ── */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
                      <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      Reviews
                      {avgRating && (
                        <span className="text-sm font-normal text-slate-400 ml-1">({avgRating} avg)</span>
                      )}
                    </h2>
                    {isAuthenticated && !showReviewForm && (
                      <button
                        onClick={() => setShowReviewForm(true)}
                        className="btn-primary px-4 py-2 rounded-xl text-sm font-medium"
                      >
                        Write a Review
                      </button>
                    )}
                  </div>

                  {/* Review form */}
                  {showReviewForm && (
                    <form onSubmit={handleSubmitReview} className="glass rounded-2xl p-6 space-y-4 mb-6">
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
                </section>
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

        {/* No Membership Open Popup */}
        {showNoMembershipPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowNoMembershipPopup(false)}>
            <div className="glass rounded-2xl p-8 max-w-md w-full text-center animate-scale-in" onClick={(e) => e.stopPropagation()}>
              <div className="w-16 h-16 rounded-full bg-slate-500/10 border border-slate-500/20 flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-2">No Membership Open</h3>
              <p className="text-sm text-slate-400 mb-6">
                This community has not opened membership applications at this time. Please check back later or contact the organizer.
              </p>
              <button
                onClick={() => setShowNoMembershipPopup(false)}
                className="btn-ghost px-6 py-2.5 rounded-xl text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}

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
