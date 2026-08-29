'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import Chatbot from '../components/Chatbot';
import { apiFetch, BACKEND_URL } from '../lib/auth';
import { useAuth } from '../lib/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, refresh, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState({
    new_event: true,
    announcement: true,
    document_approved: true,
    document_rejected: true,
    answer_approved: true,
    answer_rejected: true,
  });
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setInterests(
        user.interests
          ? user.interests.split(',').map((s: string) => s.trim()).filter(Boolean)
          : []
      );
    }
  }, [user]);

  // Fetch notification preferences
  useEffect(() => {
    if (isAuthenticated) {
      apiFetch('/api/notification-preferences')
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data) setNotifPrefs(data);
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  // Save notification preferences
  const saveNotifPrefs = async () => {
    setPrefsSaving(true);
    setPrefsSuccess('');
    try {
      const res = await apiFetch('/api/notification-preferences', {
        method: 'PUT',
        body: JSON.stringify(notifPrefs),
      });
      if (res.ok) {
        setPrefsSuccess('Preferences saved!');
        setTimeout(() => setPrefsSuccess(''), 3000);
      }
    } catch {
      // Silent fail
    }
    setPrefsSaving(false);
  };

  const togglePref = (key: keyof typeof notifPrefs) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const addInterest = () => {
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
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addInterest();
    }
    if (e.key === 'Backspace' && !interestInput && interests.length > 0) {
      setInterests(interests.slice(0, -1));
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name,
          bio,
          interests: interests.join(', '),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || data.error || 'Failed to update profile.');
        setSaving(false);
        return;
      }

      setSuccess('Profile updated successfully!');
      setEditing(false);
      await refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setSaving(false);
  };
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingAvatarFile(file);
    setShowUploadConfirm(true);
    // Reset input so same file can be re-selected after modal
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmUpload = async () => {
    if (!pendingAvatarFile) return;
    setShowUploadConfirm(false);
    setUploadingAvatar(true);
    setError('');
    try {
      const payload = new FormData();
      payload.append('avatar', pendingAvatarFile);
      const res = await apiFetch('/api/auth/avatar', {
        method: 'POST',
        body: payload,
      });
      if (res.ok) {
        await refresh();
        setSuccess('Profile picture updated!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to upload photo');
      }
    } catch {
      setError('Failed to upload photo');
    }
    setUploadingAvatar(false);
    setPendingAvatarFile(null);
  };

  const handleRemoveClick = () => {
    setShowRemoveConfirm(true);
  };

  const handleConfirmRemove = async () => {
    setShowRemoveConfirm(false);
    setUploadingAvatar(true);
    try {
      const res = await apiFetch('/api/auth/avatar', { method: 'DELETE' });
      if (res.ok) {
        await refresh();
        setSuccess('Profile picture removed');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {
      setError('Failed to remove photo');
    }
    setUploadingAvatar(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (authLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
            <p className="text-slate-400 text-sm">Loading profile...</p>
          </div>
        </main>
      </>
    );
  }

  if (!isAuthenticated || !user) return null;

  const avatarUrl = user.avatar_url
    ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${BACKEND_URL}${user.avatar_url}`)
    : null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 px-4">
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="glow-orb glow-orb-amber w-[500px] h-[500px] -top-40 left-1/4 opacity-10" />
          <div className="glow-orb glow-orb-orange w-[300px] h-[300px] bottom-20 right-10 opacity-10" />
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Profile header */}
          <div className="glass-strong rounded-3xl p-8 mb-6 opacity-0 animate-fade-in-up animate-fill-both">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar — clickable to upload only in edit mode */}
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/10 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-gradient">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                </div>

                {/* Edit-mode controls — only visible when editing */}
                {editing && (
                  <>
                    {/* Upload button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 border-2 border-slate-950 flex items-center justify-center hover:bg-amber-400 transition-colors disabled:opacity-50"
                      title={avatarUrl ? 'Change photo' : 'Upload photo'}
                    >
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </button>

                    {/* Remove photo button (only if avatar exists) */}
                    {avatarUrl && (
                      <button
                        onClick={handleRemoveClick}
                        disabled={uploadingAvatar}
                        className="absolute top-0 right-0 w-6 h-6 rounded-full bg-red-500 border-2 border-slate-950 flex items-center justify-center hover:bg-red-400 transition-colors disabled:opacity-50"
                        title="Remove photo"
                      >
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}

                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelected}
                      className="hidden"
                    />
                  </>
                )}
              </div>

              {/* Name + email */}
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold text-slate-100">{user.name}</h1>
                <p className="text-slate-400 text-sm mt-1">{user.email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-300">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {user.role || 'Member'}
                  </span>
                  {user.created_at && (
                    <span className="text-xs text-slate-500">
                      Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>

              {/* Edit toggle */}
              <button
                onClick={() => setEditing(!editing)}
                className={`p-2.5 rounded-xl border transition-all ${
                  editing
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
                }`}
                aria-label="Toggle edit mode"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300 flex items-start gap-3 animate-scale-in">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300 flex items-start gap-3 animate-scale-in">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          {/* Edit form / Display info */}
          <div className="glass rounded-3xl p-8 mb-6 opacity-0 animate-fade-in-up animate-fill-both animate-delay-100">
            <h2 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              Personal Information
            </h2>

            {editing ? (
              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label htmlFor="editName" className="block text-sm font-medium text-slate-300 mb-2">
                    Display Name
                  </label>
                  <input
                    id="editName"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-glass w-full py-3 rounded-xl"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label htmlFor="editBio" className="block text-sm font-medium text-slate-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    id="editBio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    placeholder="Tell us about yourself..."
                    className="input-glass w-full py-3 rounded-xl resize-none"
                  />
                </div>

                {/* Interests */}
                <div>
                  <label htmlFor="editInterests" className="block text-sm font-medium text-slate-300 mb-2">
                    Interests
                  </label>
                  <div className="input-glass rounded-xl p-3 min-h-[56px] flex flex-wrap items-center gap-2">
                    {interests.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-300"
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
                    <input
                      id="editInterests"
                      type="text"
                      value={interestInput}
                      onChange={(e) => setInterestInput(e.target.value)}
                      onKeyDown={handleInterestKeyDown}
                      onBlur={addInterest}
                      placeholder={interests.length === 0 ? 'Add interests...' : ''}
                      className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-slate-200 placeholder:text-slate-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">Press Enter or comma to add</p>
                </div>

                {/* Save / Cancel buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setName(user.name || '');
                      setBio(user.bio || '');
                      setInterests(
                        user.interests
                          ? user.interests.split(',').map((s: string) => s.trim()).filter(Boolean)
                          : []
                      );
                      setError('');
                    }}
                    className="btn-ghost px-6 py-2.5 rounded-xl text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Display name */}
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Name</p>
                  <p className="text-slate-200">{user.name || 'Not set'}</p>
                </div>

                {/* Bio */}
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Bio</p>
                  <p className="text-slate-300 leading-relaxed">
                    {user.bio || <span className="text-slate-500 italic">No bio yet</span>}
                  </p>
                </div>

                {/* Interests */}
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Interests</p>
                  {interests.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {interests.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic text-sm">No interests added</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Account info section */}
          <div className="glass rounded-3xl p-8 mb-6 opacity-0 animate-fade-in-up animate-fill-both animate-delay-200">
            <h2 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Account Settings
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div>
                  <p className="text-sm text-slate-300">Email</p>
                  <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
                  Verified
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div>
                  <p className="text-sm text-slate-300">Role</p>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">{user.role || 'user'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-slate-300">Member since</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="glass rounded-3xl p-8 mb-6 opacity-0 animate-fade-in-up animate-fill-both animate-delay-300">
            <h2 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              Notification Preferences
            </h2>

            {prefsSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300">
                {prefsSuccess}
              </div>
            )}

            <div className="space-y-1">
              <PrefToggle
                label="New Events"
                description="When a community you follow posts a new event"
                enabled={notifPrefs.new_event}
                onToggle={() => togglePref('new_event')}
              />
              <PrefToggle
                label="Announcements"
                description="When a community you follow posts an announcement"
                enabled={notifPrefs.announcement}
                onToggle={() => togglePref('announcement')}
              />
              <PrefToggle
                label="Document Approved"
                description="When your event registration document is approved"
                enabled={notifPrefs.document_approved}
                onToggle={() => togglePref('document_approved')}
              />
              <PrefToggle
                label="Document Rejected"
                description="When your event registration document needs updating"
                enabled={notifPrefs.document_rejected}
                onToggle={() => togglePref('document_rejected')}
              />
              <PrefToggle
                label="Answer Approved"
                description="When your registration answer is approved"
                enabled={notifPrefs.answer_approved}
                onToggle={() => togglePref('answer_approved')}
              />
              <PrefToggle
                label="Answer Rejected"
                description="When your registration answer needs updating"
                enabled={notifPrefs.answer_rejected}
                onToggle={() => togglePref('answer_rejected')}
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={saveNotifPrefs}
                disabled={prefsSaving}
                className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                {prefsSaving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Preferences'
                )}
              </button>
            </div>
          </div>

          {/* Logout button */}
          <div className="glass rounded-3xl p-6 opacity-0 animate-fade-in-up animate-fill-both animate-delay-300">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all font-medium text-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </main>

      {/* Upload Confirmation Modal */}
      <ConfirmModal
        isOpen={showUploadConfirm}
        title="Update Profile Picture?"
        message={`Are you sure you want to update your profile picture? The change will be visible to everyone.`}
        confirmLabel="Upload"
        variant="default"
        onConfirm={handleConfirmUpload}
        onClose={() => { setShowUploadConfirm(false); setPendingAvatarFile(null); }}
      />

      {/* Remove Photo Confirmation Modal */}
      <ConfirmModal
        isOpen={showRemoveConfirm}
        title="Remove Profile Picture?"
        message="Are you sure you want to remove your profile picture? Your initials will be shown instead."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={handleConfirmRemove}
        onClose={() => setShowRemoveConfirm(false)}
      />

      <Chatbot />
    </>
  );
}

// ─── Notification Toggle Component ───
function PrefToggle({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${
          enabled ? 'bg-amber-500' : 'bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
