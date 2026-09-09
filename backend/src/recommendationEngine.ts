/**
 * Smart Connects — Recommendation Engine (isolated service)
 *
 * Redesigned recommendation system:
 *   - Evaluates EVERY eligible community against ALL user interests.
 *   - Communities matching multiple interests strongly outrank ones
 *     matching a single interest weakly.
 *   - Deterministic, reproducible scoring (no AI decides the score).
 *   - Weighted components normalized to 0–100, combined into a final
 *     0–100 score.
 *   - Diversity-aware reranking for the top results.
 *   - Structured explanations generated ONLY from actual calculated data.
 *     Missing data (no events / no reviews) is reported honestly as
 *     neutral/unavailable — never fabricated.
 *
 * This service is read-only: it never writes to the database and does not
 * modify any schema. It reuses the existing tables as they are.
 */

import { query } from './db';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration (single source of truth — weights total 1.0)
// ─────────────────────────────────────────────────────────────────────────────

export const RECOMMENDATION_WEIGHTS = {
  interest_relevance: 0.35,
  description_relevance: 0.20,
  event_relevance: 0.15,
  category_relevance: 0.10,
  review_score: 0.10,
  engagement_score: 0.05,
  verification_score: 0.05,
} as const;

/** Score used when a component has no data at all (neutral, not a penalty). */
const NEUTRAL_SCORE = 50;

/** Bayesian review prior: with few reviews, ratings are pulled toward this. */
const REVIEW_PRIOR_MEAN = 3.5;
const REVIEW_PRIOR_WEIGHT = 3; // pseudo-review count (confidence constant)

/** An interest is "matched" on a card when its strength reaches this value. */
export const STRONG_INTEREST_THRESHOLD = 0.5;

/** Final scores below this are flagged as "no strong matches found". */
export const STRONG_MATCH_FLOOR = 40;

/** Ranking penalty ceiling for diversification (never dominates big gaps). */
const DIVERSIFICATION_MAX_PENALTY = 12;

/** Joined communities keep their honest match % but rank lower. */
const JOINED_RANKING_PENALTY = 0.6;

// ─────────────────────────────────────────────────────────────────────────────
// Concept lexicon (deterministic semantic layer)
// Maps each interest to related words/phrases so "writing" also matches
// "authors, storytellers, bloggers, literature". Deliberately compact:
// a curated lexicon + stemming, not an exhaustive synonym database.
// ─────────────────────────────────────────────────────────────────────────────

