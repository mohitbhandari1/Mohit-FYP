'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { apiFetch, BACKEND_URL } from '../lib/auth';
import { useAuth } from '../lib/AuthContext';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
  community_logo?: string | null;
}

const PAGE_SIZE = 20;

// Group label for a notification type (used by the filter tabs)
const typeGroups: Record<string, string> = {
  new_event: 'Events',
  rsvp_pending: 'Events',
  rsvp_confirmed: 'Events',
  rsvp_approved: 'Events',
  rsvp_rejected: 'Events',
  document_approved: 'Events',
  document_rejected: 'Events',
  answer_approved: 'Events',
  answer_rejected: 'Events',
  event_reminder: 'Events',
  announcement: 'Communities',
  community_joined: 'Communities',
  membership_approved: 'Communities',
  membership_rejected: 'Communities',
};

const FILTERS = ['All', 'Unread', 'Events', 'Communities'] as const;
type Filter = (typeof FILTERS)[number];

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<Filter>('All');
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const loadNotifications = async (reset: boolean) => {
    const offset = reset ? 0 : notifications.length;
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await apiFetch(`/api/notifications?limit=${PAGE_SIZE}&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications((prev) => (reset ? data.notifications : [...prev, ...data.notifications]));
        setUnreadCount(data.unread_count);
        setHasMore(data.notifications.length === PAGE_SIZE);
      }
    } catch {
      // Silent fail
    }
    setLoading(false);
    setLoadingMore(false);
  };

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || loading || loadingMore || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNotifications(false);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, loadingMore, hasMore, notifications.length]);

  // Mark a single notification as read (no navigation — explicit open button for that)
  const markAsRead = async (notif: Notification) => {
    if (notif.is_read) return;
    setActionInProgress(notif.id);
    try {
      await apiFetch(`/api/notifications/${notif.id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch {
      // Silent fail
    }
    setActionInProgress(null);
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setActionInProgress(-1);
    try {
      await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Silent fail
    }
    setActionInProgress(null);
  };

  // Delete a notification
  const deleteNotification = async (notifId: number) => {
    setActionInProgress(notifId);
    try {
      await apiFetch(`/api/notifications/${notifId}`, { method: 'DELETE' });
      const deleted = notifications.find((n) => n.id === notifId);
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      if (deleted && !deleted.is_read) {
        setUnreadCount((prev) => Math.max(prev - 1, 0));
      }
    } catch {
      // Silent fail
    }
    setActionInProgress(null);
  };

  // Navigate to notification target (marks read first)
  const openNotification = async (notif: Notification) => {
    if (!notif.is_read) {
      try {
        await apiFetch(`/api/notifications/${notif.id}/read`, { method: 'PATCH' });
      } catch {
        // Silent fail
      }
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  // Format relative time
  const timeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'new_event':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        );
      case 'rsvp_pending':
      case 'document_rejected':
      case 'answer_rejected':
        return (
          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'rsvp_confirmed':
      case 'rsvp_approved':
      case 'document_approved':
      case 'answer_approved':
        return (
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'rsvp_rejected':
      case 'membership_rejected':
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        );
      case 'community_joined':
        return (
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 7v14m-8-6v6m-6-10v10a1 1 0 001 1h2a1 1 0 001-1V11a1 1 0 00-1-1H5a1 1 0 00-1 1zm10 0h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6a1 1 0 011-1zM3 21h18M4 4h16" />
          </svg>
        );
      case 'membership_approved':
        return (
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'announcement':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.52-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
        );
    }
  };

  // Apply client-side filter
  const filtered = notifications.filter((n) => {
    if (filter === 'Unread') return !n.is_read;
    if (filter === 'Events') return typeGroups[n.type] === 'Events';
    if (filter === 'Communities') return typeGroups[n.type] === 'Communities';
    return true;
  });

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 opacity-0 animate-fade-in-up animate-fill-both">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              Notifications
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                : `Your full notification history, ${user?.name?.split(' ')[0] || 'welcome back'}`}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={actionInProgress === -1}
              className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === f
                  ? 'bg-amber-400 text-black'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
              }`}
            >
              {f}
              {f === 'Unread' && unreadCount > 0 && (
                <span className={`ml-1.5 text-xs ${filter === 'Unread' ? 'text-black/70' : 'text-amber-400'}`}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notification list */}
        <div className="glass rounded-2xl overflow-hidden opacity-0 animate-fade-in-up animate-fill-both animate-delay-150">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-800/60 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <p className="text-slate-300 font-medium">
                {filter === 'Unread' ? 'All caught up!' : 'No notifications yet'}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {filter === 'Unread'
                  ? 'You have no unread notifications.'
                  : 'Join communities and RSVP to events to start receiving notifications.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-800/40">
              {filtered.map((notif) => (
                <li
                  key={notif.id}
                  className={`flex items-start gap-3 px-4 sm:px-6 py-4 transition-colors ${
                    notif.is_read ? '' : 'bg-amber-500/[0.04]'
                  }`}
                >
                  {/* Icon or community logo */}
                  <div className="flex-shrink-0 mt-0.5">
                    {notif.community_logo ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-slate-800/50">
                        <img
                          src={notif.community_logo.startsWith('http') ? notif.community_logo : `${BACKEND_URL}${notif.community_logo}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${notif.is_read ? 'text-slate-500 bg-slate-800/40' : 'text-amber-400 bg-amber-500/10'}`}>
                        {getNotifIcon(notif.type)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${notif.is_read ? 'text-slate-300' : 'text-white'}`}>
                        {notif.title}
                      </p>
                      <span className="flex-shrink-0 text-[11px] text-slate-500 mt-0.5">
                        {timeAgo(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">{notif.message}</p>
                    {!notif.is_read && (
                      <span className="inline-block mt-1.5 w-2 h-2 bg-amber-400 rounded-full" aria-hidden />
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {notif.link && (
                        <button
                          onClick={() => openNotification(notif)}
                          className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
                        >
                          View →
                        </button>
                      )}
                      {!notif.is_read && (
                        <button
                          onClick={() => markAsRead(notif)}
                          disabled={actionInProgress === notif.id}
                          className="text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                        >
                          Mark read
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notif.id)}
                        disabled={actionInProgress === notif.id}
                        className="text-xs text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50 ml-auto"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-10" />
        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
}
