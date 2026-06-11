'use client';

import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../lib/auth';
import Image from 'next/image';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const quickPrompts = [
  'Show me communities',
  'What events are coming up?',
  'Recommend communities for me',
  'What categories are available?',
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm your Smart Connects assistant. I can help you discover communities and events. What would you like to know?", timestamp: new Date().toISOString() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (isOpen && inputRef.current) inputRef.current.focus(); }, [isOpen]);

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || loading) return;
    const userMessage: Message = { role: 'user', content: messageText, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/chat', { method: 'POST', body: JSON.stringify({ message: messageText }) });
      if (res.status === 401) {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Please sign in to use the chatbot.', timestamp: new Date().toISOString() }]);
        return;
      }
      if (!res.ok) throw new Error('Chat request failed');
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply, timestamp: data.timestamp }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I had trouble connecting. Please try again.', timestamp: new Date().toISOString() }]);
    } finally { setLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const formatMessage = (content: string) => {
    return content.split('\n').map((line) => {
      let s = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      if (s.trimStart().startsWith('•') || s.trimStart().startsWith('-'))
        return `<span class="flex items-start gap-2"><span class="text-orange-500 mt-1">•</span><span>${s.trimStart().slice(1).trim()}</span></span>`;
      const numberedMatch = s.match(/^(\d+)\.\s+(.*)/);
      if (numberedMatch) return `<span class="flex items-start gap-2"><span class="text-orange-500 font-medium min-w-[1.5rem]">${numberedMatch[1]}.</span><span>${numberedMatch[2]}</span></span>`;
      if (s.trim() === '') return '<br/>';
      return `<span>${s}</span>`;
    }).join('\n');
  };

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20 transition-all hover:shadow-xl hover:scale-110 active:scale-95"
        aria-label="Toggle chatbot">
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-800 dark:to-slate-800 px-4 py-3">
            <Image
              src="/logo.png"
              alt="Smart Connects"
              width={32}
              height={32}
              className="rounded-full shadow-sm"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Smart Connects Assistant</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">AI-powered help</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-80">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-br-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-bl-md'
                }`}>
                  <div className="[&_strong]:font-semibold" dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                  <p className="mt-1 text-[10px] opacity-50 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-slate-100 dark:bg-slate-800 px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-orange-400" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-orange-400" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-orange-400" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 2 && (
            <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-2">
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((prompt) => (
                  <button key={prompt} onClick={() => handleSend(prompt)}
                    className="rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-500 dark:text-slate-400 transition hover:border-orange-300 dark:hover:border-orange-600 hover:text-orange-600 dark:hover:text-orange-400">
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
            <div className="flex gap-2">
              <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Ask about communities..."
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
              <button onClick={() => handleSend()} disabled={loading || !input.trim()}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-2 text-white shadow-sm transition hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
