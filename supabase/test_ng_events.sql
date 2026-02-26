-- =============================================================================
-- Test queries for Nigerian (NG) event tracking
-- Run these after triggering actions with country === 'NG' to verify implementation.
-- =============================================================================

-- 1. Summary: count of each event type (NG only)
-- Use this to confirm which events have fired at least once.
SELECT
  event_name,
  count(*) AS event_count,
  min(created_at) AS first_seen,
  max(created_at) AS last_seen
FROM app_8574c59127_analytics_events
WHERE country = 'NG'
GROUP BY event_name
ORDER BY event_name;

-- 2. All 10 expected event names (for reference)
-- Expected: HOMEPAGE_LANDING, EXPLORE_CURATED_ROOMS_VIEW, ROOM_SELECTION,
--           SIGNUP, SIGNIN, SHOPPING_LIST_CREATED, HOME_REGISTRY_SHARED,
--           CATALOG_PRODUCT_CLICKED, VIEW_ON_INSTAGRAM_CLICKED, WHATSAPP_REDIRECT

-- 3. Recent NG events (last 50) with key fields
SELECT
  id,
  event_name,
  user_id,
  metadata,
  created_at
FROM app_8574c59127_analytics_events
WHERE country = 'NG'
ORDER BY created_at DESC
LIMIT 50;

-- 4. Per-event checks: see sample rows and metadata shape
-- HOMEPAGE_LANDING (metadata: timestamp, referrer)
SELECT 'HOMEPAGE_LANDING' AS check_name, metadata, created_at
FROM app_8574c59127_analytics_events
WHERE country = 'NG' AND event_name = 'HOMEPAGE_LANDING'
ORDER BY created_at DESC LIMIT 3;

-- EXPLORE_CURATED_ROOMS_VIEW (metadata: location = homepage | upload_page, timestamp)
SELECT 'EXPLORE_CURATED_ROOMS_VIEW' AS check_name, metadata, created_at
FROM app_8574c59127_analytics_events
WHERE country = 'NG' AND event_name = 'EXPLORE_CURATED_ROOMS_VIEW'
ORDER BY created_at DESC LIMIT 3;

-- ROOM_SELECTION (metadata: scene_id, scene_title, scene_slug, timestamp)
SELECT 'ROOM_SELECTION' AS check_name, metadata, created_at
FROM app_8574c59127_analytics_events
WHERE country = 'NG' AND event_name = 'ROOM_SELECTION'
ORDER BY created_at DESC LIMIT 3;

-- SIGNUP (metadata: signup_method, timestamp)
SELECT 'SIGNUP' AS check_name, metadata, created_at
FROM app_8574c59127_analytics_events
WHERE country = 'NG' AND event_name = 'SIGNUP'
ORDER BY created_at DESC LIMIT 3;

-- SIGNIN (metadata: signin_method, timestamp)
SELECT 'SIGNIN' AS check_name, metadata, created_at
FROM app_8574c59127_analytics_events
WHERE country = 'NG' AND event_name = 'SIGNIN'
ORDER BY created_at DESC LIMIT 3;

-- SHOPPING_LIST_CREATED (metadata: checklist_id, explore_scene_id, item_count, total_budget, timestamp)
SELECT 'SHOPPING_LIST_CREATED' AS check_name, metadata, created_at
FROM app_8574c59127_analytics_events
WHERE country = 'NG' AND event_name = 'SHOPPING_LIST_CREATED'
ORDER BY created_at DESC LIMIT 3;

-- HOME_REGISTRY_SHARED (metadata: checklist_id, timestamp)
SELECT 'HOME_REGISTRY_SHARED' AS check_name, metadata, created_at
FROM app_8574c59127_analytics_events
WHERE country = 'NG' AND event_name = 'HOME_REGISTRY_SHARED'
ORDER BY created_at DESC LIMIT 3;

-- CATALOG_PRODUCT_CLICKED (metadata: product_id, product_name, vendor_id, explore_scene_id, timestamp)
SELECT 'CATALOG_PRODUCT_CLICKED' AS check_name, metadata, created_at
FROM app_8574c59127_analytics_events
WHERE country = 'NG' AND event_name = 'CATALOG_PRODUCT_CLICKED'
ORDER BY created_at DESC LIMIT 3;

-- VIEW_ON_INSTAGRAM_CLICKED (metadata: instagram_handle, item_name, explore_scene_id, timestamp)
SELECT 'VIEW_ON_INSTAGRAM_CLICKED' AS check_name, metadata, created_at
FROM app_8574c59127_analytics_events
WHERE country = 'NG' AND event_name = 'VIEW_ON_INSTAGRAM_CLICKED'
ORDER BY created_at DESC LIMIT 3;

-- WHATSAPP_REDIRECT (metadata: vendor_id or storefront_id, product_id, source, from_scene_slug, timestamp)
SELECT 'WHATSAPP_REDIRECT' AS check_name, metadata, created_at
FROM app_8574c59127_analytics_events
WHERE country = 'NG' AND event_name = 'WHATSAPP_REDIRECT'
ORDER BY created_at DESC LIMIT 3;

-- 5. Quick sanity: any non-NG rows should not have these Nigerian event names
-- (Optional; run if you want to ensure no NG events leaked with wrong country.)
-- SELECT event_name, country, count(*) FROM app_8574c59127_analytics_events
-- WHERE event_name IN (
--   'HOMEPAGE_LANDING','EXPLORE_CURATED_ROOMS_VIEW','ROOM_SELECTION','SIGNUP','SIGNIN',
--   'SHOPPING_LIST_CREATED','HOME_REGISTRY_SHARED','CATALOG_PRODUCT_CLICKED','VIEW_ON_INSTAGRAM_CLICKED','WHATSAPP_REDIRECT'
-- ) GROUP BY event_name, country ORDER BY event_name, country;
