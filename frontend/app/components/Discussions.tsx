'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { apiFetch, BACKEND_URL } from '../lib/auth';

interface DiscussionMessage {
  id: number;
  user_id: number;
  user_name: string;
  user_avatar?: string;
  content: string;
  parent_id?: number | null;
  created_at: string;
  replies?: DiscussionMessage[];
}

interface DiscussionsProps {
  communityId: number;
  isAuthenticated?: boolean;
  communityOwnerId?: number;
  className?: string;
}

export default function Discussions({ communityId, isAuthenticated: isAuthProp, communityOwnerId, className = '' }: DiscussionsProps) {
  const { user, isAuthenticated: authCtx } = useAuth();
  const isAuth = isAuthProp ?? authCtx;
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<DiscussionMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [communityId]);

  const fetchMessages = async () => {
    try {
      const res = await apiFetch(`/api/communities/${communityId}/discussions`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.discussions || data || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/communities/${communityId}/discussions`, {
        method: 'POST',
        body: JSON.stringify({
          content: newMessage.trim(),
          parent_id: replyTo?.id || null,
        }),
      });

      if (res.ok) {
        setNewMessage('');
        setReplyTo(null);
        fetchMessages();
      }
    } catch {
      // Handle error
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Organize messages into threads
  const topLevelMessages = messages.filter((m) => !m.parent_id);
  const getReplies = (parentId: number) => messages.filter((m) => m.parent_id === parentId);

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-slate-800/50" />
              <div className="h-3 w-24 rounded bg-slate-800/50" />
            </div>
            <div className="h-4 w-3/4 rounded bg-slate-800/50" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* New message form */}
      {isAuth && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-4">
          {replyTo && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <p className="text-xs text-slate-400 truncate flex-1">
                Replying to <span className="text-amber-400 font-medium">{replyTo.user_name}</span>
              </p>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url.startsWith('http') ? user.avatar_url : `${BACKEND_URL}${user.avatar_url}`} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Start a discussion..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={!newMessage.trim() || submitting}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 transition-all duration-200"
                >
                  {submitting ? 'Posting...' : replyTo ? 'Reply' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Messages */}
      {topLevelMessages.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">No discussions yet. Start the conversation!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topLevelMessages.map((msg) => (
            <MessageCard
              key={msg.id}
              message={msg}
              replies={getReplies(msg.id)}
              onReply={setReplyTo}
              formatTime={formatTime}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MessageCard({
  message,
  replies,
  onReply,
  formatTime,
}: {
  message: DiscussionMessage;
  replies: DiscussionMessage[];
  onReply: (msg: DiscussionMessage) => void;
  formatTime: (d: string) => string;
}) {
  const [showReplies, setShowReplies] = useState(replies.length <= 2);

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden hover:border-white/10 transition-all duration-200">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/80 to-orange-500/80 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
            {message.user_avatar ? (
              <img src={message.user_avatar.startsWith('http') ? message.user_avatar : `${BACKEND_URL}${message.user_avatar}`} alt="" className="w-full h-full object-cover" />
            ) : (
              message.user_name?.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{message.user_name}</p>
            <p className="text-xs text-slate-500">{formatTime(message.created_at)}</p>
          </div>
        </div>

        {/* Content */}
        <p className="text-sm text-slate-300 leading-relaxed pl-11">{message.content}</p>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-3 pl-11">
          <button
            onClick={() => onReply(message)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-400 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Reply
          </button>
          {replies.length > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-xs text-slate-500 hover:text-amber-400 transition-colors"
            >
              {showReplies ? 'Hide' : `Show ${replies.length}`} {replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      </div>

      {/* Replies */}
      {showReplies && replies.length > 0 && (
        <div className="border-t border-slate-800/40 bg-slate-900/30 px-4 py-3 space-y-3">
          {replies.map((reply) => (
            <div key={reply.id} className="flex items-start gap-3 pl-4 border-l-2 border-amber-500/20">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500/60 to-amber-500/60 flex items-center justify-center text-[10px] font-bold text-white shrink-0 overflow-hidden">
                {reply.user_avatar ? (
                  <img src={reply.user_avatar.startsWith('http') ? reply.user_avatar : `${BACKEND_URL}${reply.user_avatar}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  reply.user_name?.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white">{reply.user_name}</span>
                  <span className="text-[10px] text-slate-600">{formatTime(reply.created_at)}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
