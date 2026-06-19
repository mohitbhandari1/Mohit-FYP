'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { useAuth } from '../lib/AuthContext';
import { apiFetch, BACKEND_URL } from '../lib/auth';

export default function ProfilePage() {
  const {
    user: authUser,
    isAuthenticated,
    loading: authLoading,
    refresh,
  } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  if (authLoading) return <div />;
  if (!authUser) return null;

  const createdDate = new Date(authUser.created_at || Date.now());
  const avatarSrc = authUser.avatar_url ? `${BACKEND_URL}${authUser.avatar_url}` : null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await apiFetch('/api/auth/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to upload avatar');
        return;
      }

      await refresh();
      setAvatarError(false);
    } catch (err) {
      setError('An error occurred while uploading');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const res = await apiFetch('/api/auth/avatar', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to remove avatar');
        return;
      }
      await refresh();
      setAvatarError(false);
    } catch (err) {
      setError('An error occurred');
    }
  };

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-2xl px-6 py-16 sm:px-8">
        <div className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg">
          {/* Header */}
          <div className="flex items-center gap-6">
            {/* Avatar with upload */}
            <div className="relative group">
              {avatarSrc && !avatarError ? (
                <img
                  src={avatarSrc}
                  alt={authUser.name}
                  className="h-20 w-20 rounded-full border-2 border-slate-200 object-cover shadow-md"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-2xl font-bold text-white shadow-md">
                  {authUser.name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              {/* Upload overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                title="Change photo"
              >
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">{authUser.name}</h1>
              <p className="mt-1 text-sm text-slate-500">{authUser.email}</p>
              {authUser.avatar_url && (
                <button
                  onClick={handleRemoveAvatar}
                  className="mt-1 text-xs text-slate-400 hover:text-red-500 transition"
                >
                  Remove photo
                </button>
              )}
            </div>
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
