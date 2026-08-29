'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import Chatbot from '../../components/Chatbot';
import ImageCropper from '../../components/ImageCropper';
import { apiFetch, BACKEND_URL } from '../../lib/auth';

const TOPIC_OPTIONS = [
  'Technology', 'Chess', 'Networking', 'Workshop', 'Education',
  'Music', 'Sports', 'Art', 'Business', 'Social Service',
  'Environment', 'Health', 'Gaming', 'Photography', 'Cooking',
  'Literature', 'Dance', 'Theater', 'Film', 'Fashion'
];

const CATEGORIES = [
  'Education', 'Technology', 'Social Service', 'Business & Entrepreneurship',
  'Sports & Fitness', 'Arts & Culture', 'Environment', 'Other'
];

const QUESTION_TYPES = [
  { value: 'text', label: 'Short answer' },
  { value: 'textarea', label: 'Long answer' },
  { value: 'checkboxes', label: 'Checkboxes' },
  { value: 'radio', label: 'Multiple choice' },
  { value: 'select', label: 'Dropdown' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
  { value: 'file', label: 'File upload' },
];

const FILE_ACCEPT_PRESETS = [
  { value: 'images', label: 'Images (JPG, PNG)' },
  { value: 'documents', label: 'Documents (PDF, DOC)' },
  { value: 'both', label: 'Both' },
];

export default function CreateEventPage() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '', description: '', event_date: '', start_time: '',
    end_date: '', end_time: '', duration: '',
    location: '', event_type: 'physical', banner_image: '',
    max_attendees: '', allow_guests: false, guest_limit: '',
    rsvp_deadline: '', payment_type: 'free',
    topics: [] as string[], topicInput: '',
    hosts: [{ name: '', role: '' }],
    speakers: '', agenda: '', requirements: '', instructions: '',
    age_limit: '',
    require_approval: false,
    community_id: '',
    questions: [
      {
        question: '', type: 'text', required: false,
        options: '',
        file_accept: 'both' as string,
        file_max_size: 5,
      },
    ],
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [showSeatLimit, setShowSeatLimit] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const meRes = await apiFetch('/api/auth/me');
        if (!meRes.ok) { router.push('/login'); return; }

        // Use my-owned endpoint — returns a flat array
        const res = await apiFetch('/api/communities/my-owned');
        if (res.ok) {
          const data = await res.json();
          const owned = Array.isArray(data) ? data : [];

          // Only organizers can create events — redirect if no communities
          if (owned.length === 0) {
            router.push('/?error=no_community');
            return;
          }

          setCommunities(owned);

          // Auto-select: single community, or first one
          setFormData((prev) => ({
            ...prev,
            community_id: String(owned[0].id),
          }));
        }
      } catch (err) { console.error('Failed to load communities'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const addTopic = (topic: string) => {
    if (!formData.topics.includes(topic)) {
      setFormData((prev) => ({ ...prev, topics: [...prev.topics, topic] }));
    }
  };

  const removeTopic = (topic: string) => {
    setFormData((prev) => ({ ...prev, topics: prev.topics.filter((t) => t !== topic) }));
  };

  // ─── Custom registration questions ───
  const updateQuestion = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const questions = prev.questions.map((q, i) => (i === index ? { ...q, [field]: value } : q));
      return { ...prev, questions };
    });
  };

  const addQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        { question: '', type: 'text', required: false, options: '', file_accept: 'both', file_max_size: 5 },
      ],
    }));
  };

  const removeQuestion = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('title', formData.title);
      payload.append('description', formData.description);
      payload.append('event_date', formData.event_date);
      payload.append('start_time', formData.start_time);
      if (formData.end_date) payload.append('end_date', formData.end_date);
      if (formData.end_time) payload.append('end_time', formData.end_time);
      if (formData.duration) payload.append('duration', formData.duration);
      payload.append('location', formData.location);
      payload.append('event_type', formData.event_type);
      if (formData.max_attendees) payload.append('max_attendees', formData.max_attendees);
      if (formData.rsvp_deadline) payload.append('rsvp_deadline', formData.rsvp_deadline);
      payload.append('payment_type', formData.payment_type);
      payload.append('community_id', formData.community_id);
      if (formData.topics.length > 0) payload.append('topics', JSON.stringify(formData.topics));
      if (formData.speakers) payload.append('speakers', formData.speakers);
      if (formData.agenda) payload.append('agenda', formData.agenda);
      if (formData.requirements) payload.append('requirements', formData.requirements);
      if (formData.instructions) payload.append('instructions', formData.instructions);
      if (formData.hosts.length > 0 && formData.hosts[0].name) payload.append('hosts', JSON.stringify(formData.hosts));
      if (bannerFile) payload.append('banner_image', bannerFile);
      if (formData.age_limit) payload.append('age_limit', formData.age_limit);
      if (formData.require_approval) payload.append('require_approval', 'true');

      // Custom registration questions
      const needsOptions = ['select', 'checkboxes', 'radio'];
      const needsFileSettings = ['file'];
      const validQuestions = formData.questions
        .filter((q) => q.question.trim())
        .map((q) => {
          const base: Record<string, any> = {
            question: q.question.trim(),
            type: q.type,
            required: q.required,
            options: needsOptions.includes(q.type)
              ? q.options.split(',').map((s: string) => s.trim()).filter(Boolean)
              : [],
          };
          if (needsFileSettings.includes(q.type)) {
            base.file_accept = q.file_accept || 'both';
            base.file_max_size = q.file_max_size || 5;
          }
          return base;
        });
      // Always send (even empty) so the edit flow can also clear all questions
      payload.append('questions', JSON.stringify(validQuestions));

      const res = await apiFetch('/api/events', {
        method: 'POST',
        body: payload,
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/events/${data.id || data.event?.id || ''}`);
      } else {
        const errData = await res.json().catch(() => null);
        setError(errData?.message || 'Failed to create event');
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
          <div className="h-8 w-48 bg-white/5 rounded mb-6" />
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
          <Link href="/events" className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-400 transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Events
          </Link>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6 sm:p-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent mb-2">
              Create Event
            </h1>
            <p className="text-slate-400 mb-8">Fill in the details to create a new event</p>

            {error && (
              <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Community — auto-selected from organizer's communities */}
              <div>
                <label className={labelClass}>Community</label>
                {communities.length > 1 ? (
                  <>
                    <select name="community_id" value={formData.community_id} onChange={handleChange} required
                      className={inputClass}>
                      {communities.map((c) => (
                        <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">You own multiple communities — select which one this event belongs to.</p>
                  </>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 py-3">
                    {communities[0]?.banner_image ? (
                      <img src={`${BACKEND_URL}${communities[0].banner_image}`} alt=""
                        className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-200">{communities[0]?.name}</p>
                      <p className="text-xs text-slate-500">Creating event for this community</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className={labelClass}>Event Title *</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} required
                  placeholder="e.g., Tech Meetup 2024" className={inputClass} />
              </div>

              {/* Description */}
              <div>
                <label className={labelClass}>Description *</label>
                <textarea name="description" value={formData.description} onChange={handleChange} required
                  placeholder="Describe your event..." rows={4}
                  className={`${inputClass} resize-none`} />
              </div>

              {/* Date & Time Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Start Date *</label>
                  <input type="date" name="event_date" value={formData.event_date} onChange={handleChange} required
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Start Time *</label>
                  <input type="time" name="start_time" value={formData.start_time} onChange={handleChange} required
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>End Date</label>
                  <input type="date" name="end_date" value={formData.end_date} onChange={handleChange}
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>End Time</label>
                  <input type="time" name="end_time" value={formData.end_time} onChange={handleChange}
                    className={inputClass} />
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Location *</label>
                  <input type="text" name="location" value={formData.location} onChange={handleChange} required
                    placeholder="Venue or online link" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Event Type</label>
                  <select name="event_type" value={formData.event_type} onChange={handleChange} className={inputClass}>
                    <option value="physical" className="bg-slate-900">Physical</option>
                    <option value="virtual" className="bg-slate-900">Virtual</option>
                    <option value="hybrid" className="bg-slate-900">Hybrid</option>
                  </select>
                </div>
              </div>

              {/* Seat Limit & RSVP Deadline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  {showSeatLimit || formData.max_attendees ? (
                    <div>
                      <label className={labelClass}>Seat Limit (Max Attendees)</label>
                      <input type="number" name="max_attendees" value={formData.max_attendees} onChange={handleChange}
                        min={1} placeholder="e.g., 50" className={inputClass} />
                      <button type="button" onClick={() => { setShowSeatLimit(false); setFormData((prev) => ({ ...prev, max_attendees: '' })); }}
                        className="mt-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors">
                        Remove seat limit
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowSeatLimit(true)}
                      className="w-full rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-2.5 text-sm text-slate-400 hover:text-amber-400 hover:border-amber-500/30 transition-all">
                      + Set a seat limit
                    </button>
                  )}
                </div>
                <div>
                  <label className={labelClass}>RSVP Deadline</label>
                  <input type="date" name="rsvp_deadline" value={formData.rsvp_deadline} onChange={handleChange}
                    className={inputClass} />
                </div>
              </div>

              {/* Age Limit */}
              <div>
                <label className={labelClass}>
                  Age Limit <span className="text-xs font-normal text-slate-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="age_limit"
                  value={formData.age_limit}
                  onChange={handleChange}
                  placeholder="e.g., 12-18"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Enter age range or leave blank. Examples: 12-18, 18+, Under 18, All Ages.
                </p>
              </div>

              {/* Attendee Approval Toggle */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-slate-200">Require Approval</label>
                    <p className="text-xs text-slate-500 mt-0.5">When enabled, attendees must be approved by you before their registration is confirmed.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, require_approval: !prev.require_approval }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.require_approval ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.require_approval ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Custom Registration Questions — Google Forms style */}
              <div>
                <label className={labelClass}>Registration Questions</label>
                <p className="text-xs text-slate-500 mb-3">
                  Ask attendees to answer these before joining. Leave blank if not needed.
                </p>
                <div className="space-y-4">
                  {formData.questions.map((q, index) => (
                    <div key={index} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                      {/* Question header */}
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold shrink-0">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <input type="text" value={q.question}
                            onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                            placeholder="Question"
                            className="w-full bg-transparent border-b border-white/10 px-1 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500/50 focus:outline-none transition-all" />
                        </div>
                        <button type="button" onClick={() => removeQuestion(index)}
                          className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Remove question">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {/* Type + Required row */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <select value={q.type} onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all">
                            {QUESTION_TYPES.map((qt) => (
                              <option key={qt.value} value={qt.value} className="bg-slate-900">{qt.label}</option>
                            ))}
                          </select>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer whitespace-nowrap">
                          <input type="checkbox" checked={q.required}
                            onChange={(e) => updateQuestion(index, 'required', e.target.checked)}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/20" />
                          Required
                        </label>
                      </div>

                      {/* Options editor for radio / select / checkboxes */}
                      {['select', 'radio', 'checkboxes'].includes(q.type) && (
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-slate-400">Options</label>
                          <div className="space-y-1.5">
                            {(() => {
                              const opts = q.options ? q.options.split(',').map((s: string) => s.trim()).filter(Boolean) : [''];
                              return opts.map((opt: string, oi: number) => (
                                <div key={oi} className="flex items-center gap-2">
                                  <span className="text-slate-500 text-xs w-5 text-center shrink-0">{oi + 1}.</span>
                                  <input type="text" value={opt}
                                    placeholder={`Option ${oi + 1}`}
                                    onChange={(e) => {
                                      const parts = q.options ? q.options.split(',').map((s: string) => s.trim()) : [];
                                      parts[oi] = e.target.value;
                                      while (parts.length <= oi) parts.push('');
                                      updateQuestion(index, 'options', parts.join(', '));
                                    }}
                                    className="flex-1 bg-transparent border-b border-white/10 px-1 py-1 text-sm text-slate-200 placeholder-slate-600 focus:border-amber-500/50 focus:outline-none transition-all" />
                                  {opts.length > 1 && (
                                    <button type="button" onClick={() => {
                                      const parts = q.options ? q.options.split(',').map((s: string) => s.trim()) : [];
                                      parts.splice(oi, 1);
                                      updateQuestion(index, 'options', parts.join(', '));
                                    }} className="text-slate-500 hover:text-red-400 text-xs">✕</button>
                                  )}
                                </div>
                              ));
                            })()}
                          </div>
                          <button type="button" onClick={() => {
                            const parts = q.options ? q.options.split(',').map((s: string) => s.trim()) : [];
                            parts.push('');
                            updateQuestion(index, 'options', parts.join(', '));
                          }} className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors">
                            + Add option
                          </button>
                          <input type="hidden" value={q.options}
                            onChange={(e) => updateQuestion(index, 'options', e.target.value)} />
                        </div>
                      )}

                      {/* File upload settings */}
                      {q.type === 'file' && (
                        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-2.5">
                          <label className="block text-xs font-medium text-slate-400">File upload settings</label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] text-slate-500 mb-1">Allowed types</label>
                              <select value={q.file_accept || 'both'}
                                onChange={(e) => updateQuestion(index, 'file_accept', e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-200 focus:border-amber-500/50 focus:outline-none transition-all">
                                {FILE_ACCEPT_PRESETS.map((fp) => (
                                  <option key={fp.value} value={fp.value} className="bg-slate-900">{fp.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-500 mb-1">Max size (MB)</label>
                              <select value={q.file_max_size || 5}
                                onChange={(e) => updateQuestion(index, 'file_max_size', Number(e.target.value))}
                                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-200 focus:border-amber-500/50 focus:outline-none transition-all">
                                {[2, 5, 10, 15, 20].map((mb) => (
                                  <option key={mb} value={mb} className="bg-slate-900">{mb} MB</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-600">
                            {q.file_accept === 'images' ? 'JPG, PNG' : q.file_accept === 'documents' ? 'PDF, DOC, DOCX' : 'JPG, PNG, PDF, DOC, DOCX'} — max {q.file_max_size || 5} MB
                          </p>
                        </div>
                      )}

                      {/* Preview hint for non-editable types */}
                      {q.type === 'date' && (
                        <p className="text-xs text-slate-600 italic">Attendees will pick a date.</p>
                      )}
                      {q.type === 'number' && (
                        <p className="text-xs text-slate-600 italic">Attendees will enter a number.</p>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addQuestion}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  + Add Question
                </button>
              </div>

              {/* Topics */}
              <div>
                <label className={labelClass}>Topics</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.topics.map((topic) => (
                    <span key={topic}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {topic}
                      <button type="button" onClick={() => removeTopic(topic)} className="ml-1 text-amber-400/60 hover:text-amber-400">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TOPIC_OPTIONS.filter((t) => !formData.topics.includes(t)).map((topic) => (
                    <button key={topic} type="button" onClick={() => addTopic(topic)}
                      className="px-2.5 py-1 text-xs rounded-full border border-white/10 text-slate-400 hover:text-amber-400 hover:border-amber-500/20 transition-all">
                      + {topic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Banner Image */}
              <div>
                <label className={labelClass}>Banner Image</label>
                <ImageCropper aspect={16 / 9} onChange={setBannerFile} />
                <p className="mt-1 text-xs text-slate-500">Drag &amp; drop an image, then drag or zoom to frame it in the 16:9 banner shape.</p>
              </div>

              {/* Agenda */}
              <div>
                <label className={labelClass}>Agenda</label>
                <textarea name="agenda" value={formData.agenda} onChange={handleChange}
                  placeholder="Event schedule..." rows={3} className={`${inputClass} resize-none`} />
              </div>

              {/* Speakers */}
              <div>
                <label className={labelClass}>Speakers</label>
                <input type="text" name="speakers" value={formData.speakers} onChange={handleChange}
                  placeholder="Speaker names (comma separated)" className={inputClass} />
              </div>

              {/* Requirements */}
              <div>
                <label className={labelClass}>Requirements</label>
                <textarea name="requirements" value={formData.requirements} onChange={handleChange}
                  placeholder="What participants should bring or know..." rows={2} className={`${inputClass} resize-none`} />
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <button type="submit" disabled={submitting}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100">
                  {submitting ? 'Creating...' : 'Create Event'}
                </button>
                <Link href="/events"
                  className="px-6 py-3 rounded-xl border border-white/10 text-slate-400 font-medium hover:text-slate-200 hover:border-white/20 transition-all text-center">
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
      <Chatbot />
    </main>
  );
}
