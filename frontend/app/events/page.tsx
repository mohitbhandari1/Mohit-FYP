'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Chatbot from '../components/Chatbot';
import Pagination from '../components/Pagination';
import { SkeletonEventGrid } from '../components/Skeleton';
import { apiFetch, BACKEND_URL } from '../lib/auth';

type DateFilter = 'all' | 'today' | 'week' | 'month';

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<Record<number, string>>({});
  const [savedEvents, setSavedEvents] = useState<Set<number>>(new Set());
  const [activeFilter, setActiveFilter] = useState<DateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    setPage(1);
  }, [activeFilter, searchQuery]);

  const fetchEvents = useCallback(async () => {
    setFetching(true);
    try {
      const filterParam = activeFilter !== 'all' ? `filter=${activeFilter}` : '';
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const eventsRes = await apiFetch(`/api/events?${filterParam}${searchParam}&limit=${ITEMS_PER_PAGE}&page=${page}`);
      const eventsData = await eventsRes.json();
      setEvents(Array.isArray(eventsData) ? eventsData : eventsData.events || []);
      if (eventsData.totalPages) setTotalPages(eventsData.totalPages);

      const meRes = await apiFetch('/api/auth/me');
      if (meRes.ok) {
        setIsAuthenticated(true);
        const rsvpRes = await apiFetch('/api/engagement/rsvp/user');
        if (rsvpRes.ok) {
          const rsvpData = await rsvpRes.json();
          const statusMap: Record<number, string> = {};
          rsvpData.forEach((item: any) => { statusMap[item.event_id || item.id] = item.status; });
          setRsvpStatus(statusMap);
        }
        const savedRes = await apiFetch('/api/events/my-saved');
        if (savedRes.ok) {
          const savedData = await savedRes.json();
          setSavedEvents(new Set(savedData.map((s: any) => s.id)));
        }
      }
      setTotalPages(Math.max(1, Math.ceil((Array.isArray(eventsData) ? eventsData.length : eventsData.total || ITEMS_PER_PAGE) / ITEMS_PER_PAGE)));
    } catch (err) { console.error('Failed to load events'); }
    finally { setInitialLoading(false); setFetching(false); }
  }, [activeFilter, searchQuery, page]);

  // Debounced fetch for search/filter changes
  useEffect(() => {
    const timer = setTimeout(fetchEvents, 300);
    return () => clearTimeout(timer);
  }, [fetchEvents]);

  const handleSaveEvent = async (eventId: number) => {
    const meRes = await apiFetch('/api/auth/me');
    if (!meRes.ok) { window.location.href = '/login'; return; }
    try {
      const res = await apiFetch(`/api/events/${eventId}/save`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSavedEvents((prev) => {
          const next = new Set(prev);
          if (data.saved) next.add(eventId);
          else next.delete(eventId);
          return next;
        });
      }
    } catch (err) { console.error('Failed to save event'); }
  };

  const formatDateTime = (dateStr: string, timeStr?: string) => {
    const d = new Date(dateStr);
    const datePart = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (timeStr) {
      // timeStr is like "17:00" or "17:00:00"
      const [h, m] = timeStr.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      return `${datePart} · ${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
    }
    // Fallback: try to extract time from dateStr
    try {
      const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      if (timePart !== '12:00 AM') return `${datePart} · ${timePart}`;
    } catch {}
    return datePart;
  };

  const filters: { label: string; value: DateFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
  ];

  if (initialLoading) return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-fade-in-up">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <div className="h-10 w-48 rounded bg-white/5 animate-pulse" />
              <div className="mt-2 h-4 w-56 rounded bg-white/5 animate-pulse" />
            </div>
          </div>
          <SkeletonEventGrid count={6} />
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Explore Events
              </h1>
              <p className="mt-2 text-slate-400">Discover events happening in communities around you</p>
            </div>
            {isAuthenticated && (
              <Link href="/events/create"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 font-semibold text-black shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/40 hover:scale-[1.02]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Event
              </Link>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col gap-4 sm:flex-row mb-8">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl pl-10 pr-10 py-2.5 text-slate-100 placeholder-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
              {fetching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="w-4 h-4 animate-spin text-amber-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex gap-1 bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/10 p-1">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setActiveFilter(filter.value)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    activeFilter === filter.value
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Events Grid */}
          {events.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event: any, i: number) => (
                <div
                  key={event.id}
                  className="group rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-lg hover:shadow-amber-500/10 hover:border-amber-500/20 transition-all duration-500 hover:-translate-y-1 overflow-hidden opacity-0 animate-fade-in-up"
                  style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
                >
                  {/* Banner */}
                  <Link href={`/events/${event.id}`}>
                    <div className="relative aspect-video bg-gradient-to-br from-amber-900/30 to-orange-900/30 overflow-hidden">
                      {event.banner_image ? (
                        <img src={`${BACKEND_URL}${event.banner_image}`} alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-16 h-16 text-amber-600/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {/* Save button */}
                      <button
                        onClick={(e) => { e.preventDefault(); handleSaveEvent(event.id); }}
                        className="absolute top-3 right-3 p-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 hover:bg-black/60 transition-all"
                      >
                        <svg className={`w-4 h-4 ${savedEvents.has(event.id) ? 'text-amber-400 fill-amber-400' : 'text-white'}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                    </div>
                  </Link>

                  {/* Content */}
                  <div className="p-5">
                    <Link href={`/events/${event.id}`}>
                      <h3 className="text-lg font-semibold text-slate-100 group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
                        {event.title}
                      </h3>
                    </Link>

                    {/* Date · Time · Location — one line */}
                    {(event.event_date || event.location) && (
                      <div className="mt-2 text-sm text-slate-300">
                        {event.event_date && <span>{formatDateTime(event.event_date, event.start_time)}</span>}
                        {event.event_date && event.location && <span> </span>}
                        {event.location && <span>{event.location}</span>}
                      </div>
                    )}

                    {/* by Organizer */}
                    {event.community_owner_name && (
                      <div className="text-sm text-slate-400">by {event.community_owner_name}</div>
                    )}

                    {/* Rating */}
                    {event.avg_rating && (
                      <div className="text-sm text-amber-400">
                        <svg className="inline w-4 h-4 -mt-0.5 mr-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {event.avg_rating}
                      </div>
                    )}

                    {/* Attendees & seats remaining */}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {(event.attendee_count ?? 0) > 0 && (
                        <div className="text-sm text-slate-400">{event.attendee_count} attendees</div>
                      )}
                      {event.seats_remaining != null && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          event.seats_remaining <= 0
                            ? 'bg-red-500/15 text-red-400 border-red-500/20'
                            : event.seats_remaining <= 10
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {event.seats_remaining <= 0 ? 'Event Full' : `${event.seats_remaining} seat${event.seats_remaining === 1 ? '' : 's'} left`}
                        </span>
                      )}
                    </div>

                    {/* RSVP badge */}
                    {rsvpStatus[event.id] === 'attending' && (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Going
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl">
              <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-slate-300">No events found</h3>
              <p className="mt-2 text-slate-500">Try adjusting your search or filters</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      </section>
      <Chatbot />
    </main>
  );
}
