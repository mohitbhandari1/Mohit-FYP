import express from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/discussions/:communityId - Get discussions for a community
router.get('/:communityId', async (req, res, next) => {
  const communityId = Number(req.params.communityId);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    // Get top-level discussions (parent_id IS NULL)
    const result = await query(
      `SELECT d.id, d.content, d.created_at, d.parent_id,
              u.id as author_id, u.name as author_name, u.avatar_url as author_avatar
       FROM community_discussions d
       JOIN users u ON d.user_id = u.id
       WHERE d.community_id = $1 AND d.parent_id IS NULL
       ORDER BY d.created_at DESC
       LIMIT $2 OFFSET $3`,
      [communityId, limit, offset]
    );

    // Get replies for each discussion
    const discussionsWithReplies = await Promise.all(
      result.rows.map(async (discussion: any) => {
        const replies = await query(
          `SELECT d.id, d.content, d.created_at, d.parent_id,
                  u.id as author_id, u.name as author_name, u.avatar_url as author_avatar
           FROM community_discussions d
           JOIN users u ON d.user_id = u.id
           WHERE d.parent_id = $1
           ORDER BY d.created_at ASC`,
          [discussion.id]
        );
        return { ...discussion, replies: replies.rows, reply_count: replies.rows.length };
      })
    );

    // Get total count for pagination
    const countResult = await query(
      'SELECT COUNT(*) as total FROM community_discussions WHERE community_id = $1 AND parent_id IS NULL',
      [communityId]
    );

    res.json({
      discussions: discussionsWithReplies,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/discussions/:communityId - Post a discussion or reply
router.post('/:communityId', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.communityId);
  const { content, parent_id } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    // Check if community exists
    const communityCheck = await query('SELECT id, owner_id FROM communities WHERE id = $1 AND deleted_at IS NULL', [communityId]);
    if (communityCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }

    // Check if user is a member of the community (or the owner)
    const isOwner = communityCheck.rows[0].owner_id === req.userId;
    const isMember = await query(
      'SELECT 1 FROM community_members WHERE user_id = $1 AND community_id = $2',
      [req.userId, communityId]
    );

    if (!isOwner && isMember.rows.length === 0) {
      return res.status(403).json({ error: 'You must join the community to post discussions' });
    }

    // If it's a reply, check that parent exists and belongs to same community
    if (parent_id) {
      const parentCheck = await query(
        'SELECT id FROM community_discussions WHERE id = $1 AND community_id = $2',
        [parent_id, communityId]
      );
      if (parentCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Parent discussion not found in this community' });
      }
    }

    const result = await query(
      `INSERT INTO community_discussions (community_id, user_id, content, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, content, parent_id, created_at`,
      [communityId, req.userId, content.trim(), parent_id || null]
    );

    // Get author info to return with the response
    const user = await query('SELECT id, name, avatar_url FROM users WHERE id = $1', [req.userId]);
    const response = {
      ...result.rows[0],
      author_id: user.rows[0].id,
      author_name: user.rows[0].name,
      author_avatar: user.rows[0].avatar_url,
    };

    // Log activity
    const action = parent_id ? 'discussion_replied' : 'discussion_created';
    const actionDesc = parent_id
      ? `Replied to a discussion in community #${communityId}`
      : `Started a new discussion in community #${communityId}`;
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, user.rows[0]?.name || '', action, actionDesc]
    );

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/discussions/:communityId/:discussionId - Delete a discussion post
router.delete('/:communityId/:discussionId', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.communityId);
  const discussionId = Number(req.params.discussionId);

  try {
    // Only the author, community owner, or admin can delete
    const discussion = await query(
      'SELECT user_id FROM community_discussions WHERE id = $1 AND community_id = $2',
      [discussionId, communityId]
    );
    if (discussion.rows.length === 0) {
      return res.status(404).json({ error: 'Discussion not found' });
    }

    const community = await query('SELECT owner_id FROM communities WHERE id = $1 AND deleted_at IS NULL', [communityId]);
    const isOwner = community.rows[0]?.owner_id === req.userId;
    const isAuthor = discussion.rows[0].user_id === req.userId;
    const isAdmin = req.userRole === 'admin';

    if (!isOwner && !isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await query('DELETE FROM community_discussions WHERE id = $1', [discussionId]);
    res.json({ message: 'Discussion deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
