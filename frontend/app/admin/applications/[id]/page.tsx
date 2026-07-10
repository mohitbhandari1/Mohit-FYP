'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import Chatbot from '../../../components/Chatbot';
import { apiFetch, BACKEND_URL } from '../../../lib/auth';
import { SkeletonDetailPage } from '../../../components/Skeleton';

interface ApplicationDetail {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  community_name: string;
  description: string;
  org_type: string;
  year_established: string;
  facebook: string;
  instagram: string;
  website: string;
  linkedin: string;
  tiktok: string;
  contact_person_name: string;
  position_role: string;
  contact_info: string;
  phone: string;
  address: string;
  target_audience: string;
  age_group: string;
  category: string;
  activities: string;
  benefits: string;
  info_accurate: boolean;
  preferred_username: string;
  motivation: string;
  expected_members: string;
  meeting_frequency: string;
  experience: string;
  venue_details: string;
  authorized_representative: boolean;
  certificate_file: string;
  logo_file: string;
  additional_doc_file: string;
  status: string;
  admin_notes: string;
  created_at: string;
  reviewed_at: string;
}

function Field({ label, value, isLong }: { label: string; value?: string | null; isLong?: boolean }) {
  if (!value) return null;
  if (isLong) {
    return (
      <div>
        <span className="text-xs text-slate-500 block mb-1">{label}</span>
        <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{value}</p>
      </div>
    );
  }
  return (
    <div>
      <span className="text-xs text-slate-500 block mb-0.5">{label}</span>
      <p className="text-sm text-slate-200">{value}</p>
    </div>
  );
}

