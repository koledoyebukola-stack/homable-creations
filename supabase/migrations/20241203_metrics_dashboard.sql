-- Metrics Dashboard SQL Views
-- Run this in Supabase SQL Editor to create analytics views
-- These views provide real-time metrics for tracking business performance

BEGIN;

-- ============================================================================
-- PRIMARY METRIC: Total Purchases (Tracked via Product Clicks)
-- ============================================================================

-- View: Product click tracking with purchase intent
CREATE OR REPLACE VIEW analytics_product_clicks AS
SELECT 
  p.id as product_id,
  p.product_name,
  p.merchant,
  p.price,
  p.product_url,
  p.is_seed,
  di.category,
  di.style,
  b.user_id,
  b.created_at as board_created_at,
  p.created_at as product_matched_at
FROM products p
LEFT JOIN detected_items di ON p.detected_item_id = di.id
LEFT JOIN boards b ON di.board_id = b.id
WHERE p.product_url IS NOT NULL
ORDER BY p.created_at DESC;

COMMENT ON VIEW analytics_product_clicks IS 
'Tracks all product matches that could lead to purchases. Each row represents a potential purchase opportunity.';

-- ============================================================================
-- SECONDARY METRICS
-- ============================================================================

-- View: Homepage impressions (board views)
CREATE OR REPLACE VIEW analytics_homepage_impressions AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_boards_created,
  COUNT(DISTINCT user_id) as unique_users
FROM boards
GROUP BY DATE(created_at)
ORDER BY date DESC;

COMMENT ON VIEW analytics_homepage_impressions IS 
'Daily homepage engagement measured by new board creations';

-- View: User signups
CREATE OR REPLACE VIEW analytics_signups AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_signups,
  COUNT(*) FILTER (WHERE email IS NOT NULL) as email_signups,
  COUNT(*) FILTER (WHERE email IS NULL) as anonymous_signups
FROM auth.users
GROUP BY DATE(created_at)
ORDER BY date DESC;

COMMENT ON VIEW analytics_signups IS 
'Daily user registration tracking';

-- View: Upload activity
CREATE OR REPLACE VIEW analytics_uploads AS
SELECT 
  DATE(b.created_at) as date,
  COUNT(*) as total_uploads,
  COUNT(DISTINCT b.user_id) as unique_uploaders,
  COUNT(*) FILTER (WHERE b.source_image_url IS NOT NULL) as successful_uploads
FROM boards b
GROUP BY DATE(b.created_at)
ORDER BY date DESC;

COMMENT ON VIEW analytics_uploads IS 
'Daily image upload activity and success rate';

-- View: Successful matches (products found)
CREATE OR REPLACE VIEW analytics_successful_matches AS
SELECT 
  DATE(di.created_at) as date,
  COUNT(DISTINCT di.id) as items_detected,
  COUNT(p.id) as products_matched,
  ROUND(AVG(p.match_score), 2) as avg_match_score,
  COUNT(DISTINCT di.board_id) as boards_with_matches
FROM detected_items di
LEFT JOIN products p ON p.detected_item_id = di.id
GROUP BY DATE(di.created_at)
ORDER BY date DESC;

COMMENT ON VIEW analytics_successful_matches IS 
'Daily product matching success metrics';

-- View: No-match events (failed detections)
CREATE OR REPLACE VIEW analytics_no_matches AS
SELECT 
  DATE(di.created_at) as date,
  COUNT(*) as items_with_no_matches,
  COUNT(DISTINCT di.board_id) as affected_boards,
  STRING_AGG(DISTINCT di.category, ', ') as categories_affected
FROM detected_items di
LEFT JOIN products p ON p.detected_item_id = di.id
WHERE p.id IS NULL
GROUP BY DATE(di.created_at)
ORDER BY date DESC;

COMMENT ON VIEW analytics_no_matches IS 
'Tracks items that were detected but had no product matches';

-- ============================================================================
-- COMPREHENSIVE DASHBOARD VIEW
-- ============================================================================

-- View: Daily metrics summary
CREATE OR REPLACE VIEW analytics_daily_summary AS
SELECT 
  d.date,
  COALESCE(s.new_signups, 0) as signups,
  COALESCE(u.total_uploads, 0) as uploads,
  COALESCE(u.unique_uploaders, 0) as unique_uploaders,
  COALESCE(m.items_detected, 0) as items_detected,
  COALESCE(m.products_matched, 0) as products_matched,
  COALESCE(m.avg_match_score, 0) as avg_match_score,
  COALESCE(nm.items_with_no_matches, 0) as no_match_items,
  COALESCE(h.total_boards_created, 0) as total_boards
