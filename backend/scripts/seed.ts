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
