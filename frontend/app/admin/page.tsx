'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { apiFetch } from '../lib/auth';

type Tab = 'overview' | 'applications' | 'communities' | 'events' | 'users' | 'activity';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [appDetail, setAppDetail] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approving, setApproving] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  // Communities management
  const [allCommunities, setAllCommunities] = useState<any[]>([]);
  const [editingCommunity, setEditingCommunity] = useState<any>(null);
  const [communityEditForm, setCommunityEditForm] = useState({ name: '', description: '', category: '', website: '' });

  // Events management
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [eventEditForm, setEventEditForm] = useState({ title: '', description: '', location: '', event_date: '' });

  // Activity log
  const [activities, setActivities] = useState<any[]>([]);
  const [activityStats, setActivityStats] = useState<any[]>([]);

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const adminHeaders = { 'x-admin': 'true' };

        const [usersRes, statsRes, appsRes, communitiesRes, eventsRes, activityRes, activityStatsRes] = await Promise.all([
          apiFetch('/api/admin/users', { headers: adminHeaders }),
          apiFetch('/api/admin/stats', { headers: adminHeaders }),
          apiFetch('/api/admin/applications', { headers: adminHeaders }),
          apiFetch('/api/admin/communities', { headers: adminHeaders }),
          apiFetch('/api/admin/events', { headers: adminHeaders }),
          apiFetch('/api/admin/activity', { headers: adminHeaders }),
          apiFetch('/api/admin/activity/stats', { headers: adminHeaders }),
        ]);

        if (!usersRes.ok || !statsRes.ok) {
          router.push('/');
          return;
        }

        setUsers(await usersRes.json());
        setStats(await statsRes.json());
        setApplications(await appsRes.json());
        setAllCommunities(await communitiesRes.json());
        setAllEvents(await eventsRes.json());
        setActivities(await activityRes.json());
        setActivityStats(await activityStatsRes.json());
      } catch (err) {
        setError('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // ===== User Management =====
  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await apiFetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'x-admin': 'true' },
      });
      if (!res.ok) { setError('Failed to delete user'); return; }
      setUsers(users.filter((u) => u.id !== userId));
    } catch (err) { setError('An error occurred'); }
  };

  // ===== Application Review =====
  const handleViewApplication = async (appId: number) => {
    try {
      const res = await apiFetch(`/api/admin/applications/${appId}`, {
        headers: { 'x-admin': 'true' },
      });
      const data = await res.json();
      setAppDetail(data);
      setSelectedApp(data);
      setAdminNotes('');
    } catch (err) { setError('Failed to load application details'); }
  };

  const handleReview = async (appId: number, status: 'approved' | 'rejected') => {
    setApproving(true);
    try {
      const res = await apiFetch(`/api/admin/applications/${appId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin': 'true' },
        body: JSON.stringify({ status, admin_notes: adminNotes }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to review'); return; }
      setApplications(applications.map((a) => a.id === appId ? { ...a, status } : a));
      setSelectedApp(null);
      setAppDetail(null);
      if (status === 'approved') {
        alert(`Application approved!\n\nTemporary password: ${data.temp_password}\n\nShare this with the applicant.`);
      }
    } catch (err) { setError('An error occurred'); }
    finally { setApproving(false); }
  };

  // ===== Community Management =====
  const handleEditCommunity = async (communityId: number) => {
    try {
      const res = await apiFetch(`/api/admin/communities/${communityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin': 'true' },
        body: JSON.stringify(communityEditForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to update'); return; }
      setAllCommunities(allCommunities.map((c) => c.id === communityId ? { ...c, ...data } : c));
      setEditingCommunity(null);
    } catch (err) { setError('An error occurred'); }
  };

  const handleDeleteCommunity = async (communityId: number) => {
    if (!confirm('Delete this community permanently?')) return;
    try {
      const res = await apiFetch(`/api/admin/communities/${communityId}`, {
        method: 'DELETE',
        headers: { 'x-admin': 'true' },
      });
      if (!res.ok) { setError('Failed to delete'); return; }
      setAllCommunities(allCommunities.filter((c) => c.id !== communityId));
    } catch (err) { setError('An error occurred'); }
  };

  // ===== Event Management =====
  const handleEditEvent = async (eventId: number) => {
    try {
      const res = await apiFetch(`/api/admin/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin': 'true' },
        body: JSON.stringify(eventEditForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to update'); return; }
      setAllEvents(allEvents.map((e) => e.id === eventId ? { ...e, ...data } : e));
      setEditingEvent(null);
    } catch (err) { setError('An error occurred'); }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm('Delete this event permanently?')) return;
    try {
      const res = await apiFetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'x-admin': 'true' },
      });
      if (!res.ok) { setError('Failed to delete'); return; }
      setAllEvents(allEvents.filter((e) => e.id !== eventId));
    } catch (err) { setError('An error occurred'); }
  };

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'applications', label: 'Applications', badge: applications.filter((a) => a.status === 'pending').length },
    { id: 'communities', label: 'Communities' },
    { id: 'events', label: 'Events' },
    { id: 'users', label: 'Users' },
    { id: 'activity', label: 'Activity' },
  ];

  if (loading) return <div className="min-h-screen" />;

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8">
        <div className="animate-fade-in-up">
        <h1 className="text-4xl font-bold text-slate-800 dark:text-white">Admin Dashboard</h1>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>}

        {/* Tabs */}          <div className="mt-8 flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700 pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-t-lg px-4 py-3 text-sm font-medium capitalize transition ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-800 text-orange-600 border border-b-0 border-slate-200 dark:border-slate-700 shadow-sm'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {tab.label}
              {tab.badge && tab.badge > 0 ? (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-xs font-bold text-slate-950">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === 'overview' && stats && (
          <div className="mt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="card-hover rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-400">Total Users</p>
                <p className="mt-2 text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">{stats.totalUsers}</p>
              </div>
              <div className="card-hover rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-400">Total Communities</p>
                <p className="mt-2 text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">{stats.totalCommunities}</p>
              </div>
              <div className="card-hover rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-400">Total Events</p>
                <p className="mt-2 text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">{stats.totalEvents}</p>
              </div>
              <div className="card-hover rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-400">Pending Applications</p>
                <p className="mt-2 text-3xl font-bold text-yellow-500">
                  {applications.filter((a) => a.status === 'pending').length}
                </p>
              </div>
              <div className="card-hover rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-400">Approved Organizers</p>
                <p className="mt-2 text-3xl font-bold text-green-500">
                  {applications.filter((a) => a.status === 'approved').length}
                </p>
              </div>
              <div className="card-hover rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-400">Rejected</p>
                <p className="mt-2 text-3xl font-bold text-red-500">
                  {applications.filter((a) => a.status === 'rejected').length}
                </p>
              </div>
            </div>

            {/* Activity Stats Chart */}
            {activityStats.length > 0 && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-700 mb-4">Platform Activity (30 days)</h2>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {activityStats.map((stat: any) => (
                    <div key={stat.action} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                      <p className="text-xs font-medium text-slate-400 capitalize">{stat.action.replace(/_/g, ' ')}</p>
                      <p className="mt-1 text-2xl font-bold text-orange-600">{stat.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== APPLICATIONS TAB ===== */}
        {activeTab === 'applications' && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-700">Applications</h2>
              {applications.length === 0 ? (
                <p className="mt-4 text-slate-400">No applications yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {applications.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => handleViewApplication(app.id)}
                      className={`w-full rounded-xl border p-4 text-left transition-all ${
                        selectedApp?.id === app.id
                          ? 'border-orange-500 bg-orange-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-700">{app.community_name}</span>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          app.status === 'pending' ? 'bg-yellow-50 text-yellow-600'
                          : app.status === 'approved' ? 'bg-green-50 text-green-600'
                          : 'bg-red-50 text-red-500'
                        }`}>{app.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">by {app.user_name} • {new Date(app.created_at).toLocaleDateString()}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {app.category && <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{app.category}</span>}
                        {app.org_type && <span className="inline-block rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-600">{app.org_type}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              {!appDetail ? (
                <div className="flex h-full items-center justify-center"><p className="text-slate-400">Select an application to review</p></div>
              ) : (
                <div>
                  <h2 className="text-xl font-bold text-slate-700">{appDetail.community_name}</h2>
                  <p className="mt-1 text-sm text-slate-500">Applicant: {appDetail.user_name} ({appDetail.user_email})</p>
                  
                  {/* Section 1: Organization Info */}
                  <div className="mt-6 border-b border-slate-100 pb-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Organization / Community Information</p>
                  </div>
                  <div className="mt-3 space-y-3">
                    <div><label className="text-xs font-medium text-slate-400">Description</label><p className="mt-1 text-sm text-slate-600">{appDetail.description}</p></div>
                    <div className="grid grid-cols-2 gap-4">
                      {appDetail.org_type && <div><label className="text-xs font-medium text-slate-400">Type</label><p className="mt-1 text-sm text-slate-600">{appDetail.org_type}</p></div>}
                      {appDetail.year_established && <div><label className="text-xs font-medium text-slate-400">Year Established</label><p className="mt-1 text-sm text-slate-600">{new Date(appDetail.year_established).toLocaleDateString()}</p></div>}
                      {appDetail.category && <div><label className="text-xs font-medium text-slate-400">Category</label><p className="mt-1 text-sm text-slate-600">{appDetail.category}</p></div>}
                      {appDetail.preferred_username && <div><label className="text-xs font-medium text-slate-400">Preferred Username</label><p className="mt-1 text-sm text-slate-600">{appDetail.preferred_username}</p></div>}
                    </div>
                  </div>

                  {/* Section 2: Social Media */}
                  {(appDetail.facebook || appDetail.instagram || appDetail.website || appDetail.linkedin || appDetail.tiktok) && (
                    <>
                      <div className="mt-5 border-b border-slate-100 pb-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Social Media &amp; Website</p>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-4">
                        {appDetail.facebook && <div><label className="text-xs font-medium text-slate-400">Facebook</label><p className="mt-1"><a href={appDetail.facebook} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline">{appDetail.facebook}</a></p></div>}
                        {appDetail.instagram && <div><label className="text-xs font-medium text-slate-400">Instagram</label><p className="mt-1"><a href={appDetail.instagram} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline">{appDetail.instagram}</a></p></div>}
                        {appDetail.website && <div><label className="text-xs font-medium text-slate-400">Website</label><p className="mt-1"><a href={appDetail.website} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline">{appDetail.website}</a></p></div>}
                        {appDetail.linkedin && <div><label className="text-xs font-medium text-slate-400">LinkedIn</label><p className="mt-1"><a href={appDetail.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline">{appDetail.linkedin}</a></p></div>}
                        {appDetail.tiktok && <div><label className="text-xs font-medium text-slate-400">TikTok</label><p className="mt-1"><a href={appDetail.tiktok} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline">{appDetail.tiktok}</a></p></div>}
                      </div>
                    </>
                  )}

                  {/* Section 3: Contact Information */}
                  <div className="mt-5 border-b border-slate-100 pb-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Information</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    {appDetail.contact_person_name && <div><label className="text-xs font-medium text-slate-400">Contact Person</label><p className="mt-1 text-sm text-slate-600">{appDetail.contact_person_name}</p></div>}
                    {appDetail.position_role && <div><label className="text-xs font-medium text-slate-400">Position / Role</label><p className="mt-1 text-sm text-slate-600">{appDetail.position_role}</p></div>}
                    {appDetail.contact_info && <div><label className="text-xs font-medium text-slate-400">Email</label><p className="mt-1 text-sm text-slate-600">{appDetail.contact_info}</p></div>}
                    {appDetail.phone && <div><label className="text-xs font-medium text-slate-400">Phone</label><p className="mt-1 text-sm text-slate-600">{appDetail.phone}</p></div>}
                    {appDetail.address && <div className="col-span-2"><label className="text-xs font-medium text-slate-400">Address</label><p className="mt-1 text-sm text-slate-600">{appDetail.address}</p></div>}
                  </div>

                  {/* Section 4: Community Details */}
                  <div className="mt-5 border-b border-slate-100 pb-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Community Details</p>
                  </div>
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      {appDetail.target_audience && <div><label className="text-xs font-medium text-slate-400">Target Audience</label><p className="mt-1 text-sm text-slate-600">{appDetail.target_audience}</p></div>}
                      {appDetail.age_group && <div><label className="text-xs font-medium text-slate-400">Age Group</label><p className="mt-1 text-sm text-slate-600">{appDetail.age_group}</p></div>}
                    </div>
                    {appDetail.activities && <div><label className="text-xs font-medium text-slate-400">Activities</label><p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{appDetail.activities}</p></div>}
                    {appDetail.benefits && <div><label className="text-xs font-medium text-slate-400">Benefits</label><p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{appDetail.benefits}</p></div>}
                    <div className="grid grid-cols-2 gap-4">
                      {appDetail.expected_members && <div><label className="text-xs font-medium text-slate-400">Expected Members</label><p className="mt-1 text-sm text-slate-600">{appDetail.expected_members}</p></div>}
                      {appDetail.meeting_frequency && <div><label className="text-xs font-medium text-slate-400">Meeting Frequency</label><p className="mt-1 text-sm text-slate-600">{appDetail.meeting_frequency}</p></div>}
                    </div>
                    {appDetail.experience && <div><label className="text-xs font-medium text-slate-400">Previous Experience</label><p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{appDetail.experience}</p></div>}
                    {appDetail.venue_details && <div><label className="text-xs font-medium text-slate-400">Venue Details</label><p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{appDetail.venue_details}</p></div>}
                    {appDetail.motivation && <div><label className="text-xs font-medium text-slate-400">Why join Smart Connects?</label><p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{appDetail.motivation}</p></div>}
                  </div>

                  {/* Section 5: Verification */}
                  {(appDetail.certificate_file || appDetail.logo_file || appDetail.additional_doc_file || appDetail.info_accurate !== null) && (
                    <>
                      <div className="mt-5 border-b border-slate-100 pb-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verification Information</p>
                      </div>
                      <div className="mt-3 space-y-2">
                        {appDetail.certificate_file && <div><label className="text-xs font-medium text-slate-400">Registration Certificate</label><p className="mt-1"><a href={appDetail.certificate_file} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline">📄 View Document</a></p></div>}
                        {appDetail.logo_file && <div><label className="text-xs font-medium text-slate-400">Organization Logo</label><p className="mt-1"><a href={appDetail.logo_file} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline">🖼 View Logo</a></p></div>}
                        {appDetail.additional_doc_file && <div><label className="text-xs font-medium text-slate-400">Additional Documents</label><p className="mt-1"><a href={appDetail.additional_doc_file} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline">📄 View Documents</a></p></div>}
                        {appDetail.info_accurate !== null && <div><label className="text-xs font-medium text-slate-400">Info Verified?</label><p className="mt-1 text-sm"><span className={`inline-flex items-center gap-1 ${appDetail.info_accurate ? 'text-green-600' : 'text-red-500'}`}>{appDetail.info_accurate ? '✅ Yes' : '❌ No'}</span></p></div>}
                      </div>
                    </>
                  )}

                  {/* Section 7: Declaration */}
                  {appDetail.authorized_representative !== null && (
                    <>
                      <div className="mt-5 border-b border-slate-100 pb-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Declaration</p>
                      </div>
                      <div className="mt-3">
                        <div><label className="text-xs font-medium text-slate-400">Authorized Representative?</label>
                          <p className="mt-1 text-sm"><span className={`inline-flex items-center gap-1 ${appDetail.authorized_representative ? 'text-green-600' : 'text-red-500'}`}>{appDetail.authorized_representative ? '✅ Yes' : '❌ No'}</span></p>
                        </div>
                      </div>
                    </>
                  )}
                  {appDetail.status === 'pending' ? (
                    <div className="mt-8 space-y-4">
                      <div><label className="block text-sm font-medium text-slate-600">Admin Notes</label>
                        <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3}
                          placeholder="Optional notes about the decision..."
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => handleReview(appDetail.id, 'approved')} disabled={approving}
                          className="flex-1 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02] disabled:opacity-50">
                          {approving ? 'Processing...' : '✓ Approve'}
                        </button>
                        <button onClick={() => handleReview(appDetail.id, 'rejected')} disabled={approving}
                          className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 px-4 py-2 font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02] disabled:opacity-50">
                          {approving ? 'Processing...' : '✕ Reject'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm">Status: <span className={`font-medium ${appDetail.status === 'approved' ? 'text-green-600' : 'text-red-500'}`}>{appDetail.status}</span></p>
                      {appDetail.admin_notes && <p className="mt-2 text-sm text-slate-500">Notes: {appDetail.admin_notes}</p>}
                      {appDetail.reviewed_at && <p className="mt-1 text-xs text-slate-400">Reviewed: {new Date(appDetail.reviewed_at).toLocaleDateString()}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== COMMUNITIES TAB ===== */}
        {activeTab === 'communities' && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-700">All Communities ({allCommunities.length})</h2>
            <div className="mt-6 space-y-4">
              {allCommunities.map((community) => (
                <div key={community.id} className="card-hover rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  {editingCommunity === community.id ? (
                    <div className="space-y-3">
                      <input type="text" value={communityEditForm.name} onChange={(e) => setCommunityEditForm({...communityEditForm, name: e.target.value})}                          className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-slate-800 dark:text-slate-200" placeholder="Name" />
                      <textarea value={communityEditForm.description} onChange={(e) => setCommunityEditForm({...communityEditForm, description: e.target.value})} rows={2}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-slate-800 dark:text-slate-200" placeholder="Description" />
                      <div className="flex gap-2">
                        <input type="text" value={communityEditForm.category} onChange={(e) => setCommunityEditForm({...communityEditForm, category: e.target.value})}
                          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-slate-800 dark:text-slate-200" placeholder="Category" />
                        <input type="url" value={communityEditForm.website} onChange={(e) => setCommunityEditForm({...communityEditForm, website: e.target.value})}
                          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-slate-800 dark:text-slate-200" placeholder="Website" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditCommunity(community.id)} className="rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white hover:shadow-md">Save</button>
                        <button onClick={() => setEditingCommunity(null)} className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:border-slate-300">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{community.name}</h3>
                          <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400">{community.category || 'General'}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{community.description}</p>
                        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                          Owner: {community.owner_name || 'None'} • {community.member_count || 0} members • Created: {new Date(community.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4 shrink-0">
                        <button onClick={() => { setEditingCommunity(community.id); setCommunityEditForm({ name: community.name, description: community.description, category: community.category || '', website: community.website || '' }); }}
                          className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:border-orange-500 hover:text-orange-600 dark:hover:border-orange-400 dark:hover:text-orange-400">Edit</button>
                        <button onClick={() => handleDeleteCommunity(community.id)}
                          className="rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {allCommunities.length === 0 && <p className="text-slate-400">No communities yet.</p>}
            </div>
          </div>
        )}

        {/* ===== EVENTS TAB ===== */}
        {activeTab === 'events' && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-700">All Events ({allEvents.length})</h2>
            <div className="mt-6 space-y-4">
              {allEvents.map((event) => (
                <div key={event.id} className="card-hover rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  {editingEvent === event.id ? (
                    <div className="space-y-3">
                      <input type="text" value={eventEditForm.title} onChange={(e) => setEventEditForm({...eventEditForm, title: e.target.value})}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-slate-800 dark:text-slate-200" placeholder="Title" />
                      <textarea value={eventEditForm.description} onChange={(e) => setEventEditForm({...eventEditForm, description: e.target.value})} rows={2}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-slate-800 dark:text-slate-200" placeholder="Description" />
                      <div className="flex gap-2">
                        <input type="text" value={eventEditForm.location} onChange={(e) => setEventEditForm({...eventEditForm, location: e.target.value})}
                          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-slate-800 dark:text-slate-200" placeholder="Location" />
                        <input type="datetime-local" value={eventEditForm.event_date} onChange={(e) => setEventEditForm({...eventEditForm, event_date: e.target.value})}
                          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-slate-800 dark:text-slate-200" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditEvent(event.id)} className="rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white hover:shadow-md">Save</button>
                        <button onClick={() => setEditingEvent(null)} className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:border-slate-300">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{event.title}</h3>
                          <span className="rounded-full bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 text-xs text-orange-600 dark:text-orange-300">{event.community_name}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{event.description}</p>
                        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                          {event.location || 'Online'} • {new Date(event.event_date).toLocaleDateString()} • {event.attendee_count || 0} attending
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4 shrink-0">
                        <button onClick={() => { setEditingEvent(event.id); setEventEditForm({ title: event.title, description: event.description, location: event.location || '', event_date: event.event_date ? event.event_date.slice(0, 16) : '' }); }}
                          className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:border-orange-500 hover:text-orange-600 dark:hover:border-orange-400 dark:hover:text-orange-400">Edit</button>
                        <button onClick={() => handleDeleteEvent(event.id)}
                          className="rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {allEvents.length === 0 && <p className="text-slate-400">No events yet.</p>}
            </div>
          </div>
        )}

        {/* ===== USERS TAB ===== */}
        {activeTab === 'users' && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-700">Users ({users.length})</h2>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-medium text-slate-400">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-400">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-400">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-400">Created</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">{user.name}</td>
                      <td className="px-4 py-3 text-slate-500">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-1 text-xs font-medium text-orange-600">{user.role}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-400 hover:text-red-500 text-xs font-medium">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== ACTIVITY TAB ===== */}
        {activeTab === 'activity' && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-700">Platform Activity Log</h2>
            <div className="mt-6 space-y-2">
              {activities.length === 0 ? (
                <p className="text-slate-400">No activity recorded yet.</p>
              ) : (
                activities.map((activity: any) => (
                  <div key={activity.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold text-slate-700">{activity.user_name || 'System'}</span>
                        {' '}
                        <span className="text-slate-400 capitalize">{activity.action.replace(/_/g, ' ')}</span>
                        {activity.description && <span className="text-slate-400"> — {activity.description}</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">{new Date(activity.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        </div>
      </section>
    </main>
  );
}
