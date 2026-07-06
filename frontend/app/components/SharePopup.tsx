'use client';

import { useState, useEffect } from 'react';

interface SharePopupProps {
  isOpen: boolean;
  onClose: () => void;
  url?: string;
  title?: string;
  description?: string;
}

export default function SharePopup({
  isOpen,
  onClose,
  url,
  title = 'Check this out!',
  description = '',
}: SharePopupProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  useEffect(() => {
    if (!isOpen) setCopied(false);
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const socialPlatforms = [
    {
      name: 'Twitter',
      color: 'hover:bg-sky-500/10 hover:border-sky-500/30 hover:text-sky-400',
      icon: (
        <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
      ),
      getUrl: () =>
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'Facebook',
      color: 'hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400',
      icon: (
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
      ),
      getUrl: () =>
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'LinkedIn',
      color: 'hover:bg-blue-600/10 hover:border-blue-600/30 hover:text-blue-400',
      icon: (
        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 110-4 2 2 0 010 4z" />
      ),
      getUrl: () =>
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'WhatsApp',
      color: 'hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-400',
      icon: (
        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
      ),
      getUrl: () =>
        `https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl}`)}`,
    },
    {
      name: 'Email',
      color: 'hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-400',
      icon: (
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm16 2l-8 5-8-5m16 0v12H4V6" />
      ),
      getUrl: () =>
        `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${description}\n\n${shareUrl}`)}`,
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h3 className="text-lg font-semibold text-white">Share</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Copy link */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex-1 min-w-0 px-2">
              <p className="text-sm text-slate-300 truncate">{shareUrl}</p>
            </div>
            <button
              onClick={copyLink}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:scale-105 shadow-lg shadow-amber-500/20'
              }`}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Social platforms */}
        <div className="px-6 pb-6">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Share via</p>
          <div className="grid grid-cols-5 gap-2">
            {socialPlatforms.map((platform) => (
              <a
                key={platform.name}
                href={platform.getUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-800/60 bg-white/[0.02] text-slate-400 transition-all duration-200 ${platform.color}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  {platform.icon}
                </svg>
                <span className="text-[10px] font-medium">{platform.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
