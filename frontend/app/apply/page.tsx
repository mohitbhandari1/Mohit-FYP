'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Chatbot from '../components/Chatbot';
import { apiFetch } from '../lib/auth';
import { useAuth } from '../lib/AuthContext';

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
  const [success, setSuccess] = useState(false);
  const [existingApp, setExistingApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

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
      } catch (err) { console.error('Error checking application'); }
      finally { setLoading(false); }
    };
    checkExisting();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value) payload.append(key, value);
      });
      if (certificateFile) payload.append('certificate', certificateFile);
      if (logoFile) payload.append('logo', logoFile);

      const res = await apiFetch('/api/applications', {
        method: 'POST',
        body: payload,
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const errData = await res.json().catch(() => null);
        setError(errData?.message || 'Failed to submit application');
      }
    } catch (err) { setError('Something went wrong. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const inputClass = "w-full rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all";
  const labelClass = "block text-sm font-medium text-slate-300 mb-1.5";

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

  // Show existing application status
  if (existingApp) {
    return (
      <main className="min-h-screen bg-slate-950">
        <Navbar />
        <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-fade-in-up rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-8 text-center">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${
              existingApp.status === 'approved' ? 'bg-emerald-500/10' : existingApp.status === 'pending' ? 'bg-amber-500/10' : 'bg-red-500/10'
            }`}>
              {existingApp.status === 'approved' && (
                <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {existingApp.status === 'pending' && (
                <svg className="w-10 h-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {existingApp.status === 'rejected' && (
                <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Application {existingApp.status === 'approved' ? 'Approved!' : existingApp.status === 'pending' ? 'Under Review' : 'Not Approved'}</h2>
            <p className="text-slate-400 mb-6">
              {existingApp.status === 'approved' && 'Congratulations! You can now manage communities.'}
              {existingApp.status === 'pending' && 'Your application is being reviewed by our team.'}
              {existingApp.status === 'rejected' && 'Your application was not approved at this time.'}
            </p>
            {existingApp.status === 'approved' && (
              <Link href="/organizer"
                className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all">
                Go to Dashboard
              </Link>
            )}
          </div>
        </section>
        <Chatbot />
      </main>
    );
  }

  // Show success state
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

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6 sm:p-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent mb-2">
              Become an Organizer
            </h1>
            <p className="text-slate-400 mb-8">Apply to create and manage communities on Smart Connects</p>

            {error && (
              <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Organization Info */}
              <div className="pb-4 border-b border-white/5">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Organization Information</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Organization Name *</label>
                      <input type="text" name="organization_name" value={formData.organization_name} onChange={handleChange} required
                        placeholder="Your organization" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Organization Type *</label>
                      <select name="organization_type" value={formData.organization_type} onChange={handleChange} required className={inputClass}>
                        <option value="" className="bg-slate-900">Select type</option>
                        <option value="student_club" className="bg-slate-900">Student Club</option>
                        <option value="ngo" className="bg-slate-900">NGO</option>
                        <option value="company" className="bg-slate-900">Company</option>
                        <option value="individual" className="bg-slate-900">Individual</option>
                        <option value="other" className="bg-slate-900">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Description *</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} required
                      placeholder="Tell us about your organization..." rows={3} className={`${inputClass} resize-none`} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Website</label>
                      <input type="url" name="website" value={formData.website} onChange={handleChange}
                        placeholder="https://..." className={inputClass} />
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
                      placeholder="City, Country" className={inputClass} />
                  </div>
                </div>
              </div>

              {/* About You */}
              <div className="pb-4 border-b border-white/5">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">About Your Plans</h3>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Why do you want to be an organizer? *</label>
                    <textarea name="reason" value={formData.reason} onChange={handleChange} required
                      placeholder="Explain your motivation..." rows={3} className={`${inputClass} resize-none`} />
                  </div>
                  <div>
                    <label className={labelClass}>Past Experience</label>
                    <textarea name="experience" value={formData.experience} onChange={handleChange}
                      placeholder="Share any relevant experience in organizing events or communities..." rows={3} className={`${inputClass} resize-none`} />
                  </div>
                  <div>
                    <label className={labelClass}>Goals</label>
                    <textarea name="goals" value={formData.goals} onChange={handleChange}
                      placeholder="What do you hope to achieve?" rows={2} className={`${inputClass} resize-none`} />
                  </div>
                  <div>
                    <label className={labelClass}>Target Audience</label>
                    <input type="text" name="target_audience" value={formData.target_audience} onChange={handleChange}
                      placeholder="Who will your community serve?" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Planned Activities</label>
                    <textarea name="planned_activities" value={formData.planned_activities} onChange={handleChange}
                      placeholder="What kind of events/activities will you organize?" rows={2} className={`${inputClass} resize-none`} />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="pb-4 border-b border-white/5">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Contact Email</label>
                    <input type="email" name="contact_email" value={formData.contact_email} onChange={handleChange}
                      placeholder="contact@org.com" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Contact Phone</label>
                    <input type="tel" name="contact_phone" value={formData.contact_phone} onChange={handleChange}
                      placeholder="+1 234 567 8900" className={inputClass} />
                  </div>
                </div>
              </div>

              {/* File Uploads */}
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Supporting Documents</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Certificate / Proof</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 file:cursor-pointer" />
                    <p className="mt-1 text-xs text-slate-500">PDF, JPG, PNG</p>
                  </div>
                  <div>
                    <label className={labelClass}>Organization Logo</label>
                    <input type="file" accept=".jpg,.jpeg,.png,.svg"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 file:cursor-pointer" />
                    <p className="mt-1 text-xs text-slate-500">JPG, PNG, SVG</p>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4">
                <button type="submit" disabled={submitting}
                  className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100">
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
      <Chatbot />
    </main>
  );
}
