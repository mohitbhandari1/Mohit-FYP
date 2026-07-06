import express from 'express';
import multer from 'multer';
import path from 'path';
import bcryptjs from 'bcryptjs';
import { query } from '../db';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';
import { sendEmail, applicationApprovedEmail, applicationRejectedEmail } from '../email';

// ─── File Upload Setup ───
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /pdf|doc|docx|jpg|jpeg|png|gif|svg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext || mime) return cb(null, true);
    cb(new Error('Only PDF, DOC, DOCX, and image files (JPG, PNG, GIF, SVG) are allowed'));
  },
});

// Create uploads directory if it doesn't exist
import fs from 'fs';
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ---------------
// USER-FACING ROUTES — mounted at /api/applications
// ---------------
export const userApplicationsRouter = express.Router();

// POST /api/applications - Submit a new organizer application (with file uploads)
userApplicationsRouter.post(
  '/',
  authMiddleware,
  upload.fields([
    { name: 'certificate_file', maxCount: 1 },
    { name: 'logo_file', maxCount: 1 },
    { name: 'additional_doc_file', maxCount: 1 },
  ]),
  async (req: AuthRequest, res, next) => {
    // Multer can add files to req.files while the rest is in req.body
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    const getFilePath = (field: string): string | null => {
      if (files && files[field] && files[field].length > 0) {
        return '/uploads/' + files[field][0].filename;
      }
      return null;
    };

    const {
      community_name, description, org_type, year_established,
      facebook, instagram, website, linkedin, tiktok,
      contact_person_name, position_role, contact_info, phone, address,
      target_audience, age_group, category,
      activities, benefits, info_accurate,
      preferred_username, motivation, expected_members,
      meeting_frequency, experience, venue_details,
      authorized_representative,
    } = req.body;

    if (!community_name || !description) {
      return res.status(400).json({ error: 'Community name and description are required' });
    }

    try {
      // Check if user already has a pending application
      const existing = await query(
        'SELECT id, status FROM organizer_applications WHERE user_id = $1 AND status = $2',
        [req.userId, 'pending']
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'You already have a pending application' });
      }

      const certificateFile = getFilePath('certificate_file');
      const logoFile = getFilePath('logo_file');
      const additionalDocFile = getFilePath('additional_doc_file');

      const result = await query(
        `INSERT INTO organizer_applications 
         (user_id, community_name, description, org_type, year_established,
          facebook, instagram, website, linkedin, tiktok,
          contact_person_name, position_role, contact_info, phone, address,
          target_audience, age_group, category,
          activities, benefits, info_accurate,
          preferred_username, motivation, expected_members,
          meeting_frequency, experience, venue_details,
          authorized_representative,
          certificate_file, logo_file, additional_doc_file)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                 $11, $12, $13, $14, $15, $16, $17, $18,
                 $19, $20, $21, $22, $23, $24, $25, $26, $27,
                 $28, $29, $30, $31)
         RETURNING id, community_name, status, created_at`,
        [
          req.userId,
          community_name,
          description,
          org_type || null,
          year_established || null,
          facebook || null,
          instagram || null,
          website || null,
          linkedin || null,
          tiktok || null,
          contact_person_name || null,
          position_role || null,
          contact_info || null,
          phone || null,
          address || null,
          target_audience || null,
          age_group || null,
          category || null,
          activities || null,
          benefits || null,
          info_accurate === 'true' || info_accurate === true,
          preferred_username || null,
          motivation || null,
          expected_members || null,
          meeting_frequency || null,
          experience || null,
          venue_details || null,
          authorized_representative === 'true' || authorized_representative === true,
          certificateFile,
          logoFile,
          additionalDocFile,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/applications/my - Get current user's application status
userApplicationsRouter.get('/my', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const result = await query(
      `SELECT id, community_name, description, org_type, year_established,
              facebook, instagram, website, linkedin, tiktok,
              contact_person_name, position_role, contact_info, phone, address,
              target_audience, age_group, category,
              activities, benefits, info_accurate,
              preferred_username, motivation, expected_members,
              meeting_frequency, experience, venue_details,
              authorized_representative,
              certificate_file, logo_file, additional_doc_file,
              status, admin_notes, created_at, reviewed_at
       FROM organizer_applications 
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ application: null });
    }
    res.json({ application: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// ---------------
// ADMIN ROUTES — mounted at /api/admin/applications
// ---------------
export const adminApplicationsRouter = express.Router();

// All admin routes require auth + admin
adminApplicationsRouter.use(authMiddleware, adminMiddleware);

// GET /api/admin/applications - List all applications
adminApplicationsRouter.get('/', async (req, res, next) => {
  const statusFilter = req.query.status as string | undefined;

  try {
    let sql = `SELECT a.id, a.community_name, a.status, a.category, a.org_type, a.created_at, 
                      u.id as user_id, u.name as user_name, u.email as user_email
               FROM organizer_applications a
               JOIN users u ON a.user_id = u.id`;
    const params: any[] = [];

    if (statusFilter && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
      sql += ' WHERE a.status = $1';
      params.push(statusFilter);
    }

    sql += ' ORDER BY a.created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/applications/:id - Get application details
adminApplicationsRouter.get('/:id', async (req, res, next) => {
  const appId = Number(req.params.id);

  try {
    const result = await query(
      `SELECT a.*, u.name as user_name, u.email as user_email, u.id as user_id
       FROM organizer_applications a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1`,
      [appId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/applications/:id/review - Approve or reject application
adminApplicationsRouter.put('/:id/review', async (req: AuthRequest, res, next) => {
  const appId = Number(req.params.id);
  const { status, admin_notes } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "approved" or "rejected"' });
  }

  try {
    // Get the application
    const app = await query(
      'SELECT * FROM organizer_applications WHERE id = $1',
      [appId]
    );

    if (app.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = app.rows[0];

    if (application.status !== 'pending') {
      return res.status(400).json({ error: `Application already ${application.status}` });
    }

    if (status === 'approved') {
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(2, 10) + 'A1!';
      const hashedTempPassword = await bcryptjs.hash(tempPassword, 10);

      // Update user role to 'organizer'
      await query('UPDATE users SET role = $1 WHERE id = $2', ['organizer', application.user_id]);

      // Create the community for the applicant
      const communityResult = await query(
        `INSERT INTO communities (name, description, category, owner_id, member_count, website, facebook, instagram, linkedin, tiktok, location, is_verified)
         VALUES ($1, $2, $3, $4, 1, $5, $6, $7, $8, $9, $10, TRUE)
         RETURNING id`,
        [
          application.community_name,
          application.description,
          application.category || null,
          application.user_id,
          application.website || null,
          application.facebook || null,
          application.instagram || null,
          application.linkedin || null,
          application.tiktok || null,
          application.address || null,
        ]
      );

      const communityId = communityResult.rows[0].id;

      // Add the applicant as first member of the community
      await query(
        'INSERT INTO community_members (user_id, community_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [application.user_id, communityId]
      );

      // Update application with temp password
      await query(
        `UPDATE organizer_applications 
         SET status = $1, admin_notes = $2, temp_password = $3, reviewed_at = NOW(), reviewed_by = $4
         WHERE id = $5`,
        [status, admin_notes || null, hashedTempPassword, req.userId, appId]
      );

      // Log activity
      const adminUser = await query('SELECT name FROM users WHERE id = $1', [req.userId]);
      await query(
        'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
        [req.userId, adminUser.rows[0]?.name || '', 'application_approved', `Approved ${application.community_name} application`]
      );

      // Send approval email with temp password (non-blocking)
      const applicant = await query('SELECT name, email FROM users WHERE id = $1', [application.user_id]);
      if (applicant.rows.length > 0) {
        const emailContent = applicationApprovedEmail(
          applicant.rows[0].name,
          application.community_name,
          tempPassword
        );
        sendEmail(applicant.rows[0].email, emailContent.subject, emailContent.html).catch((err) =>
          console.error('Failed to send approval email:', err)
        );
      }

      res.json({
        message: 'Application approved',
        temp_password: tempPassword,
        user_id: application.user_id,
        community_name: application.community_name,
        community_id: communityId,
      });
    } else {
      // Rejected - just update status
      await query(
        `UPDATE organizer_applications 
         SET status = $1, admin_notes = $2, reviewed_at = NOW(), reviewed_by = $3
         WHERE id = $4`,
        [status, admin_notes || null, req.userId, appId]
      );

      // Log activity
      const adminUser = await query('SELECT name FROM users WHERE id = $1', [req.userId]);
      await query(
        'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
        [req.userId, adminUser.rows[0]?.name || '', 'application_rejected', `Rejected ${application.community_name} application`]
      );

      // Send rejection email (non-blocking)
      const applicant = await query('SELECT name, email FROM users WHERE id = $1', [application.user_id]);
      if (applicant.rows.length > 0) {
        const emailContent = applicationRejectedEmail(
          applicant.rows[0].name,
          application.community_name,
          admin_notes || ''
        );
        sendEmail(applicant.rows[0].email, emailContent.subject, emailContent.html).catch((err) =>
          console.error('Failed to send rejection email:', err)
        );
      }

      res.json({ message: 'Application rejected' });
    }
  } catch (error) {
    next(error);
  }
});