FROM (
  SELECT DISTINCT DATE(created_at) as date 
  FROM boards
  UNION
  SELECT DISTINCT DATE(created_at) as date 
  FROM auth.users
) d
LEFT JOIN analytics_signups s ON d.date = s.date
LEFT JOIN analytics_uploads u ON d.date = u.date
LEFT JOIN analytics_successful_matches m ON d.date = m.date
LEFT JOIN analytics_no_matches nm ON d.date = nm.date
LEFT JOIN analytics_homepage_impressions h ON d.date = h.date
ORDER BY d.date DESC;

COMMENT ON VIEW analytics_daily_summary IS 
'Comprehensive daily metrics dashboard combining all key metrics';

-- ============================================================================
-- MERCHANT PERFORMANCE TRACKING
-- ============================================================================

-- View: Merchant performance
CREATE OR REPLACE VIEW analytics_merchant_performance AS
SELECT 
  p.merchant,
  COUNT(*) as total_products,
  COUNT(DISTINCT p.detected_item_id) as unique_items_matched,
  ROUND(AVG(p.match_score), 2) as avg_match_score,
  ROUND(AVG(p.price), 2) as avg_price,
  COUNT(*) FILTER (WHERE p.is_seed = true) as seed_products,
  COUNT(*) FILTER (WHERE p.is_seed = false) as api_products
FROM products p
GROUP BY p.merchant
ORDER BY total_products DESC;

COMMENT ON VIEW analytics_merchant_performance IS 
'Performance metrics by merchant (Amazon, Walmart, Wayfair, etc.)';

-- ============================================================================
-- CATEGORY INSIGHTS
-- ============================================================================

-- View: Category performance
CREATE OR REPLACE VIEW analytics_category_insights AS
SELECT 
  di.category,
  COUNT(DISTINCT di.id) as items_detected,
  COUNT(p.id) as products_matched,
  ROUND(AVG(p.match_score), 2) as avg_match_score,
  COUNT(DISTINCT di.board_id) as boards_featuring_category,
  STRING_AGG(DISTINCT di.style, ', ') as common_styles
FROM detected_items di
LEFT JOIN products p ON p.detected_item_id = di.id
GROUP BY di.category
ORDER BY items_detected DESC;

COMMENT ON VIEW analytics_category_insights IS 
'Product category performance and trends';

-- ============================================================================
-- USER ENGAGEMENT METRICS
-- ============================================================================

-- View: User engagement levels
CREATE OR REPLACE VIEW analytics_user_engagement AS
SELECT 
  b.user_id,
  COUNT(DISTINCT b.id) as total_boards,
  COUNT(DISTINCT di.id) as total_items_detected,
  COUNT(p.id) as total_products_matched,
  MIN(b.created_at) as first_board_date,
  MAX(b.created_at) as last_board_date,
  EXTRACT(EPOCH FROM (MAX(b.created_at) - MIN(b.created_at))) / 86400 as days_active
FROM boards b
LEFT JOIN detected_items di ON di.board_id = b.id
LEFT JOIN products p ON p.detected_item_id = di.id
GROUP BY b.user_id
ORDER BY total_boards DESC;

COMMENT ON VIEW analytics_user_engagement IS 
'User-level engagement metrics for retention analysis';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Ensure indexes exist for fast analytics queries
CREATE INDEX IF NOT EXISTS idx_boards_created_at ON boards(created_at);
CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);
CREATE INDEX IF NOT EXISTS idx_detected_items_created_at ON detected_items(created_at);
CREATE INDEX IF NOT EXISTS idx_detected_items_board_id ON detected_items(board_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_products_detected_item_id ON products(detected_item_id);
CREATE INDEX IF NOT EXISTS idx_products_merchant ON products(merchant);
CREATE INDEX IF NOT EXISTS idx_products_is_seed ON products(is_seed);

COMMIT;

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================

-- Query examples:

-- 1. Get today's metrics
-- SELECT * FROM analytics_daily_summary WHERE date = CURRENT_DATE;

-- 2. Get last 7 days summary
-- SELECT * FROM analytics_daily_summary WHERE date >= CURRENT_DATE - INTERVAL '7 days';

-- 3. Get total purchases (product clicks)
-- SELECT COUNT(*) as total_potential_purchases FROM analytics_product_clicks;

-- 4. Get merchant breakdown
-- SELECT * FROM analytics_merchant_performance;

-- 5. Get category insights
-- SELECT * FROM analytics_category_insights;

-- 6. Get top engaged users
-- SELECT * FROM analytics_user_engagement ORDER BY total_boards DESC LIMIT 10;

-- 7. Get no-match rate
-- SELECT 
--   SUM(items_detected) as total_items,
--   SUM(items_with_no_matches) as no_matches,
--   ROUND(100.0 * SUM(items_with_no_matches) / NULLIF(SUM(items_detected), 0), 2) as no_match_rate_percent
-- FROM analytics_no_matches;