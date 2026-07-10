'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import Chatbot from '../components/Chatbot';
import { SkeletonTable } from '../components/Skeleton';
import { apiFetch, BACKEND_URL } from '../lib/auth';

type Tab = 'overview' | 'users' | 'applications' | 'communities' | 'activity' | 'trash';

const sidebarTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 'users',
    label: 'Users',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
  },
  {
    id: 'applications',
    label: 'Applications',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'communities',
    label: 'Communities',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'trash',
    label: 'Trash',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
  },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingApp, setProcessingApp] = useState<number | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [communities, setCommunities] = useState<any[]>([]);
  const [adminEvents, setAdminEvents] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [adminNotes, setAdminNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState<{ id: number; action: 'approved' | 'rejected' } | null>(null);
  const [trashItems, setTrashItems] = useState<any[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [processingTrash, setProcessingTrash] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const meRes = await apiFetch('/api/auth/me');
        if (!meRes.ok) { router.push('/login'); return; }
        const currentUser = await meRes.json();
        if (!currentUser.is_admin && currentUser.role !== 'admin') { router.push('/'); return; }

        const [statsRes, usersRes, appsRes, commRes, evRes] = await Promise.all([
          apiFetch('/api/admin/stats'),
          apiFetch('/api/admin/users'),
          apiFetch('/api/admin/applications'),
          apiFetch('/api/admin/communities'),
          apiFetch('/api/admin/events'),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (usersRes.ok) setUsers(await usersRes.json());
        if (appsRes.ok) setApplications(await appsRes.json());
        if (commRes.ok) setCommunities(await commRes.json());
        if (evRes.ok) setAdminEvents(await evRes.json());
      } catch (err) { setError('Failed to load admin data'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [router]);

  // Fetch trash items when trash tab is active
  useEffect(() => {
    if (activeTab !== 'trash') return;
    const fetchTrash = async () => {
      setLoadingTrash(true);
      try {
        const res = await apiFetch('/api/admin/trash');
        if (res.ok) setTrashItems(await res.json());
      } catch (err) { console.error('Failed to load trash'); }
      finally { setLoadingTrash(false); }
    };
    fetchTrash();
  }, [activeTab]);

  // Fetch activity log when tab or filter changes
  useEffect(() => {
    if (activeTab !== 'activity') return;
    const fetchActivity = async () => {
      setLoadingActivity(true);
      try {
        const params = activityFilter !== 'all' ? `?action=${activityFilter}` : '';
        const res = await apiFetch(`/api/admin/activity${params}`);
        if (res.ok) setActivities(await res.json());
      } catch (err) { console.error('Failed to load activity'); }
      finally { setLoadingActivity(false); }
    };
    fetchActivity();
  }, [activeTab, activityFilter]);

  // Re-fetch users when role filter changes
  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'overview') {
      const fetchFilteredUsers = async () => {
        const params = roleFilter !== 'all' ? `?role=${roleFilter}` : '';
        const res = await apiFetch(`/api/admin/users${params}`);
        if (res.ok) setUsers(await res.json());
      };
      fetchFilteredUsers();
    }
  }, [roleFilter, activeTab]);

  const refreshStats = async () => {
    const res = await apiFetch('/api/admin/stats');
    if (res.ok) setStats(await res.json());
  };

  const handleApplication = async (appId: number, status: 'approved' | 'rejected', notes?: string) => {
    setProcessingApp(appId);
    try {
      const res = await apiFetch(`/api/admin/applications/${appId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: notes || '' }),
      });
      if (res.ok) {
        setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status } : a));
        setShowNotesInput(null);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Failed: ${data.error || res.statusText}`);
      }
    } catch (err) { 
      console.error('Failed to process application', err);
      alert('Network error. Please try again.');
    }
    finally { setProcessingApp(null); }
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin: 'bg-red-500/10 text-red-400 border-red-500/20',
      organizer: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      member: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    };
    return styles[role] || styles.member;
  };

  const filteredUsers = users;
  const roles = ['all', 'admin', 'organizer', 'member'];
  const roleCounts: Record<string, number> = { all: users.length };
  users.forEach((u) => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });

  const handleRestore = async (type: string, id: number) => {
    setProcessingTrash(`restore-${type}-${id}`);
    try {
      const res = await apiFetch(`/api/admin/trash/${type}/${id}/restore`, { method: 'POST' });
      if (res.ok) {
        setTrashItems((prev) => prev.filter((t) => !(t.type === type && t.id === id)));
        refreshStats();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Failed to restore: ${data.error || res.statusText}`);
      }
    } catch { alert('Network error. Please try again.'); }
    finally { setProcessingTrash(null); }
  };

  const handlePermanentDelete = async (type: string, id: number, name: string) => {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    setProcessingTrash(`delete-${type}-${id}`);
    try {
      const res = await apiFetch(`/api/admin/trash/${type}/${id}/permanent`, { method: 'DELETE' });
      if (res.ok) {
        setTrashItems((prev) => prev.filter((t) => !(t.type === type && t.id === id)));
        refreshStats();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Failed to delete: ${data.error || res.statusText}`);
      }
    } catch { alert('Network error. Please try again.'); }
    finally { setProcessingTrash(null); }
  };

  const handleCleanup = async () => {
    if (!window.confirm('Permanently delete all items older than 30 days?')) return;
    setProcessingTrash('cleanup');
    try {
      const res = await apiFetch('/api/admin/trash/cleanup', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        const trashRes = await apiFetch('/api/admin/trash');
        if (trashRes.ok) setTrashItems(await trashRes.json());
        refreshStats();
      }
    } catch { alert('Network error.'); }
    finally { setProcessingTrash(null); }
  };

  const getDeletedAtDisplay = (d: string) => {
    const ms = Date.now() - new Date(d).getTime();
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const remaining = 30 - days;
    return { days, remaining, auto: remaining > 0 ? `Auto-delete in ${remaining} day${remaining === 1 ? '' : 's'}` : 'Pending auto-delete' };
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
  const formatDateTime = (d: string) => d ? new Date(d).toLocaleString() : '-';

  if (loading) return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-64 bg-white/5 rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-white/5 rounded-2xl" />)}
          </div>
          <SkeletonTable rows={5} />
        </div>
      </section>
      <Chatbot />
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />

      {/* Mobile sidebar toggle */}
      <div className="lg:hidden sticky top-14 z-30 bg-slate-950/95 backdrop-blur-xl border-b border-white/5 px-4 py-2 flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors text-slate-400"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {sidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        <span className="text-sm font-medium text-slate-300 capitalize">
          {activeTab === 'applications' ? 'Applications' : activeTab === 'trash' ? 'Trash' : activeTab}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {activeTab === 'applications' && stats?.pendingApplications > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-red-500/20 text-red-400">{stats.pendingApplications}</span>
          )}
          {activeTab === 'trash' && (stats?.totalTrashed || 0) > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-red-500/20 text-red-400">{stats.totalTrashed}</span>
          )}
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-6 py-8">

          {/* ============ SIDEBAR ============ */}
          <aside className={`
            fixed inset-0 top-[57px] z-20 lg:static lg:top-auto lg:inset-auto
            w-64 flex-shrink-0
            bg-slate-950 lg:bg-transparent
            border-r border-white/5 lg:border-0
            transition-transform duration-200
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>
            <nav className="p-4 space-y-1 lg:sticky lg:top-24">
              {sidebarTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-400 border border-amber-500/20 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
                    }`}
                  >
                    <span className={`flex-shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-500'}`}>
                      {tab.icon}
                    </span>
                    <span className="capitalize">{tab.label}</span>

                    {/* Badges */}
                    {tab.id === 'applications' && stats?.pendingApplications > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] rounded-full bg-red-500/20 text-red-400 font-medium">
                        {stats.pendingApplications}
                      </span>
                    )}
                    {tab.id === 'trash' && (stats?.totalTrashed || 0) > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] rounded-full bg-red-500/20 text-red-400 font-medium">
                        {stats.totalTrashed}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Overlay for mobile */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 top-[57px] z-10 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* ============ MAIN CONTENT ============ */}
          <div className="flex-1 min-w-0 animate-fade-in-up">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="mt-1 text-slate-400">Platform administration and management</p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm">{error}</div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-100">{stats?.totalUsers || users.length}</p>
                    <p className="text-sm text-slate-400">Total Users</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-100">{stats?.totalCommunities || 0}</p>
                    <p className="text-sm text-slate-400">Communities</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-100">{stats?.totalEvents || 0}</p>
                    <p className="text-sm text-slate-400">Events</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-100">{stats?.pendingApplications || 0}</p>
                    <p className="text-sm text-slate-400">Pending Apps</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════
               OVERVIEW TAB
               ═══════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
              <>
                {communities.length > 0 && (
                  <div className="mb-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                      <h2 className="text-lg font-semibold text-slate-100">Communities</h2>
                      <p className="text-sm text-slate-400 mt-1">{communities.length} total communities</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Category</th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Owner</th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Members</th>
                            <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {communities.slice(0, 10).map((c: any) => (
                            <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-200">{c.name}</span>
                                  {c.is_verified && (
                                    <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-400">{c.category || '-'}</td>
                              <td className="px-6 py-4 text-sm text-slate-400">{c.owner_name || 'None'}</td>
                              <td className="px-6 py-4 text-sm text-slate-400">{c.member_count || 0}</td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => router.push(`/admin/communities/${c.id}`)}
                                  className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors">
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {communities.length > 10 && (
                      <div className="p-4 text-center border-t border-white/5">
                        <button onClick={() => setActiveTab('communities')} className="text-sm text-amber-400 hover:text-amber-300 transition-colors">
                          View all {communities.length} communities →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {adminEvents.length > 0 && (
                  <div className="mb-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                      <h2 className="text-lg font-semibold text-slate-100">Events</h2>
                      <p className="text-sm text-slate-400 mt-1">{adminEvents.length} total events</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Title</th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Community</th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Attending</th>
                            <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {adminEvents.slice(0, 10).map((ev: any) => (
                            <tr key={ev.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-6 py-4">
                                <span className="text-sm font-medium text-slate-200">{ev.title}</span>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-400">{ev.community_name || '-'}</td>
                              <td className="px-6 py-4 text-sm text-slate-400">
                                {ev.event_date ? formatDate(ev.event_date) : '-'}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-400">{ev.attendee_count || 0}</td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => router.push(`/admin/events/${ev.id}`)}
                                  className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors">
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {applications.filter(a => a.status === 'pending').length > 0 && (
                  <div className="mb-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                      <h2 className="text-lg font-semibold text-slate-100">Pending Applications</h2>
                      <p className="text-sm text-slate-400 mt-1">{applications.filter(a => a.status === 'pending').length} awaiting review</p>
                    </div>
                    <div className="divide-y divide-white/5">
                      {applications.filter(a => a.status === 'pending').slice(0, 5).map((app: any) => (
                        <div key={app.id} className="p-5 hover:bg-white/[0.01] transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Link href={`/admin/applications/${app.id}`}
                                className="text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors underline underline-offset-2">
                                {app.community_name || 'N/A'}
                              </Link>
                              <span className="text-xs text-slate-500">by {app.user_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {showNotesInput?.id === app.id ? (
                                <div className="flex items-center gap-2">
                                  <input type="text" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Optional notes..." className="w-40 px-2.5 py-1.5 text-xs rounded-lg border border-white/10 bg-white/[0.03] text-slate-200 placeholder-slate-500 focus:border-amber-500/50 focus:outline-none" autoFocus />
                                  <button onClick={() => handleApplication(app.id, showNotesInput!.action, adminNotes)}
                                    disabled={processingApp === app.id}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${showNotesInput!.action === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'}`}>
                                    Confirm
                                  </button>
                                  <button onClick={() => { setShowNotesInput(null); setAdminNotes(''); }} className="text-xs text-slate-500 hover:text-slate-400">Cancel</button>
                                </div>
                              ) : (
                                <>
                                  <button onClick={() => setShowNotesInput({ id: app.id, action: 'approved' })}
                                    disabled={processingApp === app.id}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50">
                                    Approve
                                  </button>
                                  <button onClick={() => setShowNotesInput({ id: app.id, action: 'rejected' })}
                                    disabled={processingApp === app.id}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50">
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {applications.filter(a => a.status === 'pending').length > 5 && (
                      <div className="p-4 text-center border-t border-white/5">
                        <button onClick={() => setActiveTab('applications')} className="text-sm text-amber-400 hover:text-amber-300 transition-colors">
                          View all pending applications →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                  <div className="p-6 border-b border-white/5">
                    <h2 className="text-lg font-semibold text-slate-100">Recent Users</h2>
                    <p className="text-sm text-slate-400 mt-1">{users.length} registered users</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                          <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                          <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                          <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Communities</th>
                          <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Joined</th>
                          <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {users.slice(0, 10).map((user: any) => (
                          <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                                  <span className="text-xs font-medium text-amber-400">{user.name?.charAt(0)?.toUpperCase() || '?'}</span>
                                </div>
                                <span className="text-sm font-medium text-slate-200">{user.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-400">{user.email}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadge(user.role)}`}>{user.role}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1.5 max-w-[220px]">
                                {user.owned_communities && user.owned_communities.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {user.owned_communities.map((comm: any) => (
                                      <Link key={`own-${comm.id}`} href={`/admin/communities/${comm.id}`}
                                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-colors truncate max-w-full"
                                        title={`Owner of ${comm.name} (${comm.member_count || 0} members)`}
                                      >
                                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                                        <span className="truncate">{comm.name}</span>
                                      </Link>
                                    ))}
                                  </div>
                                )}
                                {user.joined_communities && user.joined_communities.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {user.joined_communities.map((comm: any) => (
                                      <Link key={`join-${comm.id}`} href={`/admin/communities/${comm.id}`}
                                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-400 border border-slate-500/20 hover:border-amber-500/30 hover:text-amber-400 transition-colors truncate max-w-full group"
                                        title={`Member of ${comm.name} · ${comm.member_count || 0} members · Owner: ${comm.owner_name || 'N/A'}`}
                                      >
                                        <svg className="w-3 h-3 flex-shrink-0 opacity-60 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        <span className="truncate">{comm.name}</span>
                                      </Link>
                                    ))}
                                  </div>
                                )}
                                {(!user.owned_communities?.length && !user.joined_communities?.length) && (
                                  <span className="text-xs text-slate-500">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-400">{user.created_at ? formatDate(user.created_at) : '-'}</td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => router.push(`/admin/users/${user.id}`)} className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors">View</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ═══════════════════════════════════════════════════
               USERS TAB
               ═══════════════════════════════════════════════════ */}
            {activeTab === 'users' && (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                <div className="p-6 border-b border-white/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-100">User Management</h2>
                      <p className="text-sm text-slate-400 mt-1">{users.length} users found</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {roles.map((role) => (
                      <button key={role} onClick={() => setRoleFilter(role)}
                        className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${
                          roleFilter === role
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-sm'
                            : 'bg-white/5 text-slate-400 border border-white/10 hover:border-amber-500/30 hover:text-amber-400'
                        }`}>
                        {role === 'all' ? 'All Roles' : role}
                        <span className="ml-1.5 opacity-70">({roleCounts[role] || 0})</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Communities</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Joined</th>
                        <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">No users found with this role filter</td>
                        </tr>
                      ) : (
                        filteredUsers.map((user: any) => (
                          <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-medium text-amber-400">{user.name?.charAt(0)?.toUpperCase() || '?'}</span>
                                </div>
                                <span className="text-sm font-medium text-slate-200">{user.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-400">{user.email}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadge(user.role)}`}>{user.role}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1.5 max-w-[220px]">
                                {user.owned_communities && user.owned_communities.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {user.owned_communities.map((comm: any) => (
                                      <Link key={`own-${comm.id}`} href={`/admin/communities/${comm.id}`}
                                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-colors truncate max-w-full"
                                        title={`Owner of ${comm.name} (${comm.member_count || 0} members)`}
                                      >
                                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                                        <span className="truncate">{comm.name}</span>
                                      </Link>
                                    ))}
                                  </div>
                                )}
                                {user.joined_communities && user.joined_communities.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {user.joined_communities.map((comm: any) => (
                                      <Link key={`join-${comm.id}`} href={`/admin/communities/${comm.id}`}
                                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-400 border border-slate-500/20 hover:border-amber-500/30 hover:text-amber-400 transition-colors truncate max-w-full group"
                                        title={`Member of ${comm.name} · ${comm.member_count || 0} members · Owner: ${comm.owner_name || 'N/A'}`}
                                      >
                                        <svg className="w-3 h-3 flex-shrink-0 opacity-60 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        <span className="truncate">{comm.name}</span>
                                      </Link>
                                    ))}
                                  </div>
                                )}
                                {(!user.owned_communities?.length && !user.joined_communities?.length) && (
                                  <span className="text-xs text-slate-500">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-400">{user.created_at ? formatDate(user.created_at) : '-'}</td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => router.push(`/admin/users/${user.id}`)} className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors">View</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════
               APPLICATIONS TAB
               ═══════════════════════════════════════════════════ */}
            {activeTab === 'applications' && (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                <div className="p-6 border-b border-white/5">
                  <h2 className="text-lg font-semibold text-slate-100">Organizer Applications</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {applications.filter((a) => a.status === 'pending').length} pending · {applications.filter((a) => a.status === 'approved').length} approved · {applications.filter((a) => a.status === 'rejected').length} rejected
                  </p>
                </div>
                <div className="divide-y divide-white/5">
                  {applications.length > 0 ? applications.map((app: any) => (
                    <div key={app.id} className="p-5 hover:bg-white/[0.01] transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-slate-200">{app.user_name || `User #${app.user_id}`}</h4>
                            <span className="text-xs text-slate-500">· {app.user_email}</span>
                          </div>
                          <Link href={`/admin/applications/${app.id}`} className="text-sm text-amber-400 hover:text-amber-300 transition-colors underline underline-offset-2 mt-0.5">
                            {app.community_name || 'N/A'}
                          </Link>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                              app.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : app.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>{app.status}</span>
                            <span className="text-[10px] text-slate-500">{formatDate(app.created_at)}</span>
                            <Link href={`/admin/applications/${app.id}`} className="text-[10px] text-amber-400/70 hover:text-amber-400 transition-colors underline underline-offset-2">View Details</Link>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                          {app.status === 'pending' ? (
                            showNotesInput?.id === app.id ? (
                              <div className="flex items-center gap-2">
                                <input type="text" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Notes..." className="w-32 px-2.5 py-1.5 text-xs rounded-lg border border-white/10 bg-white/[0.03] text-slate-200 placeholder-slate-500 focus:border-amber-500/50 focus:outline-none" autoFocus />
                                <button onClick={() => handleApplication(app.id, showNotesInput!.action, adminNotes)} disabled={processingApp === app.id}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${showNotesInput!.action === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'}`}>
                                  Confirm
                                </button>
                                <button onClick={() => { setShowNotesInput(null); setAdminNotes(''); }} className="text-xs text-slate-500 hover:text-slate-400">Cancel</button>
                              </div>
                            ) : (
                              <>
                                <button onClick={() => setShowNotesInput({ id: app.id, action: 'approved' })} disabled={processingApp === app.id}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50">
                                  Approve
                                </button>
                                <button onClick={() => setShowNotesInput({ id: app.id, action: 'rejected' })} disabled={processingApp === app.id}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50">
                                  Reject
                                </button>
                              </>
                            )
                          ) : app.status === 'approved' ? (
                            <Link href={`/admin/applications/${app.id}`} className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors">View</Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-sm text-slate-500">No applications yet</div>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════
               COMMUNITIES TAB
               ═══════════════════════════════════════════════════ */}
            {activeTab === 'communities' && (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                <div className="p-6 border-b border-white/5">
                  <h2 className="text-lg font-semibold text-slate-100">All Communities</h2>
                  <p className="text-sm text-slate-400 mt-1">{communities.length} total communities</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Category</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Owner</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Members</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Created</th>
                        <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {communities.map((c: any) => (
                        <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-200">{c.name}</span>
                              {c.is_verified && (
                                <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400">{c.category || '-'}</td>
                          <td className="px-6 py-4 text-sm text-slate-400">{c.owner_name || 'None'}</td>
                          <td className="px-6 py-4 text-sm text-slate-400">{c.member_count || 0}</td>
                          <td className="px-6 py-4 text-sm text-slate-400">{c.created_at ? formatDate(c.created_at) : '-'}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => router.push(`/admin/communities/${c.id}`)} className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors">View Details</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════
               ACTIVITY TAB
               ═══════════════════════════════════════════════════ */}
            {activeTab === 'activity' && (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                <div className="p-6 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-100">Activity History</h2>
                      <p className="text-sm text-slate-400 mt-1">Track all admin and user actions</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {[
                      { label: 'All', value: 'all' },
                      { label: 'Deleted', value: 'deleted' },
                      { label: 'Approved', value: 'approved' },
                      { label: 'Created', value: 'created' },
                      { label: 'Join/Leave', value: 'join' },
                    ].map((f) => (
                      <button key={f.value} onClick={() => setActivityFilter(f.value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                          activityFilter === f.value
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-sm'
                            : 'bg-white/5 text-slate-400 border border-white/10 hover:border-amber-500/30 hover:text-amber-400'
                        }`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                {loadingActivity ? (
                  <div className="p-8 text-center">
                    <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-slate-500 mt-3">Loading activity...</p>
                  </div>
                ) : activities.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {activities.map((act: any) => (
                      <div key={act.id} className="p-4 sm:p-5 hover:bg-white/[0.01] transition-colors">
                        <div className="flex items-start gap-4">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            act.action?.includes('deleted') ? 'bg-red-500/10' : act.action?.includes('approved') ? 'bg-emerald-500/10' : act.action?.includes('created') || act.action?.includes('joined') || act.action?.includes('rsvp') ? 'bg-amber-500/10' : act.action?.includes('rejected') ? 'bg-red-500/10' : 'bg-slate-500/10'
                          }`}>
                            {act.action?.includes('deleted') || act.action?.includes('rejected') ? (
                              <svg className="w-4.5 h-4.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            ) : act.action?.includes('approved') ? (
                              <svg className="w-4.5 h-4.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            ) : act.action?.includes('created') || act.action?.includes('joined') || act.action?.includes('rsvp') ? (
                              <svg className="w-4.5 h-4.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            ) : (
                              <svg className="w-4.5 h-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-slate-200">{act.user_name || 'System'}</span>
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                act.action?.includes('deleted') ? 'bg-red-500/10 text-red-400 border-red-500/20' : act.action?.includes('approved') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : act.action?.includes('rejected') ? 'bg-red-500/10 text-red-400 border-red-500/20' : act.action?.includes('created') ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                              }`}>{act.action?.replace(/_/g, ' ')}</span>
                            </div>
                            <p className="text-sm text-slate-400 mt-1">{act.description}</p>
                            <p className="text-xs text-slate-600 mt-1">{formatDateTime(act.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-slate-500">No activity found</div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════
               TRASH / RECYCLE BIN TAB
               ═══════════════════════════════════════════════════ */}
            {activeTab === 'trash' && (
              <div className="rounded-2xl border border-red-500/10 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                <div className="p-6 border-b border-red-500/10">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-100">Recycle Bin</h2>
                        <p className="text-sm text-slate-400 mt-0.5">{trashItems.length} item{trashItems.length !== 1 ? 's' : ''} in trash · Auto-deleted after 30 days</p>
                      </div>
                    </div>
                    {trashItems.length > 0 && (
                      <button onClick={handleCleanup} disabled={processingTrash === 'cleanup'}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50">
                        {processingTrash === 'cleanup' ? 'Purging...' : 'Purge Old Items (>30 days)'}
                      </button>
                    )}
                  </div>
                </div>
                {loadingTrash ? (
                  <div className="p-8 text-center">
                    <div className="w-6 h-6 border-2 border-red-500/30 border-t-red-400 rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-slate-500 mt-3">Loading trash...</p>
                  </div>
                ) : trashItems.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {trashItems.map((item: any) => {
                      const tt = getDeletedAtDisplay(item.deleted_at);
                      const isProcessing = processingTrash === `restore-${item.type}-${item.id}` || processingTrash === `delete-${item.type}-${item.id}`;
                      return (
                        <div key={`${item.type}-${item.id}`} className="p-4 sm:p-5 hover:bg-white/[0.01] transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                item.type === 'user' ? 'bg-violet-500/10' : item.type === 'community' ? 'bg-amber-500/10' : item.type === 'event' ? 'bg-emerald-500/10' : 'bg-purple-500/10'
                              }`}>
                                {item.type === 'user' ? (
                                  <svg className="w-4.5 h-4.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                ) : item.type === 'community' ? (
                                  <svg className="w-4.5 h-4.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                ) : (
                                  <svg className="w-4.5 h-4.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-slate-200 truncate">{item.name}</span>
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${
                                    item.type === 'user' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : item.type === 'community' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : item.type === 'event' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                  }`}>{item.type}</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">{item.subtitle}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-[10px] text-slate-500">Deleted {formatDateTime(item.deleted_at)}</span>
                                  <span className={`text-[10px] font-medium ${tt.remaining > 0 ? 'text-amber-400/70' : 'text-red-400/70'}`}>{tt.auto}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button onClick={() => handleRestore(item.type, item.id)} disabled={isProcessing}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                Restore
                              </button>
                              <button onClick={() => handlePermanentDelete(item.type, item.id, item.name)} disabled={isProcessing}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete Forever
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
                      <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </div>
                    <h3 className="text-base font-medium text-slate-400 mb-1">Trash is empty</h3>
                    <p className="text-sm text-slate-500">Deleted items will appear here. They are auto-deleted after 30 days.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <Chatbot />
    </main>
  );
}
