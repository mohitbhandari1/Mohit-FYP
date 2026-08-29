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
  const [seatsLeft, setSeatsLeft] = useState<number | null>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [attendeesError, setAttendeesError] = useState('');
  // RSVP custom questions
  const [showRsvpQuestions, setShowRsvpQuestions] = useState(false);
  const [rsvpAnswers, setRsvpAnswers] = useState<Record<string, string>>({});
  const [rsvpAnswerFiles, setRsvpAnswerFiles] = useState<Record<string, File>>({});
  const [rsvpDocument, setRsvpDocument] = useState<File | null>(null);
  const [rsvpError, setRsvpError] = useState('');
  const [submittingRsvp, setSubmittingRsvp] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showFullWarning, setShowFullWarning] = useState(false);
  // Organizer per-attendee form review (shows all answers + uploaded files/images)
  const [reviewUserId, setReviewUserId] = useState<number | null>(null);
  const [reviewError, setReviewError] = useState('');
  const reviewAttendee = attendees.find((a: any) => a.user_id === reviewUserId) || null;

  /** Detect image files by extension (jpg, jpeg, png, gif, webp). */
  const isImageFile = (p: string) => /\.(jpe?g|png|gif|webp)$/i.test(p);

  /**
   * Render a file upload value: inline thumbnail for images, or a
   * download-link card for non-image files (PDF, DOC, etc.).
   */
  const renderFileUpload = (
    filePath: string,
    fileName: string | undefined,
    opts?: { thumbClass?: string; wrapperClass?: string }
  ) => {
    const name = fileName || filePath.split('/').pop() || 'uploaded file';
    const fullUrl = `${BACKEND_URL}${filePath}`;
    if (isImageFile(filePath)) {
      return (
        <a href={fullUrl} target="_blank" rel="noopener noreferrer"
          className={`group inline-block ${opts?.wrapperClass || ''}`}>
          <img
            src={fullUrl}
            alt={name}
            className={`rounded-lg object-cover border border-white/10 group-hover:border-amber-500/40 transition-colors ${opts?.thumbClass || 'w-20 h-20'}`}
          />
          <p className="text-[11px] text-slate-500 mt-1 truncate max-w-[8rem] group-hover:text-amber-400 transition-colors">{name}</p>
        </a>
      );
    }
    return (
      <a href={fullUrl} target="_blank" rel="noopener noreferrer"
        download={name}
        className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
        {name}
      </a>
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventRes, reviewsRes] = await Promise.all([
          apiFetch(`/api/events/${id}`),
          // no-store → always fetch the latest reviewer name/avatar (profile updates show here)
          apiFetch(`/api/engagement/review/event/${id}`, { cache: 'no-store' }),
        ]);
        if (eventRes.ok) {
          const eventData = await eventRes.json();
          setEvent(eventData);
          setAttendeeCount(eventData.attendee_count || eventData.attendees?.length || 0);
          setSeatsLeft(
            eventData.seats_remaining != null
              ? eventData.seats_remaining
              : eventData.max_attendees != null
                ? Math.max(Number(eventData.max_attendees) - (eventData.attendee_count || 0), 0)
                : null
          );

          const meRes = await apiFetch('/api/auth/me');
          if (meRes.ok) {
            setIsAuthenticated(true);
            const me = await meRes.json();
            const rsvpRes = await apiFetch('/api/engagement/rsvp/user');
            if (rsvpRes.ok) {
              const rsvpData = await rsvpRes.json();
              const myRsvp = rsvpData.find((r: any) => r.event_id === parseInt(id) || r.id === parseInt(id));
              if (myRsvp) setRsvpStatus(myRsvp.status);
            }
            const savedRes = await apiFetch(`/api/events/${id}/saved`);
            if (savedRes.ok) { const savedData = await savedRes.json(); setIsSaved(savedData.saved); }

            // Organizer (community owner) sees who joined + answers
            if (me.id === eventData.community_owner_id || me.role === 'admin') {
              const attRes = await apiFetch(`/api/engagement/rsvp/event/${id}`);
              if (attRes.ok) setAttendees(await attRes.json());
            }
          }
        } else { router.push('/events'); }
        if (reviewsRes.ok) {
          // API returns { reviews: [...], avg_rating, total_reviews } — extract the array
          const reviewData = await reviewsRes.json();
          setReviews(Array.isArray(reviewData) ? reviewData : (reviewData?.reviews || []));
        }
      } catch (err) { console.error('Error fetching event details'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id, router]);

  const handleRsvp = (status: 'attending' | 'not_attending') => {
    if (!isAuthenticated) { router.push('/login'); return; }
    setRsvpError('');
    // Event is full → show the friendly warning instead of attempting RSVP
    if (status === 'attending' && isFull && rsvpStatus !== 'attending') {
      setShowFullWarning(true);
      return;
    }
    // Attending an event with custom registration questions OR a required
    // verification document → ask them first
    if (status === 'attending' && (event?.questions?.length > 0 || event?.requires_documents)) {
      setRsvpAnswers({});
      setRsvpAnswerFiles({});
      setRsvpDocument(null);
      setRsvpError('');
      setShowRsvpQuestions(true);
      return;
    }
    submitRsvp(status, {});
  };

  const submitRsvp = async (status: 'attending' | 'not_attending', answers: Record<string, string>) => {
    setSubmittingRsvp(true);
    setRsvpError('');
    try {
      // Multipart form — includes the verification document and file answers when required
      const fd = new FormData();
      fd.append('event_id', String(parseInt(id)));
      fd.append('status', status);
      fd.append('answers', JSON.stringify(answers));
      // File/image-type registration questions: append each file with its question id
      (event?.questions || [])
        .filter((q: any) => q.type === 'file')
        .forEach((q: any) => {
          const f = rsvpAnswerFiles[String(q.id)];
          if (f) {
            fd.append('answer_files', f);
            fd.append('answer_file_questions', String(q.id));
          }
        });
      if (rsvpDocument) fd.append('document', rsvpDocument);

      const res = await apiFetch('/api/engagement/rsvp', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        // Only adjust counters when the status actually changed
        // (re-clicking the same status is a no-op on the backend)
        const statusChanged = rsvpStatus !== status;
        setRsvpStatus(status);
        if (statusChanged) {
          setAttendeeCount((prev) => status === 'attending' ? prev + 1 : Math.max(0, prev - 1));
          if (status === 'attending' && seatsLeft != null) setSeatsLeft((prev) => prev == null ? null : Math.max(0, prev - 1));
        }
        setShowRsvpQuestions(false);
        setRsvpDocument(null);
        setRsvpAnswerFiles({});
      } else {
        setRsvpError(data?.message || data?.error || 'Failed to RSVP');
      }
    } catch (err) { setRsvpError('Failed to RSVP. Please try again.'); }
    finally { setSubmittingRsvp(false); }
  };

  const handleAnswerStatus = async (userId: number, questionId: number, status: 'verified' | 'rejected' | '') => {
    setReviewError('');
    try {
      const res = await apiFetch('/api/engagement/rsvp/answer-status', {
        method: 'PATCH',
        body: JSON.stringify({ event_id: parseInt(id), user_id: userId, question_id: questionId, status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAttendees((prev) => prev.map((a: any) =>
          a.user_id === updated.user_id ? { ...a, answers: updated.answers } : a
        ));
      } else {
        const data = await res.json().catch(() => null);
        setReviewError(data?.error || 'Failed to update answer status');
      }
    } catch { setReviewError('Failed to update answer status'); }
  };

  const handleDocumentStatus = async (userId: number, status: 'verified' | 'rejected' | '') => {
    setAttendeesError('');
    try {
      const res = await apiFetch('/api/engagement/rsvp/document-status', {
        method: 'PATCH',
        body: JSON.stringify({ event_id: parseInt(id), user_id: userId, status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAttendees((prev) => prev.map((a: any) =>
          a.user_id === updated.user_id
            ? { ...a, document_status: updated.document_status, document_reviewed_at: updated.document_reviewed_at }
            : a
        ));
      } else {
        const data = await res.json().catch(() => null);
        setAttendeesError(data?.error || 'Failed to update document status');
      }
    } catch { setAttendeesError('Failed to update document status'); }
  };

  const handleDownloadAttendees = async () => {
    setDownloading(true);
    try {
      const res = await apiFetch(`/api/events/${id}/export`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setAttendeesError(err?.error || 'Failed to download');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(event?.title || 'event').replace(/[^\w\s-]/g, '')}_attendees.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { setAttendeesError('Failed to download'); }
    finally { setDownloading(false); }
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
        setReviews((prev) => [newReview, ...(Array.isArray(prev) ? prev : [])]);
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

  const isOwner = user && (user.id === event.community_owner_id || user.role === 'admin');
  const isFull = event.max_attendees != null && seatsLeft != null && seatsLeft <= 0;

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
              {event.location ? (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors underline underline-offset-2 decoration-amber-400/30 hover:decoration-amber-300/50">
                  {event.location}
                </a>
              ) : (
                <p className="text-sm font-medium text-slate-200">Online</p>
              )}
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-xs text-slate-500 mb-1">Attendees</p>
              <p className="text-sm font-medium text-slate-200">
                {attendeeCount}{event.max_attendees ? ` / ${event.max_attendees}` : ''}
              </p>
              {seatsLeft != null && seatsLeft <= 10 && (
                <p className={`mt-1 text-xs font-semibold ${isFull ? 'text-red-400' : 'text-amber-400'}`}>
                  {isFull ? 'Event Full' : `Only ${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} left`}
                </p>
              )}
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
                {event.age_limit && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <h3 className="text-md font-semibold text-slate-200 mb-2">Age Limit</h3>
                    <p className="text-slate-400">{event.age_limit}</p>
                  </div>
                )}
                {event.requires_documents && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <h3 className="text-md font-semibold text-slate-200 mb-2">📄 Verification Document Required</h3>
                    <p className="text-slate-400 whitespace-pre-wrap">
                      {event.document_instructions || 'Attendees must upload a verification document when RSVPing.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Who's Coming — organizer only */}
              {isOwner && (
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-100">Who&apos;s Coming</h2>
                      <p className="text-sm text-slate-400 mt-0.5">{attendees.length} response{attendees.length === 1 ? '' : 's'}</p>
                    </div>
                    <button onClick={handleDownloadAttendees} disabled={downloading}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-medium hover:bg-emerald-500/25 transition-all disabled:opacity-50">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {downloading ? 'Downloading...' : 'Download XLSX'}
                    </button>
                  </div>

                  {attendeesError && (
                    <div className="mb-3 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs">{attendeesError}</div>
                  )}

                  {attendees.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No RSVPs yet.</p>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {attendees.map((att: any) => (
                        <div key={att.user_id || att.id} className="py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {att.avatar_url ? (
                                <img src={`${BACKEND_URL}${att.avatar_url}`} alt="" className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-semibold text-amber-400">{(att.name || '?').charAt(0).toUpperCase()}</span>
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-200 truncate">{att.full_name || att.name}</p>
                                <p className="text-xs text-slate-500 truncate">{(att.email || '')}</p>
                              </div>
                            </div>
                            <span className="flex-shrink-0 flex items-center gap-2">
                              {((event.questions?.length > 0 && att.answers) || att.document_url) && (
                                <button
                                  onClick={() => setReviewUserId(att.user_id || att.id)}
                                  className="text-[10px] px-2.5 py-1 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400 font-medium hover:bg-amber-500/20 transition-all"
                                >
                                  Review
                                </button>
                              )}
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                att.status === 'attending'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {att.status === 'attending' ? 'Attending' : 'Not attending'}
                              </span>
                            </span>
                          </div>
                          {att.phone && <p className="text-xs text-slate-500 mt-1 ml-11">📞 {att.phone}</p>}                              {event.questions?.length > 0 && att.answers && (
                            <div className="ml-11 mt-1 space-y-0.5">
                              {event.questions.map((q: any) => {
                                const val = att.answers[String(q.id)] ?? att.answers[q.question] ?? '';
                                if (!val) return null;
                                if (q.type === 'file') {
                                  return (
                                    <div key={q.id} className="mt-1.5">
                                      {renderFileUpload(
                                        val,
                                        att.answers[String(q.id) + '_name'],
                                        { thumbClass: 'w-16 h-16', wrapperClass: 'inline-block' }
                                      )}
                                    </div>
                                  );
                                }
                                return (
                                  <p key={q.id} className="text-xs text-slate-400">
                                    <span className="text-slate-500">{q.question}:</span>{' '}{val}
                                  </p>
                                );
                              })}
                            </div>
                          )}
                          {att.document_url && (
                            <div className="ml-11 mt-1.5 space-y-1.5">
                              <div className="flex items-start gap-2 flex-wrap">
                                {isImageFile(att.document_url) ? (
                                  <a href={`${BACKEND_URL}${att.document_url}`} target="_blank" rel="noopener noreferrer"
                                    className="group inline-block">
                                    <img
                                      src={`${BACKEND_URL}${att.document_url}`}
                                      alt={att.document_name || 'Verification document'}
                                      className="w-20 h-20 rounded-lg object-cover border border-white/10 group-hover:border-amber-500/40 transition-colors"
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1 truncate max-w-[8rem] group-hover:text-amber-400 transition-colors">{att.document_name || 'Verification doc'}</p>
                                  </a>
                                ) : (
                                  <a href={`${BACKEND_URL}${att.document_url}`} target="_blank" rel="noopener noreferrer"
                                    download={att.document_name || 'verification-document'}
                                    className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                    </svg>
                                    {att.document_name || 'Verification document'}
                                  </a>
                                )}
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                  att.document_status === 'verified'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : att.document_status === 'rejected'
                                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}>
                                  {att.document_status === 'verified' ? 'Verified' : att.document_status === 'rejected' ? 'Rejected' : 'Pending'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleDocumentStatus(att.user_id, att.document_status === 'verified' ? '' : 'verified')}
                                  title={att.document_status === 'verified' ? 'Click to reset to pending' : 'Mark as verified'}
                                  className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                                    att.document_status === 'verified'
                                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                      : 'border-white/10 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30'
                                  }`}>
                                  ✓ Verify
                                </button>
                                <button
                                  onClick={() => handleDocumentStatus(att.user_id, att.document_status === 'rejected' ? '' : 'rejected')}
                                  title={att.document_status === 'rejected' ? 'Click to reset to pending' : 'Mark as rejected'}
                                  className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                                    att.document_status === 'rejected'
                                      ? 'border-red-500/40 bg-red-500/15 text-red-300'
                                      : 'border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/30'
                                  }`}>
                                  ✗ Reject
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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

                {/* Reviews List — 3 cards per row */}
                {reviews.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {reviews.map((review: any, i: number) => (
                      <div key={review.id || i} className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl flex flex-col transition-all hover:border-amber-500/20 hover:bg-white/[0.04]">
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
                            <div className="flex mt-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg key={star} className={`w-3.5 h-3.5 ${star <= review.rating ? 'text-amber-400' : 'text-slate-700'}`}
                                  fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          {review.comment ? (
                            <p className="text-sm text-slate-400 leading-relaxed">{review.comment}</p>
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
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">No reviews yet. Be the first to review!</p>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Organizer Card */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-medium">Organized by</p>
                <Link
                  href={event.community_id ? `/communities/${event.community_id}` : '#'}
                  className="flex items-center gap-3 group"
                >
                  {event.community_logo ? (
                    <img src={`${BACKEND_URL}${event.community_logo}`} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-amber-500/30 transition-colors" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/10 flex items-center justify-center group-hover:border-amber-500/30 transition-colors">
                      <span className="text-sm font-semibold text-amber-400">{(event.community_name || 'C').charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-amber-400 transition-colors">
                      {event.community_name || 'Community'}
                    </p>
                    <p className="text-xs text-slate-500">View community</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors group-hover:translate-x-0.5 transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* RSVP Card */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6 sticky top-24">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">RSVP</h3>

                {/* Seats remaining bar */}
                {event.max_attendees != null && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-400">Seats remaining</span>
                      <span className={`font-semibold ${isFull ? 'text-red-400' : 'text-amber-400'}`}>
                        {isFull ? '0' : seatsLeft} / {event.max_attendees}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}
                        style={{ width: `${event.max_attendees > 0 ? Math.min(((event.max_attendees - (seatsLeft ?? 0)) / event.max_attendees) * 100, 100) : 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {rsvpError && rsvpStatus !== 'attending' && (
                  <div className="mb-3 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs">{rsvpError}</div>
                )}

                {/* Seats full warning */}
                {isFull && rsvpStatus !== 'attending' && (
                  isOwner ? (
                    <div className="w-full mb-4 p-4 rounded-xl border border-amber-500/25 bg-amber-500/10">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-amber-400">This event is full</p>
                          <p className="text-xs text-amber-200/80 mt-0.5">Increase the seat limit to open more places.</p>
                          <Link href={`/events/${id}/edit`} className="inline-flex mt-3 px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 text-xs font-semibold hover:bg-amber-300 transition-colors">
                            Increase seat limit
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowFullWarning(true)}
                      className="w-full mb-4 p-4 rounded-xl border border-red-500/25 bg-red-500/10 text-left transition-all hover:bg-red-500/15"
                    >
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-red-400">This event is full!</p>
                          <p className="text-xs text-red-300/80 mt-0.5">All seats are taken. Stay connected for future events from {event.community_name || 'this community'}.</p>
                        </div>
                      </div>
                    </button>
                  )
                )}

                <div className="space-y-3">
                  <button
                    onClick={() => handleRsvp('attending')}
                    className={`w-full px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                      rsvpStatus === 'attending'
                        ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                        : isFull
                          ? 'bg-white/5 text-slate-400 border border-red-500/30 hover:bg-red-500/10 hover:text-red-300'
                          : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                    }`}
                  >
                    {isFull ? '✕ Seats Full' : "✓ I'm Attending"}
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

      {/* Seats Full Warning Modal */}
      {showFullWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowFullWarning(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-red-500/25 bg-slate-900 shadow-2xl shadow-black/50 p-6 sm:p-8 text-center animate-scale-in">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">Seats are full!</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Sorry, all seats for <span className="text-slate-200 font-medium">{event.title}</span> are taken.
              Stay connected for future events from {event.community_name || 'this community'} — new ones will appear soon!
            </p>
            <button
              onClick={() => setShowFullWarning(false)}
              className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* RSVP Questions Modal */}
      {showRsvpQuestions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => !submittingRsvp && setShowRsvpQuestions(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/50 max-h-[85vh] overflow-y-auto animate-scale-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-semibold text-slate-100">Almost there! 🎉</h3>
                <button onClick={() => !submittingRsvp && setShowRsvpQuestions(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-5">Please answer a few questions from the organizer to confirm your seat.</p>

              {rsvpError && (
                <div className="mb-4 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs">{rsvpError}</div>
              )}

              <div className="space-y-4">
                {event.questions.map((q: any) => {
                  const fileAcceptHint = q.file_accept === 'images' ? 'Images only' : q.file_accept === 'documents' ? 'Documents only' : 'JPG, PNG, PDF, DOC, DOCX';
                  return (
                  <div key={q.id}>
                    <label className="block text-sm font-medium text-slate-200 mb-1.5">
                      {q.question}{q.required && <span className="text-red-400 ml-0.5">*</span>}
                    </label>
                    {q.type === 'textarea' ? (
                      <textarea
                        value={rsvpAnswers[String(q.id)] || ''}
                        onChange={(e) => setRsvpAnswers((prev) => ({ ...prev, [String(q.id)]: e.target.value }))}
                        rows={3}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                        placeholder="Your answer..."
                      />
                    ) : q.type === 'select' || q.type === 'dropdown' ? (
                      <select
                        value={rsvpAnswers[String(q.id)] || ''}
                        onChange={(e) => setRsvpAnswers((prev) => ({ ...prev, [String(q.id)]: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-slate-100 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      >
                        <option value="" className="bg-slate-900">Select an option...</option>
                        {(q.options || []).map((opt: string) => (
                          <option key={opt} value={opt} className="bg-slate-900">{opt}</option>
                        ))}
                      </select>
                    ) : q.type === 'radio' ? (
                      <div className="space-y-2">
                        {(q.options || []).map((opt: string) => (
                          <label key={opt} className="flex items-center gap-3 cursor-pointer">
                            <input type="radio" name={`q_${q.id}`} value={opt}
                              checked={rsvpAnswers[String(q.id)] === opt}
                              onChange={(e) => setRsvpAnswers((prev) => ({ ...prev, [String(q.id)]: e.target.value }))}
                              className="w-4 h-4 border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/20" />
                            <span className="text-sm text-slate-300">{opt}</span>
                          </label>
                        ))}
                      </div>
                    ) : q.type === 'checkboxes' ? (
                      <div className="space-y-2">
                        {(q.options || []).map((opt: string) => {
                          const currentChecks = rsvpAnswers[String(q.id)] ? rsvpAnswers[String(q.id)].split(',').map((s: string) => s.trim()) : [];
                          return (
                            <label key={opt} className="flex items-center gap-3 cursor-pointer">
                              <input type="checkbox" value={opt}
                                checked={currentChecks.includes(opt)}
                                onChange={(e) => {
                                  const prev = rsvpAnswers[String(q.id)] ? rsvpAnswers[String(q.id)].split(',').map((s: string) => s.trim()) : [];
                                  const next = e.target.checked ? [...prev, opt] : prev.filter((v: string) => v !== opt);
                                  setRsvpAnswers((p) => ({ ...p, [String(q.id)]: next.join(', ') }));
                                }}
                                className="w-4 h-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/20" />
                              <span className="text-sm text-slate-300">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : q.type === 'date' ? (
                      <input type="date"
                        value={rsvpAnswers[String(q.id)] || ''}
                        onChange={(e) => setRsvpAnswers((prev) => ({ ...prev, [String(q.id)]: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-slate-100 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    ) : q.type === 'number' ? (
                      <input type="number"
                        value={rsvpAnswers[String(q.id)] || ''}
                        onChange={(e) => setRsvpAnswers((prev) => ({ ...prev, [String(q.id)]: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        placeholder="Enter a number..."
                      />
                    ) : q.type === 'file' ? (
                      <div>
                        <input
                          type="file"
                          accept={q.file_accept === 'images' ? 'image/jpeg,image/png' : q.file_accept === 'documents' ? '.pdf,.doc,.docx' : '.pdf,.doc,.docx,.jpg,.jpeg,.png'}
                          onChange={(e) => {
                            setRsvpAnswerFiles((prev) => {
                              const next = { ...prev };
                              if (e.target.files?.[0]) next[String(q.id)] = e.target.files[0];
                              else delete next[String(q.id)];
                              return next;
                            });
                            if (rsvpError) setRsvpError('');
                          }}
                          className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 file:cursor-pointer"
                        />
                        <p className="mt-1 text-xs text-slate-500">{fileAcceptHint} (max {q.file_max_size || 5} MB)</p>
                        {rsvpAnswerFiles[String(q.id)] && (
                          <p className="mt-1.5 text-xs text-emerald-400 font-medium">✓ {rsvpAnswerFiles[String(q.id)].name}</p>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={rsvpAnswers[String(q.id)] || ''}
                        onChange={(e) => setRsvpAnswers((prev) => ({ ...prev, [String(q.id)]: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        placeholder="Your answer..."
                      />
                    )}
                  </div>
                  );
                })}

                {/* Verification document upload (required when organizer asked for one) */}
                {event.requires_documents && (
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1.5">
                      Verification Document <span className="text-red-400">*</span>
                    </label>
                    {event.document_instructions && (
                      <p className="text-xs text-slate-500 mb-2">{event.document_instructions}</p>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        setRsvpDocument(e.target.files?.[0] || null);
                        if (rsvpError) setRsvpError('');
                      }}
                      className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 file:cursor-pointer"
                    />
                    <p className="mt-1 text-xs text-slate-500">PDF, DOC, DOCX, JPG, PNG (max 10 MB)</p>
                    {rsvpDocument && (
                      <p className="mt-1.5 text-xs text-emerald-400 font-medium">✓ {rsvpDocument.name}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    if (event.requires_documents && !rsvpDocument) {
                      setRsvpError('Please upload the required verification document to confirm your seat.');
                      return;
                    }
                    const missingFileAnswer = (event?.questions || [])
                      .some((q: any) => q.type === 'file' && q.required && !rsvpAnswerFiles[String(q.id)]);
                    if (missingFileAnswer) {
                      setRsvpError('Please upload the required file/image for all file upload questions.');
                      return;
                    }
                    submitRsvp('attending', rsvpAnswers);
                  }}
                  disabled={submittingRsvp}
                  className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all disabled:opacity-50"
                >
                  {submittingRsvp ? 'Confirming...' : 'Confirm Attendance'}
                </button>
                <button
                  onClick={() => setShowRsvpQuestions(false)}
                  disabled={submittingRsvp}
                  className="px-5 py-3 rounded-xl border border-white/10 text-slate-400 font-medium hover:text-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organizer per-attendee form review modal */}
      {reviewAttendee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setReviewUserId(null)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/50 max-h-[85vh] overflow-y-auto animate-scale-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-semibold text-slate-100">Review Response</h3>
                <button onClick={() => setReviewUserId(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-5">
                {reviewAttendee.full_name || reviewAttendee.name}
                {reviewAttendee.email && <span className="text-slate-500"> · {reviewAttendee.email}</span>}
              </p>

              {reviewError && (
                <div className="mb-4 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs">{reviewError}</div>
              )}

              {/* Question answers — including uploaded files and images with review status */}
              {event.questions?.length > 0 && reviewAttendee.answers ? (
                <div className="space-y-3">
                  {event.questions.map((q: any) => {
                    const val = reviewAttendee.answers[String(q.id)] ?? reviewAttendee.answers[q.question] ?? '';
                    if (!val) return null;
                    const ansStatus = reviewAttendee.answers[String(q.id) + '_status'];
                    return (
                      <div key={q.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                        <p className="text-sm font-medium text-slate-200 mb-1.5">{q.question}</p>
                        {q.type === 'file' ? (
                          <div className="mt-1">
                            {renderFileUpload(
                              val,
                              reviewAttendee.answers[String(q.id) + '_name'],
                              { thumbClass: 'w-28 h-28' }
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-300 whitespace-pre-wrap">{val}</p>
                        )}

                        {/* Review status for file answers */}
                        {q.type === 'file' && (
                          <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              ansStatus === 'verified'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : ansStatus === 'rejected'
                                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {ansStatus === 'verified' ? 'Verified' : ansStatus === 'rejected' ? 'Rejected' : 'Pending'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleAnswerStatus(reviewAttendee.user_id, q.id, ansStatus === 'verified' ? '' : 'verified')}
                                title={ansStatus === 'verified' ? 'Click to reset to pending' : 'Mark as verified'}
                                className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                                  ansStatus === 'verified'
                                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                    : 'border-white/10 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30'
                                }`}>
                                ✓ Verify
                              </button>
                              <button
                                onClick={() => handleAnswerStatus(reviewAttendee.user_id, q.id, ansStatus === 'rejected' ? '' : 'rejected')}
                                title={ansStatus === 'rejected' ? 'Click to reset to pending' : 'Mark as rejected'}
                                className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                                  ansStatus === 'rejected'
                                    ? 'border-red-500/40 bg-red-500/15 text-red-300'
                                    : 'border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/30'
                                }`}>
                                ✗ Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No registration question answers.</p>
              )}

              {/* Verification document + review actions */}
              {reviewAttendee.document_url && (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-sm font-medium text-slate-200 mb-1.5">Verification Document</p>
                  <div className="flex items-start gap-2 flex-wrap">
                    {isImageFile(reviewAttendee.document_url) ? (
                      <a href={`${BACKEND_URL}${reviewAttendee.document_url}`} target="_blank" rel="noopener noreferrer"
                        className="group inline-block">
                        <img
                          src={`${BACKEND_URL}${reviewAttendee.document_url}`}
                          alt={reviewAttendee.document_name || 'Verification document'}
                          className="w-28 h-28 rounded-lg object-cover border border-white/10 group-hover:border-amber-500/40 transition-colors"
                        />
                        <p className="text-[11px] text-slate-500 mt-1 truncate max-w-[10rem] group-hover:text-amber-400 transition-colors">{reviewAttendee.document_name || 'Verification doc'}</p>
                      </a>
                    ) : (
                      <a href={`${BACKEND_URL}${reviewAttendee.document_url}`} target="_blank" rel="noopener noreferrer"
                        download={reviewAttendee.document_name || 'verification-document'}
                        className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                        {reviewAttendee.document_name || 'View document'}
                      </a>
                    )}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      reviewAttendee.document_status === 'verified'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : reviewAttendee.document_status === 'rejected'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {reviewAttendee.document_status === 'verified' ? 'Verified' : reviewAttendee.document_status === 'rejected' ? 'Rejected' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3">
                    <button
                      onClick={() => handleDocumentStatus(reviewAttendee.user_id, reviewAttendee.document_status === 'verified' ? '' : 'verified')}
                      title={reviewAttendee.document_status === 'verified' ? 'Click to reset to pending' : 'Mark as verified'}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                        reviewAttendee.document_status === 'verified'
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          : 'border-white/10 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30'
                      }`}>
                      ✓ Verify
                    </button>
                    <button
                      onClick={() => handleDocumentStatus(reviewAttendee.user_id, reviewAttendee.document_status === 'rejected' ? '' : 'rejected')}
                      title={reviewAttendee.document_status === 'rejected' ? 'Click to reset to pending' : 'Mark as rejected'}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                        reviewAttendee.document_status === 'rejected'
                          ? 'border-red-500/40 bg-red-500/15 text-red-300'
                          : 'border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/30'
                      }`}>
                      ✗ Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
