'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import Chatbot from '../../../components/Chatbot';
import ConfirmModal from '../../../components/ConfirmModal';
import ImageCropper from '../../../components/ImageCropper';
import { apiFetch, BACKEND_URL } from '../../../lib/auth';

const CATEGORIES = [
  'Education', 'Technology', 'Social Service', 'Business & Entrepreneurship',
  'Sports & Fitness', 'Arts & Culture', 'Environment', 'Other'
];

export default function EditCommunityPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [community, setCommunity] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '', description: '', category: '', website: '', location: '',
    banner_image: '', logo: '',
    facebook: '', instagram: '', linkedin: '', tiktok: '',
    is_private: false, member_approval: false,
    membership_open: false, membership_form_url: '',
  });
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchCommunity = async () => {
      try {
        const meRes = await apiFetch('/api/auth/me');
        if (!meRes.ok) { router.push('/login'); return; }

        const res = await apiFetch(`/api/communities/${id}`);
        if (!res.ok) { router.push('/communities'); return; }
        const data = await res.json();
        setCommunity(data);

        setFormData({
          name: data.name || '',
          description: data.description || '',
          category: data.category || '',
          website: data.website || '',
          location: data.location || '',
          banner_image: data.banner_image || '',
          logo: data.logo || '',
          facebook: data.facebook || '',
          instagram: data.instagram || '',
          linkedin: data.linkedin || '',
          tiktok: data.tiktok || '',
          is_private: data.is_private || false,
          member_approval: data.member_approval || false,
          membership_open: data.membership_open || false,
          membership_form_url: data.membership_form_url || '',
        });

        // Load members
        const membersRes = await apiFetch(`/api/engagement/community/${id}/members`);
        if (membersRes.ok) setMembers(await membersRes.json());
      } catch (err) { setError('Failed to load community'); }
      finally { setLoading(false); }
    };
    fetchCommunity();
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
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
      payload.append('membership_open', String(formData.membership_open));
      if (formData.membership_form_url) payload.append('membership_form_url', formData.membership_form_url);
      else payload.append('membership_form_url', '');
      if (bannerFile) payload.append('banner_image', bannerFile);
      if (logoFile) payload.append('logo', logoFile);

      const res = await apiFetch(`/api/communities/${id}`, {
        method: 'PUT',
        body: payload,
      });

      if (res.ok) {
        setSuccess('Community updated successfully!');
        setTimeout(() => router.push(`/communities/${id}`), 1500);
      } else {
        const errData = await res.json().catch(() => null);
        setError(errData?.error || errData?.message || 'Failed to update community');
      }
    } catch (err) { setError('Something went wrong. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/communities/${id}`, { method: 'DELETE' });
      if (res.ok) { router.push('/communities'); }
      else { setError('Failed to delete community'); }
    } catch (err) { setError('Failed to delete community'); }
    finally { setDeleting(false); setShowDeleteModal(false); }
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
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-white/5 rounded-xl" />)}
          </div>
        </div>
      </section>
      <Chatbot />
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-fade-in-up">
          <Link href={`/communities/${id}`} className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-400 transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Community
          </Link>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  Edit Community
                </h1>
                <p className="text-slate-400 mt-1">Update your community settings</p>
              </div>
              <button onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-all">
                Delete
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm">{error}</div>
            )}
            {success && (
              <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-sm">{success}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required
                    placeholder="Community name" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Category *</label>
                  <select name="category" value={formData.category} onChange={handleChange} required className={inputClass}>
                    <option value="" className="bg-slate-900">Select category</option>
                    {CATEGORIES.map((cat) => <option key={cat} value={cat} className="bg-slate-900">{cat}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Description *</label>
                <textarea name="description" value={formData.description} onChange={handleChange} required
                  placeholder="Describe your community..." rows={4} className={`${inputClass} resize-none`} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Website</label>
                  <input type="url" name="website" value={formData.website} onChange={handleChange}
                    placeholder="https://..." className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Location</label>
                  <input type="text" name="location" value={formData.location} onChange={handleChange}
                    placeholder="City, Country" className={inputClass} />
                </div>
              </div>

              {/* Social Links */}
              <div className="pt-4 border-t border-white/5">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Social Links</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Facebook</label>
                    <input type="url" name="facebook" value={formData.facebook} onChange={handleChange}
                      placeholder="https://facebook.com/..." className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Instagram</label>
                    <input type="url" name="instagram" value={formData.instagram} onChange={handleChange}
                      placeholder="https://instagram.com/..." className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>LinkedIn</label>
                    <input type="url" name="linkedin" value={formData.linkedin} onChange={handleChange}
                      placeholder="https://linkedin.com/..." className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>TikTok</label>
                    <input type="url" name="tiktok" value={formData.tiktok} onChange={handleChange}
                      placeholder="https://tiktok.com/..." className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="pt-4 border-t border-white/5">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Images</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Banner Image</label>
                    <ImageCropper
                      aspect={16 / 9}
                      currentUrl={formData.banner_image ? `${BACKEND_URL}${formData.banner_image}` : undefined}
                      onChange={setBannerFile}
                    />
                    <p className="mt-1 text-xs text-slate-500">Drag &amp; drop an image, then drag or zoom to frame it in the 16:9 banner shape.</p>
                  </div>
                  <div>
                    <label className={labelClass}>Logo</label>
                    <ImageCropper
                      aspect={1}
                      currentUrl={formData.logo ? `${BACKEND_URL}${formData.logo}` : undefined}
                      onChange={setLogoFile}
                      outputMaxWidth={1024}
                    />
                    <p className="mt-1 text-xs text-slate-500">Drag &amp; drop an image, then drag or zoom to frame it in the square logo shape.</p>
                  </div>
                </div>
              </div>

              {/* Privacy Settings */}
              <div className="pt-4 border-t border-white/5">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Privacy</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="is_private" checked={formData.is_private} onChange={handleChange}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/20" />
                    <span className="text-sm text-slate-300">Private community (hidden from search)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="member_approval" checked={formData.member_approval} onChange={handleChange}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/20" />
                    <span className="text-sm text-slate-300">Require approval for new members</span>
                  </label>
                </div>
              </div>

              {/* Membership Application */}
              <div className="pt-4 border-t border-white/5">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Membership</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="membership_open" checked={formData.membership_open} onChange={handleChange}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/20" />
                    <span className="text-sm text-slate-300">Open membership applications (in-app form)</span>
                  </label>
                  <div>
                    <label className={labelClass}>Membership Form URL (optional)</label>
                    <input type="url" name="membership_form_url" value={formData.membership_form_url} onChange={handleChange}
                      placeholder="https://forms.google.com/... or Google Form link" className={inputClass} />
                    <p className="text-xs text-slate-500 mt-1.5">
                      Link to your own membership form (Google Forms, Typeform, etc.). When set, the "Be a Member" button takes users there instead of the in-app form. Leave empty to remove.
                    </p>
                  </div>
                </div>
              </div>

              {/* Members List */}
              {members.length > 0 && (
                <div className="pt-4 border-t border-white/5">
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">Members ({members.length})</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {members.map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.01]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                            <span className="text-xs font-medium text-amber-400">{member.name?.charAt(0)?.toUpperCase() || '?'}</span>
                          </div>
                          <span className="text-sm text-slate-200">{member.name}</span>
                        </div>
                        <span className="text-xs text-slate-500">{member.role || 'member'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <button type="submit" disabled={submitting}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all hover:scale-[1.01] disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
                <Link href={`/communities/${id}`}
                  className="px-6 py-3 rounded-xl border border-white/10 text-slate-400 font-medium hover:text-slate-200 hover:border-white/20 transition-all text-center">
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>

      {showDeleteModal && (
        <ConfirmModal
          isOpen={showDeleteModal}
          title="Delete Community"
          message="Are you sure you want to delete this community? All events and member data will be lost. This action cannot be undone."
          confirmLabel={deleting ? 'Deleting...' : 'Delete'}
          variant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
      <Chatbot />
    </main>
  );
}
