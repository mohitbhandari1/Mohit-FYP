import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sendEmail, membershipApprovedEmail, membershipRejectedEmail, membershipSubmittedEmail, communityJoinedEmail } from '../email';
import { createNotification } from '../notificationHelper';

const router = express.Router();

// ─── File Upload Setup for Communities ───
const communityStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '../../uploads/communities');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `community-${uniqueSuffix}${ext}`);
  },
});

const uploadCommunityImages = multer({
  storage: communityStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
    }
  },
});

// Helper to extract uploaded file paths from multer result
function getCommunityFileUrls(files: { [fieldname: string]: Express.Multer.File[] } | undefined): { banner_url?: string; logo_url?: string } {
  const result: { banner_url?: string; logo_url?: string } = {};
  if (!files) return result;
  if (files['banner_image'] && files['banner_image'].length > 0) {
    result.banner_url = '/uploads/communities/' + files['banner_image'][0].filename;
  }
  if (files['logo'] && files['logo'].length > 0) {
    result.logo_url = '/uploads/communities/' + files['logo'][0].filename;
  }
  return result;
}

// GET /api/communities - List communities with filtering
router.get('/', async (req, res, next) => {
  const searchTerm = req.query.search ? `%${req.query.search}%` : null;
  const category = req.query.category as string;
  const sort = req.query.sort as string; // newest | oldest | popular | name
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    let sql = `SELECT c.id, c.name, c.description, c.category, c.website, c.owner_id,
              c.member_count, c.banner_image, c.logo, c.location, c.is_verified,
              c.facebook, c.instagram, c.linkedin, c.tiktok,
              c.is_private, c.member_approval,
              c.created_at,
              u.name as owner_name
              FROM communities c LEFT JOIN users u ON c.owner_id = u.id WHERE c.deleted_at IS NULL`;
    const params: any[] = [];
    let paramIdx = 1;

    if (searchTerm) {
      sql += ` AND (c.name ILIKE $${paramIdx} OR c.description ILIKE $${paramIdx})`;
      params.push(searchTerm);
      paramIdx++;
    }

    if (category) {
      // Case-insensitive, tolerant match: "health" finds "Health & Wellness",
      // "social" finds "Social Service", etc.
      sql += ` AND c.category ILIKE $${paramIdx}`;
      params.push(`%${category}%`);
      paramIdx++;
    }

    // Sort by established date (created_at) or popularity or name.
    if (sort === 'newest') {
      sql += ' ORDER BY c.created_at DESC, c.id DESC';
    } else if (sort === 'oldest') {
      sql += ' ORDER BY c.created_at ASC, c.id ASC';
    } else if (sort === 'name') {
      sql += ' ORDER BY LOWER(c.name) ASC, c.id ASC';
    } else {
      sql += ' ORDER BY c.member_count DESC, c.id DESC';
    }
    sql += ` LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Also get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM communities WHERE deleted_at IS NULL';
    const countParams: any[] = [];
    let countIdx = 1;

    if (searchTerm) {
      countSql += ` AND (name ILIKE $${countIdx} OR description ILIKE $${countIdx})`;
      countParams.push(searchTerm);
      countIdx++;
    }
    if (category) {
      countSql += ` AND category ILIKE $${countIdx}`;
      countParams.push(`%${category}%`);
      countIdx++;
    }

    const countResult = await query(countSql, countParams);

    // Related communities from OTHER categories (popular first). Returned when a
    // category filter is active so the page never looks empty and users discover
    // communities in similar categories (e.g. Health → Technology, Sports).
    let related: any[] = [];
    if (category && result.rows.length < 4) {
      const excludeIds = result.rows.map((r: any) => r.id);
      const relatedRes = await query(
        `SELECT c.id, c.name, c.description, c.category, c.website, c.owner_id,
                c.member_count, c.banner_image, c.logo, c.location, c.is_verified,
                c.facebook, c.instagram, c.linkedin, c.tiktok,
                c.is_private, c.member_approval,
                c.created_at,
                u.name as owner_name
         FROM communities c LEFT JOIN users u ON c.owner_id = u.id
         WHERE c.deleted_at IS NULL
           AND (c.category IS NULL OR c.category NOT ILIKE $1)
           AND NOT (c.id = ANY($2::int[]))
         ORDER BY c.member_count DESC, c.id DESC
         LIMIT 3`,
        [`%${category}%`, excludeIds.length ? excludeIds : [0]]
      );
      related = relatedRes.rows;
    }

    res.json({
      communities: result.rows,
      related,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/communities/categories - List distinct categories
router.get('/categories', async (_req, res, next) => {
  try {
    const result = await query('SELECT DISTINCT category FROM communities WHERE category IS NOT NULL AND deleted_at IS NULL ORDER BY category');
    res.json(result.rows.map((r: any) => r.category));
  } catch (error) {
    next(error);
  }
});

// GET /api/communities/my-owned - Get communities owned by current user
router.get('/my-owned', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const result = await query(
      `SELECT c.*, u.name as owner_name
       FROM communities c LEFT JOIN users u ON c.owner_id = u.id
       WHERE c.owner_id = $1 AND c.deleted_at IS NULL
       ORDER BY c.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/communities/:id - Get community details
router.get('/:id', async (req, res, next) => {
  const communityId = Number(req.params.id);
  if (isNaN(communityId)) {
    return res.status(400).json({ error: 'Invalid community ID' });
  }

  try {
    const result = await query(
      `SELECT c.*, u.name as owner_name, u.email as owner_email, u.avatar_url as owner_avatar
       FROM communities c LEFT JOIN users u ON c.owner_id = u.id WHERE c.id = $1 AND c.deleted_at IS NULL`,
      [communityId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST /api/communities - Create community (supports file uploads)
router.post('/', authMiddleware, uploadCommunityImages.fields([
  { name: 'banner_image', maxCount: 1 },
  { name: 'logo', maxCount: 1 },
]), async (req: AuthRequest, res, next) => {
  const { name, description, category, website, location } = req.body;
  if (!name || !description) {
    return res.status(400).json({ error: 'Name and description are required' });
  }

  try {
    // Get uploaded file URLs
    const fileUrls = getCommunityFileUrls(req.files as any);
    const bannerImage = fileUrls.banner_url || req.body.banner_image || null;
    const logoImage = fileUrls.logo_url || req.body.logo || null;

    const result = await query(
      `INSERT INTO communities (name, description, category, website, location, logo, banner_image, owner_id, member_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1) RETURNING *`,
      [name, description, category || null, website || null, location || null, logoImage, bannerImage, req.userId]
    );

    // Auto-join the owner as a member
    await query(
      'INSERT INTO community_members (user_id, community_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.userId, result.rows[0].id]
    );

    // Log activity
    const user = await query('SELECT name FROM users WHERE id = $1', [req.userId]);
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, user.rows[0]?.name || '', 'community_created', `Created community: ${name}`]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/communities/:id - Update community (supports file uploads)
router.put('/:id', authMiddleware, uploadCommunityImages.fields([
  { name: 'banner_image', maxCount: 1 },
  { name: 'logo', maxCount: 1 },
]), async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.id);
  const {
    name, description, category, website, location,
    facebook, instagram, linkedin, tiktok,
    is_private, member_approval, membership_open, membership_form_url
  } = req.body;

  try {
    // Allow owner or admin to edit
    const community = await query('SELECT owner_id, banner_image, logo FROM communities WHERE id = $1 AND deleted_at IS NULL', [communityId]);
    if (community.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }
    if (community.rows[0].owner_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to edit this community' });
    }

    // Get uploaded file URLs (files take priority over body fields)
    const fileUrls = getCommunityFileUrls(req.files as any);
    const banner_image = fileUrls.banner_url || req.body.banner_image || community.rows[0].banner_image;
    const logo = fileUrls.logo_url || req.body.logo || community.rows[0].logo;

    // Delete old files if new ones uploaded
    if (fileUrls.banner_url && community.rows[0].banner_image) {
      const oldPath = path.join(__dirname, '../..', community.rows[0].banner_image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    if (fileUrls.logo_url && community.rows[0].logo) {
      const oldPath = path.join(__dirname, '../..', community.rows[0].logo);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const result = await query(
      `UPDATE communities SET
        name = COALESCE($1, name), description = COALESCE($2, description),
        category = COALESCE($3, category), website = COALESCE($4, website),
        location = COALESCE($5, location),
        banner_image = COALESCE($6, banner_image), logo = COALESCE($7, logo),
        facebook = COALESCE($8, facebook), instagram = COALESCE($9, instagram),
        linkedin = COALESCE($10, linkedin), tiktok = COALESCE($11, tiktok),
        is_private = COALESCE($12, is_private), member_approval = COALESCE($13, member_approval),
        membership_open = COALESCE($14, membership_open),
        membership_form_url = $15
       WHERE id = $16 RETURNING *`,
      [name || null, description || null, category || null, website || null,
       location || null, banner_image || null, logo || null,
       facebook || null, instagram || null, linkedin || null, tiktok || null,
       is_private ?? null, member_approval ?? null, membership_open ?? null,
       typeof membership_form_url === 'string' ? membership_form_url.trim() || null : null, communityId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/communities/:id - Soft-delete community (move to trash)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.id);
  try {
    const community = await query('SELECT owner_id, name FROM communities WHERE id = $1 AND deleted_at IS NULL', [communityId]);
    if (community.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }
    // Allow owner or admin
    if (community.rows[0].owner_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this community' });
    }

    await query('UPDATE communities SET deleted_at = NOW() WHERE id = $1', [communityId]);

    // Log activity
    const user = await query('SELECT name FROM users WHERE id = $1', [req.userId]);
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, user.rows[0]?.name || '', 'community_deleted', `Moved community to trash: ${community.rows[0].name}`]
    );

    res.json({ message: 'Community moved to trash.' });
  } catch (error) {
    next(error);
  }
});

// GET /api/communities/:id/members - Get community members (organizer/manager only)
router.get('/:id/members', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.id);
  try {
    const community = await query(
      'SELECT owner_id FROM communities WHERE id = $1 AND deleted_at IS NULL',
      [communityId]
    );
    if (community.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }
    if (community.rows[0].owner_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Only the community organizer/manager can view the member list' });
    }

    const result = await query(
      `SELECT u.id, u.name, u.email, u.avatar_url, u.role, cm.joined_at
       FROM community_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.community_id = $1
       ORDER BY cm.joined_at ASC`,
      [communityId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/communities/:id/events - Get community events (past/upcoming)
router.get('/:id/events', async (req, res, next) => {
  const communityId = Number(req.params.id);
  const type = req.query.type as string; // 'upcoming' or 'past'

  try {
    let sql = `SELECT e.*, c.name as community_name
               FROM events e JOIN communities c ON e.community_id = c.id
               WHERE e.community_id = $1 AND e.deleted_at IS NULL`;
    if (type === 'upcoming') sql += ' AND e.event_date >= NOW() ORDER BY e.event_date ASC';
    else if (type === 'past') sql += ' AND e.event_date < NOW() ORDER BY e.event_date DESC';
    else sql += ' ORDER BY e.event_date DESC';

    const result = await query(sql, [communityId]);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/communities/:id/membership - Check if current user is a member
router.get('/:id/membership', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.id);
  try {
    const result = await query(
      'SELECT 1 FROM community_members WHERE user_id = $1 AND community_id = $2',
      [req.userId, communityId]
    );
    res.json({ is_member: result.rows.length > 0 });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/communities/:id/members/:userId - Remove a member (owner only)
router.delete('/:id/members/:userId', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);

  try {
    // Check community exists and user is the owner
    const community = await query('SELECT id, name, owner_id FROM communities WHERE id = $1 AND deleted_at IS NULL', [communityId]);
    if (community.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }

    // Only the community owner can remove members
    if (community.rows[0].owner_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Only the community owner can remove members' });
    }

    // Cannot remove the owner
    if (targetUserId === community.rows[0].owner_id) {
      return res.status(400).json({ error: 'Cannot remove the community owner' });
    }

    // Check if user is a member
    const existing = await query(
      'SELECT 1 FROM community_members WHERE user_id = $1 AND community_id = $2',
      [targetUserId, communityId]
    );

    if (existing.rows.length === 0) {
      return res.status(400).json({ error: 'User is not a member of this community' });
    }

    // Remove member
    await query('DELETE FROM community_members WHERE user_id = $1 AND community_id = $2', [
      targetUserId,
      communityId,
    ]);
    // Decrement member_count
    await query('UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1', [communityId]);

    // Log activity
    const user = await query('SELECT name FROM users WHERE id = $1', [req.userId]);
    const removedUser = await query('SELECT name FROM users WHERE id = $1', [targetUserId]);
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, user.rows[0]?.name || '', 'member_removed', `Removed member ${removedUser.rows[0]?.name || 'unknown'} from community: ${community.rows[0].name}`]
    );

    res.json({ message: 'Member removed', removed: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/communities/:id/join - Join a community
router.post('/:id/join', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.id);
  try {
    // Check community exists
    const community = await query('SELECT id, name FROM communities WHERE id = $1 AND deleted_at IS NULL', [communityId]);
    if (community.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }

    // Check if user is already a member
    const existing = await query(
      'SELECT 1 FROM community_members WHERE user_id = $1 AND community_id = $2',
      [req.userId, communityId]
    );

    if (existing.rows.length > 0) {
      return res.json({ message: 'Already a member', already_member: true });
    }

    // Insert membership
    await query('INSERT INTO community_members (user_id, community_id) VALUES ($1, $2)', [
      req.userId,
      communityId,
    ]);
    // Increment member_count
    await query('UPDATE communities SET member_count = member_count + 1 WHERE id = $1', [communityId]);

    // Log activity
    const user = await query('SELECT name FROM users WHERE id = $1', [req.userId]);
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, user.rows[0]?.name || '', 'community_join', `Joined community: ${community.rows[0].name}`]
    );

    // Send welcome email (non-blocking) — parity with engagement join endpoint
    const memberEmail = await query('SELECT email FROM users WHERE id = $1', [req.userId]);
    if (memberEmail.rows.length > 0) {
      const emailContent = communityJoinedEmail(user.rows[0]?.name || 'Member', community.rows[0].name);
      sendEmail(memberEmail.rows[0].email, emailContent.subject, emailContent.html).catch((err) =>
        console.error('Failed to send community joined email:', err)
      );
    }

    // Create in-app notification (non-blocking, respects user preferences)
    if (req.userId) createNotification(
      req.userId, 'community_joined',
      `Welcome to ${community.rows[0].name}!`,
      `You've successfully joined ${community.rows[0].name}.`,
      `/communities/${communityId}`
    ).catch(() => {});

    res.json({ message: 'Joined community', joined: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/communities/:id/leave - Leave a community
router.post('/:id/leave', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.id);
  try {
    // Check community exists
    const community = await query('SELECT id, name, owner_id FROM communities WHERE id = $1 AND deleted_at IS NULL', [communityId]);
    if (community.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }

    // Owner cannot leave their own community
    if (community.rows[0].owner_id === req.userId) {
      return res.status(400).json({ error: 'Community owner cannot leave their own community' });
    }

    // Check if user is a member
    const existing = await query(
      'SELECT 1 FROM community_members WHERE user_id = $1 AND community_id = $2',
      [req.userId, communityId]
    );

    if (existing.rows.length === 0) {
      return res.status(400).json({ error: 'You are not a member of this community' });
    }

    // Remove membership
    await query('DELETE FROM community_members WHERE user_id = $1 AND community_id = $2', [
      req.userId,
      communityId,
    ]);
    // Decrement member_count
    await query('UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1', [communityId]);

    // Log activity
    const user = await query('SELECT name FROM users WHERE id = $1', [req.userId]);
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, user.rows[0]?.name || '', 'community_leave', `Left community: ${community.rows[0].name}`]
    );

    res.json({ message: 'Left community', left: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/communities/:id/sponsors - Get community sponsors
router.get('/:id/sponsors', async (req, res, next) => {
  const communityId = Number(req.params.id);
  try {
    const result = await query(
      'SELECT * FROM community_sponsors WHERE community_id = $1 ORDER BY created_at DESC',
      [communityId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/communities/:id/export - Download member list as XLSX (owner/admin only)
router.get('/:id/export', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.id);
  try {
    const community = await query(
      'SELECT id, name, owner_id FROM communities WHERE id = $1 AND deleted_at IS NULL',
      [communityId]
    );
    if (community.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }
    if (community.rows[0].owner_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to export members' });
    }

    const members = await query(
      `SELECT u.name, u.email, u.role, cm.joined_at
       FROM community_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.community_id = $1
       ORDER BY cm.joined_at ASC`,
      [communityId]
    );

    const header = ['Name', 'Email', 'Role', 'Joined Date'];
    const rows = members.rows.map((m: any) => [
      m.name || '',
      m.email || '',
      m.role || 'member',
      m.joined_at ? new Date(m.joined_at).toLocaleString() : '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = header.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `${community.rows[0].name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}_members.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// ─── Membership Toggle (organizer/admin) ───
router.patch('/:id/membership-toggle', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    const community = await query('SELECT owner_id FROM communities WHERE id = $1', [req.params.id]);
    if (!community.rows.length) { res.status(404).json({ error: 'Community not found' }); return; }
    if (community.rows[0].owner_id !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized' }); return;
    }
    const { membership_open } = req.body;
    const result = await query(
      'UPDATE communities SET membership_open = $1 WHERE id = $2 RETURNING id, membership_open',
      [membership_open, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

// ─── Membership Applications ───

// GET /api/communities/:id/membership-application — Get current user's application
router.get('/:id/membership-application', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Not authenticated' }); return; }
    const result = await query(
      'SELECT * FROM membership_applications WHERE user_id = $1 AND community_id = $2',
      [userId, req.params.id]
    );
    res.json(result.rows[0] || null);
  } catch (error) { next(error); }
});

// POST /api/communities/:id/membership-application — Submit application
router.post('/:id/membership-application', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Not authenticated' }); return; }
    const { full_name, email, phone, organization_name, position, reason, experience, availability, additional_info } = req.body;
    if (!full_name || !email || !reason) {
      res.status(400).json({ error: 'Full name, email, and reason are required' });
      return;
    }
    // ─── 10-digit phone validation ───
    if (phone !== undefined && phone !== null && String(phone).trim() !== '') {
      const digits = String(phone).replace(/\D/g, '');
      const local = digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits;
      if (local.length !== 10) {
        res.status(400).json({
          error: 'Phone number must be exactly 10 digits',
          message: 'Please enter a valid 10-digit phone number (e.g. 9876543210).',
        });
        return;
      }
    }
    // Check if already applied
    const existing = await query(
      'SELECT id, status FROM membership_applications WHERE user_id = $1 AND community_id = $2',
      [userId, req.params.id]
    );
    if (existing.rows.length > 0 && existing.rows[0].status !== 'rejected') {
      res.status(400).json({ error: 'You have already applied. Status: ' + existing.rows[0].status });
      return;
    }
    // If rejected, update instead of insert
    if (existing.rows.length > 0) {
      const result = await query(
        `UPDATE membership_applications SET full_name=$1, email=$2, phone=$3, organization_name=$4, position=$5,
         reason=$6, experience=$7, availability=$8, additional_info=$9, status='pending',
         admin_notes=NULL, reviewed_at=NULL, reviewed_by=NULL, created_at=NOW()
         WHERE user_id=$10 AND community_id=$11 RETURNING *`,
        [full_name, email, phone, organization_name, position, reason, experience, availability, additional_info, userId, req.params.id]
      );
      res.status(201).json(result.rows[0]);
      return;
    }
    const result = await query(
      `INSERT INTO membership_applications (user_id, community_id, full_name, email, phone, organization_name, position, reason, experience, availability, additional_info)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [userId, req.params.id, full_name, email, phone, organization_name, position, reason, experience, availability, additional_info]
    );

    // Send submission confirmation email
    try {
      const commRes = await query('SELECT name FROM communities WHERE id = $1', [req.params.id]);
      const userRes = await query('SELECT name FROM users WHERE id = $1', [userId]);
      if (commRes.rows.length && userRes.rows.length) {
        const communityName = commRes.rows[0].name;
        const userName = userRes.rows[0].name;
        const emailContent = membershipSubmittedEmail(userName, communityName);
        sendEmail(email, emailContent.subject, emailContent.html);
      }
    } catch (emailErr) { console.error('[Email] Failed to send membership submission email:', emailErr); }

    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

// GET /api/communities/:id/membership-applications — Get all applications (admin/owner only)
router.get('/:id/membership-applications', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    const community = await query('SELECT owner_id FROM communities WHERE id = $1', [req.params.id]);
    if (!community.rows.length) { res.status(404).json({ error: 'Community not found' }); return; }
    if (community.rows[0].owner_id !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized' }); return;
    }
    const result = await query(
      `SELECT ma.*, u.name as user_name, u.avatar_url
       FROM membership_applications ma
       JOIN users u ON ma.user_id = u.id
       WHERE ma.community_id = $1
       ORDER BY ma.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) { next(error); }
});

// PATCH /api/communities/:id/membership-applications/:appId — Review application (admin/owner)
router.patch('/:id/membership-applications/:appId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    const community = await query('SELECT owner_id FROM communities WHERE id = $1', [req.params.id]);
    if (!community.rows.length) { res.status(404).json({ error: 'Community not found' }); return; }
    if (community.rows[0].owner_id !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized' }); return;
    }
    const { status, admin_notes } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' }); return;
    }
    const result = await query(
      `UPDATE membership_applications SET status=$1, admin_notes=$2, reviewed_at=NOW(), reviewed_by=$3
       WHERE id=$4 AND community_id=$5 RETURNING *`,
      [status, admin_notes, userId, req.params.appId, req.params.id]
    );
    if (!result.rows.length) { res.status(404).json({ error: 'Application not found' }); return; }

    // Send email notification to applicant
    try {
      const userRes = await query('SELECT name, email FROM users WHERE id = $1', [result.rows[0].user_id]);
      const commRes = await query('SELECT name FROM communities WHERE id = $1', [req.params.id]);
      if (userRes.rows.length && commRes.rows.length) {
        const userName = userRes.rows[0].name;
        const userEmail = userRes.rows[0].email;
        const communityName = commRes.rows[0].name;
        if (status === 'approved') {
          const emailContent = membershipApprovedEmail(userName, communityName);
          sendEmail(userEmail, emailContent.subject, emailContent.html);
          createNotification(
            result.rows[0].user_id, 'membership_approved',
            `Membership Approved: ${communityName}`,
            `Your membership application for ${communityName} has been approved. Welcome aboard!`,
            `/communities/${req.params.id}`
          ).catch(() => {});
        } else if (status === 'rejected') {
          const emailContent = membershipRejectedEmail(userName, communityName, admin_notes);
          sendEmail(userEmail, emailContent.subject, emailContent.html);
          createNotification(
            result.rows[0].user_id, 'membership_rejected',
            `Membership Update: ${communityName}`,
            `Your membership application for ${communityName} was not approved at this time.`,
            `/communities/${req.params.id}`
          ).catch(() => {});
        }
      }
    } catch (emailErr) { console.error('[Email] Failed to send membership review email:', emailErr); }

    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

export default router;
