import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { pool } from './db';
import authRouter from './routes/auth';
import communitiesRouter from './routes/communities';
import eventsRouter from './routes/events';
import engagementRouter from './routes/engagement';
import adminRouter from './routes/admin';
import usersRouter from './routes/users';
import recommendationsRouter from './routes/recommendations';
import chatRouter from './routes/chat';
import { userApplicationsRouter, adminApplicationsRouter } from './routes/applications';
import announcementsRouter from './routes/announcements';
import discussionsRouter from './routes/discussions';
import adminActivityRouter from './routes/adminActivity';
import notificationsRouter from './routes/notifications';
import notificationPreferencesRouter from './routes/notificationPreferences';
import { startReminderService, triggerReminderCheck } from './reminderService';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:4000',
    process.env.FRONTEND_URL || '',
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/', async (_req, res) => {
  res.send({ status: 'ok', message: 'Smart Connects backend is running' });
});

// ─── API Routes ───
app.use('/api/auth', authRouter);
app.use('/api/communities', communitiesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/engagement', engagementRouter);
app.use('/api/admin', adminRouter);
app.use('/api/users', usersRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/applications', userApplicationsRouter);
app.use('/api/admin/applications', adminApplicationsRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/discussions', discussionsRouter);
app.use('/api/admin', adminActivityRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/notification-preferences', notificationPreferencesRouter);

// POST /api/admin/send-event-reminders - Manual trigger for testing reminders
app.post('/api/admin/send-event-reminders', async (req, res) => {
  try {
    await triggerReminderCheck();
    res.json({ message: 'Reminder check triggered' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger reminders' });
  }
});

// GET /api/stats - Public platform stats (no auth required)
app.get('/api/stats', async (_req, res) => {
  try {
    const [users, events, communities, connections] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL'),
      pool.query('SELECT COUNT(*) as count FROM events WHERE deleted_at IS NULL'),
      pool.query('SELECT COUNT(*) as count FROM communities WHERE deleted_at IS NULL'),
      pool.query('SELECT COUNT(*) as count FROM community_members'),
    ]);
    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalEvents: parseInt(events.rows[0].count),
      totalCommunities: parseInt(communities.rows[0].count),
      totalConnections: parseInt(connections.rows[0].count),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Database health check
app.get('/api/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT 1 AS status');
    res.json({ database: result.rows[0].status === 1, status: 'ok' });
  } catch (error) {
    res.status(500).json({ database: false, status: 'error', error: 'Database connection failed' });
  }
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message || err);
  if (err.message && err.message.includes('Only')) {
    // Multer file type errors
    return res.status(400).json({ error: err.message });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
  // Start the event reminder service
  startReminderService();
});

export default app;
