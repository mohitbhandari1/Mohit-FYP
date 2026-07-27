'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { apiFetch } from '../lib/auth';
import { useAuth } from '../lib/AuthContext';

const SUGGESTED_INTERESTS = [
  'Technology',
  'Music',
  'Sports',
  'Art & Design',
  'Photography',
  'Reading',
  'Travel',
  'Gaming',
  'Food & Cooking',
  'Fitness',
  'Movies & TV',
  'Programming',
  'Dancing',
  'Volunteering',
  'Writing',
  'Yoga & Meditation',
  'Entrepreneurship',
  'Fashion',
  'Nature & Outdoors',
  'Science',
  'History',
  'Languages',
  'Investing',
  'Podcasts',
];

export default function OnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, user, refresh } = useAuth();
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // If user already has interests, redirect to home
  useEffect(() => {
    if (user?.interests && user.interests.trim()) {
      router.push('/');
    }
  }, [user, router]);

  const toggleInterest = (tag: string) => {
    setInterests((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length < 15
          ? [...prev, tag]
          : prev
    );
  };

  const addCustomInterest = () => {
    const tag = interestInput.trim().toLowerCase();
    if (tag && !interests.includes(tag) && interests.length < 15) {
      setInterests([...interests, tag]);
      setInterestInput('');
    }
  };

  const removeInterest = (tag: string) => {
    setInterests(interests.filter((t) => t !== tag));
  };

  const handleInterestKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomInterest();
    }
    if (e.key === 'Backspace' && !interestInput && interests.length > 0) {
      setInterests(interests.slice(0, -1));
    }
  };

  const handleSave = async () => {
    if (interests.length === 0) {
      setError('Please select at least one interest.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: user?.name,
          bio: user?.bio || null,
          interests: interests.join(', '),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save interests.');
        setSaving(false);
        return;
      }

      await refresh();
      router.push('/');
    } catch {
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await refresh();
      router.push('/');
    } catch {
      router.push('/');
    }
  };

  if (authLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
        </main>
      </>
    );
  }

  if (!isAuthenticated || !user) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen flex items-center justify-center relative px-4 py-24">
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="glow-orb glow-orb-amber w-[600px] h-[600px] -top-40 -left-40 opacity-10" />
          <div className="glow-orb glow-orb-orange w-[400px] h-[400px] bottom-20 -right-20 opacity-10" />
        </div>

        {/* Onboarding card */}
        <div className="relative w-full max-w-2xl opacity-0 animate-fade-in-up animate-fill-both">
          <div className="glass-strong rounded-3xl p-8 sm:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/10 mb-4">
                <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-100">Welcome to Smart Connects!</h1>
              <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                Tell us about your interests so we can recommend the best communities and events for you.
              </p>
            </div>

            {/* Selected interests tags */}
            <div className="mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                Your interests <span className="text-amber-400">{interests.length}</span>/15
              </p>
              {interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {interests.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-sm font-medium text-amber-300 animate-scale-in"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeInterest(tag)}
                        className="text-amber-400/60 hover:text-amber-300 transition-colors"
                        aria-label={`Remove ${tag}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">Select some interests below to get started</p>
              )}
            </div>

            {/* Suggested interests grid */}
            <div className="mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                Pick your interests
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_INTERESTS.map((interest) => {
                  const selected = interests.includes(interest.toLowerCase());
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest.toLowerCase())}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                        selected
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/10'
                          : 'bg-white/[0.03] border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-slate-200'
                      }`}
                    >
                      {interest}
                      {selected && (
                        <span className="ml-1.5 text-amber-400">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom interest input */}
            <div className="mb-8">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                Or add your own
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={handleInterestKeyDown}
                  placeholder="Type an interest and press Enter..."
                  className="input-glass flex-1 py-3 rounded-xl text-sm"
                  maxLength={30}
                />
                <button
                  type="button"
                  onClick={addCustomInterest}
                  disabled={!interestInput.trim() || interests.length >= 15}
                  className="px-5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300 flex items-start gap-3 animate-scale-in">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSave}
                disabled={saving || interests.length === 0}
                className="flex-1 btn-primary py-3.5 rounded-xl text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Get Started
                  </>
                )}
              </button>
              <button
                onClick={handleSkip}
                disabled={saving}
                className="btn-ghost py-3.5 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
