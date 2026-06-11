'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { useAuth } from '../lib/AuthContext';
import { apiFetch } from '../lib/auth';

export default function ProfilePage() {
  const {
    user: authUser,
    isAuthenticated,
    loading: authLoading,
    logout,
    refresh,
  } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (authUser) {
      setName(authUser.name);
      setBio(authUser.bio || '');
      setInterests(authUser.interests || '');
    }
  }, [authUser, authLoading, isAuthenticated, router]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, bio, interests }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save profile');
        return;
      }

      await refresh();
      setError('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (authLoading) return <div className="min-h-screen" />;
  if (!authUser) return null;

  const createdDate = new Date(authUser.created_at || Date.now());

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-2xl px-6 py-16 sm:px-8">
        <div className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-2xl font-bold text-white shadow-md">
                {authUser.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">{authUser.name}</h1>
                <p className="mt-1 text-sm text-slate-500">{authUser.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-red-300 hover:text-red-500"
            >
              Logout
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
          )}
          {saved && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-600">
              Profile updated successfully!
            </div>
          )}

          {/* Editable fields */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="mt-8 space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-slate-600">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Interests (comma-separated)</label>
              <input
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="e.g. Technology, Sports, Music"
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-2 font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          {/* Account Details Section */}
          <div className="mt-8 border-t border-slate-200 pt-8">
            <h2 className="text-xl font-bold text-slate-800">Account Details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Role</p>
                <p className="mt-1 text-sm font-semibold text-slate-700 capitalize">{authUser.role}</p>
              </div>
              <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{authUser.email}</p>
              </div>
              <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Admin</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{authUser.is_admin ? 'Yes' : 'No'}</p>
              </div>
              <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Bio</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{authUser.bio || 'Not set'}</p>
              </div>
              <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Interests</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{authUser.interests || 'Not set'}</p>
              </div>
              <div className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Member Since</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {createdDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
