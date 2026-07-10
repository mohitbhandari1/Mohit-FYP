'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import Chatbot from '../../../components/Chatbot';
import { apiFetch, BACKEND_URL } from '../../../lib/auth';
import { SkeletonDetailPage } from '../../../components/Skeleton';

export default function AdminEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [event, setEvent] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
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

        const [eventRes, attendeesRes] = await Promise.all([
          apiFetch(`/api/events/${id}`),
          apiFetch(`/api/events/${id}/attendees`),
        ]);

        if (eventRes.ok) setEvent(await eventRes.json());
        if (attendeesRes.ok) setAttendees(await attendeesRes.json());
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchData();
  }, [id, router]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/admin/events/${id}`, { method: 'DELETE' });
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
  const formatTime = (d: string) => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-';

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

  if (!event) {
    return (
      <main className="min-h-screen bg-slate-950">
        <Navbar />
        <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 pt-24">
          <div className="text-center glass rounded-2xl p-10">
            <div className="text-5xl mb-4">📅</div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Event not found</h2>
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
          {event.banner_image && (
            <div className="rounded-2xl overflow-hidden aspect-video bg-gradient-to-br from-emerald-900/40 to-amber-900/20 mb-8">
              <img src={`${BACKEND_URL}${event.banner_image}`} alt={event.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Title & meta */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{event.title}</h1>
              {event.event_type && (
                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium capitalize">
                  {event.event_type}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mt-2">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {event.community_name}
              </span>
              <span>
                {formatDate(event.event_date)} at {event.start_time ? event.start_time : formatTime(event.event_date)}
              </span>
              {event.location && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {event.location}
                </span>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-xs text-slate-500 block mb-1">Attendees</span>
              <p className="text-2xl font-bold text-slate-100">{event.attendee_count || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-xs text-slate-500 block mb-1">Max Attendees</span>
              <p className="text-2xl font-bold text-slate-100">{event.max_attendees || 'Unlimited'}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-xs text-slate-500 block mb-1">Payment</span>
              <p className="text-2xl font-bold text-slate-100 capitalize">{event.payment_type || 'Free'}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-xs text-slate-500 block mb-1">Duration</span>
              <p className="text-2xl font-bold text-slate-100">{event.duration || 'TBD'}</p>
            </div>
          </div>

          {/* Description */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 mb-8">
            <h3 className="text-base font-semibold text-slate-200 mb-3">Description</h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {event.description || 'No description provided.'}
            </p>
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {event.hosts && (
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Hosts</span>
                <p className="text-sm text-slate-200 mt-1.5">{event.hosts}</p>
              </div>
            )}
            {event.speakers && (
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Speakers</span>
                <p className="text-sm text-slate-200 mt-1.5">{event.speakers}</p>
              </div>
            )}
            {event.topics && (
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Topics</span>
                <p className="text-sm text-slate-200 mt-1.5">{event.topics}</p>
              </div>
            )}
            {event.agenda && (
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Agenda</span>
                <p className="text-sm text-slate-200 mt-1.5 whitespace-pre-wrap">{event.agenda}</p>
              </div>
            )}
            {event.requirements && (
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 sm:col-span-2">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Requirements</span>
                <p className="text-sm text-slate-200 mt-1.5">{event.requirements}</p>
              </div>
            )}
            {event.instructions && (
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 sm:col-span-2">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Instructions</span>
                <p className="text-sm text-slate-200 mt-1.5 whitespace-pre-wrap">{event.instructions}</p>
              </div>
            )}
          </div>

          {/* Attendees */}
          {attendees.length > 0 && (
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 mb-8">
              <h3 className="text-base font-semibold text-slate-200 mb-4">Attendees ({attendees.length})</h3>
              <div className="space-y-2">
                {attendees.slice(0, 10).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-amber-400">{a.name?.charAt(0)?.toUpperCase() || '?'}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-200">{a.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div className="mt-10 p-5 rounded-2xl border border-red-500/20 bg-red-500/5">
            <h3 className="text-base font-semibold text-red-400 mb-2">Danger Zone</h3>
            <p className="text-sm text-slate-400 mb-4">Moving this event to trash will hide it immediately. It will be auto-deleted after 30 days. You can restore it from the Trash tab in the admin dashboard.</p>
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
