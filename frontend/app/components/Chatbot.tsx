'use client';

import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../lib/auth';
import { quickPrompts } from '../lib/chatConfig';
import { useAuth } from '../lib/AuthContext';
import RichMessage from './RichMessage';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ActionButton {
  type: 'join' | 'rsvp' | 'view' | 'link';
  id?: number;
  name: string;
  url?: string;
}

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  actions?: ActionButton[];
  timestamp: Date;
}

interface ChatResponse {
  reply?: string;
  actions?: ActionButton[];
  timestamp?: string;
  message?: string;
  error?: string;
}

// ─── localStorage Helpers ────────────────────────────────────────────────────
// ── Chat history TTL (time-to-live) ────────────────────────────────────────
// Change this value to control how long chat history persists across pages.
// Examples:
//   30  * 60 * 1000  = 30 minutes
//    1  * 60 * 60 * 1000  = 1 hour
//    6  * 60 * 60 * 1000  = 6 hours
//   12  * 60 * 60 * 1000  = 12 hours
//   24  * 60 * 60 * 1000  = 1 day  (default)
//    3  * 24 * 60 * 60 * 1000  = 3 days
//    7  * 24 * 60 * 60 * 1000  = 7 days
const CHAT_HISTORY_TTL_MS = 24 * 60 * 60 * 1000; // default: 1 day

/** Returns per-user (or guest) localStorage keys. */
function getStorageKeys(userId: number | string | null) {
  const suffix = userId ? `_${userId}` : '_guest';
  return {
    messages: `smart_connects_chat_history${suffix}`,
    expiry: `smart_connects_chat_expiry${suffix}`,
  };
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'bot',
  content:
    "Hi! 👋 I'm your **Smart Connects** assistant. I can help you find communities, browse events, and even **generate event descriptions** when you're creating a new event. Try one of the suggestions below or type your question.",
  timestamp: new Date(),
};

/** Load persisted chat messages from localStorage (returns null if expired or missing). */
function loadPersistedMessages(userId: number | string | null): Message[] | null {
  const keys = getStorageKeys(userId);
  try {
    const expiry = localStorage.getItem(keys.expiry);
    if (!expiry) return null;
    if (Date.now() > Number(expiry)) {
      // Expired — clear stale data
      localStorage.removeItem(keys.messages);
      localStorage.removeItem(keys.expiry);
      return null;
    }
    const raw = localStorage.getItem(keys.messages);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Message[];
    // Rehydrate timestamps (stored as ISO strings)
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return null;
  }
}

/** Save chat messages to localStorage with the configured TTL. */
function persistMessages(msgs: Message[], userId: number | string | null) {
  const keys = getStorageKeys(userId);
  try {
    localStorage.setItem(keys.messages, JSON.stringify(msgs));
    localStorage.setItem(keys.expiry, String(Date.now() + CHAT_HISTORY_TTL_MS));
  } catch { /* quota exceeded or SSR — silently ignore */ }
}

/** Clear persisted chat from localStorage. */
function clearPersistedMessages(userId: number | string | null) {
  const keys = getStorageKeys(userId);
  try {
    localStorage.removeItem(keys.messages);
    localStorage.removeItem(keys.expiry);
  } catch { /* ignore */ }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Chatbot() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Hydrate messages from localStorage on mount / user change ──────
  useEffect(() => {
    const persisted = loadPersistedMessages(userId);
    if (persisted && persisted.length > 0) {
      setMessages(persisted);
    }
    setHydrated(true);
  }, [userId]);

  // ─── Persist messages to localStorage whenever they change ───────────
  useEffect(() => {
    if (hydrated) {
      persistMessages(messages, userId);
    }
  }, [messages, hydrated, userId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // ─── Send Message ───────────────────────────────────────────────────────

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const isFirstMessage = !messages.some((m) => m.role === 'user');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setShowSuggestions(false);

    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text.trim(), firstMessage: isFirstMessage }),
      });

      let replyText = '';
      let actions: ActionButton[] | undefined;

      try {
        const data: ChatResponse = await res.json();
        replyText = data.reply || data.message || data.error || '';
        actions = data.actions;
      } catch {
        replyText = '';
      }

      if (!replyText) {
        replyText =
          res.status === 401
            ? 'Please log in to use the chat assistant.'
            : 'Sorry, I encountered an error. Please try again in a moment.';
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: replyText,
        actions,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content:
          "Sorry, I'm having trouble connecting right now. Please try again later.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const shouldShowPrompts =
    showSuggestions && messages.filter((m) => m.role === 'user').length === 0;

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Chat Panel ── */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[22rem] sm:w-[26rem] z-50 animate-scale-in origin-bottom-right">
          <div className="rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col max-h-[600px]">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-800/60 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <svg
                    className="w-5 h-5 text-black"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">SC Assistant</p>
                  <p className="flex items-center gap-1 text-xs text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    clearPersistedMessages(userId);
                    setMessages([{ ...WELCOME_MESSAGE, id: 'welcome-' + Date.now() }]);
                    setShowSuggestions(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  title="Clear conversation"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px] scrollbar-thin">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  {/* Bot avatar */}
                  {msg.role === 'bot' && (
                    <div className="shrink-0 mr-2 mt-1">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/20 flex items-center justify-center">
                        <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black rounded-2xl rounded-br-md px-4 py-2.5'
                        : 'bg-slate-800/60 border border-slate-700/40 rounded-2xl rounded-bl-md px-4 py-2.5'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="text-sm font-medium">{msg.content}</p>
                    ) : (
                      <RichMessage
                        content={msg.content}
                        actions={msg.actions}
                        timestamp={msg.timestamp}
                      />
                    )}
                  </div>

                  {/* User avatar */}
                  {msg.role === 'user' && (
                    <div className="shrink-0 ml-2 mt-1">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start animate-fade-in">
                  <div className="shrink-0 mr-2 mt-1">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700/40 px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick prompts — simple, focused suggestions */}
            {shouldShowPrompts && (
              <div className="px-4 pb-3 border-t border-slate-800/40 pt-3">
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Try asking about
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium border border-amber-500/20 text-amber-400/90 bg-amber-500/5 hover:bg-amber-500/15 hover:border-amber-500/40 hover:text-amber-300 transition-all duration-200 active:scale-95"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="p-3 border-t border-slate-800/60 bg-slate-900/50"
            >
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                  disabled={isTyping}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-amber-500/20 transition-all duration-200"
                >
                  {isTyping ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Floating Button ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/30 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-amber-500/50 ${
          !isOpen ? 'animate-glow-pulse' : ''
        }`}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        )}
      </button>
    </>
  );
}
