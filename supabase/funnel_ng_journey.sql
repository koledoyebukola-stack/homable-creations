-- =============================================================================
-- Nigerian (NG) user journey funnel
-- Table: app_8574c59127_analytics_events (country = 'NG')
-- =============================================================================

-- Funnel step order and event mapping
-- 1. Homepage landing         -> HOMEPAGE_LANDING
-- 2. Explore curated rooms    -> EXPLORE_CURATED_ROOMS_VIEW
-- 3. Room selection           -> ROOM_SELECTION
-- 4. Signup/Signin            -> SIGNUP or SIGNIN
-- 5. Shopping list creation   -> SHOPPING_LIST_CREATED
-- 6. Home registry creation   -> HOME_REGISTRY_SHARED
-- 7. Catalogue product click  -> CATALOG_PRODUCT_CLICKED
-- 8. View on Instagram click  -> VIEW_ON_INSTAGRAM_CLICKED
-- 9. Buy on WhatsApp click   -> WHATSAPP_REDIRECT

-- -----------------------------------------------------------------------------
-- 1. SIMPLE FUNNEL: One row per step, event_count and distinct_users (NG only)
-- Add date filter if needed: AND created_at >= (now() - interval '30 days')
-- -----------------------------------------------------------------------------
SELECT
  step,
  step_name,
  event_count,
  distinct_users
FROM (
  SELECT 1 AS step, 'Homepage landing'            AS step_name,
         count(*) AS event_count, count(DISTINCT user_id) AS distinct_users
  FROM app_8574c59127_analytics_events WHERE country = 'NG' AND event_name = 'HOMEPAGE_LANDING'
  UNION ALL
  SELECT 2, 'Explore curated rooms',
         count(*), count(DISTINCT user_id)
  FROM app_8574c59127_analytics_events WHERE country = 'NG' AND event_name = 'EXPLORE_CURATED_ROOMS_VIEW'
  UNION ALL
  SELECT 3, 'Room selection',
         count(*), count(DISTINCT user_id)
  FROM app_8574c59127_analytics_events WHERE country = 'NG' AND event_name = 'ROOM_SELECTION'
  UNION ALL
  SELECT 4, 'Signup/Signin',
         count(*), count(DISTINCT user_id)
  FROM app_8574c59127_analytics_events WHERE country = 'NG' AND event_name IN ('SIGNUP', 'SIGNIN')
  UNION ALL
  SELECT 5, 'Shopping list creation',
         count(*), count(DISTINCT user_id)
  FROM app_8574c59127_analytics_events WHERE country = 'NG' AND event_name = 'SHOPPING_LIST_CREATED'
  UNION ALL
  SELECT 6, 'Home registry creation',
         count(*), count(DISTINCT user_id)
  FROM app_8574c59127_analytics_events WHERE country = 'NG' AND event_name = 'HOME_REGISTRY_SHARED'
  UNION ALL
  SELECT 7, 'Catalogue product click',
         count(*), count(DISTINCT user_id)
  FROM app_8574c59127_analytics_events WHERE country = 'NG' AND event_name = 'CATALOG_PRODUCT_CLICKED'
  UNION ALL
  SELECT 8, 'View on Instagram click',
         count(*), count(DISTINCT user_id)
  FROM app_8574c59127_analytics_events WHERE country = 'NG' AND event_name = 'VIEW_ON_INSTAGRAM_CLICKED'
  UNION ALL
  SELECT 9, 'Buy on WhatsApp click',
         count(*), count(DISTINCT user_id)
  FROM app_8574c59127_analytics_events WHERE country = 'NG' AND event_name = 'WHATSAPP_REDIRECT'
) f
ORDER BY step;


