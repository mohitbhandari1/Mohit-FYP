import { query } from '../src/db';
import bcrypt from 'bcryptjs';

async function seed() {
  try {
    console.log('Seeding sample data...');

    // Hash admin password
    const adminPassword = await bcrypt.hash('admin123', 10);

    // Create admin user only (other users are managed through registration)
    await query(
      'INSERT INTO users (name, email, password, role, is_admin, interests, email_verified) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (email) DO NOTHING',
      ['Admin User', 'admin@smartconnects.com', adminPassword, 'admin', true, 'Technology, Community', true],
    );

    // Seed sample events tied to existing communities (clubs) so the chatbot
    // can answer "events this month" with real data. Skips if the club is missing.
    const sampleEvents = [
      {
        club: 'Leo Club of Samarpan LBEF',
        title: 'Charity Book Fair',
        description: 'The Leo Club of Samarpan LBEF is hosting a Charity Book Fair at LBEF College. Come browse donated books, and every purchase supports underprivileged students.',
        eventDate: '2026-08-15 09:00:00+00',
        location: 'LBEF College, Block A',
        startTime: '09:00',
        endTime: '16:00',
      },
      {
        club: 'Yoga & Wellness Nepal',
        title: 'Sunrise Yoga & Meditation Retreat',
        description: 'Join Yoga & Wellness Nepal for a refreshing sunrise yoga and meditation session in the heart of Kathmandu. All levels welcome.',
        eventDate: '2026-08-16 05:30:00+00',
        location: 'Swayambhunath Garden, Kathmandu',
        startTime: '05:30',
        endTime: '07:30',
      },
      {
        club: 'Grafana Kathmandu',
        title: 'Open Source Observability Workshop',
        description: 'Grafana Kathmandu presents a hands-on workshop on building dashboards with Grafana and Prometheus. Bring your laptop!',
        eventDate: '2026-08-22 13:00:00+00',
        location: 'Proshore Nepal, Kathmandu',
        startTime: '13:00',
        endTime: '17:00',
      },
      {
        club: 'Kathmandu Toastmasters Club',
        title: 'Public Speaking Night: Voices of Kathmandu',
        description: 'Kathmandu Toastmasters Club invites you to an evening of speeches, table topics, and storytelling. Improve your public speaking skills in a friendly environment.',
        eventDate: '2026-08-20 18:00:00+00',
        location: 'Hotel Himalaya, Kupondole, Kathmandu',
        startTime: '18:00',
        endTime: '20:30',
      },
      {
        club: 'Nepal Cycling Club',
        title: 'Weekend Group Ride to Nagarkot',
        description: 'Nepal Cycling Club is organising a weekend group ride from Maitidevi to Nagarkot. Helmets mandatory, breakfast stop on the way!',
        eventDate: '2026-08-23 06:00:00+00',
        location: 'Maitidevi, Kathmandu',
        startTime: '06:00',
        endTime: '12:00',
      },
      {
        club: 'Leo Club of Samarpan LBEF',
        title: 'Leo Leadership Training Camp',
        description: 'A full-day leadership development camp organised by Leo Club of Samarpan LBEF for students and young professionals.',
        eventDate: '2026-08-29 09:00:00+00',
        location: 'LBEF College, Seminar Hall',
        startTime: '09:00',
        endTime: '17:00',
      },
    ];

    for (const ev of sampleEvents) {
      await query(
        `INSERT INTO events (community_id, title, description, event_date, location, attendee_count, start_time, end_date, end_time, duration, event_type, max_attendees, allow_guests, guest_limit, rsvp_deadline, payment_type, topics)
         SELECT c.id, $2, $3, $4::timestamptz, $5, 0, $6, $4::timestamptz, $7, '', 'physical', NULL, true, NULL, $4::timestamptz - INTERVAL '1 day', 'free', '["Community","Social"]'::jsonb
         FROM communities c
         WHERE c.name = $1 AND c.deleted_at IS NULL
           AND NOT EXISTS (SELECT 1 FROM events e WHERE e.title = $2 AND e.event_date = $4::timestamptz)
         LIMIT 1`,
        [ev.club, ev.title, ev.description, ev.eventDate, ev.location, ev.startTime, ev.endTime],
      );
    }

    console.log('Sample data seeded successfully.');
    console.log('');
    console.log('Test Account:');
    console.log('Admin: admin@smartconnects.com / admin123');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
