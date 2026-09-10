'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import Chatbot from '../../../components/Chatbot';
import { apiFetch, BACKEND_URL } from '../../../lib/auth';
import { useAuth } from '../../../lib/AuthContext';
import { useToast } from '../../../components/Toast';

export default function MembershipApplyPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [community, setCommunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingApplication, setExistingApplication] = useState<any>(null);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    organization_name: '',
    position: '',
    reason: '',
    experience: '',
    availability: '',
    additional_info: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    const fetchData = async () => {
      try {
        const [commRes, appRes] = await Promise.all([
          apiFetch(`/api/communities/${id}`),
          apiFetch(`/api/communities/${id}/membership-application`),
        ]);
        if (commRes.ok) {
          const commData = await commRes.json();
          setCommunity(commData);
          // If organizer set a custom membership form URL, redirect there
          if (commData.membership_form_url) {
            window.open(commData.membership_form_url, '_blank', 'noopener,noreferrer');
            return;
          }
        }
        if (appRes.ok) {
          const data = await appRes.json();
          setExistingApplication(data);
          if (data && data.status !== 'rejected') setSubmitted(true);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchData();
  }, [id, isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // ─── 10-digit phone validation ───
    if (form.phone?.trim()) {
      const digits = form.phone.replace(/\D/g, '');
      const local = digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits;
      if (local.length !== 10) {
        addToast('error', 'Phone number must be exactly 10 digits (e.g. 9876543210).');
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/communities/${id}/membership-application`, {
        method: 'POST',
        body: JSON.stringify({
          community_id: parseInt(id),
          ...form,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        addToast('success', 'Your membership application has been submitted!');
      } else {
        const err = await res.json().catch(() => null);
        addToast('error', err?.error || 'Failed to submit application');
      }
    } catch {
      addToast('error', 'Failed to submit application');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-24 pb-16 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="glass rounded-2xl p-10 animate-pulse">
              <div className="h-6 bg-slate-800/50 rounded-lg w-1/3 mb-6" />
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-800/50 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!community) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center">
          <div className="text-center glass rounded-2xl p-10">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Community not found</h2>
            <Link href="/communities" className="btn-primary px-6 py-2.5 rounded-xl text-sm mt-4 inline-block">
              Back to Communities
            </Link>
          </div>
        </main>
      </>
    );
  }

  // Already submitted
  if (submitted && existingApplication) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-24 pb-16 px-4">
          <div className="max-w-2xl mx-auto">
            <Link href={`/communities/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-amber-400 transition-colors mb-6">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to {community.name}
            </Link>

            <div className="glass rounded-2xl p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                {existingApplication.status === 'approved' ? (
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : existingApplication.status === 'rejected' ? (
                  <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-100 mb-2">
                {existingApplication.status === 'approved'
                  ? 'Application Approved! 🎉'
                  : existingApplication.status === 'rejected'
                    ? 'Application Not Approved'
                    : 'Application Under Review ⏳'}
              </h2>
              <p className="text-slate-400 mb-6">
                {existingApplication.status === 'approved'
                  ? 'Congratulations! You are now an official member of this organization.'
                  : existingApplication.status === 'rejected'
                    ? 'Your application was not approved at this time. You can reapply.'
                    : 'Your membership application is being reviewed by the organization admin. You will be notified once a decision is made.'}
              </p>
              {existingApplication.admin_notes && (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 mb-6 text-left">
                  <p className="text-xs text-slate-500 mb-1">Admin Notes:</p>
                  <p className="text-sm text-slate-300">{existingApplication.admin_notes}</p>
                </div>
              )}
              {existingApplication.status === 'rejected' && (
                <button
                  onClick={() => { setSubmitted(false); setExistingApplication(null); }}
                  className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold"
                >
                  Reapply
                </button>
              )}
              <Link href={`/communities/${id}`} className="btn-ghost px-6 py-2.5 rounded-xl text-sm font-semibold ml-3 inline-block">
                Back to Community
              </Link>
            </div>
          </div>
        </main>
        <Chatbot />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Back link */}
          <Link href={`/communities/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-amber-400 transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {community.name}
          </Link>

          {/* Header */}
          <div className="glass rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-4">
              {community.logo && (
                <img src={`${BACKEND_URL}${community.logo}`} alt={community.name} className="w-14 h-14 rounded-xl object-cover border border-white/10" />
              )}
              <div>
                <h1 className="text-xl font-bold text-slate-100">Be a Member</h1>
                <p className="text-sm text-slate-400">Apply to become an official member of {community.name}</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 sm:p-8 space-y-5">
            <h2 className="text-lg font-semibold text-slate-100 mb-2">Personal Information</h2>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name *</label>
              <input
                type="text"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
                className="input-glass w-full rounded-xl"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
                defaultValue={user?.email || ''}
                className="input-glass w-full rounded-xl"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={(e) => {
                  // Allow only digits, spaces, dashes, parentheses (max 14 chars)
                  const v = e.target.value.replace(/[^0-9\s\-()+]/g, '').slice(0, 14);
                  setForm((prev) => ({ ...prev, phone: v }));
                }}
                placeholder="9876543210 (10 digits)"
                maxLength={14}
                className="input-glass w-full rounded-xl"
              />
              {form.phone && (() => {
                const digits = form.phone.replace(/\D/g, '');
                const ok = (digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits).length === 10;
                return (
                  <p className={`text-xs mt-1 ${ok ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {ok ? '✓ Valid phone number' : `${digits.length}/10 digits`}
                  </p>
                );
              })()}
            </div>

            <div className="pt-3 border-t border-white/5">
              <h2 className="text-lg font-semibold text-slate-100 mb-2">Organization Details</h2>
            </div>

            {/* Organization Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Organization / Company Name</label>
              <input
                type="text"
                name="organization_name"
                value={form.organization_name}
                onChange={handleChange}
                placeholder="Your organization or company"
                className="input-glass w-full rounded-xl"
              />
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Position / Role</label>
              <input
                type="text"
                name="position"
                value={form.position}
                onChange={handleChange}
                placeholder="Your role or title"
                className="input-glass w-full rounded-xl"
              />
            </div>

            <div className="pt-3 border-t border-white/5">
              <h2 className="text-lg font-semibold text-slate-100 mb-2">Membership Details</h2>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Why do you want to be a member? *</label>
              <textarea
                name="reason"
                value={form.reason}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Tell us why you want to join this organization..."
                className="input-glass w-full rounded-xl resize-none"
              />
            </div>

            {/* Experience */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Relevant Experience</label>
              <textarea
                name="experience"
                value={form.experience}
                onChange={handleChange}
                rows={3}
                placeholder="Any relevant experience or skills..."
                className="input-glass w-full rounded-xl resize-none"
              />
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Availability</label>
              <select
                name="availability"
                value={form.availability}
                onChange={handleChange}
                className="input-glass w-full rounded-xl"
              >
                <option value="">Select availability</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="weekends">Weekends only</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>

            {/* Additional Info */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Additional Information</label>
              <textarea
                name="additional_info"
                value={form.additional_info}
                onChange={handleChange}
                rows={3}
                placeholder="Any other information you'd like to share..."
                className="input-glass w-full rounded-xl resize-none"
              />
            </div>

            {/* Submit */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary px-8 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex-1"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
              <Link
                href={`/communities/${id}`}
                className="btn-ghost px-8 py-3 rounded-xl text-sm font-semibold text-center flex-1"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
      <Chatbot />
    </>
  );
}
