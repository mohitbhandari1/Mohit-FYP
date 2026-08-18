-- ============================================================
-- Migration v8: Assign categories to seeded communities
-- so the category filter on the Communities page works.
-- Idempotent — safe to re-run.
-- ============================================================

UPDATE communities
SET category = 'Social Service'
WHERE name = 'Leo Club of Samarpan LBEF'
  AND (category IS NULL OR category = '');

UPDATE communities
SET category = 'Health & Wellness'
WHERE name = 'Yoga & Wellness Nepal'
  AND (category IS NULL OR category = '');

UPDATE communities
SET category = 'Technology'
WHERE name = 'Grafana Kathmandu'
  AND (category IS NULL OR category = '');

UPDATE communities
SET category = 'Education'
WHERE name = 'Kathmandu Toastmasters Club'
  AND (category IS NULL OR category = '');

UPDATE communities
SET category = 'Sports'
WHERE name = 'Nepal Cycling Club'
  AND (category IS NULL OR category = '');