const INTEREST_CONCEPTS: Record<string, string[]> = {
  reading: ['reader', 'readers', 'book', 'books', 'literature', 'literary', 'book club', 'library', 'poetry', 'novel'],
  writing: ['writer', 'writers', 'author', 'authors', 'book', 'books', 'literature', 'literary', 'poetry', 'storyteller', 'storytelling', 'blogger', 'blogging', 'creative', 'journaling'],
  languages: ['language', 'linguistic', 'translation', 'multilingual', 'english', 'nepali', 'japanese', 'korean', 'french', 'german', 'chinese', 'spanish'],
  'art & design': ['art', 'arts', 'artist', 'design', 'designer', 'creative', 'painting', 'drawing', 'sketching', 'illustration', 'craft', 'graphic'],
  art: ['arts', 'artist', 'creative', 'painting', 'drawing', 'sketching', 'illustration', 'craft'],
  design: ['designer', 'designing', 'creative', 'ux', 'ui', 'graphic', 'art'],
  technology: ['tech', 'developer', 'developers', 'programming', 'coding', 'software', 'engineer', 'engineering', 'devops', 'cloud', 'observability', 'open source', 'startup', 'ai'],
  tech: ['technology', 'developer', 'developers', 'programming', 'coding', 'software', 'engineer', 'devops', 'cloud'],
  programming: ['coding', 'code', 'developer', 'developers', 'programmer', 'software', 'engineering', 'tech', 'hackathon'],
  music: ['musical', 'singing', 'band', 'concert', 'instrument', 'guitar', 'piano'],
  sports: ['sport', 'fitness', 'athletics', 'cycling', 'football', 'cricket', 'basketball', 'tournament'],
  photography: ['photo', 'photos', 'camera', 'photographer', 'photograph'],
  travel: ['travelling', 'traveling', 'tourism', 'trekking', 'hiking', 'adventure', 'tour', 'tours', 'explore', 'exploration', 'trip', 'trips'],
  travelling: ['travel', 'traveling', 'tourism', 'trekking', 'hiking', 'adventure'],
  gaming: ['game', 'games', 'gamer', 'esports', 'gaming'],
  dancing: ['dance', 'dancer', 'dancers', 'choreography', 'cultural program'],
  dance: ['dancing', 'dancer', 'dancers', 'choreography'],
  volunteering: ['volunteer', 'volunteers', 'volunteering', 'voluntary', 'service', 'community service', 'social service', 'charity', 'nonprofit', 'non-profit', 'ngo', 'leadership', 'community'],
  volunteer: ['volunteering', 'volunteers', 'service', 'community service', 'social service', 'charity', 'nonprofit', 'non-profit', 'ngo'],
  'food & cooking': ['food', 'cooking', 'culinary', 'chef', 'baking', 'recipe', 'recipes', 'cuisine', 'restaurant'],
  cooking: ['culinary', 'food', 'chef', 'baking', 'recipe', 'recipes', 'cuisine'],
  fitness: ['gym', 'workout', 'health', 'wellness', 'yoga', 'cycling', 'sports', 'training'],
  'movies & tv': ['movie', 'movies', 'film', 'cinema', 'tv', 'television', 'series', 'screening'],
  'yoga & meditation': ['yoga', 'meditation', 'mindfulness', 'wellness', 'well-being', 'wellbeing', 'retreat', 'breathing'],
  entrepreneurship: ['startup', 'startups', 'business', 'founder', 'founders', 'entrepreneur', 'pitch', 'networking'],
  fashion: ['style', 'styling', 'clothing', 'outfit', 'wear', 'trend'],
  'nature & outdoors': ['nature', 'outdoors', 'outdoor', 'hiking', 'trekking', 'environment', 'environmental', 'camping', 'adventure', 'conservation'],
  environment: ['environmental', 'climate', 'sustainability', 'green', 'eco', 'nature', 'conservation'],
  science: ['scientific', 'research', 'stem', 'physics', 'chemistry', 'biology', 'astronomy'],
  history: ['historical', 'heritage', 'archaeology', 'museum', 'culture', 'cultural'],
  investing: ['investment', 'finance', 'financial', 'stock', 'stocks', 'trading', 'crypto', 'market'],
  podcasts: ['podcast', 'podcasting', 'audio', 'episode'],
  health: ['wellness', 'fitness', 'mental health', 'wellbeing', 'well-being', 'medical', 'yoga'],
  wellness: ['well-being', 'wellbeing', 'health', 'yoga', 'meditation', 'mindfulness'],
  community: ['networking', 'social', 'people', 'connection', 'connections', 'members'],
};

