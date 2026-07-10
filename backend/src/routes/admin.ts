import express from 'express';
import { query } from '../db';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ─── Admin Stats ───

// GET /api/admin/stats - Dashboard statistics
router.get('/stats', authMiddleware, adminMiddleware, async (_req, res, next) => {
  try {
    const [users, communities, events, pendingApps, reviews, trashed] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL'),
      query('SELECT COUNT(*) as count FROM communities WHERE deleted_at IS NULL'),
      query('SELECT COUNT(*) as count FROM events WHERE deleted_at IS NULL'),
      query("SELECT COUNT(*) as count FROM organizer_applications WHERE status = 'pending' AND deleted_at IS NULL"),
      query('SELECT COUNT(*) as count FROM reviews'),
      query(`SELECT COUNT(*) as count FROM (
        SELECT id FROM users WHERE deleted_at IS NOT NULL
        UNION ALL
        SELECT id FROM communities WHERE deleted_at IS NOT NULL
        UNION ALL
        SELECT id FROM events WHERE deleted_at IS NOT NULL
      ) trashed`),
    ]);

    // Recent activity counts (last 7 days)
    const recentUsers = await query(
      "SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '7 days'"
    );
    const recentEvents = await query(
      "SELECT COUNT(*) as count FROM events WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '7 days'"
    );

    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalCommunities: parseInt(communities.rows[0].count),
      totalEvents: parseInt(events.rows[0].count),
      pendingApplications: parseInt(pendingApps.rows[0].count),
      totalReviews: parseInt(reviews.rows[0].count),
      recentUsers: parseInt(recentUsers.rows[0].count),
      recentEvents: parseInt(recentEvents.rows[0].count),
      totalTrashed: parseInt(trashed.rows[0].count),
    });
  } catch (error) {
    next(error);
  }
});

// ─── User Management ───

