import express from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/announcements/:communityId - Get announcements for a community
router.get('/:communityId', async (req, res, next) => {
  const communityId = Number(req.params.communityId);
  try {
    const result = await query(
      `SELECT a.id, a.title, a.content, a.created_at, a.updated_at,
              u.id as author_id, u.name as author_name, u.avatar_url as author_avatar
       FROM announcements a
       JOIN users u ON a.created_by = u.id
       WHERE a.community_id = $1
       ORDER BY a.created_at DESC`,
      [communityId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// POST /api/announcements/:communityId - Create announcement (owner only)
router.post('/:communityId', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.communityId);
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  try {
    // Verify user owns this community (or is admin)
    const community = await query('SELECT owner_id, name FROM communities WHERE id = $1 AND deleted_at IS NULL', [communityId]);
    if (community.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }
    if (community.rows[0].owner_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Only the community owner can post announcements' });
    }

    const result = await query(
      'INSERT INTO announcements (community_id, title, content, created_by) VALUES ($1, $2, $3, $4) RETURNING id, title, content, created_at',
      [communityId, title, content, req.userId]
    );

    // Log activity
    const user = await query('SELECT name FROM users WHERE id = $1', [req.userId]);
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, user.rows[0]?.name || '', 'announcement_created', `Posted announcement "${title}" in ${community.rows[0].name}`]
    );

    // ─── Notify all community members about the new announcement ───
    const communityName = community.rows[0].name;
    const communityLogo = community.rows[0].logo || null;
    const members = await query(
      'SELECT user_id FROM community_members WHERE community_id = $1 AND user_id != $2',
      [communityId, req.userId]
    );

    if (members.rows.length > 0) {
      const { createNotificationsForUsers } = await import('../notificationHelper');
      const memberIds = members.rows.map((m: any) => m.user_id);
      createNotificationsForUsers(
        memberIds,
        'announcement',
        `New Announcement in ${communityName}`,
        title,
        `/communities/${communityId}`,
        communityLogo
      ).catch((err) => console.error('Failed to create announcement notifications:', err));
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/announcements/:communityId/:announcementId - Edit announcement
router.put('/:communityId/:announcementId', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.communityId);
  const announcementId = Number(req.params.announcementId);
  const { title, content } = req.body;

  try {
    const community = await query('SELECT owner_id FROM communities WHERE id = $1 AND deleted_at IS NULL', [communityId]);
    if (community.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }
    if (community.rows[0].owner_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await query(
      `UPDATE announcements SET title = COALESCE($1, title), content = COALESCE($2, content), updated_at = NOW()
       WHERE id = $3 AND community_id = $4
       RETURNING id, title, content, updated_at`,
      [title || null, content || null, announcementId, communityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/announcements/:communityId/:announcementId - Delete announcement
router.delete('/:communityId/:announcementId', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.communityId);
  const announcementId = Number(req.params.announcementId);

  try {
    const community = await query('SELECT owner_id FROM communities WHERE id = $1 AND deleted_at IS NULL', [communityId]);
    if (community.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }
    if (community.rows[0].owner_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await query(
      'DELETE FROM announcements WHERE id = $1 AND community_id = $2 RETURNING id',
      [announcementId, communityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
