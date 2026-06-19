'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { apiFetch } from '../lib/auth';

export default function ApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [existingApp, setExistingApp] = useState<any>(null);
  const [formData, setFormData] = useState({
    // Section 1: Organization/Community Information
    community_name: '',
    org_type: '',
    description: '',
    year_established: '',
    // Section 2: Social Media & Website
    facebook: '',
    instagram: '',
    website: '',
    linkedin: '',
    tiktok: '',
    // Section 3: Contact Information
    contact_person_name: '',
    position_role: '',
    contact_info: '',
    phone: '',
    address: '',
    // Section 4: Community Details
    target_audience: '',
    age_group: [] as string[],
    category: '',
    activities: '',
    benefits: '',
    expected_members: '',
    meeting_frequency: '',
    experience: '',
    venue_details: '',
    // Section 5: Verification Information
    info_accurate: '',
    // Section 6: Account Setup
    preferred_username: '',
    motivation: '',
    // Section 7: Declaration
    authorized_representative: '',
  });

  const [files, setFiles] = useState<{
    certificate_file: File | null;
    logo_file: File | null;
    additional_doc_file: File | null;
  }>({
    certificate_file: null,
    logo_file: null,
    additional_doc_file: null,
  });

  const AGE_GROUPS = ['Children', 'Teenagers', 'Young Adults', 'Adults', 'Senior Citizens', 'All Ages'];

  useEffect(() => {
    apiFetch('/api/applications/my')
      .then((res) => { if (res.status === 401) { router.push('/login?redirect=/apply'); return null; } return res.json(); })
      .then((data) => { if (data && data.application) setExistingApp(data.application); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (field: 'certificate_file' | 'logo_file' | 'additional_doc_file') => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles({ ...files, [field]: e.target.files[0] });
    }
  };

  const handleAgeGroupToggle = (group: string) => {
    const current = formData.age_group;
    if (current.includes(group)) {
      setFormData({ ...formData, age_group: current.filter((g) => g !== group) });
    } else {
      setFormData({ ...formData, age_group: [...current, group] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const requiredFields = [
      'community_name', 'org_type', 'description',
      'contact_person_name', 'position_role', 'contact_info', 'phone', 'address',
      'target_audience', 'category', 'activities',
      'info_accurate', 'preferred_username', 'motivation',
      'authorized_representative',
    ];

    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        setError(`Please fill in all required fields. Missing: ${field.replace(/_/g, ' ')}`);
        return;
      }
    }

    if (formData.age_group.length === 0) {
      setError('Please select at least one age group');
      return;
    }

    if (formData.info_accurate !== 'yes') {
      setError('You must agree that all information provided is accurate');
      return;
    }

    if (formData.authorized_representative !== 'yes') {
      setError('You must confirm you are authorized to represent this organization');
      return;
    }

    if (!files.certificate_file) {
      setError('Please upload a registration certificate or official document');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const formPayload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'age_group') {
          formPayload.append(key, (value as string[]).join(', '));
        } else {
          formPayload.append(key, value as string);
        }
      });

      if (files.certificate_file) formPayload.append('certificate_file', files.certificate_file);
      if (files.logo_file) formPayload.append('logo_file', files.logo_file);
      if (files.additional_doc_file) formPayload.append('additional_doc_file', files.additional_doc_file);

      const res = await apiFetch('/api/applications', { method: 'POST', body: formPayload });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to submit'); return; }
      setSuccess(true);
      setExistingApp(data);
    } catch (err) { setError('An error occurred'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen" />;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50">
      <Navbar />
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="animate-fade-in-up">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-slate-800">Community Creation Application</h1>
            <p className="mt-2 text-slate-500 max-w-2xl mx-auto">
              Use this form to apply for opening and managing an organization/community page on Smart Connects.
              Applications will be reviewed by the platform administrator before approval.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
          )}

          {success && (
            <div className="mb-8 rounded-xl border border-green-200 bg-green-50 p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-green-700">Application Submitted!</h2>
              <p className="mt-2 text-green-600">
                Your application to start <strong>{formData.community_name}</strong> has been submitted for review.
                You will be notified once a decision is made.
                <br />
                <span className="text-sm text-green-500">Application Reference: #{existingApp?.id}</span>
              </p>
            </div>
          )}

          {existingApp && !success && (
            <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-700">Your Application Status</h2>
              <div className="mt-4 flex items-center gap-3">
                {existingApp.status === 'pending' && (
                  <><span className="inline-flex h-3 w-3 rounded-full bg-yellow-400 animate-pulse" /><span className="font-medium text-yellow-600">Pending Review</span></>
                )}
                {existingApp.status === 'approved' && (
                  <><span className="inline-flex h-3 w-3 rounded-full bg-green-400" /><span className="font-medium text-green-600">Approved</span></>
                )}
                {existingApp.status === 'rejected' && (
                  <><span className="inline-flex h-3 w-3 rounded-full bg-red-400" /><span className="font-medium text-red-600">Rejected</span></>
                )}
              </div>
              <p className="mt-3 text-sm text-slate-500">Community: <span className="font-medium text-slate-700">{existingApp.community_name}</span></p>
              {existingApp.admin_notes && <p className="mt-2 text-sm text-slate-500">Admin notes: <span className="text-slate-600">{existingApp.admin_notes}</span></p>}
              <p className="mt-2 text-xs text-slate-400">Submitted: {new Date(existingApp.created_at).toLocaleDateString()}</p>
              {existingApp.status === 'approved' && (
                <Link href="/organizer" className="mt-4 inline-block rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
                  Go to Organizer Dashboard
                </Link>
              )}
              {existingApp.status === 'rejected' && (
                <p className="mt-4 text-sm text-slate-400">You can submit a new application below.</p>
              )}
            </div>
          )}

          {(!existingApp || existingApp.status === 'rejected') && !success && (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* ===== SECTION 1: Organization / Community Information ===== */}
              <div id="section-info" className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-sm font-bold text-white">1</span>
                  <h2 className="text-xl font-bold text-slate-800">Organization / Community Information</h2>
                </div>
                <div className="space-y-5">
                  <FormField label="Organization / Community Name" required>
                    <input type="text" name="community_name" value={formData.community_name} onChange={handleChange} required
                      placeholder="Enter the name of your organization or community"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </FormField>

                  <FormField label="Type of Organization / Community" required>
                    <select name="org_type" value={formData.org_type} onChange={handleChange} required
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20">
                      <option value="">Select organization type...</option>
                      <option value="NGO">NGO</option>
                      <option value="INGO">INGO</option>
                      <option value="Club">Club</option>
                      <option value="Local Community">Local Community</option>
                      <option value="Other">Other</option>
                    </select>
                  </FormField>

                  <FormField label="Brief Description of Your Organization / Community" required>
                    <textarea name="description" value={formData.description} onChange={handleChange} required rows={4}
                      placeholder="Tell us about your organization/community — its mission, goals, and what it does"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </FormField>

                  <FormField label="Year Established">
                    <input type="date" name="year_established" value={formData.year_established} onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </FormField>
                </div>
              </div>

              {/* ===== SECTION 2: Social Media & Website ===== */}
              <div id="section-social" className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-sm font-bold text-white">2</span>
                  <h2 className="text-xl font-bold text-slate-800">Social Media &amp; Website</h2>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <FormField label="Facebook">
                    <input type="url" name="facebook" value={formData.facebook} onChange={handleChange}
                      placeholder="https://facebook.com/yourpage"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </FormField>
                  <FormField label="Instagram">
                    <input type="url" name="instagram" value={formData.instagram} onChange={handleChange}
                      placeholder="https://instagram.com/yourhandle"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </FormField>
                  <FormField label="Official Website">
                    <input type="url" name="website" value={formData.website} onChange={handleChange}
                      placeholder="https://yourwebsite.com"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </FormField>
                  <FormField label="LinkedIn">
                    <input type="url" name="linkedin" value={formData.linkedin} onChange={handleChange}
                      placeholder="https://linkedin.com/company/yourpage"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </FormField>
                  <FormField label="TikTok">
                    <input type="url" name="tiktok" value={formData.tiktok} onChange={handleChange}
                      placeholder="https://tiktok.com/@yourhandle"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </FormField>
                </div>
              </div>

              {/* ===== SECTION 3: Contact Information ===== */}
              <div id="section-contact" className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-sm font-bold text-white">3</span>
                  <h2 className="text-xl font-bold text-slate-800">Contact Information</h2>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <FormField label="Contact Person Full Name" required>
                    <input type="text" name="contact_person_name" value={formData.contact_person_name} onChange={handleChange} required
                      placeholder="Full name of the contact person"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </FormField>
                  <FormField label="Position / Role in the Organization" required>
                    <input type="text" name="position_role" value={formData.position_role} onChange={handleChange} required
                      placeholder="e.g. President, Coordinator, Founder"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </FormField>
                  <FormField label="Email Address" required>
                    <input type="email" name="contact_info" value={formData.contact_info} onChange={handleChange} required
                      placeholder="organizer@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </FormField>
                  <FormField label="Phone Number" required>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required
                      placeholder="+1 (555) 123-4567"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </FormField>
                  <FormField label="Office / Organization Address" required className="md:col-span-2">
                    <textarea name="address" value={formData.address} onChange={handleChange} required rows={2}
                      placeholder="Full address of your organization"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </FormField>
                </div>
              </div>

              {/* ===== SECTION 4: Community Details ===== */}
              <div id="section-details" className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-sm font-bold text-white">4</span>
                  <h2 className="text-xl font-bold text-slate-800">Community Details</h2>
                </div>
                <div className="space-y-5">
                  <FormField label="Who is your target audience?" required>
                    <textarea name="target_audience" value={formData.target_audience} onChange={handleChange} required rows={3}
                      placeholder="Describe who your community serves (e.g., college students, working professionals, local residents)"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </FormField>

                  <FormField label="Age Group" required>
                    <div className="flex flex-wrap gap-2">
                      {AGE_GROUPS.map((group) => (
                        <button
                          key={group}
                          type="button"
                          onClick={() => handleAgeGroupToggle(group)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                            formData.age_group.includes(group)
                              ? 'bg-orange-500 text-white shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600'
                          }`}
                        >
                          {group}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Select all that apply</p>
                  </FormField>

                  <FormField label="Community Category" required>
                    <select name="category" value={formData.category} onChange={handleChange} required
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20">
                      <option value="">Select a category...</option>
                      <option value="Education">Education</option>
                      <option value="Technology">Technology</option>
                      <option value="Social Service">Social Service</option>
                      <option value="Business & Entrepreneurship">Business &amp; Entrepreneurship</option>
                      <option value="Sports & Fitness">Sports &amp; Fitness</option>
                      <option value="Arts & Culture">Arts &amp; Culture</option>
                      <option value="Environment">Environment</option>
                      <option value="Other">Other</option>
                    </select>
                  </FormField>

                  <FormField label="What activities does your community organize?" required>
                    <textarea name="activities" value={formData.activities} onChange={handleChange} required rows={3}
                      placeholder="Describe the types of events, meetups, workshops, or activities you plan to organize"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </FormField>

                  <FormField label="How will people benefit from your organization/community?">
                    <textarea name="benefits" value={formData.benefits} onChange={handleChange} rows={3}
                      placeholder="What value will members get? (e.g., networking, learning, community service)"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </FormField>

                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField label="Expected Number of Members">
                      <input type="text" name="expected_members" value={formData.expected_members} onChange={handleChange}
                        placeholder="e.g. 50-100 members"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                    </FormField>
                    <FormField label="Meeting Frequency">
                      <select name="meeting_frequency" value={formData.meeting_frequency} onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20">
                        <option value="">Select frequency...</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Bi-weekly">Bi-weekly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Per-event">Per-event</option>
                        <option value="Other">Other</option>
                      </select>
                    </FormField>
                  </div>

                  <FormField label="Previous Organizing Experience">
                    <textarea name="experience" value={formData.experience} onChange={handleChange} rows={3}
                      placeholder="Tell us about any previous experience organizing events or communities"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </FormField>

                  <FormField label="Venue Details">
                    <textarea name="venue_details" value={formData.venue_details} onChange={handleChange} rows={2}
                      placeholder="Do you have a venue or meeting space?"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </FormField>
                </div>
              </div>

              {/* ===== SECTION 5: Verification Information ===== */}
              <div id="section-verification" className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-sm font-bold text-white">5</span>
                  <h2 className="text-xl font-bold text-slate-800">Verification Information</h2>
                </div>
                <div className="space-y-5">
                  <FormField label="Upload Registration Certificate or Official Document" required>
                    <div className="mt-1 flex items-center gap-4">
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 transition-all hover:border-orange-400 hover:bg-orange-50">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Choose File (max 3 MB)
                        <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif" onChange={handleFileChange('certificate_file')} className="hidden" />
                      </label>
                      {files.certificate_file && <span className="text-sm text-green-600">{files.certificate_file.name}</span>}
                    </div>
                  </FormField>

                  <FormField label="Upload Organization Logo (Optional)">
                    <div className="mt-1 flex items-center gap-4">
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 transition-all hover:border-orange-400 hover:bg-orange-50">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Choose File (max 3 MB)
                        <input type="file" accept=".jpg,.jpeg,.png,.gif,.svg" onChange={handleFileChange('logo_file')} className="hidden" />
                      </label>
                      {files.logo_file && <span className="text-sm text-green-600">{files.logo_file.name}</span>}
                    </div>
                  </FormField>

                  <FormField label="Provide Any Additional Verification Documents">
                    <div className="mt-1 flex items-center gap-4">
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 transition-all hover:border-orange-400 hover:bg-orange-50">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Choose File (max 3 MB)
                        <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif" onChange={handleFileChange('additional_doc_file')} className="hidden" />
                      </label>
                      {files.additional_doc_file && <span className="text-sm text-green-600">{files.additional_doc_file.name}</span>}
                    </div>
                  </FormField>

                  <FormField label="Do you agree that all information provided is accurate and may be verified by the Smart Connects administration?" required>
                    <div className="mt-2 flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="info_accurate" value="yes" checked={formData.info_accurate === 'yes'} onChange={handleChange}
                          className="h-4 w-4 text-orange-500 focus:ring-orange-500" />
                        <span className="text-sm text-slate-700">Yes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="info_accurate" value="no" checked={formData.info_accurate === 'no'} onChange={handleChange}
                          className="h-4 w-4 text-orange-500 focus:ring-orange-500" />
                        <span className="text-sm text-slate-700">No</span>
                      </label>
                    </div>
                  </FormField>
                </div>
              </div>

              {/* ===== SECTION 6: Account Setup ===== */}
              <div id="section-account" className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-sm font-bold text-white">6</span>
                  <h2 className="text-xl font-bold text-slate-800">Account Setup</h2>
                </div>
                <div className="space-y-5">
                  <FormField label="Preferred Username" required>
                    <input type="text" name="preferred_username" value={formData.preferred_username} onChange={handleChange} required
                      placeholder="e.g. cityscienceclub"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                    <p className="mt-1 text-xs text-slate-400">This will be used for your community page URL and login</p>
                  </FormField>

                  <FormField label="Why would you like to join Smart Connects as a Community Organizer?" required>
                    <textarea name="motivation" value={formData.motivation} onChange={handleChange} required rows={3}
                      placeholder="Tell us what inspired you to start this community on Smart Connects"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </FormField>
                </div>
              </div>

              {/* ===== SECTION 7: Declaration ===== */}
              <div id="section-declaration" className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-sm font-bold text-white">7</span>
                  <h2 className="text-xl font-bold text-slate-800">Declaration</h2>
                </div>
                <div className="space-y-5">
                  <FormField label="I confirm that I am authorized to represent this organization/community and agree to follow the Smart Connects platform guidelines." required>
                    <div className="mt-2 flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="authorized_representative" value="yes" checked={formData.authorized_representative === 'yes'} onChange={handleChange}
                          className="h-4 w-4 text-orange-500 focus:ring-orange-500" />
                        <span className="text-sm text-slate-700">Yes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="authorized_representative" value="no" checked={formData.authorized_representative === 'no'} onChange={handleChange}
                          className="h-4 w-4 text-orange-500 focus:ring-orange-500" />
                        <span className="text-sm text-slate-700">No</span>
                      </label>
                    </div>
                  </FormField>

                  {/* Application Review Process */}
                  <div className="rounded-xl border border-orange-100 bg-orange-50 p-5">
                    <h3 className="text-sm font-bold text-orange-700">Application Review Process</h3>
                    <ol className="mt-3 space-y-2 text-sm text-orange-600">
                      <li className="flex gap-2"><span className="font-bold">1.</span> Applicant submits the form with the required documents.</li>
                      <li className="flex gap-2"><span className="font-bold">2.</span> The Smart Connects administrator reviews the application.</li>
                      <li className="flex gap-2"><span className="font-bold">3.</span> If the organization/community meets the verification requirements, the application is approved.</li>
                      <li className="flex gap-2"><span className="font-bold">4.</span> A community page is created in the system using the preferred username provided.</li>
                      <li className="flex gap-2"><span className="font-bold">5.</span> The organizer receives login credentials and can change the password after the first login.</li>
                      <li className="flex gap-2"><span className="font-bold">6.</span> After activation, the organizer can manage the community profile and create events.</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center gap-4 pt-4 pb-8">
                <button type="submit" disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-10 py-3.5 font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02] disabled:opacity-50">
                  {submitting ? 'Submitting Application...' : 'Submit Application'}
                </button>
                <Link href="/organizer" className="text-sm font-medium text-orange-600 hover:text-orange-500">Already an organizer? →</Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

function FormField({ label, required, children, className }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-600">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
