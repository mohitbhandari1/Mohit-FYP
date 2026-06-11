import express from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/discussions/:communityId - Get discussions for a community
router.get('/:communityId', async (req, res, next) => {
  const communityId = Number(req.params.communityId);
  try {
    // Get top-level discussions (parent_id IS NULL)
    const result = await query(
      `SELECT d.id, d.content, d.created_at, d.parent_id,
              u.id as author_id, u.name as author_name
       FROM community_discussions d
       JOIN users u ON d.user_id = u.id
       WHERE d.community_id = $1 AND d.parent_id IS NULL
       ORDER BY d.created_at DESC`,
      [communityId]
    );

    // Get replies for each discussion
    const discussionsWithReplies = await Promise.all(
      result.rows.map(async (discussion) => {
        const replies = await query(
          `SELECT d.id, d.content, d.created_at, d.parent_id,
                  u.id as author_id, u.name as author_name
           FROM community_discussions d
           JOIN users u ON d.user_id = u.id
           WHERE d.parent_id = $1
           ORDER BY d.created_at ASC`,
          [discussion.id]
        );
        return { ...discussion, replies: replies.rows };
      })
    );

    res.json(discussionsWithReplies);
  } catch (error) {
    next(error);
  }
});

// POST /api/discussions/:communityId - Post a discussion (members who joined can post)
router.post('/:communityId', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.communityId);
  const { content, parent_id } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    // Check if user is a member of the community (or the owner)
    const isOwner = await query(
      'SELECT owner_id FROM communities WHERE id = $1 AND owner_id = $2',
      [communityId, req.userId]
    );
    const isMember = await query(
      'SELECT 1 FROM community_members WHERE user_id = $1 AND community_id = $2',
      [req.userId, communityId]
    );

    if (isOwner.rows.length === 0 && isMember.rows.length === 0) {
      return res.status(403).json({ error: 'You must join the community to post discussions' });
    }

    const result = await query(
      'INSERT INTO community_discussions (community_id, user_id, content, parent_id) VALUES ($1, $2, $3, $4) RETURNING id, content, parent_id, created_at',
      [communityId, req.userId, content, parent_id || null]
    );

    // Log activity
    const user = await query('SELECT name FROM users WHERE id = $1', [req.userId]);
    const action = parent_id ? 'discussion_replied' : 'discussion_created';
    const actionDesc = parent_id
      ? `Replied to a discussion in community #${communityId}`
      : `Started a new discussion in community #${communityId}`;
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, user.rows[0]?.name || '', action, actionDesc]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/discussions/:communityId/:discussionId - Delete a discussion post
router.delete('/:communityId/:discussionId', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.communityId);
  const discussionId = Number(req.params.discussionId);

  try {
    // Only the author or the community owner can delete
    const discussion = await query(
      'SELECT user_id FROM community_discussions WHERE id = $1 AND community_id = $2',
      [discussionId, communityId]
    );
    if (discussion.rows.length === 0) {
      return res.status(404).json({ error: 'Discussion not found' });
    }

    const community = await query('SELECT owner_id FROM communities WHERE id = $1', [communityId]);
    const isOwner = community.rows[0]?.owner_id === req.userId;
    const isAuthor = discussion.rows[0].user_id === req.userId;

    if (!isOwner && !isAuthor) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await query('DELETE FROM community_discussions WHERE id = $1', [discussionId]);
    res.json({ message: 'Discussion deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
