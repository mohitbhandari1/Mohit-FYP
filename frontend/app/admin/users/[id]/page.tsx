'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import Chatbot from '../../../components/Chatbot';
import { apiFetch, BACKEND_URL } from '../../../lib/auth';
import { SkeletonDetailPage } from '../../../components/Skeleton';

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const meRes = await apiFetch('/api/auth/me');
        if (!meRes.ok) { router.push('/login'); return; }
        const currentUser = await meRes.json();
        if (!currentUser.is_admin && currentUser.role !== 'admin') { router.push('/'); return; }

        const res = await apiFetch(`/api/admin/users/${id}`);
        if (res.ok) setUser(await res.json());
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchData();
  }, [id, router]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/admin');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Failed to move to trash: ${data.error || res.statusText}`);
        setDeleting(false);
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      alert('Network error. Please try again.');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
  const formatDateTime = (d: string) => d ? new Date(d).toLocaleString() : '-';

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950">
        <Navbar />
        <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 pt-24">
          <SkeletonDetailPage />
        </section>
        <Chatbot />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950">
        <Navbar />
        <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 pt-24">
          <div className="text-center glass rounded-2xl p-10">
            <div className="text-5xl mb-4">👤</div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">User not found</h2>
            <Link href="/admin" className="btn-primary px-6 py-2.5 rounded-xl text-sm inline-block mt-4">
              Back to Admin
            </Link>
          </div>
        </section>
        <Chatbot />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 pt-24">
        <div className="animate-fade-in-up">
          {/* Back button */}
          <Link href="/admin" className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-400 transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Admin Dashboard
          </Link>

          {/* User header */}
          <div className="flex items-start gap-5 mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0 border border-white/10">
              {user.avatar_url ? (
                <img src={`${BACKEND_URL}${user.avatar_url}`} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-amber-400">{user.name?.charAt(0)?.toUpperCase() || '?'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">{user.name}</h1>
                <span className={`inline-flex px-3 py-0.5 rounded-full text-xs font-medium border ${
                  user.role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  user.role === 'organizer' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-slate-500/10 text-slate-400 border-slate-500/20'
                }`}>
                  {user.role}
                </span>
                {user.is_admin && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-medium">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-1">{user.email}</p>
              <p className="text-xs text-slate-500 mt-1">Joined {formatDate(user.created_at)}</p>
            </div>
          </div>

          {/* Profile Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {user.bio && (
              <div className="sm:col-span-2 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Bio</span>
                <p className="text-sm text-slate-200 mt-1.5">{user.bio}</p>
              </div>
            )}
            {user.interests && (
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Interests</span>
                <p className="text-sm text-slate-200 mt-1.5">{user.interests}</p>
              </div>
            )}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-xs text-slate-500 uppercase tracking-wider">User ID</span>
              <p className="text-sm text-slate-200 mt-1.5">#{user.id}</p>
            </div>
          </div>

          {/* Banner Image */}
          {user.banner_image && (
            <div className="rounded-2xl overflow-hidden aspect-video bg-gradient-to-br from-amber-900/20 to-orange-900/20 mb-8">
              <img src={`${BACKEND_URL}${user.banner_image}`} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Danger Zone */}
          <div className="mt-10 p-5 rounded-2xl border border-red-500/20 bg-red-500/5">
            <h3 className="text-base font-semibold text-red-400 mb-2">Danger Zone</h3>
            <p className="text-sm text-slate-400 mb-4">
              Moving this user to trash will deactivate their account immediately. It will be auto-deleted after 30 days. You can restore it from the Trash tab.
              {user.is_admin && <span className="block mt-1 text-red-400 font-medium">This is an admin user — proceed with caution.</span>}
            </p>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm text-slate-300">Are you sure you want to move this to trash?</p>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-500 text-black hover:bg-amber-600 transition-all disabled:opacity-50"
                >
                  {deleting ? 'Moving...' : 'Yes, Move to Trash'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
              >
                Move to Trash
              </button>
            )}
          </div>
        </div>
      </section>
      <Chatbot />
    </main>
  );
}
