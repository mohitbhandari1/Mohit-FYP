'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Chatbot from '../components/Chatbot';
import { apiFetch } from '../lib/auth';
import {
  organizerApplicationSchema,
  zodToFieldErrors,
  zodToFirstError,
  validateApplicationFile,
  CERTIFICATE_FILE_EXTENSIONS,
  LOGO_FILE_EXTENSIONS,
  type FieldErrors,
} from '../lib/validation';

export default function ApplyPage() {
  const [formData, setFormData] = useState({
    organization_name: '',
    organization_type: '',
    description: '',
    reason: '',
    website: '',
    social_media: '',
    experience: '',
    goals: '',
    target_audience: '',
    planned_activities: '',
    location: '',
    contact_phone: '',
    contact_email: '',
  });
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);
  const [existingApp, setExistingApp] = useState<any>(null);
  const [ownedCommunities, setOwnedCommunities] = useState<any[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkExisting = async () => {
      try {
        const meRes = await apiFetch('/api/auth/me');
        if (!meRes.ok) { router.push('/login'); return; }
        const appRes = await apiFetch('/api/applications/my');
        if (appRes.ok) {
          const data = await appRes.json();
          if (data.application) setExistingApp(data.application);
        }
        // Communities the user already owns (for approved organizers)
        const ownedRes = await apiFetch('/api/communities/my-owned');
        if (ownedRes.ok) {
          const data = await ownedRes.json();
          setOwnedCommunities(Array.isArray(data) ? data : data.communities || []);
        }
      } catch (err) { console.error('Error checking application'); }
      finally { setLoading(false); }
    };
    checkExisting();
  }, [router]);

  const clearFieldError = (field: string) =>
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    clearFieldError(e.target.name);
  };

  const handleCertificateChange = (file: File | null) => {
    setError('');
    setCertificateFile(file);
    if (!file) return;
    const fileError = validateApplicationFile(file, CERTIFICATE_FILE_EXTENSIONS);
    if (fileError) {
      setFieldErrors((prev) => ({ ...prev, certificate_file: fileError }));
      setCertificateFile(null);
    } else {
      clearFieldError('certificate_file');
    }
  };

  const handleLogoChange = (file: File | null) => {
    setError('');
    setLogoFile(file);
    if (!file) return;
    const fileError = validateApplicationFile(file, LOGO_FILE_EXTENSIONS);
    if (fileError) {
      setFieldErrors((prev) => ({ ...prev, logo_file: fileError }));
      setLogoFile(null);
    } else {
      clearFieldError('logo_file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // ─── Zod validation ───
    const parsed = organizerApplicationSchema.safeParse(formData);
    if (!parsed.success) {
      const errs = zodToFieldErrors(parsed.error);
      setFieldErrors(errs);
      setError(zodToFirstError(parsed.error));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!certificateFile) {
      setFieldErrors((prev) => ({
        ...prev,
        certificate_file: 'Please upload a certificate or proof document.',
      }));
      setError('Please upload a certificate or proof document.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = new FormData();
      // Map frontend field names to backend field names
      const fieldMappings: Record<string, string> = {
        organization_name: 'community_name',
        organization_type: 'org_type',
        reason: 'motivation',
        planned_activities: 'activities',
        location: 'address',
        contact_phone: 'phone',
        contact_email: 'contact_info',
      };
      Object.entries(formData).forEach(([key, value]) => {
        const backendKey = fieldMappings[key] || key;
        if (value) payload.append(backendKey, value);
      });
      if (certificateFile) payload.append('certificate_file', certificateFile);
      if (logoFile) payload.append('logo_file', logoFile);

      const res = await apiFetch('/api/applications', {
        method: 'POST',
        body: payload,
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const errData = await res.json().catch(() => null);
        setError(errData?.error || errData?.message || 'Failed to submit application');
      }
    } catch (err) { setError('Something went wrong. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const inputClass = "w-full rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all";
  const labelClass = "block text-sm font-medium text-slate-300 mb-1.5";

  const errBorder = (field: string) => (fieldErrors[field] ? ' border-red-500/60' : '');
  const FieldError = ({ field }: { field: string }) =>
    fieldErrors[field] ? (
      <p className="mt-1 text-xs text-red-400">{fieldErrors[field]}</p>
    ) : null;

  // Reusable application form — shown to new applicants, and to organizers
  // applying for an additional community
  const renderForm = (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6 sm:p-8 animate-fade-in-up">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent mb-2">
        Become an Organizer
      </h1>
      <p className="text-slate-400 mb-8">Apply to create and manage communities on Smart Connects</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Info */}
        <div className="pb-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Organization Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Organization Name <span className="text-red-400">*</span></label>
                <input type="text" name="organization_name" value={formData.organization_name} onChange={handleChange} required
                  placeholder="Your organization" className={`${inputClass}${errBorder('organization_name')}`} />
                <FieldError field="organization_name" />
              </div>
              <div>
                <label className={labelClass}>Organization Type <span className="text-red-400">*</span></label>
                <select name="organization_type" value={formData.organization_type} onChange={handleChange} required className={`${inputClass}${errBorder('organization_type')}`}>
                  <option value="" className="bg-slate-900">Select type</option>
                  <option value="student_club" className="bg-slate-900">Student Club</option>
                  <option value="ngo" className="bg-slate-900">NGO</option>
                  <option value="company" className="bg-slate-900">Company</option>
                  <option value="individual" className="bg-slate-900">Individual</option>
                  <option value="other" className="bg-slate-900">Other</option>
                </select>
                <FieldError field="organization_type" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Description <span className="text-red-400">*</span></label>                <textarea name="description" value={formData.description} onChange={handleChange} required
                  placeholder="Tell us about your organization..." rows={3} className={`${inputClass} resize-none${errBorder('description')}`} />
                <FieldError field="description" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Website</label>
                <input type="url" name="website" value={formData.website} onChange={handleChange}
                  placeholder="https://..." className={`${inputClass}${errBorder('website')}`} />
                <FieldError field="website" />
              </div>
              <div>
                <label className={labelClass}>Social Media</label>
                <input type="text" name="social_media" value={formData.social_media} onChange={handleChange}
                  placeholder="Instagram, Facebook, etc." className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Location</label>
                <input type="text" name="location" value={formData.location} onChange={handleChange}
                  placeholder="City, Country" className={`${inputClass}${errBorder('location')}`} />
                <FieldError field="location" />
            </div>
          </div>
        </div>

        {/* About You */}
        <div className="pb-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">About Your Plans</h3>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Why do you want to be an organizer? <span className="text-red-400">*</span></label>
                <textarea name="reason" value={formData.reason} onChange={handleChange} required
                  placeholder="Explain your motivation..." rows={3} className={`${inputClass} resize-none${errBorder('reason')}`} />
                <FieldError field="reason" />
            </div>
            <div>
              <label className={labelClass}>Past Experience</label>
                <textarea name="experience" value={formData.experience} onChange={handleChange}
                  placeholder="Share any relevant experience in organizing events or communities..." rows={3} className={`${inputClass} resize-none${errBorder('experience')}`} />
                <FieldError field="experience" />
            </div>
            <div>
              <label className={labelClass}>Goals</label>                <textarea name="goals" value={formData.goals} onChange={handleChange}
                  placeholder="What do you hope to achieve?" rows={2} className={`${inputClass} resize-none${errBorder('goals')}`} />
                <FieldError field="goals" />
            </div>
            <div>
              <label className={labelClass}>Target Audience</label>                <input type="text" name="target_audience" value={formData.target_audience} onChange={handleChange}
                  placeholder="Who will your community serve?" className={`${inputClass}${errBorder('target_audience')}`} />
                <FieldError field="target_audience" />
            </div>
            <div>
              <label className={labelClass}>Planned Activities</label>                <textarea name="planned_activities" value={formData.planned_activities} onChange={handleChange}
                  placeholder="What kind of events/activities will you organize?" rows={2} className={`${inputClass} resize-none${errBorder('planned_activities')}`} />
                <FieldError field="planned_activities" />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="pb-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Contact Email <span className="text-red-400">*</span></label>                <input type="email" name="contact_email" value={formData.contact_email} onChange={handleChange} required
                  placeholder="contact@org.com" className={`${inputClass}${errBorder('contact_email')}`} />
                <FieldError field="contact_email" />
            </div>
            <div>
              <label className={labelClass}>Contact Phone <span className="text-red-400">*</span></label>                <input type="tel" name="contact_phone" value={formData.contact_phone}
                  onChange={(e) => {
                    // Allow only digits, spaces, dashes, parentheses (max 14 chars)
                    const v = e.target.value.replace(/[^0-9\s\-()+]/g, '').slice(0, 14);
                    setFormData((prev: any) => ({ ...prev, contact_phone: v }));
                    clearFieldError('contact_phone');
                  }}
                  required
                  placeholder="9876543210 (10 digits)" className={`${inputClass}${errBorder('contact_phone')}`} />
                <FieldError field="contact_phone" />
              {formData.contact_phone && (() => {
                const digits = formData.contact_phone.replace(/\D/g, '');
                const ok = (digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits).length === 10;
                return (
                  <p className={`text-xs mt-1 ${ok ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {ok ? '✓ Valid phone number' : `${digits.length}/10 digits`}
                  </p>
                );
              })()}
            </div>
          </div>
        </div>

        {/* File Uploads */}
        <div>
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Supporting Documents</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Certificate / Proof <span className="text-red-400">*</span></label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" required
                onChange={(e) => handleCertificateChange(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 file:cursor-pointer" />
              <p className="mt-1 text-xs text-slate-500">PDF, JPG, PNG (max 3 MB)</p>
              <FieldError field="certificate_file" />
            </div>
            <div>
              <label className={labelClass}>Organization Logo</label>
              <input type="file" accept=".jpg,.jpeg,.png,.svg"
                onChange={(e) => handleLogoChange(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 file:cursor-pointer" />
              <p className="mt-1 text-xs text-slate-500">JPG, PNG, SVG (max 3 MB)</p>
              <FieldError field="logo_file" />
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm">{error}</div>
        )}

        {/* Submit */}
        <div className="pt-2">
          <button type="submit" disabled={submitting}
            className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100">
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );

  // Application form wrapped with a cancel action (used when a user already has
  // a community and is applying for an additional one)
  const renderNewForm = (
    <>
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={() => setShowNewForm(false)}
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Cancel
        </button>
      </div>
      {renderForm}
    </>
  );

  if (loading) return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-8 animate-pulse">
          <div className="h-8 w-56 bg-white/5 rounded mb-6" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-white/5 rounded-xl" />)}
          </div>
        </div>
      </section>
      <Chatbot />
    </main>
  );

  // Success screen — shown right after a new application is submitted
  if (success) {
    return (
      <main className="min-h-screen bg-slate-950">
        <Navbar />
        <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-fade-in-up rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-8 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Application Submitted!</h2>
            <p className="text-slate-400 mb-6">We&apos;ll review your application and get back to you soon.</p>
            <Link href="/"
              className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all">
              Return Home
            </Link>
          </div>
        </section>
        <Chatbot />
      </main>
    );
  }

  // Existing application — status screen with a path to apply for more communities
  if (existingApp) {
    const status = existingApp.status;
    const ownedNames = ownedCommunities.map((c: any) => c.name).filter(Boolean);

    return (
      <main className="min-h-screen bg-slate-950">
        <Navbar />
        <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-fade-in-up">
            <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-400 transition-colors mb-6">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>

            {status === 'approved' ? (
              <>
                {/* Congratulations — you already have a community */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-8 text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100 mb-2">Congratulations! 🎉</h2>
                  <p className="text-slate-400 max-w-md mx-auto mb-6">
                    {ownedNames.length > 0 ? (
                      <>
                        You have <span className="text-slate-200 font-semibold">
                          {ownedNames.length} community{ownedNames.length > 1 ? 'ies' : 'y'}
                        </span>{' '}
                        on Smart Connects: <span className="text-emerald-400 font-medium">{ownedNames.join(', ')}</span>
                      </>
                    ) : (
                      <>
                        Your community <span className="text-slate-200 font-semibold">{existingApp.community_name}</span>{' '}
                        is live on Smart Connects.
                      </>
                    )}
                  </p>
                  <Link href="/organizer"
                    className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all">
                    Go to Dashboard
                  </Link>
                </div>

                {/* Open another community? */}
                {!showNewForm ? (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 text-center">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
                      <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-100 mb-2">Do you want to open another new community?</h3>
                    <p className="text-slate-400 max-w-md mx-auto mb-6">
                      You can apply to create and manage additional communities. Every application is reviewed before it goes live.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowNewForm(true)}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all hover:scale-[1.02]"
                      >
                        Apply for a New Community
                      </button>
                      <Link href="/" className="w-full sm:w-auto px-6 py-3 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all text-center">
                        Back to Home
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6">{renderNewForm}</div>
                )}
              </>
            ) : status === 'rejected' ? (
              <>
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-8 text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100 mb-2">Application Not Approved</h2>
                  <p className="text-slate-400 mb-4">Your application was not approved at this time.</p>
                  {existingApp.admin_notes && (
                    <p className="text-sm text-slate-400 bg-white/[0.02] border border-white/5 rounded-xl p-3 mb-6 max-w-md mx-auto text-left">
                      <span className="text-slate-300 font-medium">Admin note:</span> {existingApp.admin_notes}
                    </p>
                  )}
                  {!showNewForm && (
                    <button
                      type="button"
                      onClick={() => setShowNewForm(true)}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all hover:scale-[1.02]"
                    >
                      Apply Again
                    </button>
                  )}
                </div>
                {showNewForm && (
                  <div className="mt-6">
                    <p className="text-center text-sm text-slate-400 mb-4">You can submit a new application below.</p>
                    {renderNewForm}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-8 text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-100 mb-2">Application Under Review</h2>
                <p className="text-slate-400 mb-6">Your application is being reviewed by our team.</p>
              </div>
            )}
          </div>
        </section>
        <Chatbot />
      </main>
    );
  }

  // No existing application — show the application form directly
  return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-fade-in-up">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-400 transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          {renderForm}
        </div>
      </section>
      <Chatbot />
    </main>
  );
}
