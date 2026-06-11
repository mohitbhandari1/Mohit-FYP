import { query } from '../src/db';
import bcrypt from 'bcryptjs';

async function seed() {
  try {
    console.log('Seeding sample data...');

    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const userPassword = await bcrypt.hash('user123', 10);

    // Create users
    await query(
      'INSERT INTO users (name, email, password, role, is_admin, interests) VALUES ($1, $2, $3, $4, $5, $6)',
      ['Admin User', 'admin@smartconnects.com', adminPassword, 'admin', true, 'Technology, Community'],
    );

    await query(
      'INSERT INTO users (name, email, password, role, is_admin, interests) VALUES ($1, $2, $3, $4, $5, $6)',
      ['Tech Organizer', 'tech@smartconnects.com', userPassword, 'organizer', false, 'Technology, Education'],
    );

    await query(
      'INSERT INTO users (name, email, password, role, is_admin, interests) VALUES ($1, $2, $3, $4, $5, $6)',
      ['Sports Organizer', 'sports@smartconnects.com', userPassword, 'organizer', false, 'Sports, Fitness'],
    );

    await query(
      'INSERT INTO users (name, email, password, role, is_admin, interests) VALUES ($1, $2, $3, $4, $5, $6)',
      ['Regular Member', 'member@smartconnects.com', userPassword, 'member', false, 'Music, Art'],
    );

    // Create communities with owners
    await query('INSERT INTO communities (name, description, category, website, owner_id) VALUES ($1, $2, $3, $4, $5)', [
      'Campus Tech Club',
      'A community for students interested in software development and technology projects.',
      'Technology',
      'https://example.com/campus-tech',
      2,
    ]);

    await query('INSERT INTO communities (name, description, category, website, owner_id) VALUES ($1, $2, $3, $4, $5)', [
      'Neighborhood Sports Group',
      'Local community sports events, weekly meetups, and tournaments.',
      'Sports',
      'https://example.com/sports-group',
      3,
    ]);

    await query(
      'INSERT INTO events (community_id, title, description, event_date, location) VALUES ($1, $2, $3, $4, $5)',
      [1, 'Intro to JavaScript', 'Beginner-friendly session for new developers.', '2026-07-15T18:00:00Z', 'Room 101'],
    );

    await query(
      'INSERT INTO events (community_id, title, description, event_date, location) VALUES ($1, $2, $3, $4, $5)',
      [2, 'Weekend Soccer Meetup', 'Friendly soccer match and community socials.', '2026-07-17T15:00:00Z', 'Community field'],
    );

    // Create sample organizer applications with all new fields
    await query(
      `INSERT INTO organizer_applications 
       (user_id, community_name, org_type, description, year_established,
        facebook, instagram, website, linkedin, tiktok,
        contact_person_name, position_role, contact_info, phone, address,
        target_audience, age_group, category, activities, benefits, info_accurate,
        preferred_username, motivation, expected_members, meeting_frequency, experience, venue_details,
        authorized_representative, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
               $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
               $22, $23, $24, $25, $26, $27, $28, $29)`,
      [
        2, // Tech Organizer user
        'Campus Tech Club',
        'Club',
        'A community for students interested in software development, programming, and technology projects. We organize hackathons, workshops, and tech talks.',
        '2024-01-15',
        'https://facebook.com/campustechclub',
        'https://instagram.com/campustechclub',
        'https://campustechclub.example.com',
        'https://linkedin.com/company/campustechclub',
        'https://tiktok.com/@campustechclub',
        'Jane Smith',
        'President',
        'tech.organizer@example.com',
        '+1 (555) 123-4567',
        'University Campus, Building A, Room 101, City, State 12345',
        'College students and young professionals interested in technology',
        'Teenagers, Young Adults',
        'Technology',
        'Weekly coding workshops, hackathons, tech talks, project showcases, mentorship programs',
        'Members gain practical coding skills, build portfolios, network with industry professionals, and collaborate on real-world projects',
        true,
        'campustechclub',
        'I want to create a space where students can learn programming and build projects together outside of the classroom.',
        '100-200 members',
        'Weekly',
        'I have organized 3 hackathons before and was a teaching assistant for a coding bootcamp.',
        'We have access to the university computer lab on weekends and a community center meeting room.',
        true,
        'approved',
      ]
    );

    await query(
      `INSERT INTO organizer_applications 
       (user_id, community_name, org_type, description, year_established,
        facebook, instagram, website, linkedin, tiktok,
        contact_person_name, position_role, contact_info, phone, address,
        target_audience, age_group, category, activities, benefits, info_accurate,
        preferred_username, motivation, expected_members, meeting_frequency, experience, venue_details,
        authorized_representative, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
               $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
               $22, $23, $24, $25, $26, $27, $28, $29)`,
      [
        3, // Sports Organizer user
        'Neighborhood Sports Group',
        'Local Community',
        'Local community sports events, weekly meetups, friendly tournaments, and fitness activities for all skill levels.',
        '2023-06-01',
        'https://facebook.com/neighborhoodsports',
        'https://instagram.com/neighborhoodsports',
        'https://neighborhoodsports.example.com',
        '',
        '',
        'Mike Johnson',
        'Coordinator',
        'sports.organizer@example.com',
        '+1 (555) 987-6543',
        '123 Sports Avenue, City Center, City, State 12345',
        'Local residents, fitness enthusiasts of all ages and abilities',
        'Children, Teenagers, Young Adults, Adults, Senior Citizens',
        'Sports & Fitness',
        'Weekly soccer matches, basketball tournaments, morning yoga sessions, running clubs, family fitness days',
        'Members stay active, build community connections, improve physical and mental health, and make new friends through shared sports activities',
        true,
        'neighborhoodsports',
        'Our neighborhood lacks accessible sports activities. I want to bring people together through fitness and friendly competition.',
        '50-80 members',
        'Bi-weekly',
        'I have been coaching a local youth soccer team for 3 years and have organized 2 community fitness events.',
        'We use the city park soccer field on weekends and have permission from the parks department.',
        true,
        'approved',
      ]
    );

    // Create sample announcements
    await query(
      'INSERT INTO announcements (community_id, title, content, created_by) VALUES ($1, $2, $3, $4)',
      [1, 'Welcome to Campus Tech Club!', 'We are excited to launch our community for the new semester! Join us for workshops, hackathons, and networking events. Our first meetup is on July 15th.', 2]
    );

    await query(
      'INSERT INTO announcements (community_id, title, content, created_by) VALUES ($1, $2, $3, $4)',
      [2, 'New Season Starting Soon', 'Get ready for our summer sports season! We have soccer, basketball, and friendly tournaments planned. All skill levels welcome!', 3]
    );

    // Create sample discussions
    await query(
      'INSERT INTO community_discussions (community_id, user_id, content) VALUES ($1, $2, $3)',
      [1, 4, 'I am really looking forward to the JavaScript workshop! Will there be any prerequisites?']
    );

    await query(
      'INSERT INTO community_discussions (community_id, user_id, content, parent_id) VALUES ($1, $2, $3, $4)',
      [1, 2, 'No prerequisites needed! It is beginner-friendly. Just bring your laptop.', 1]
    );

    await query(
      'INSERT INTO community_discussions (community_id, user_id, content) VALUES ($1, $2, $3)',
      [2, 4, 'What time do the weekend soccer matches usually start?']
    );

    await query(
      'INSERT INTO community_discussions (community_id, user_id, content, parent_id) VALUES ($1, $2, $3, $4)',
      [2, 3, 'We usually start at 3 PM on Saturdays. Feel free to come early to warm up!', 3]
    );

    // Create sample activity logs
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [1, 'Admin User', 'user_registered', 'Platform initialized with seed data']
    );

    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [2, 'Tech Organizer', 'application_approved', 'Organizer application for Campus Tech Club approved']
    );

    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [3, 'Sports Organizer', 'application_approved', 'Organizer application for Neighborhood Sports Group approved']
    );

    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [2, 'Tech Organizer', 'community_created', 'Created community: Campus Tech Club']
    );

    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [3, 'Sports Organizer', 'community_created', 'Created community: Neighborhood Sports Group']
    );

    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [2, 'Tech Organizer', 'event_created', 'Created event: Intro to JavaScript']
    );

    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [3, 'Sports Organizer', 'event_created', 'Created event: Weekend Soccer Meetup']
    );

    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [2, 'Tech Organizer', 'announcement_created', 'Posted welcome announcement in Campus Tech Club']
    );

    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [3, 'Sports Organizer', 'announcement_created', 'Posted new season announcement in Neighborhood Sports Group']
    );

    console.log('Sample data seeded successfully.');
    console.log('');
    console.log('Test Accounts:');
    console.log('Admin: admin@smartconnects.com / admin123');
    console.log('Tech Organizer: tech@smartconnects.com / user123');
    console.log('Sports Organizer: sports@smartconnects.com / user123');
    console.log('Regular Member: member@smartconnects.com / user123');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
