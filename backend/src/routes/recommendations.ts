import express from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { buildRecommendations } from '../recommendationEngine';

const router = express.Router();

/**
 * GET /api/recommendations — Get community recommendations based on user interests.
 *
 * Redesigned recommendation system (isolated to this feature):
 *   - Every eligible community is evaluated against ALL of the user's interests.
 *   - Deterministic weighted score (0–100) with a transparent breakdown.
 *   - Diversity-aware reranking of the final selection.
 *   - Structured "Why recommended?" explanations generated only from actual
 *     database data — missing data (no events / no reviews) is reported as
 *     neutral/unavailable, never fabricated.
 *
 * Response shape:
 * {
 *   recommendations: [{
 *     community details...,
 *     match_percentage,        // 0–100, backend-calculated
 *     matched_interests: [{ interest, strength, label }],
 *     score_breakdown: { interest_relevance, description_relevance, event_relevance,
 *                        category_relevance, review_score, engagement_score, verification_score },
 *     recommendation_reasons: [...],
 *     data_notes: { ... },     // honest "no data" notes, e.g. no reviews/events
 *     ranking_position
 *   }],
 *   has_strong_matches,        // false → frontend shows "No strong matches found"
 *   interests, interest_list, total_available, weights
 * }
 *
 * Query params (preserved from the previous API):
 *   ?exclude_joined=true   — filter out communities the user is a member of
 *   ?limit=n               — number of recommendations (default 6, max 50)
 */
router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const result = await buildRecommendations(req.userId!, {
      excludeJoined: req.query.exclude_joined === 'true',
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    if ('error' in result) {
      return res.status(404).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
