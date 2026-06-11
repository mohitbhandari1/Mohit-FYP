import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
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

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4000'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

app.get('/', async (req, res) => {
  res.send({ status: 'ok', message: 'Smart Connects backend is running' });
});

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

app.get('/api/health', async (req, res) => {
  const result = await pool.query('SELECT 1 AS status');
  res.json({ database: result.rows[0].status === 1 });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});
