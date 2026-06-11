'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/auth';
import { useAuth } from '../lib/AuthContext';

interface Props {
  communityId: number;
  isAuthenticated: boolean;
  communityOwnerId?: number;
}

export default function Discussions({ communityId, isAuthenticated, communityOwnerId }: Props) {
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch(`/api/discussions/${communityId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setDiscussions(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [communityId]);

  const handlePostDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await apiFetch(`/api/discussions/${communityId}`, { method: 'POST', body: JSON.stringify({ content: newContent }) });
      if (!res.ok) { const data = await res.json(); setError(data.error || 'Failed to post'); return; }
      const newDiscussion = await res.json();
      const meRes = await apiFetch('/api/auth/me');
      if (meRes.ok) { const me = await meRes.json(); newDiscussion.author_name = me.name; newDiscussion.author_id = me.id; }
      newDiscussion.replies = [];
      setDiscussions([newDiscussion, ...discussions]);
      setNewContent('');
      setShowForm(false);
    } catch (err) { setError('An error occurred'); }
    finally { setSubmitting(false); }
  };

  const handleReply = async (discussionId: number) => {
    if (!replyContent.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/discussions/${communityId}`, { method: 'POST', body: JSON.stringify({ content: replyContent, parent_id: discussionId }) });
      if (!res.ok) { const data = await res.json(); setError(data.error || 'Failed to reply'); return; }
      const reply = await res.json();
      const meRes = await apiFetch('/api/auth/me');
      if (meRes.ok) { const me = await meRes.json(); reply.author_name = me.name; reply.author_id = me.id; }
      setDiscussions(discussions.map((d) => d.id === discussionId ? { ...d, replies: [...(d.replies || []), reply] } : d));
      setReplyContent('');
      setReplyTo(null);
    } catch (err) { setError('An error occurred'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (discussionId: number) => {
    if (!confirm('Delete this post?')) return;
    try {
      const res = await apiFetch(`/api/discussions/${communityId}/${discussionId}`, { method: 'DELETE' });
      if (res.ok) setDiscussions(discussions.filter((d) => d.id !== discussionId));
    } catch (err) {}
  };

  const { user: currentUser } = useAuth();
  const canDelete = (authorId: number) => authorId === currentUser?.id || currentUser?.is_admin || currentUser?.id === communityOwnerId;

  if (loading) return <div className="h-20 animate-pulse rounded-xl bg-slate-200" />;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-700">💬 Discussions</h2>
        {isAuthenticated && (
          <button onClick={() => setShowForm(!showForm)}
            className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
            {showForm ? 'Cancel' : '+ New Post'}
          </button>
        )}
      </div>

      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {showForm && (
        <form onSubmit={handlePostDiscussion} className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <textarea placeholder="Start a discussion..." value={newContent} onChange={(e) => setNewContent(e.target.value)} required rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
          <button type="submit" disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02] disabled:opacity-50">
            {submitting ? 'Posting...' : 'Post'}
          </button>
        </form>
      )}

      <div className="mt-6 space-y-4">
        {discussions.length === 0 ? (
          <p className="text-sm text-slate-400">No discussions yet. Be the first to start one!</p>
        ) : (
          discussions.map((discussion) => (
            <div key={discussion.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-slate-700">{discussion.content}</p>
                  <p className="mt-1 text-xs text-slate-400">{discussion.author_name} • {new Date(discussion.created_at).toLocaleDateString()}</p>
                </div>
                {canDelete(discussion.author_id) && (
                  <button onClick={() => handleDelete(discussion.id)} className="text-xs text-red-400 hover:text-red-500 ml-2 shrink-0">Delete</button>
                )}
              </div>

              {discussion.replies && discussion.replies.length > 0 && (
                <div className="mt-3 ml-6 space-y-2 border-l-2 border-orange-200 pl-4">
                  {discussion.replies.map((reply: any) => (
                    <div key={reply.id} className="py-2">
                      <p className="text-sm text-slate-600">{reply.content}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{reply.author_name} replied • {new Date(reply.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}

              {isAuthenticated && (
                <div className="mt-3">
                  {replyTo === discussion.id ? (
                    <div className="flex gap-2">
                      <input type="text" placeholder="Write a reply..." value={replyContent} onChange={(e) => setReplyContent(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                      <button onClick={() => handleReply(discussion.id)} disabled={submitting}
                        className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50">
                        Reply
                      </button>
                      <button onClick={() => { setReplyTo(null); setReplyContent(''); }} className="text-xs text-slate-400 hover:text-slate-500">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setReplyTo(discussion.id)} className="text-xs font-medium text-orange-600 hover:text-orange-500">Reply</button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
