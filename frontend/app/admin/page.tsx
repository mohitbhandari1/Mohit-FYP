'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import Chatbot from '../components/Chatbot';
import ConfirmModal from '../components/ConfirmModal';
import { SkeletonTable } from '../components/Skeleton';
import { apiFetch } from '../lib/auth';

type Tab = 'overview' | 'users' | 'applications' | 'activity';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [processingApp, setProcessingApp] = useState<number | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [communities, setCommunities] = useState<any[]>([]);
  const [adminEvents, setAdminEvents] = useState<any[]>([]);
  const [deleteCommunityTarget, setDeleteCommunityTarget] = useState<any>(null);
  const [deleteEventTarget, setDeleteEventTarget] = useState<any>(null);
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

  const refreshStats = async () => {
    const res = await apiFetch('/api/admin/stats');
    if (res.ok) setStats(await res.json());
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        // Refresh communities and events too — cascade may have deleted them
        const [commRes, evRes] = await Promise.all([
          apiFetch('/api/admin/communities'),
          apiFetch('/api/admin/events'),
        ]);
        if (commRes.ok) setCommunities(await commRes.json());
        if (evRes.ok) setAdminEvents(await evRes.json());
        await refreshStats();
      }
    } catch (err) { console.error('Failed to delete user'); }
    finally { setDeleteTarget(null); }
  };

  const handleDeleteCommunity = async () => {
    if (!deleteCommunityTarget) return;
    try {
      const res = await apiFetch(`/api/admin/communities/${deleteCommunityTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setCommunities((prev) => prev.filter((c) => c.id !== deleteCommunityTarget.id));
        setAdminEvents((prev) => prev.filter((e) => e.community_id !== deleteCommunityTarget.id));
        await refreshStats();
      }
    } catch (err) { console.error('Failed to delete community'); }
    finally { setDeleteCommunityTarget(null); }
  };

  const handleDeleteEvent = async () => {
    if (!deleteEventTarget) return;
    try {
      const res = await apiFetch(`/api/admin/events/${deleteEventTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setAdminEvents((prev) => prev.filter((e) => e.id !== deleteEventTarget.id));
        await refreshStats();
      }
    } catch (err) { console.error('Failed to delete event'); }
    finally { setDeleteEventTarget(null); }
  };

  const handleApplication = async (appId: number, status: 'approved' | 'rejected') => {
    setProcessingApp(appId);
    try {
      const res = await apiFetch(`/api/admin/applications/${appId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status } : a));
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
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-fade-in-up">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
          </div>

          {/* Tab Bar */}
          <div className="flex gap-1 mb-6 bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/10 p-1 w-fit">
            {(['overview', 'users', 'applications', 'activity'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
                  activeTab === tab ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}>
                {tab}
              </button>
            ))}
          </div>

          {/* Communities Table */}
          {(activeTab === 'overview') && communities.length > 0 && (
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
                    {communities.map((c: any) => (
                      <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-200">{c.name}</span>
                            {c.is_verified && (
                              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{c.category || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">{c.owner_name || 'None'}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">{c.member_count || 0}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => setDeleteCommunityTarget(c)}
                            className="text-xs text-red-400/70 hover:text-red-400 transition-colors">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Events Table */}
          {(activeTab === 'overview') && adminEvents.length > 0 && (
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
                    {adminEvents.map((ev: any) => (
                      <tr key={ev.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-200">{ev.title}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{ev.community_name || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {ev.event_date ? new Date(ev.event_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{ev.attendee_count || 0}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => setDeleteEventTarget(ev)}
                            className="text-xs text-red-400/70 hover:text-red-400 transition-colors">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Users Table */}
          {(activeTab === 'overview' || activeTab === 'users') && (
            <div className="mb-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <h2 className="text-lg font-semibold text-slate-100">Users</h2>
                <p className="text-sm text-slate-400 mt-1">{users.length} registered users</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Joined</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.slice(0, activeTab === 'users' ? undefined : 10).map((user: any) => (
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
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadge(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {user.role !== 'admin' && (
                            <button onClick={() => setDeleteTarget(user)}
                              className="text-xs text-red-400/70 hover:text-red-400 transition-colors">
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Applications */}
          {(activeTab === 'overview' || activeTab === 'applications') && (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <h2 className="text-lg font-semibold text-slate-100">Organizer Applications</h2>
                <p className="text-sm text-slate-400 mt-1">{applications.filter((a) => a.status === 'pending').length} pending</p>
              </div>
              <div className="divide-y divide-white/5">
                {applications.length > 0 ? applications.map((app: any) => (
                  <div key={app.id} className="p-6 hover:bg-white/[0.01] transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-slate-200">{app.user_name || app.name || `User #${app.user_id}`}</h4>
                        <p className="text-sm text-slate-400 mt-0.5">{app.organization_name || app.community_name || 'N/A'}</p>
                        {app.reason && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{app.reason}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        {app.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApplication(app.id, 'approved')}
                              disabled={processingApp === app.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50">
                              Approve
                            </button>
                            <button
                              onClick={() => handleApplication(app.id, 'rejected')}
                              disabled={processingApp === app.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50">
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            app.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {app.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center text-sm text-slate-500">No applications yet</div>
                )}
              </div>
            </div>
          )}

          {/* Activity Log */}
          {activeTab === 'activity' && (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">Activity History</h2>
                    <p className="text-sm text-slate-400 mt-1">Track all admin and user actions</p>
                  </div>
                </div>
                {/* Action type filter */}
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
                        {/* Action icon */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          act.action?.includes('deleted') ? 'bg-red-500/10' :
                          act.action?.includes('approved') ? 'bg-emerald-500/10' :
                          act.action?.includes('created') || act.action?.includes('joined') || act.action?.includes('rsvp') ? 'bg-amber-500/10' :
                          act.action?.includes('rejected') ? 'bg-red-500/10' :
                          'bg-slate-500/10'
                        }`}>
                          {act.action?.includes('deleted') || act.action?.includes('rejected') ? (
                            <svg className="w-4.5 h-4.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          ) : act.action?.includes('approved') ? (
                            <svg className="w-4.5 h-4.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : act.action?.includes('created') || act.action?.includes('joined') || act.action?.includes('rsvp') ? (
                            <svg className="w-4.5 h-4.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          ) : (
                            <svg className="w-4.5 h-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        {/* Activity details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-200">
                              {act.user_name || 'System'}
                            </span>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                              act.action?.includes('deleted') ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              act.action?.includes('approved') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              act.action?.includes('rejected') ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              act.action?.includes('created') ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              'bg-slate-500/10 text-slate-400 border-slate-500/20'
                            }`}>
                              {act.action?.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400 mt-1">{act.description}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            {new Date(act.created_at).toLocaleString()}
                          </p>
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
        </div>
      </section>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteUser}
        onClose={() => setDeleteTarget(null)}
      />
      <ConfirmModal
        isOpen={!!deleteCommunityTarget}
        title="Delete Community"
        message={`Are you sure you want to delete "${deleteCommunityTarget?.name}"? All events under this community will also be deleted. This action cannot be undone.`}
        confirmLabel="Delete Community"
        variant="danger"
        onConfirm={handleDeleteCommunity}
        onClose={() => setDeleteCommunityTarget(null)}
      />
      <ConfirmModal
        isOpen={!!deleteEventTarget}
        title="Delete Event"
        message={`Are you sure you want to delete "${deleteEventTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Event"
        variant="danger"
        onConfirm={handleDeleteEvent}
        onClose={() => setDeleteEventTarget(null)}
      />
      <Chatbot />
    </main>
  );
}