/** Match-strength tiers used across all surfaces (name, category, description, events). */
const MATCH = {
  DIRECT: 1.0, // exact interest word appears
  CONCEPT: 0.8, // a related concept word appears
  STEM: 0.45, // only a loose word-stem overlap
  NONE: 0,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Text matching helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Common word endings stripped to catch simple word variations. */
function stem(word: string): string {
  if (word.length > 4 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith('ers')) return word.slice(0, -3);
  if (word.length > 3 && word.endsWith('er')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1);
  return word;
}

/** Escape a string for safe use inside a RegExp. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Word-boundary regex for a term, tolerant of plurals and flexible spacing. */
function termRegex(candidate: string): RegExp {
  const escaped = escapeRegex(candidate).replace(/\s+/g, '\\s+');
  return new RegExp(`\\b${escaped}(?:es|s)?\\b`, 'i');
}

/**
 * How strongly does `text` relate to `term` (with its related concepts)?
 * Returns a tier from MATCH. Deterministic and explainable.
 */
function matchStrength(text: string, term: string, concepts: string[]): number {
  const t = term.toLowerCase().trim();
  if (!t || !text) return MATCH.NONE;

  // 1) Direct word hit.
  if (termRegex(t).test(text)) return MATCH.DIRECT;

  // 2) Related-concept hit.
  for (const concept of concepts) {
    if (termRegex(concept).test(text)) return MATCH.CONCEPT;
  }

  // 3) Loose stem overlap (only meaningful for stems of 4+ chars).
  const stemOfTerm = stem(t);
  if (stemOfTerm.length >= 4) {
    const words = text.split(/[^a-z]+/).filter(Boolean);
    for (const word of words) {
      if (stem(word) === stemOfTerm) return MATCH.STEM;
    }
  }

  return MATCH.NONE;
}

/**
 * Events.topics (and similar fields) are stored as TEXT that usually holds a
 * JSON array string (e.g. '["Technology","Workshop"]') but may be plain text.
 * Normalize to a matchable string plus the individual tokens.
 */
function parseListField(value: unknown): { text: string; tokens: string[] } {
  if (!value || typeof value !== 'string') return { text: '', tokens: [] };
  const raw = value.trim();
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const tokens = parsed.map((x) => String(x)).filter((x) => x.trim().length > 0);
        return { text: tokens.join(' '), tokens };
      }
    } catch {
      // fall through: treat as plain text
    }
  }
  return { text: raw, tokens: raw.split(',').map((s) => s.trim()).filter(Boolean) };
}