// GET /api/admin/users - List all users with their owned communities (optionally filter by role)
router.get('/users', authMiddleware, adminMiddleware, async (req, res, next) => {
  const { role, search } = req.query;
  try {
    let sql = `SELECT u.id, u.name, u.email, u.role, u.is_admin, u.avatar_url, u.created_at,
              COALESCE(
                (SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'member_count', c.member_count))
                 FROM communities c WHERE c.owner_id = u.id AND c.deleted_at IS NULL
                ), '[]'::json
              ) as owned_communities,
              COALESCE(
                (SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'member_count', c.member_count, 'owner_name', u2.name))
                 FROM community_members cm
                 JOIN communities c ON cm.community_id = c.id
                 LEFT JOIN users u2 ON c.owner_id = u2.id
                 WHERE cm.user_id = u.id AND c.deleted_at IS NULL
                   AND cm.community_id NOT IN (SELECT id FROM communities WHERE owner_id = u.id AND deleted_at IS NULL)
                ), '[]'::json
              ) as joined_communities
              FROM users u WHERE u.deleted_at IS NULL`;
    const params: any[] = [];
    let paramIdx = 1;

    if (role && typeof role === 'string') {
      sql += ` AND u.role = $${paramIdx++}`;
      params.push(role);
    }

    if (search && typeof search === 'string') {
      sql += ` AND (u.name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    sql += ' ORDER BY u.created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/users/:userId - Get single user details
router.get('/users/:userId', authMiddleware, adminMiddleware, async (req, res, next) => {
  const userId = Number(req.params.userId);
  try {
    const result = await query(
      'SELECT id, name, email, role, is_admin, interests, bio, avatar_url, banner_image, created_at, deleted_at FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:userId/role - Update user role
router.put('/users/:userId/role', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const { role } = req.body;
  const userId = Number(req.params.userId);

  if (!role || !['member', 'organizer', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role must be one of: member, organizer, admin' });
  }

  try {
    const result = await query(
      'UPDATE users SET role = $1, is_admin = $2 WHERE id = $3 RETURNING id, name, email, role',
      [role, role === 'admin', userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log activity
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, 'Admin', 'user_role_changed', `Changed user #${userId} role to ${role}`]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/users/:userId - Soft-delete user (move to trash)
router.delete('/users/:userId', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const userId = Number(req.params.userId);

  // Prevent deleting yourself
  if (userId === req.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    const userCheck = await query('SELECT id, name FROM users WHERE id = $1 AND deleted_at IS NULL', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await query('UPDATE users SET deleted_at = NOW() WHERE id = $1', [userId]);

    // Log activity
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, 'Admin', 'user_deleted', `Moved user to trash: ${userCheck.rows[0].name} (#${userId})`]
    );

    res.json({ message: 'User moved to trash. Will be auto-deleted after 30 days.' });
  } catch (error) {
    next(error);
  }
});

// ─── Community Management ───

// GET /api/admin/communities - List all communities (admin)
router.get('/communities', authMiddleware, adminMiddleware, async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT c.id, c.name, c.description, c.category, c.member_count, c.owner_id, c.is_verified,
              u.name as owner_name, c.created_at
       FROM communities c
       LEFT JOIN users u ON c.owner_id = u.id
       WHERE c.deleted_at IS NULL
       ORDER BY c.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/communities/:id - Edit any community (admin)
router.put('/communities/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.id);
  const { name, description, category, website, is_verified } = req.body;

  try {
    const result = await query(
      `UPDATE communities SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        website = COALESCE($4, website),
        is_verified = COALESCE($5, is_verified)
       WHERE id = $6 RETURNING id, name, description, category, website, is_verified`,
      [name || null, description || null, category || null, website || null, is_verified, communityId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/communities/:id/details - Get community details with demographics (admin)
router.get('/communities/:id/details', authMiddleware, adminMiddleware, async (req, res, next) => {
  const communityId = Number(req.params.id);
  try {
    // Get community info
    const communityResult = await query(
      `SELECT c.*, u.name as owner_name, u.email as owner_email, u.avatar_url as owner_avatar
       FROM communities c
       LEFT JOIN users u ON c.owner_id = u.id
       WHERE c.id = $1 AND c.deleted_at IS NULL`,
      [communityId]
    );

    if (communityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }

    const community = communityResult.rows[0];

    // Get total members count
    const membersResult = await query(
      'SELECT COUNT(*) as count FROM community_members WHERE community_id = $1',
      [communityId]
    );

    // Get gender breakdown from users who are members
    const genderResult = await query(
      `SELECT u.gender, COUNT(*) as count
       FROM community_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.community_id = $1 AND u.gender IS NOT NULL
       GROUP BY u.gender`,
      [communityId]
    );

    // Get total events count
    const eventsResult = await query(
      'SELECT COUNT(*) as count FROM events WHERE community_id = $1',
      [communityId]
    );

    // Get upcoming events count
    const upcomingEventsResult = await query(
      "SELECT COUNT(*) as count FROM events WHERE community_id = $1 AND event_date >= NOW()",
      [communityId]
    );

    // Get total announcements count
    const announcementsResult = await query(
      'SELECT COUNT(*) as count FROM announcements WHERE community_id = $1',
      [communityId]
    );

    // Get total discussions count
    const discussionsResult = await query(
      'SELECT COUNT(*) as count FROM community_discussions WHERE community_id = $1 AND parent_id IS NULL',
      [communityId]
    );

    // Get average rating
    const ratingResult = await query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE community_id = $1',
      [communityId]
    );

    // Build gender breakdown map
    const genderBreakdown: Record<string, number> = {};
    let totalWithGender = 0;
    for (const row of genderResult.rows) {
      genderBreakdown[row.gender] = parseInt(row.count);
      totalWithGender += parseInt(row.count);
    }

    // Recent members (latest 5)
    const recentMembers = await query(
      `SELECT u.id, u.name, u.avatar_url, u.gender, cm.joined_at
       FROM community_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.community_id = $1
       ORDER BY cm.joined_at DESC
       LIMIT 5`,
      [communityId]
    );

    res.json({
      id: community.id,
      name: community.name,
      description: community.description,
      category: community.category,
      website: community.website,
      location: community.location,
      is_verified: community.is_verified,
      is_private: community.is_private,
      member_approval: community.member_approval,
      banner_image: community.banner_image,
      logo: community.logo,
      facebook: community.facebook,
      instagram: community.instagram,
      linkedin: community.linkedin,
      tiktok: community.tiktok,
      created_at: community.created_at,
      owner: {
        id: community.owner_id,
        name: community.owner_name,
        email: community.owner_email,
        avatar_url: community.owner_avatar,
      },
      stats: {
        total_members: parseInt(membersResult.rows[0].count),
        total_events: parseInt(eventsResult.rows[0].count),
        upcoming_events: parseInt(upcomingEventsResult.rows[0].count),
        total_announcements: parseInt(announcementsResult.rows[0].count),
        total_discussions: parseInt(discussionsResult.rows[0].count),
        average_rating: ratingResult.rows[0].avg_rating ? parseFloat(parseFloat(ratingResult.rows[0].avg_rating).toFixed(1)) : null,
        review_count: parseInt(ratingResult.rows[0].review_count),
        members_with_gender: totalWithGender,
        gender_breakdown: genderBreakdown,
      },
      recent_members: recentMembers.rows,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/communities/:id - Soft-delete community (move to trash)
router.delete('/communities/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.id);
  try {
    const community = await query('SELECT name FROM communities WHERE id = $1 AND deleted_at IS NULL', [communityId]);
    if (community.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }

    await query('UPDATE communities SET deleted_at = NOW() WHERE id = $1', [communityId]);

    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, 'Admin', 'community_deleted', `Moved community to trash: ${community.rows[0].name}`]
    );

    res.json({ message: 'Community moved to trash. Will be auto-deleted after 30 days.' });
  } catch (error) {
    next(error);
  }
});

// ─── Event Management ───

// GET /api/admin/events - List all events (admin)
router.get('/events', authMiddleware, adminMiddleware, async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT e.id, e.title, e.description, e.event_date, e.location, e.community_id,
              e.attendee_count, e.max_attendees, e.event_type,
              c.name as community_name
       FROM events e
       JOIN communities c ON e.community_id = c.id
       WHERE e.deleted_at IS NULL AND c.deleted_at IS NULL
       ORDER BY e.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/events/:id - Edit any event (admin)
router.put('/events/:id', authMiddleware, adminMiddleware, async (_req, res, next) => {
  const eventId = Number(_req.params.id);
  const { title, description, event_date, location } = _req.body;

  try {
    const result = await query(
      `UPDATE events SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        event_date = COALESCE($3, event_date),
        location = COALESCE($4, location)
       WHERE id = $5
       RETURNING id, title, description, event_date, location`,
      [title || null, description || null, event_date || null, location || null, eventId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/events/:id - Soft-delete event (move to trash)
router.delete('/events/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const eventId = Number(req.params.id);
  try {
    const event = await query('SELECT title FROM events WHERE id = $1 AND deleted_at IS NULL', [eventId]);
    if (event.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await query('UPDATE events SET deleted_at = NOW() WHERE id = $1', [eventId]);

    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, 'Admin', 'event_deleted', `Moved event to trash: ${event.rows[0].title}`]
    );

    res.json({ message: 'Event moved to trash. Will be auto-deleted after 30 days.' });
  } catch (error) {
    next(error);
  }
});

// ════════════════════════════════════════════════════════
//    TRASH / RECYCLE BIN
// ════════════════════════════════════════════════════════

// GET /api/admin/trash - List all trashed items
router.get('/trash', authMiddleware, adminMiddleware, async (_req, res, next) => {
  try {
    const [trashedUsers, trashedCommunities, trashedEvents, trashedApps] = await Promise.all([
      query("SELECT id, name, email, 'user' as item_type, deleted_at FROM users WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"),
      query("SELECT c.id, c.name, c.description, 'community' as item_type, c.deleted_at, u.name as owner_name FROM communities c LEFT JOIN users u ON c.owner_id = u.id WHERE c.deleted_at IS NOT NULL ORDER BY c.deleted_at DESC"),
      query("SELECT e.id, e.title, 'event' as item_type, e.deleted_at, c.name as parent_name FROM events e LEFT JOIN communities c ON e.community_id = c.id WHERE e.deleted_at IS NOT NULL ORDER BY e.deleted_at DESC"),
      query("SELECT a.id, a.community_name, 'application' as item_type, a.deleted_at, a.status FROM organizer_applications a WHERE a.deleted_at IS NOT NULL ORDER BY a.deleted_at DESC"),
    ]);

    const items = [
      ...trashedUsers.rows.map((r: any) => ({ id: r.id, name: r.name, subtitle: r.email, type: r.item_type, deleted_at: r.deleted_at })),
      ...trashedCommunities.rows.map((r: any) => ({ id: r.id, name: r.name, subtitle: `Owner: ${r.owner_name || 'Unknown'}`, type: r.item_type, deleted_at: r.deleted_at })),
      ...trashedEvents.rows.map((r: any) => ({ id: r.id, name: r.title, subtitle: r.parent_name || '', type: r.item_type, deleted_at: r.deleted_at })),
      ...trashedApps.rows.map((r: any) => ({ id: r.id, name: r.community_name, subtitle: `Status: ${r.status}`, type: r.item_type, deleted_at: r.deleted_at })),
    ];

    // Sort by deleted_at descending
    items.sort((a: any, b: any) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());

    res.json(items);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/trash/:type/:id/restore - Restore a trashed item
router.post('/trash/:type/:id/restore', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const itemId = Number(req.params.id);
  const itemType = req.params.type;

  let tableName: string;
  if (itemType === 'user') tableName = 'users';
  else if (itemType === 'community') tableName = 'communities';
  else if (itemType === 'event') tableName = 'events';
  else if (itemType === 'application') tableName = 'organizer_applications';
  else return res.status(400).json({ error: 'Invalid item type' });

  try {
    // Get name before restoring for logging
    const nameField = itemType === 'event' ? 'title' : itemType === 'application' ? 'community_name' : 'name';
    const before = await query(`SELECT ${nameField} as name FROM ${tableName} WHERE id = $1 AND deleted_at IS NOT NULL`, [itemId]);
    if (before.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found in trash' });
    }

    await query(`UPDATE ${tableName} SET deleted_at = NULL WHERE id = $1`, [itemId]);

    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, 'Admin', 'item_restored', `Restored ${itemType}: ${before.rows[0].name}`]
    );

    res.json({ message: `${itemType} restored successfully` });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/trash/:type/:id/permanent - Permanently delete a trashed item
router.delete('/trash/:type/:id/permanent', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const itemId = Number(req.params.id);
  const itemType = req.params.type;

  let tableName: string;
  if (itemType === 'user') tableName = 'users';
  else if (itemType === 'community') tableName = 'communities';
  else if (itemType === 'event') tableName = 'events';
  else if (itemType === 'application') tableName = 'organizer_applications';
  else return res.status(400).json({ error: 'Invalid item type' });

  try {
    const nameField = itemType === 'event' ? 'title' : itemType === 'application' ? 'community_name' : 'name';
    const before = await query(`SELECT ${nameField} as name FROM ${tableName} WHERE id = $1 AND deleted_at IS NOT NULL`, [itemId]);
    if (before.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found in trash' });
    }

    await query(`DELETE FROM ${tableName} WHERE id = $1 AND deleted_at IS NOT NULL`, [itemId]);

    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, 'Admin', 'item_permanently_deleted', `Permanently deleted ${itemType}: ${before.rows[0].name}`]
    );

    res.json({ message: `${itemType} permanently deleted` });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/trash/cleanup - Manually purge items older than 30 days
router.post('/trash/cleanup', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const cutoff = "NOW() - INTERVAL '30 days'";
  try {
    const [usersDel, communitiesDel, eventsDel, appsDel] = await Promise.all([
      query(`DELETE FROM users WHERE deleted_at IS NOT NULL AND deleted_at < ${cutoff}`),
      query(`DELETE FROM communities WHERE deleted_at IS NOT NULL AND deleted_at < ${cutoff}`),
      query(`DELETE FROM events WHERE deleted_at IS NOT NULL AND deleted_at < ${cutoff}`),
      query(`DELETE FROM organizer_applications WHERE deleted_at IS NOT NULL AND deleted_at < ${cutoff}`),
    ]);

    const total = (usersDel.rowCount ?? 0) + (communitiesDel.rowCount ?? 0) + (eventsDel.rowCount ?? 0) + (appsDel.rowCount ?? 0);

    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, 'Admin', 'trash_cleaned', `Auto-purged ${total} items older than 30 days`]
    );

    res.json({
      message: `Purged ${total} items older than 30 days`,
      purged: { users: usersDel.rowCount ?? 0, communities: communitiesDel.rowCount ?? 0, events: eventsDel.rowCount ?? 0, applications: appsDel.rowCount ?? 0 },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