-- -----------------------------------------------------------------------------
-- 2. SEQUENTIAL FUNNEL: Users who completed step 1, then step 2, then ... (by time)
-- Uses first occurrence of each event per user; step N must occur after step N-1.
-- -----------------------------------------------------------------------------
WITH ng_events AS (
  SELECT user_id, event_name, created_at
  FROM app_8574c59127_analytics_events
  WHERE country = 'NG' AND user_id IS NOT NULL
),
-- Map event_name to funnel step (Signup/Signin = one step)
first_per_user_step AS (
  SELECT
    user_id,
    CASE event_name
      WHEN 'HOMEPAGE_LANDING'           THEN 1
      WHEN 'EXPLORE_CURATED_ROOMS_VIEW' THEN 2
      WHEN 'ROOM_SELECTION'             THEN 3
      WHEN 'SIGNUP'                     THEN 4
      WHEN 'SIGNIN'                     THEN 4
      WHEN 'SHOPPING_LIST_CREATED'      THEN 5
      WHEN 'HOME_REGISTRY_SHARED'       THEN 6
      WHEN 'CATALOG_PRODUCT_CLICKED'    THEN 7
      WHEN 'VIEW_ON_INSTAGRAM_CLICKED'  THEN 8
      WHEN 'WHATSAPP_REDIRECT'          THEN 9
    END AS step,
    min(created_at) AS first_at
  FROM ng_events
  GROUP BY user_id, 2
),
steps_ordered AS (
  SELECT * FROM first_per_user_step WHERE step IS NOT NULL
),
-- Users who reached each step in order (step 2 after step 1, etc.)
reached AS (
  SELECT 1 AS step, count(DISTINCT user_id) AS users_count
  FROM steps_ordered WHERE step = 1
  UNION ALL
  SELECT 2, count(DISTINCT s2.user_id)
  FROM steps_ordered s1
  JOIN steps_ordered s2 ON s1.user_id = s2.user_id AND s2.step = 2 AND s2.first_at > s1.first_at
  WHERE s1.step = 1
  UNION ALL
  SELECT 3, count(DISTINCT s3.user_id)
  FROM steps_ordered s1
  JOIN steps_ordered s2 ON s1.user_id = s2.user_id AND s2.step = 2 AND s2.first_at > s1.first_at
  JOIN steps_ordered s3 ON s2.user_id = s3.user_id AND s3.step = 3 AND s3.first_at > s2.first_at
  WHERE s1.step = 1
  UNION ALL
  SELECT 4, count(DISTINCT s4.user_id)
  FROM steps_ordered s1
  JOIN steps_ordered s2 ON s1.user_id = s2.user_id AND s2.step = 2 AND s2.first_at > s1.first_at
  JOIN steps_ordered s3 ON s2.user_id = s3.user_id AND s3.step = 3 AND s3.first_at > s2.first_at
  JOIN steps_ordered s4 ON s3.user_id = s4.user_id AND s4.step = 4 AND s4.first_at > s3.first_at
  WHERE s1.step = 1
  UNION ALL
  SELECT 5, count(DISTINCT s5.user_id)
  FROM steps_ordered s1
  JOIN steps_ordered s2 ON s1.user_id = s2.user_id AND s2.step = 2 AND s2.first_at > s1.first_at
  JOIN steps_ordered s3 ON s2.user_id = s3.user_id AND s3.step = 3 AND s3.first_at > s2.first_at
  JOIN steps_ordered s4 ON s3.user_id = s4.user_id AND s4.step = 4 AND s4.first_at > s3.first_at
  JOIN steps_ordered s5 ON s4.user_id = s5.user_id AND s5.step = 5 AND s5.first_at > s4.first_at
  WHERE s1.step = 1
  UNION ALL
  SELECT 6, count(DISTINCT s6.user_id)
  FROM steps_ordered s1
  JOIN steps_ordered s2 ON s1.user_id = s2.user_id AND s2.step = 2 AND s2.first_at > s1.first_at
  JOIN steps_ordered s3 ON s2.user_id = s3.user_id AND s3.step = 3 AND s3.first_at > s2.first_at
  JOIN steps_ordered s4 ON s3.user_id = s4.user_id AND s4.step = 4 AND s4.first_at > s3.first_at
  JOIN steps_ordered s5 ON s4.user_id = s5.user_id AND s5.step = 5 AND s5.first_at > s4.first_at
  JOIN steps_ordered s6 ON s5.user_id = s6.user_id AND s6.step = 6 AND s6.first_at > s5.first_at
  WHERE s1.step = 1
  UNION ALL
  SELECT 7, count(DISTINCT s7.user_id)
  FROM steps_ordered s1
  JOIN steps_ordered s2 ON s1.user_id = s2.user_id AND s2.step = 2 AND s2.first_at > s1.first_at
  JOIN steps_ordered s3 ON s2.user_id = s3.user_id AND s3.step = 3 AND s3.first_at > s2.first_at
  JOIN steps_ordered s4 ON s3.user_id = s4.user_id AND s4.step = 4 AND s4.first_at > s3.first_at
  JOIN steps_ordered s5 ON s4.user_id = s5.user_id AND s5.step = 5 AND s5.first_at > s4.first_at
  JOIN steps_ordered s6 ON s5.user_id = s6.user_id AND s6.step = 6 AND s6.first_at > s5.first_at
  JOIN steps_ordered s7 ON s6.user_id = s7.user_id AND s7.step = 7 AND s7.first_at > s6.first_at
  WHERE s1.step = 1
  UNION ALL
  SELECT 8, count(DISTINCT s8.user_id)
  FROM steps_ordered s1
  JOIN steps_ordered s2 ON s1.user_id = s2.user_id AND s2.step = 2 AND s2.first_at > s1.first_at
  JOIN steps_ordered s3 ON s2.user_id = s3.user_id AND s3.step = 3 AND s3.first_at > s2.first_at
  JOIN steps_ordered s4 ON s3.user_id = s4.user_id AND s4.step = 4 AND s4.first_at > s3.first_at
  JOIN steps_ordered s5 ON s4.user_id = s5.user_id AND s5.step = 5 AND s5.first_at > s4.first_at
  JOIN steps_ordered s6 ON s5.user_id = s6.user_id AND s6.step = 6 AND s6.first_at > s5.first_at
  JOIN steps_ordered s7 ON s6.user_id = s7.user_id AND s7.step = 7 AND s7.first_at > s6.first_at
  JOIN steps_ordered s8 ON s7.user_id = s8.user_id AND s8.step = 8 AND s8.first_at > s7.first_at
  WHERE s1.step = 1
  UNION ALL
  SELECT 9, count(DISTINCT s9.user_id)
  FROM steps_ordered s1
  JOIN steps_ordered s2 ON s1.user_id = s2.user_id AND s2.step = 2 AND s2.first_at > s1.first_at
  JOIN steps_ordered s3 ON s2.user_id = s3.user_id AND s3.step = 3 AND s3.first_at > s2.first_at
  JOIN steps_ordered s4 ON s3.user_id = s4.user_id AND s4.step = 4 AND s4.first_at > s3.first_at
  JOIN steps_ordered s5 ON s4.user_id = s5.user_id AND s5.step = 5 AND s5.first_at > s4.first_at
  JOIN steps_ordered s6 ON s5.user_id = s6.user_id AND s6.step = 6 AND s6.first_at > s5.first_at
  JOIN steps_ordered s7 ON s6.user_id = s7.user_id AND s7.step = 7 AND s7.first_at > s6.first_at
  JOIN steps_ordered s8 ON s7.user_id = s8.user_id AND s8.step = 8 AND s8.first_at > s7.first_at
  JOIN steps_ordered s9 ON s8.user_id = s9.user_id AND s9.step = 9 AND s9.first_at > s8.first_at
  WHERE s1.step = 1
)
SELECT
  r.step,
  (ARRAY[
    'Homepage landing','Explore curated rooms','Room selection','Signup/Signin',
    'Shopping list creation','Home registry creation','Catalogue product click',
    'View on Instagram click','Buy on WhatsApp click'
  ])[r.step] AS step_name,
  r.users_count
FROM reached r
ORDER BY r.step;


-- -----------------------------------------------------------------------------
-- 3. DATE RANGE: Simple funnel for last 30 days (optional filter)
-- -----------------------------------------------------------------------------
-- Uncomment and add to each query: AND created_at >= (now() - interval '30 days')