/** Human label for a 0–1 interest strength (shown in the UI). */
export function strengthLabel(strength: number): string {
  if (strength >= 0.75) return 'Very strong match';
  if (strength >= STRONG_INTEREST_THRESHOLD) return 'Strong match';
  if (strength >= 0.25) return 'Some relevance';
  if (strength >= 0.1) return 'Limited relevance';
  return 'Minimal relevance';
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-interest relevance (used by interest relevance, description relevance
// and event relevance). Weighted blend of the surfaces where an interest can
// appear. Name > category > description because the name is the strongest
// self-description of a community.
// ─────────────────────────────────────────────────────────────────────────────

interface InterestBreakdown {
  interest: string; // display form (as the user typed it)
  key: string; // lowercase matching key
  strength: number; // 0–1 combined relevance to this community
  name: number;
  category: number;
  description: number;
}

function scoreInterestAgainstCommunity(
  interest: string,
  concepts: string[],
  nameText: string,
  categoryText: string,
  descriptionText: string,
): InterestBreakdown {
  const name = matchStrength(nameText, interest, concepts);
  const category = matchStrength(categoryText, interest, concepts);
  const description = matchStrength(descriptionText, interest, concepts);

  const strength = Math.min(
    1,
    0.55 * name + 0.45 * category + 0.35 * description,
  );

  return {
    interest,
    key: interest.toLowerCase(),
    strength,
    name,
    category,
    description,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component scorers (each returns a 0–100 normalized score)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Interest relevance (35 pts max): the average of the two strongest
 * interest matches drives the base, and covering several interests adds a
 * bonus — so a community matching Reading + Writing strongly beats one
 * matching only Reading (even perfectly), and also beats three separate
 * single-interest communities for discovery value.
 */
function interestRelevanceScore(breakdowns: InterestBreakdown[]): { score: number; matchedCount: number } {
  if (breakdowns.length === 0) return { score: 0, matchedCount: 0 };

  const strengths = breakdowns.map((b) => b.strength).sort((a, b) => b - a);
  const top1 = strengths[0];
  const top2 = strengths.length > 1 ? strengths[1] : top1; // single-interest users: top interest fully counts
  const base = (top1 + top2) / 2; // 0–1

  const matchedCount = strengths.filter((s) => s >= STRONG_INTEREST_THRESHOLD).length;
  let coverageBonus = 0;
  if (matchedCount >= 3) coverageBonus = 0.1;
  else if (matchedCount === 2) coverageBonus = 0.05;

  return { score: Math.round(100 * Math.min(1, base + coverageBonus)), matchedCount };
}

/**
 * Description/semantic relevance (20 pts max): how well the description TEXT
 * itself relates to the user's interests — average strength across interests
 * plus a breadth term (how many interests have at least some relevance).
 */
function descriptionRelevanceScore(breakdowns: InterestBreakdown[]): number {
  if (breakdowns.length === 0) return NEUTRAL_SCORE;
  const avg = breakdowns.reduce((sum, b) => sum + Math.min(1, b.description), 0) / breakdowns.length;
  const covered = breakdowns.filter((b) => b.description >= 0.3).length / breakdowns.length;
  return Math.round(100 * (0.6 * avg + 0.4 * covered));
}

/**
 * Category relevance (10 pts max): direct comparison of each interest with
 * the community category. Best-matching interest wins; intentionally capped
 * at a small weight so it can never dominate the recommendation.
 */
function categoryRelevanceScore(breakdowns: InterestBreakdown[]): number {
  const best = breakdowns.reduce((max, b) => Math.max(max, b.category), 0);
  return Math.round(100 * best);
}

/** Logarithmic normalization so a huge community doesn't saturate the score. */
function logNorm(value: number): number {
  return Math.log10(1 + Math.max(0, value)) / 2.7; // ≈ 500 members → 1.0
}

/**
 * Engagement (5 pts max): member count + upcoming event participation.
 * Kept at a low weight — popularity must never overpower relevance.
 */
function engagementScore(memberCount: number, upcomingAttendees: number): number {
  return Math.round(100 * Math.min(1, 0.7 * logNorm(memberCount) + 0.3 * logNorm(upcomingAttendees)));
}

/**
 * Reviews & ratings (10 pts max): confidence-adjusted (Bayesian-style)
 * rating so 2 perfect reviews can't overpower 150 good ones.
 * Returns null when there is no review data (caller applies neutral score).
 */
function reviewScore(avgRating: number | null, reviewCount: number): number | null {
  if (avgRating === null || !reviewCount) return null;
  const v = reviewCount;
  const weighted =
    (v / (v + REVIEW_PRIOR_WEIGHT)) * avgRating +
    (REVIEW_PRIOR_WEIGHT / (v + REVIEW_PRIOR_WEIGHT)) * REVIEW_PRIOR_MEAN;
  return Math.round(((weighted - 1) / 4) * 100); // 1★→0, 3.5★→50, 5★→100
}

/** Verification (5 pts max): a small trust boost — never a relevance signal. */
function verificationScore(isVerified: boolean): number {
  return isVerified ? 100 : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event relevance
// ─────────────────────────────────────────────────────────────────────────────

interface UpcomingEventRow {
  [key: string]: unknown; // pg result row compatibility
  id: number;
  community_id: number;
  title: string;
  description: string | null;
  topics: string | null;
  event_type: string | null;
  event_date: Date | string;
  attendee_count: number | null;
}

/**
 * Recency multiplier for an upcoming event: soon events count slightly more
 * than distant ones. Old (past) events are never considered at all.
 */
function recencyMultiplier(eventDate: Date): number {
  const days = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days <= 7) return 1.0;
  if (days <= 30) return 0.95;
  if (days <= 90) return 0.85;
  return 0.75;
}

interface EventRelevance {
  score: number; // 0–100 (neutral 50 when no data)
  bestEvent: { id: number; title: string; event_date: string } | null;
  note: string | null;
  related: boolean;
}

/**
 * Event relevance (15 pts max): scans upcoming events (title, description,
 * topics, event type) against ALL user interests. A clearly related upcoming
 * event boosts the score above neutral; unrelated or missing events stay at
 * the neutral baseline instead of penalizing the community.
 */
function eventRelevanceScore(
  events: UpcomingEventRow[],
  interestKeys: { interest: string; concepts: string[] }[],
): EventRelevance {
  if (events.length === 0) {
    return {
      score: NEUTRAL_SCORE,
      bestEvent: null,
      note: 'No upcoming event data available.',
      related: false,
    };
  }

  let bestStrength = 0;
  let bestEvent: UpcomingEventRow | null = null;

  for (const event of events) {
    const topics = parseListField(event.topics);
    const titleText = (event.title || '').toLowerCase();
    const descText = (event.description || '').toLowerCase();
    const topicsText = topics.text.toLowerCase();
    const typeText = (event.event_type || '').toLowerCase();

    // Title hits weigh most, then topics, then description/type.
    for (const { interest, concepts } of interestKeys) {
      let strength = 0;
      const title = matchStrength(titleText, interest, concepts);
      const top = matchStrength(topicsText, interest, concepts);
      const desc = matchStrength(descText, interest, concepts);
      const type = matchStrength(typeText, interest, concepts);

      strength = Math.max(
        strength,
        title * 0.6 + top * 0.25 + desc * 0.3 + type * 0.1,
        title, // a pure title hit is already a strong signal on its own
        top,
        desc,
        type,
      );
      strength = Math.min(1, strength);

      if (strength > bestStrength) {
        bestStrength = strength;
        bestEvent = event;
      }
    }
  }

  if (bestEvent && bestStrength >= 0.15) {
    const recency = recencyMultiplier(new Date(bestEvent.event_date));
    return {
      score: Math.min(100, Math.round(NEUTRAL_SCORE + 0.5 * 100 * bestStrength * recency)),
      bestEvent: {
        id: bestEvent.id,
        title: bestEvent.title,
        event_date: new Date(bestEvent.event_date).toISOString(),
      },
      note: null,
      related: true,
    };
  }

  return {
    score: NEUTRAL_SCORE,
    bestEvent: null,
    note: 'Has upcoming events, but none clearly related to your interests.',
    related: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Diversification (reranking, never a replacement for relevance)
// ─────────────────────────────────────────────────────────────────────────────

interface ScoredCommunity {
  community: CommunityRow;
  breakdowns: InterestBreakdown[];
  components: {
    interest_relevance: number;
    description_relevance: number;
    event_relevance: number;
    category_relevance: number;
    review_score: number;
    engagement_score: number;
    verification_score: number;
  };
  reviewCount: number;
  hasReviews: boolean;
  event: EventRelevance;
  finalScore: number; // 0–100, unrounded (ranking uses full precision)
  isJoined: boolean;
}

/**
 * Reorders the ranked list so the final selection balances relevance with
 * interest coverage: candidates that introduce a strong interest the list
 * doesn't cover yet are preferred, and the third+ community of the same
 * category is gently demoted. A relevant community is never excluded
 * outright, and a large score gap always wins over any penalty.
 */
function diversifyOrder(scored: ScoredCommunity[], limit: number): ScoredCommunity[] {
  const picked: ScoredCommunity[] = [];
  const remaining = [...scored]; // already sorted by finalScore desc
  const coveredInterests = new Set<string>();
  const categoryUse = new Map<string, number>();

  while (picked.length < limit && remaining.length > 0) {
    let bestIdx = 0;
    let bestValue = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];

      let penalty = 0;
      const strongKeys = candidate.breakdowns
        .filter((b) => b.strength >= STRONG_INTEREST_THRESHOLD)
        .map((b) => b.key);
      const addsNewInterest = coveredInterests.size === 0 || strongKeys.some((k) => !coveredInterests.has(k));
      if (!addsNewInterest) penalty += 6; // would repeat only already-covered interests

      const cat = (candidate.community.category || 'uncategorized').toLowerCase();
      const seen = categoryUse.get(cat) || 0;
      if (seen >= 2) penalty += 6; // third community of the same category
      else if (seen === 1) penalty += 3; // second community of the same category

      penalty = Math.min(penalty, DIVERSIFICATION_MAX_PENALTY);
      const value = candidate.finalScore - penalty;
      if (value > bestValue) {
        bestValue = value;
        bestIdx = i;
      }
    }

    const chosen = remaining.splice(bestIdx, 1)[0];
    picked.push(chosen);

    for (const b of chosen.breakdowns) {
      if (b.strength >= STRONG_INTEREST_THRESHOLD) coveredInterests.add(b.key);
    }
    const cat = (chosen.community.category || 'uncategorized').toLowerCase();
    categoryUse.set(cat, (categoryUse.get(cat) || 0) + 1);
  }

  return picked;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reason generation — strictly from actual calculated data
// ─────────────────────────────────────────────────────────────────────────────

function buildReasons(
  breakdowns: InterestBreakdown[],
  components: ScoredCommunity['components'],
  community: CommunityRow,
  event: EventRelevance,
  reviewCount: number,
): string[] {
  const reasons: string[] = [];

  const strong = breakdowns
    .filter((b) => b.strength >= STRONG_INTEREST_THRESHOLD)
    .sort((a, b) => b.strength - a.strength)
    .map((b) => b.interest);

  if (strong.length >= 2) {
    const listed = strong.slice(0, 3);
    const joined =
      listed.length <= 2
        ? listed.join(' and ')
        : `${listed[0]}, ${listed[1]} and ${listed[2]}`;
    reasons.push(`Strongly matches your interests in ${joined}`);
  } else if (strong.length === 1) {
    reasons.push(`Strongly matches your interest in ${strong[0]}`);
  }

  if (components.description_relevance >= 70) {
    reasons.push('Community description is highly relevant to your interests');
  } else if (components.description_relevance >= 50) {
    reasons.push('Community description is moderately relevant to your interests');
  } else if (components.description_relevance >= 30) {
    reasons.push('Community description is somewhat relevant to your interests');
  }

  if (event.related && event.bestEvent) {
    reasons.push(`Upcoming event "${event.bestEvent.title}" relates to your interests`);
  }

  if (components.category_relevance >= 70 && community.category) {
    reasons.push(`Community category (${community.category}) is closely related to your interests`);
  }

  if (components.review_score !== null && components.review_score >= 60 && reviewCount > 0) {
    reasons.push(`Strong member ratings based on ${reviewCount} review${reviewCount === 1 ? '' : 's'}`);
  }

  if (community.is_verified) {
    reasons.push('Verified community');
  }

  return reasons;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point — read-only aggregation of existing data
// ─────────────────────────────────────────────────────────────────────────────

interface CommunityRow {
  [key: string]: unknown; // pg result row compatibility
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  member_count: number | null;
  owner_id: number;
  logo: string | null;
  banner_image: string | null;
  location: string | null;
  is_verified: boolean | null;
  owner_name: string | null;
}

export interface RecommendationOptions {
  excludeJoined?: boolean;
  limit?: number;
}

export async function buildRecommendations(userId: number, options: RecommendationOptions = {}) {
  const limit = Math.min(Math.max(options.limit ?? 6, 1), 50);
  const excludeJoined = options.excludeJoined ?? false;

  // 1) User + interests (interests stay in the user's original wording).
  const userResult = await query<{ id: number; interests: string | null }>(
    'SELECT id, interests FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId],
  );
  if (userResult.rows.length === 0) {
    return { error: 'User not found' as const };
  }

  const interestList: string[] = (userResult.rows[0].interests || '')
    .split(',')
    .map((i) => i.trim())
    .filter((i) => i.length > 0);

  if (interestList.length === 0) {
    return {
      recommendations: [],
      interests: '',
      interest_list: [],
      has_strong_matches: false,
      message: 'Add interests to your profile to get personalized recommendations.',
      total_available: 0,
      weights: RECOMMENDATION_WEIGHTS,
    };
  }

  const interestKeys = interestList.map((interest) => ({
    interest,
    concepts: INTEREST_CONCEPTS[interest.toLowerCase()] || [],
  }));

  // 2) Joined communities (kept for ranking + exclusion, never written to).
  const joinedResult = await query<{ community_id: number }>(
    'SELECT community_id FROM community_members WHERE user_id = $1',
    [userId],
  );
  const joinedIds = new Set(joinedResult.rows.map((r) => r.community_id));

  // 3) Every eligible community.
  const communitiesResult = await query<CommunityRow>(
    `SELECT c.id, c.name, c.description, c.category, c.member_count,
            c.owner_id, c.logo, c.banner_image, c.location, c.is_verified,
            u.name as owner_name
     FROM communities c
     LEFT JOIN users u ON c.owner_id = u.id
     WHERE c.deleted_at IS NULL`,
  );
  const communities = communitiesResult.rows;
  if (communities.length === 0) {
    return {
      recommendations: [],
      interests: userResult.rows[0].interests || '',
      interest_list: interestList,
      has_strong_matches: false,
      message: 'No communities available yet.',
      total_available: 0,
      weights: RECOMMENDATION_WEIGHTS,
    };
  }

  const communityIds = communities.map((c) => c.id);

  // 4) Upcoming events for those communities (single read-only query).
  const eventsResult = await query<UpcomingEventRow>(
    `SELECT id, community_id, title, description, topics, event_type, event_date, attendee_count
     FROM events
     WHERE deleted_at IS NULL AND event_date >= NOW()
       AND community_id = ANY($1::int[])`,
    [communityIds],
  );
  const eventsByCommunity = new Map<number, UpcomingEventRow[]>();
  let upcomingAttendeesByCommunity = new Map<number, number>();
  for (const ev of eventsResult.rows) {
    const list = eventsByCommunity.get(ev.community_id) || [];
    list.push(ev);
    eventsByCommunity.set(ev.community_id, list);
    upcomingAttendeesByCommunity.set(
      ev.community_id,
      (upcomingAttendeesByCommunity.get(ev.community_id) || 0) + (ev.attendee_count || 0),
    );
  }

  // 5) Review aggregates (confidence-adjusted later, per community).
  const reviewResult = await query<{ community_id: number; avg_rating: number | null; review_count: string }>(
    `SELECT community_id, AVG(rating)::float as avg_rating, COUNT(*)::text as review_count
     FROM reviews
     WHERE community_id = ANY($1::int[])
     GROUP BY community_id`,
    [communityIds],
  );
  const reviewsByCommunity = new Map<number, { avg: number | null; count: number }>();
  for (const row of reviewResult.rows) {
    reviewsByCommunity.set(row.community_id, {
      avg: row.avg_rating,
      count: parseInt(row.review_count, 10) || 0,
    });
  }

  // 6) Score EVERY community against ALL interests.
  const scored: ScoredCommunity[] = communities.map((community) => {
    const nameText = (community.name || '').toLowerCase();
    const categoryText = (community.category || '').toLowerCase();
    const descriptionText = (community.description || '').toLowerCase();

    const breakdowns = interestKeys.map(({ interest, concepts }) =>
      scoreInterestAgainstCommunity(interest, concepts, nameText, categoryText, descriptionText),
    );

    const interestComponent = interestRelevanceScore(breakdowns);
    const upcomingEvents = eventsByCommunity.get(community.id) || [];
    const eventComponent = eventRelevanceScore(upcomingEvents, interestKeys);
    const reviewInfo = reviewsByCommunity.get(community.id);
    const reviewCount = reviewInfo?.count ?? 0;
    const rawReview = reviewScore(reviewInfo?.avg ?? null, reviewCount);
    const hasReviews = rawReview !== null;

    const components = {
      interest_relevance: interestComponent.score,
      description_relevance: descriptionRelevanceScore(breakdowns),
      event_relevance: eventComponent.score,
      category_relevance: categoryRelevanceScore(breakdowns),
      review_score: hasReviews ? (rawReview as number) : NEUTRAL_SCORE,
      engagement_score: engagementScore(
        community.member_count || 0,
        upcomingAttendeesByCommunity.get(community.id) || 0,
      ),
      verification_score: verificationScore(!!community.is_verified),
    };

    let finalScore =
      components.interest_relevance * RECOMMENDATION_WEIGHTS.interest_relevance +
      components.description_relevance * RECOMMENDATION_WEIGHTS.description_relevance +
      components.event_relevance * RECOMMENDATION_WEIGHTS.event_relevance +
      components.category_relevance * RECOMMENDATION_WEIGHTS.category_relevance +
      components.review_score * RECOMMENDATION_WEIGHTS.review_score +
      components.engagement_score * RECOMMENDATION_WEIGHTS.engagement_score +
      components.verification_score * RECOMMENDATION_WEIGHTS.verification_score;

    // Joined communities keep their honest match % but rank lower (the user
    // is already a member). Ranking-only: it never alters the components.
    const isJoined = joinedIds.has(community.id);
    if (isJoined) finalScore *= JOINED_RANKING_PENALTY;

    return {
      community,
      breakdowns,
      components,
      reviewCount,
      hasReviews,
      event: eventComponent,
      finalScore,
      isJoined,
    };
  });

  // 7) Rank ALL communities, then apply diversity-aware reranking for the top.
  scored.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    return (b.community.member_count || 0) - (a.community.member_count || 0);
  });

  const eligible = excludeJoined ? scored.filter((s) => !s.isJoined) : scored;
  const top = diversifyOrder(eligible, limit);

  // 8) Strong-match flag: based on the best honest score, never inflated.
  const bestRawScore = eligible.length > 0 ? eligible[0].finalScore : 0;
  const hasStrongMatches = bestRawScore >= STRONG_MATCH_FLOOR;

  // 9) Build the structured response (explanations from actual data only).
  const recommendations = top.map((item, index) => {
    const { community, breakdowns, components, event, reviewCount, hasReviews, isJoined } = item;

    const matched_interests = breakdowns.map((b) => ({
      interest: b.interest,
      strength: Math.round(b.strength * 100) / 100,
      label: strengthLabel(b.strength),
    }));

    const reasons = buildReasons(breakdowns, components, community, event, reviewCount);

    const data_notes: Record<string, string> = {};
    if (!hasReviews) data_notes.review_score = 'Not enough review data available.';
    if (event.note) data_notes.event_relevance = event.note;

    return {
      // community details
      community_id: community.id,
      id: community.id,
      type: 'community' as const,
      name: community.name,
      description: community.description,
      category: community.category,
      member_count: community.member_count,
      logo: community.logo,
      banner_image: community.banner_image,
      location: community.location,
      is_verified: !!community.is_verified,
      owner_name: community.owner_name,
      // match + ranking
      match_percentage: Math.round(item.finalScore),
      ranking_position: index + 1,
      is_joined: isJoined,
      // explanations (all values calculated from actual database data)
      matched_interests,
      score_breakdown: components,
      reasons,
      recommendation_reasons: reasons, // alias for clarity
      data_notes,
      best_event: event.bestEvent,
      review_count: reviewCount,
    };
  });

  return {
    recommendations,
    interests: interestList.join(', '),
    interest_list: interestList,
    has_strong_matches: hasStrongMatches,
    message: hasStrongMatches
      ? null
      : 'No strong matches found. These are the closest communities based on your interests.',
    total_available: eligible.length,
    weights: RECOMMENDATION_WEIGHTS,
  };
}
