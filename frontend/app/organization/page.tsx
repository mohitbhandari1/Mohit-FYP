'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Chatbot from '../components/Chatbot';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import { apiFetch, BACKEND_URL } from '../lib/auth';

type Tab = 'overview' | 'members' | 'settings' | 'events';

const CATEGORIES = [
  'Education', 'Technology', 'Social Service', 'Business & Entrepreneurship',
  'Sports & Fitness', 'Arts & Culture', 'Environment', 'Other'
];

export default function OrganizationDashboard() {
  const router = useRouter();
  const { addToast } = useToast();
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Settings form
  const [formData, setFormData] = useState({
    name: '', description: '', category: '', website: '', location: '',
    facebook: '', instagram: '', linkedin: '', tiktok: '',
    is_private: false, member_approval: false,
  });
  const [saving, setSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Remove member
  const [removeTarget, setRemoveTarget] = useState<any>(null);
  const [removingMember, setRemovingMember] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const meRes = await apiFetch('/api/auth/me');
        if (!meRes.ok) { router.push('/login'); return; }
        const currentUser = await meRes.json();

        const ownedRes = await apiFetch('/api/communities/my-owned');
        if (ownedRes.ok) {
          const data = await ownedRes.json();
          const owned = Array.isArray(data) ? data : [];
          setCommunities(owned);
          if (owned.length > 0) {
            setSelectedCommunity(owned[0]);
          }
        }
      } catch (err) { setError('Failed to load dashboard'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [router]);

  useEffect(() => {
    if (!selectedCommunity) return;
    setFormData({
      name: selectedCommunity.name || '',
      description: selectedCommunity.description || '',
      category: selectedCommunity.category || '',
      website: selectedCommunity.website || '',
      location: selectedCommunity.location || '',
      facebook: selectedCommunity.facebook || '',
      instagram: selectedCommunity.instagram || '',
      linkedin: selectedCommunity.linkedin || '',
      tiktok: selectedCommunity.tiktok || '',
      is_private: selectedCommunity.is_private || false,
      member_approval: selectedCommunity.member_approval || false,
    });
    setBannerFile(null);
    setLogoFile(null);

    const fetchMembersAndEvents = async () => {
      try {
        const [membersRes, eventsRes] = await Promise.all([
          apiFetch(`/api/communities/${selectedCommunity.id}/members`),
          apiFetch(`/api/communities/${selectedCommunity.id}/events`),
        ]);
        if (membersRes.ok) setMembers(await membersRes.json());
        if (eventsRes.ok) setEvents(await eventsRes.json());
      } catch { /* ignore */ }
    };
    fetchMembersAndEvents();
  }, [selectedCommunity]);

  const handleSelectCommunity = (id: number) => {
    const found = communities.find((c) => c.id === id);
    if (found) setSelectedCommunity(found);
  };

  const handleRemoveMember = async () => {
    if (!removeTarget || !selectedCommunity) return;
    setRemovingMember(true);
    try {
      const res = await apiFetch(`/api/communities/${selectedCommunity.id}/members/${removeTarget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== removeTarget.id));
        addToast('success', `Removed ${removeTarget.name} from community`);
      } else {
        const data = await res.json().catch(() => ({}));
        addToast('error', data.error || 'Failed to remove member');
      }
    } catch { addToast('error', 'Failed to remove member'); }
    finally { setRemovingMember(false); setRemoveTarget(null); }
  };

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommunity) return;
    setSaving(true);
    setSettingsSuccess('');
    setError('');
    try {
      // Use FormData to support file uploads
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('description', formData.description);
      payload.append('category', formData.category);
      if (formData.website) payload.append('website', formData.website);
      if (formData.location) payload.append('location', formData.location);
      if (formData.facebook) payload.append('facebook', formData.facebook);
      if (formData.instagram) payload.append('instagram', formData.instagram);
      if (formData.linkedin) payload.append('linkedin', formData.linkedin);
      if (formData.tiktok) payload.append('tiktok', formData.tiktok);
      payload.append('is_private', String(formData.is_private));
      payload.append('member_approval', String(formData.member_approval));
      if (bannerFile) payload.append('banner_image', bannerFile);
      if (logoFile) payload.append('logo', logoFile);

      const res = await apiFetch(`/api/communities/${selectedCommunity.id}`, {
        method: 'PUT',
        body: payload,
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedCommunity(updated);
        setCommunities((prev) => prev.map((c) => c.id === updated.id ? updated : c));
        setSettingsSuccess('Community settings updated successfully!');
        addToast('success', 'Community settings updated');
        setTimeout(() => setSettingsSuccess(''), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to update community');
      }
    } catch { setError('Failed to update community'); }
    finally { setSaving(false); }
  };

  const inputClass = "w-full rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all";
  const labelClass = "block text-sm font-medium text-slate-300 mb-1.5";

  if (loading) return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-72 bg-white/5 rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-white/5 rounded-2xl" />)}
          </div>
        </div>
      </section>
      <Chatbot />
    </main>
  );

  if (communities.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950">
        <Navbar />
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">No Communities Yet</h2>
            <p className="text-slate-400 max-w-md mb-8">
              You don&apos;t own any communities yet. Create one to start managing your organization!
            </p>
            <Link href="/apply"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all hover:scale-[1.02]">
              Create a Community
            </Link>
          </div>
        </section>
        <Chatbot />
      </main>
    );
  }

  const totalMembers = members.length;

  return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-fade-in-up">
          {/* Header with community switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Organization Dashboard
              </h1>
              <p className="text-slate-400 mt-1">Manage your communities, members, and settings</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/"
                className="text-sm text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                User Dashboard
              </Link>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm">{error}</div>
          )}

          {/* Community selector */}
          {communities.length > 1 && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {communities.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectCommunity(c.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCommunity?.id === c.id
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'bg-white/[0.03] text-slate-400 border border-white/10 hover:text-slate-200 hover:border-white/20'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {selectedCommunity && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-100">{totalMembers}</p>
                      <p className="text-xs text-slate-400">Members</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-100">{events.length}</p>
                      <p className="text-xs text-slate-400">Events</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-100">{selectedCommunity.member_count || 0}</p>
                      <p className="text-xs text-slate-400">Total Joined</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-100">{selectedCommunity.category || 'N/A'}</p>
                      <p className="text-xs text-slate-400">Category</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Bar */}
              <div className="flex gap-1 mb-6 bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/10 p-1 w-fit">
                {(['overview', 'members', 'settings', 'events'] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
                      activeTab === tab ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}>
                    {tab === 'overview' && '📊 Overview'}
                    {tab === 'members' && '👥 Members'}
                    {tab === 'settings' && '⚙️ Settings'}
                    {tab === 'events' && '📅 Events'}
                  </button>
                ))}
              </div>

              {/* ─── Tab: Overview ─── */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6">
                    <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {selectedCommunity.name}
                    </h2>
                    <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {selectedCommunity.description || 'No description'}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-400">
                      {selectedCommunity.website && (
                        <a href={selectedCommunity.website} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
                          </svg>
                          Website
                        </a>
                      )}
                      {selectedCommunity.location && (
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {selectedCommunity.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Link href={`/communities/${selectedCommunity.id}`}
                      className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-5 hover:border-amber-500/20 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200 group-hover:text-amber-400 transition-colors">View Public Page</p>
                          <p className="text-xs text-slate-500">See how others see your community</p>
                        </div>
                      </div>
                    </Link>
                    <Link href={`/events/create`}
                      className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-5 hover:border-amber-500/20 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200 group-hover:text-amber-400 transition-colors">Create Event</p>
                          <p className="text-xs text-slate-500">Host a new event for your community</p>
                        </div>
                      </div>
                    </Link>
                    <Link href={`/communities/${selectedCommunity.id}/edit`}
                      className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-5 hover:border-amber-500/20 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200 group-hover:text-amber-400 transition-colors">Advanced Edit</p>
                          <p className="text-xs text-slate-500">Full community editing with images</p>
                        </div>
                      </div>
                    </Link>
                  </div>

                  {/* Recent Members */}
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6">
                    <h2 className="text-lg font-semibold text-slate-100 mb-4">Recent Members</h2>
                    {members.length > 0 ? (
                      <div className="space-y-2">
                        {members.slice(0, 5).map((member: any) => (
                          <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                                <span className="text-xs font-semibold text-amber-400">
                                  {member.name?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              </div>
                              <span className="text-sm text-slate-200">{member.name}</span>
                            </div>
                            <span className="text-xs text-slate-500">
                              {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : ''}
                            </span>
                          </div>
                        ))}
                        {members.length > 5 && (
                          <button onClick={() => setActiveTab('members')}
                            className="w-full text-center text-sm text-amber-400 hover:text-amber-300 pt-2 transition-colors">
                            View all {members.length} members →
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No members yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ─── Tab: Members ─── */}
              {activeTab === 'members' && (
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                  <div className="p-6 border-b border-white/5">
                    <h2 className="text-lg font-semibold text-slate-100">Members ({members.length})</h2>
                    <p className="text-sm text-slate-400 mt-1">Manage who is part of your community</p>
                  </div>
                  {members.length > 0 ? (
                    <div className="divide-y divide-white/5">
                      {members.map((member: any) => (
                        <div key={member.id} className="flex items-center justify-between p-4 hover:bg-white/[0.01] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                              <span className="text-sm font-semibold text-amber-400">
                                {member.name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-200">{member.name}</p>
                              <p className="text-xs text-slate-500">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">
                              Joined {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'N/A'}
                            </span>
                            <button
                              onClick={() => setRemoveTarget(member)}
                              className="p-2 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              title="Remove member"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 text-center">
                      <svg className="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-slate-400">No members have joined yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Tab: Settings ─── */}
              {activeTab === 'settings' && (
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6 sm:p-8">
                  <h2 className="text-lg font-semibold text-slate-100 mb-1">Community Settings</h2>
                  <p className="text-sm text-slate-400 mb-6">Update your community&apos;s details and preferences</p>

                  {settingsSuccess && (
                    <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-sm">{settingsSuccess}</div>
                  )}

                  <form onSubmit={handleSaveSettings} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Name *</label>
                        <input type="text" name="name" value={formData.name} onChange={handleSettingsChange} required
                          className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Category *</label>
                        <select name="category" value={formData.category} onChange={handleSettingsChange} required className={inputClass}>
                          {CATEGORIES.map((cat) => <option key={cat} value={cat} className="bg-slate-900">{cat}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Description</label>
                      <textarea name="description" value={formData.description} onChange={handleSettingsChange}
                        rows={4} className={`${inputClass} resize-none`} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Website</label>
                        <input type="url" name="website" value={formData.website} onChange={handleSettingsChange}
                          placeholder="https://..." className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Location</label>
                        <input type="text" name="location" value={formData.location} onChange={handleSettingsChange}
                          placeholder="City, Country" className={inputClass} />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <h3 className="text-base font-semibold text-slate-200 mb-4">Social Links</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Facebook</label>
                          <input type="url" name="facebook" value={formData.facebook} onChange={handleSettingsChange}
                            placeholder="https://facebook.com/..." className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Instagram</label>
                          <input type="url" name="instagram" value={formData.instagram} onChange={handleSettingsChange}
                            placeholder="https://instagram.com/..." className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>LinkedIn</label>
                          <input type="url" name="linkedin" value={formData.linkedin} onChange={handleSettingsChange}
                            placeholder="https://linkedin.com/..." className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>TikTok</label>
                          <input type="url" name="tiktok" value={formData.tiktok} onChange={handleSettingsChange}
                            placeholder="https://tiktok.com/..." className={inputClass} />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <h3 className="text-base font-semibold text-slate-200 mb-4">Images (Recommended: 1920 × 1080 px)</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Banner Image</label>
                          <input type="file" accept="image/*" onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                            className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 file:cursor-pointer" />
                          <p className="mt-1 text-xs text-slate-500">1920 × 1080 px recommended. {selectedCommunity?.banner_image ? 'Current banner exists.' : ''}</p>
                        </div>
                        <div>
                          <label className={labelClass}>Logo</label>
                          <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                            className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 file:cursor-pointer" />
                          <p className="mt-1 text-xs text-slate-500">1920 × 1080 px recommended. {selectedCommunity?.logo ? 'Current logo exists.' : ''}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <h3 className="text-base font-semibold text-slate-200 mb-4">Privacy</h3>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" name="is_private" checked={formData.is_private} onChange={handleSettingsChange}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/20" />
                          <span className="text-sm text-slate-300">Private community (hidden from search)</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" name="member_approval" checked={formData.member_approval} onChange={handleSettingsChange}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/20" />
                          <span className="text-sm text-slate-300">Require approval for new members</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button type="submit" disabled={saving}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all hover:scale-[1.01] disabled:opacity-50 text-sm">
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ─── Tab: Events ─── */}
              {activeTab === 'events' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-100">Events ({events.length})</h2>
                    <Link href="/events/create"
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-sm font-medium shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all">
                      + New Event
                    </Link>
                  </div>
                  {events.length > 0 ? (
                    events.map((event: any) => (
                      <Link key={event.id} href={`/events/${event.id}`}
                        className="block rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-5 hover:border-amber-500/20 hover:bg-white/[0.04] transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/5 flex flex-col items-center justify-center shrink-0">
                            {event.event_date && (
                              <>
                                <span className="text-[10px] text-amber-400 font-medium uppercase leading-none">
                                  {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })}
                                </span>
                                <span className="text-lg font-bold text-slate-100 leading-none mt-0.5">
                                  {new Date(event.event_date).getDate()}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-slate-100 truncate group-hover:text-amber-400 transition-colors">{event.title}</h3>
                            <p className="text-sm text-slate-400 truncate">{event.location || 'Online'} · {event.attendee_count || 0} attending</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link href={`/events/${event.id}/edit`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-white/5 transition-all">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Link>
                            <svg className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-10 text-center">
                      <div className="text-4xl mb-3">📅</div>
                      <p className="text-slate-400">No events yet for this community.</p>
                      <Link href="/events/create"
                        className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-sm font-medium shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all">
                        Create First Event
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Remove Member Confirm Modal */}
      <ConfirmModal
        isOpen={!!removeTarget}
        title="Remove Member"
        message={`Are you sure you want to remove "${removeTarget?.name}" from ${selectedCommunity?.name}?`}
        confirmLabel={removingMember ? 'Removing...' : 'Remove'}
        variant="danger"
        loading={removingMember}
        onConfirm={handleRemoveMember}
        onClose={() => setRemoveTarget(null)}
      />
      <Chatbot />
    </main>
  );
}
