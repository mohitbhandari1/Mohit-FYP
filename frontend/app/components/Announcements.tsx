'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { apiFetch } from '../lib/auth';

interface Announcement {
  id: number;
  title: string;
  content: string;
  author_name: string;
  author_avatar?: string;
  created_at: string;
  pinned?: boolean;
}

interface AnnouncementsProps {
  communityId: number;
  isOwner?: boolean;
  className?: string;
}

export default function Announcements({ communityId, isOwner = false, className = '' }: AnnouncementsProps) {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, [communityId]);

  const fetchAnnouncements = async () => {
    try {
      const res = await apiFetch(`/api/communities/${communityId}/announcements`);
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || data || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/communities/${communityId}/announcements`, {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });

      if (res.ok) {
        setTitle('');
        setContent('');
        setShowForm(false);
        fetchAnnouncements();
      }
    } catch {
      // Handle error
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await apiFetch(`/api/communities/${communityId}/announcements/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      // Handle error
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-5 animate-pulse">
            <div className="h-4 w-48 rounded bg-slate-800/50 mb-3" />
            <div className="h-3 w-full rounded bg-slate-800/50 mb-2" />
            <div className="h-3 w-3/4 rounded bg-slate-800/50" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Create announcement button (owner only) */}
      {isOwner && (
        <div>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-105 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Announcement
            </button>
          ) : (
            <form onSubmit={handleCreate} className="rounded-xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-xl p-5 animate-fade-in-up">
              <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                Create Announcement
              </h4>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement title..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all mb-3"
              />

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What would you like to announce?"
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all resize-none"
              />

              <div className="flex items-center gap-2 mt-3">
                <button
                  type="submit"
                  disabled={!title.trim() || !content.trim() || submitting}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 disabled:opacity-40 transition-all duration-200"
                >
                  {submitting ? 'Publishing...' : 'Publish'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setTitle(''); setContent(''); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Announcements list */}
      {announcements.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement, idx) => (
            <div
              key={announcement.id}
              className="group rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden hover:border-white/10 transition-all duration-200"
              style={{ animationDelay: `${idx * 75}ms` }}
            >
              {/* Pinned indicator */}
              {announcement.pinned && (
                <div className="px-5 pt-3 flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                  </svg>
                  <span className="text-[10px] font-medium text-amber-400 uppercase tracking-wider">Pinned</span>
                </div>
              )}

              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-semibold text-white group-hover:text-amber-400 transition-colors">
                      {announcement.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500/60 to-orange-500/60 flex items-center justify-center text-[9px] font-bold text-white overflow-hidden">
                        {announcement.author_avatar ? (
                          <img src={announcement.author_avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          announcement.author_name?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="text-xs text-slate-500">{announcement.author_name}</span>
                      <span className="text-xs text-slate-700">·</span>
                      <span className="text-xs text-slate-600">{formatDate(announcement.created_at)}</span>
                    </div>
                  </div>

                  {/* Delete button (owner only) */}
                  {isOwner && (
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      aria-label="Delete announcement"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Content */}
                <p className="mt-3 text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                  {announcement.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
