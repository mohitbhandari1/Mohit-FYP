-- ============================================================
-- Migration v6: Seed events for the current month (Aug 2026)
-- so the chatbot can answer "events this month" with real data.
-- Linked to existing communities (clubs) in the database.
-- Idempotent — safe to re-run.
-- ============================================================

INSERT INTO events (community_id, title, description, event_date, location, attendee_count, start_time, end_date, end_time, duration, event_type, max_attendees, allow_guests, guest_limit, rsvp_deadline, payment_type, topics)
SELECT v.community_id, v.title, v.description, v.event_date::timestamptz, v.location, v.attendee_count, v.start_time, v.end_date::timestamptz, v.end_time, v.duration, v.event_type, v.max_attendees, v.allow_guests, v.guest_limit, v.rsvp_deadline::timestamptz, v.payment_type, v.topics::jsonb
FROM (VALUES
  (
    4, 'Charity Book Fair',
    'The Leo Club of Samarpan LBEF is hosting a Charity Book Fair at LBEF College. Come browse donated books, and every purchase supports underprivileged students.',
    '2026-08-15 09:00:00+00', 'LBEF College, Block A', 0, '09:00', '2026-08-15 00:00:00+00', '16:00', '7 hours', 'physical', 100, true, 20, '2026-08-14 23:59:59+00', 'free', '["Social Service","Education","Charity"]'
  ),
  (
    5, 'Sunrise Yoga & Meditation Retreat',
    'Join Yoga & Wellness Nepal for a refreshing sunrise yoga and meditation session in the heart of Kathmandu. All levels welcome.',
    '2026-08-16 05:30:00+00', 'Swayambhunath Garden, Kathmandu', 0, '05:30', '2026-08-16 00:00:00+00', '07:30', '2 hours', 'physical', 40, true, 10, '2026-08-15 23:59:59+00', 'free', '["Health","Wellness","Meditation"]'
  ),
  (
    6, 'Open Source Observability Workshop',
    'Grafana Kathmandu presents a hands-on workshop on building dashboards with Grafana and Prometheus. Bring your laptop!',
    '2026-08-22 13:00:00+00', 'Proshore Nepal, Kathmandu', 0, '13:00', '2026-08-22 00:00:00+00', '17:00', '4 hours', 'physical', 50, true, 10, '2026-08-21 23:59:59+00', 'free', '["Technology","Open Source","DevOps"]'
  ),
  (
    7, 'Public Speaking Night: Voices of Kathmandu',
    'Kathmandu Toastmasters Club invites you to an evening of speeches, table topics, and storytelling. Improve your public speaking skills in a friendly environment.',
    '2026-08-20 18:00:00+00', 'Hotel Himalaya, Kupondole, Kathmandu', 0, '18:00', '2026-08-20 00:00:00+00', '20:30', '2.5 hours', 'physical', 60, true, 15, '2026-08-20 12:00:00+00', 'free', '["Public Speaking","Leadership","Networking"]'
  ),
  (
    8, 'Weekend Group Ride to Nagarkot',
    'Nepal Cycling Club is organising a weekend group ride from Maitidevi to Nagarkot. Helmets mandatory, breakfast stop on the way!',
    '2026-08-23 06:00:00+00', 'Maitidevi, Kathmandu', 0, '06:00', '2026-08-23 00:00:00+00', '12:00', '6 hours', 'physical', 30, true, 5, '2026-08-22 23:59:59+00', 'free', '["Cycling","Fitness","Outdoors"]'
  ),
  (
    4, 'Leo Leadership Training Camp',
    'A full-day leadership development camp organised by Leo Club of Samarpan LBEF for students and young professionals.',
    '2026-08-29 09:00:00+00', 'LBEF College, Seminar Hall', 0, '09:00', '2026-08-29 00:00:00+00', '17:00', '8 hours', 'physical', 80, true, 15, '2026-08-28 23:59:59+00', 'free', '["Leadership","Personal Development","Social Service"]'
  )
) AS v(community_id, title, description, event_date, location, attendee_count, start_time, end_date, end_time, duration, event_type, max_attendees, allow_guests, guest_limit, rsvp_deadline, payment_type, topics)
WHERE NOT EXISTS (
  SELECT 1 FROM events e WHERE e.title = v.title AND e.event_date = v.event_date::timestamptz
);
