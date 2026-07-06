import express from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/recommendations - Get community recommendations based on user interests
router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    // Fetch user's interests and joined communities
    const userResult = await query<{ id: number; interests: string }>(
      'SELECT id, interests FROM users WHERE id = $1',
      [req.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const interests = user.interests
      ? user.interests.split(',').map((i: string) => i.trim().toLowerCase()).filter((i: string) => i.length > 0)
      : [];

    // Get communities user already joined (to exclude them or rank lower)
    const joinedResult = await query(
      'SELECT community_id FROM community_members WHERE user_id = $1',
      [req.userId]
    );
    const joinedIds = new Set(joinedResult.rows.map((r: any) => r.community_id));

    // Fetch all communities
    const communitiesResult = await query<any>(
      `SELECT c.id, c.name, c.description, c.category, c.member_count,
              c.owner_id, c.logo, c.banner_image, c.location, c.is_verified,
              u.name as owner_name
       FROM communities c
       LEFT JOIN users u ON c.owner_id = u.id
       ORDER BY c.member_count DESC`
    );

    // Score communities by interest match (AI keyword matching)
    const scored = communitiesResult.rows.map((community: any) => {
      let score = 0;
      const searchText = `${community.name} ${community.description} ${community.category || ''}`.toLowerCase();
      const isJoined = joinedIds.has(community.id);

      if (interests.length === 0) {
        // No interests defined: score by member count (popular communities)
        score = (community.member_count || 0) * 0.1;
      } else {
        for (const interest of interests) {
          if (interest.length < 2) continue;
          // Escape regex special chars
          const escaped = interest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escaped}\\b|${escaped}`, 'i');

          if (regex.test(searchText)) {
            // Weight: name match > category match > description match
            if (regex.test(community.name.toLowerCase())) score += 5;
            else if (community.category && regex.test(community.category.toLowerCase())) score += 3;
            else score += 1;
          }

          // Partial/fuzzy match: check if interest is substring
          if (searchText.includes(interest)) {
            score += 0.5;
          }
        }
        // Boost for popular communities
        score += (community.member_count || 0) * 0.02;
      }

      // If already joined, reduce score significantly (user already has it)
      if (isJoined) {
        score *= 0.1;
      }

      // Boost verified communities slightly
      if (community.is_verified) {
        score += 0.5;
      }

      return {
        ...community,
        score: Math.round(score * 100) / 100,
        is_joined: isJoined,
      };
    });

    // Sort by score descending, then by member count
    scored.sort((a: any, b: any) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.member_count || 0) - (a.member_count || 0);
    });

    // Return top recommendations (exclude already joined if requested)
    const excludeJoined = req.query.exclude_joined === 'true';
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    let results = scored;

    if (excludeJoined) {
      results = results.filter((c: any) => !c.is_joined);
    }

    res.json({
      recommendations: results.slice(0, limit),
      interests: user.interests || '',
      total_available: results.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