export default function AdminApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const meRes = await apiFetch('/api/auth/me');
        if (!meRes.ok) { router.push('/login'); return; }
        const currentUser = await meRes.json();
        if (!currentUser.is_admin && currentUser.role !== 'admin') { router.push('/'); return; }

        const res = await apiFetch(`/api/admin/applications/${id}`);
        if (res.ok) {
          setApp(await res.json());
        } else {
          router.push('/admin');
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchData();
  }, [id, router]);

  const handleReview = async (status: 'approved' | 'rejected') => {
    setProcessing(true);
    try {
      const res = await apiFetch(`/api/admin/applications/${id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: adminNotes }),
      });
      if (res.ok) {
        const data = await res.json();
        if (status === 'approved' && data.temp_password) {
          alert(`Application approved!\n\nTemporary password for the organizer: ${data.temp_password}\n\nPlease share this securely with the applicant.`);
        }
        // Refresh to show updated status
        const refreshed = await apiFetch(`/api/admin/applications/${id}`);
        if (refreshed.ok) setApp(await refreshed.json());
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed: ${errData.error || res.statusText}`);
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
    setProcessing(false);
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

  if (!app) {
    return (
      <main className="min-h-screen bg-slate-950">
        <Navbar />
        <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 pt-24">
          <div className="text-center glass rounded-2xl p-10">
            <div className="text-5xl mb-4">📄</div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Application not found</h2>
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

          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Application Details
              </h1>
              <p className="text-slate-400 mt-1">Review full organizer application form</p>
            </div>
            <Link href="/admin" className="text-sm text-amber-400 hover:text-amber-300 transition-colors">
              Back to list
            </Link>
          </div>

          {/* Status banner */}
          <div className={`p-5 rounded-2xl border mb-8 ${
            app.status === 'approved' ? 'border-emerald-500/20 bg-emerald-500/5' :
            app.status === 'rejected' ? 'border-red-500/20 bg-red-500/5' :
            'border-amber-500/20 bg-amber-500/5'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className={`w-3.5 h-3.5 rounded-full ${
                  app.status === 'approved' ? 'bg-emerald-400' :
                  app.status === 'rejected' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'
                }`} />
                <div>
                  <span className="text-base font-semibold text-slate-200 capitalize">{app.status}</span>
                  <span className="text-sm text-slate-500 ml-3">· {app.community_name}</span>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Submitted: {formatDateTime(app.created_at)}
                {app.reviewed_at && ` · Reviewed: ${formatDateTime(app.reviewed_at)}`}
              </div>
            </div>
            {app.admin_notes && (
              <p className="mt-3 text-sm text-slate-400 border-t border-white/5 pt-3">
                <span className="text-slate-500 font-medium">Admin notes: </span>{app.admin_notes}
              </p>
            )}
          </div>

          <div className="space-y-6">
            {/* Applicant info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider">Applicant</span>
                <p className="text-base font-medium text-slate-200 mt-1">{app.user_name}</p>
                <p className="text-sm text-slate-400">{app.user_email}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider">Community Name</span>
                <p className="text-base font-medium text-slate-200 mt-1">{app.community_name}</p>
              </div>
            </div>

            {/* Section: Organization Info */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4">Organization Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Organization Type" value={app.org_type} />
                <Field label="Year Established" value={app.year_established ? formatDate(app.year_established) : '-'} />
              </div>
              <div className="mt-4">
                <Field label="Description" value={app.description} isLong />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <Field label="Category" value={app.category} />
                <Field label="Target Audience" value={app.target_audience} />
                <Field label="Age Group" value={app.age_group} />
                <Field label="Expected Members" value={app.expected_members} />
              </div>
            </div>

            {/* Section: Social Media */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4">Social Media & Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Website" value={app.website} />
                <Field label="Facebook" value={app.facebook} />
                <Field label="Instagram" value={app.instagram} />
                <Field label="LinkedIn" value={app.linkedin} />
                <Field label="TikTok" value={app.tiktok} />
              </div>
            </div>

            {/* Section: Contact Person */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4">Contact Person</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Contact Person" value={app.contact_person_name} />
                <Field label="Position/Role" value={app.position_role} />
                <Field label="Contact Info" value={app.contact_info} />
                <Field label="Phone" value={app.phone} />
                <Field label="Address" value={app.address} />
              </div>
            </div>

            {/* Section: Plans */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4">Plans & Motivation</h3>
              <div className="space-y-4">
                <Field label="Motivation" value={app.motivation} isLong />
                <Field label="Activities" value={app.activities} isLong />
                <Field label="Benefits" value={app.benefits} isLong />
                <Field label="Experience" value={app.experience} isLong />
                <Field label="Meeting Frequency" value={app.meeting_frequency} />
                <Field label="Venue Details" value={app.venue_details} />
              </div>
            </div>

            {/* Section: Verification */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4">Verification</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${app.info_accurate ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                  <span className="text-sm text-slate-300">Info Accurate: {app.info_accurate ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${app.authorized_representative ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                  <span className="text-sm text-slate-300">Authorized Representative: {app.authorized_representative ? 'Yes' : 'No'}</span>
                </div>
                <Field label="Preferred Username" value={app.preferred_username} />
              </div>
              {/* File attachments */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {app.certificate_file && (
                  <a href={`${BACKEND_URL}${app.certificate_file}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-amber-500/30 transition-colors text-sm text-slate-300 hover:text-amber-400 hover:bg-white/[0.04]">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View Certificate
                  </a>
                )}
                {app.logo_file && (
                  <a href={`${BACKEND_URL}${app.logo_file}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-amber-500/30 transition-colors text-sm text-slate-300 hover:text-amber-400 hover:bg-white/[0.04]">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    View Logo
                  </a>
                )}
                {app.additional_doc_file && (
                  <a href={`${BACKEND_URL}${app.additional_doc_file}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-amber-500/30 transition-colors text-sm text-slate-300 hover:text-amber-400 hover:bg-white/[0.04]">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Additional Doc
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Admin Actions for pending */}
          {app.status === 'pending' && (
            <div className="sticky bottom-4 mt-8 p-5 rounded-2xl border border-amber-500/20 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/40">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Review Application</h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Optional admin notes..."
                  className="flex-1 w-full px-4 py-2.5 text-sm rounded-xl border border-white/10 bg-white/[0.03] text-slate-200 placeholder-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleReview('rejected')}
                    disabled={processing}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50"
                  >
                    {processing ? 'Processing...' : 'Reject'}
                  </button>
                  <button
                    onClick={() => handleReview('approved')}
                    disabled={processing}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    {processing ? 'Processing...' : 'Approve'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      <Chatbot />
    </main>
  );
}
