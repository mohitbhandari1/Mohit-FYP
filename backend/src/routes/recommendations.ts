import express from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/recommendations - Get community recommendations based on user interests
router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    // Fetch user's interests
    const userResult = await query<{ id: number; interests: string }>(
      'SELECT id, interests FROM users WHERE id = $1',
      [req.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const interests = user.interests
      ? user.interests.split(',').map((i: string) => i.trim().toLowerCase())
      : [];

    // Fetch all communities
    const communitiesResult = await query<any>(
      `SELECT c.id, c.name, c.description, c.category, c.member_count, 
              c.owner_id, u.name as owner_name
       FROM communities c 
       LEFT JOIN users u ON c.owner_id = u.id 
       ORDER BY c.member_count DESC`
    );

    // Score communities by interest match
    const scored = communitiesResult.rows.map((community: any) => {
      let score = 0;
      const searchText = `${community.name} ${community.description} ${community.category || ''}`.toLowerCase();

      if (interests.length === 0) {
        // No interests defined: score by member count (popular communities)
        score = (community.member_count || 0) * 0.1;
      } else {
        for (const interest of interests) {
          if (interest.length < 2) continue;
          // Check if interest appears in name/description/category
          const regex = new RegExp(interest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          if (regex.test(searchText)) {
            // Weight: name match > category match > description match
            if (regex.test(community.name)) score += 3;
            else if (community.category && regex.test(community.category)) score += 2;
            else score += 1;
          }
        }
        // Add small boost for popular communities
        score += (community.member_count || 0) * 0.05;
      }

      return { ...community, score: Math.round(score * 100) / 100 };
    });

    // Sort by score descending, then by member count
    scored.sort((a: any, b: any) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.member_count || 0) - (a.member_count || 0);
    });

    res.json({
      recommendations: scored.slice(0, 10),
      interests: user.interests || '',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
