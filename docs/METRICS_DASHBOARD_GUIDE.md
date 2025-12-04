# Homable Metrics Dashboard Guide

This guide explains how to use the analytics views created for tracking Homable's business metrics.

## Setup

1. **Run the SQL migration** in Supabase SQL Editor:
   ```bash
   # Copy the contents of supabase/migrations/20241203_metrics_dashboard.sql
   # Paste into Supabase Dashboard → SQL Editor → New Query
   # Click "Run"
   ```

2. **Verify views were created**:
   ```sql
   SELECT table_name 
   FROM information_schema.views 
   WHERE table_schema = 'public' 
   AND table_name LIKE 'analytics_%';
   ```

## Primary Metric: Total Purchases

Since we can't directly track purchases (they happen on Amazon/Walmart/Wayfair), we track **product clicks** as a proxy for purchase intent.

### Query: Total Potential Purchases
```sql
SELECT COUNT(*) as total_potential_purchases 
FROM analytics_product_clicks;
```

### Query: Purchases by Merchant
```sql
SELECT 
  merchant,
  COUNT(*) as clicks,
  ROUND(AVG(price), 2) as avg_price
FROM analytics_product_clicks
GROUP BY merchant
ORDER BY clicks DESC;
```

### Query: Purchases by Date
```sql
SELECT 
  DATE(product_matched_at) as date,
  COUNT(*) as clicks,
  COUNT(DISTINCT user_id) as unique_users
FROM analytics_product_clicks
GROUP BY DATE(product_matched_at)
ORDER BY date DESC;
```

## Secondary Metrics

### 1. Homepage Impressions
```sql
-- Last 30 days
SELECT * FROM analytics_homepage_impressions 
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;

-- Total impressions
SELECT SUM(total_boards_created) as total_impressions
FROM analytics_homepage_impressions;
```

### 2. User Signups
```sql
-- Daily signups
SELECT * FROM analytics_signups 
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;

-- Total signups
SELECT SUM(new_signups) as total_signups
FROM analytics_signups;
```

### 3. Upload Activity
```sql
-- Recent uploads
SELECT * FROM analytics_uploads 
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;

-- Upload success rate
SELECT 
  SUM(total_uploads) as total_attempts,
  SUM(successful_uploads) as successful,
  ROUND(100.0 * SUM(successful_uploads) / NULLIF(SUM(total_uploads), 0), 2) as success_rate_percent
FROM analytics_uploads;
```

### 4. Successful Matches
```sql
-- Recent matching performance
SELECT * FROM analytics_successful_matches 
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;

-- Overall match quality
SELECT 
  SUM(items_detected) as total_items,
  SUM(products_matched) as total_matches,
  ROUND(AVG(avg_match_score), 2) as overall_avg_score
FROM analytics_successful_matches;
```

### 5. No-Match Events
```sql
-- Recent no-match issues
SELECT * FROM analytics_no_matches 
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;

-- No-match rate
SELECT 
  SUM(m.items_detected) as total_items,
  SUM(nm.items_with_no_matches) as no_matches,
  ROUND(100.0 * SUM(nm.items_with_no_matches) / NULLIF(SUM(m.items_detected), 0), 2) as no_match_rate_percent
FROM analytics_successful_matches m
FULL OUTER JOIN analytics_no_matches nm ON m.date = nm.date;
```

## Comprehensive Dashboard

### Daily Summary (All Metrics)
```sql
-- Last 7 days
SELECT * FROM analytics_daily_summary 
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;

-- Today's metrics
SELECT * FROM analytics_daily_summary 
WHERE date = CURRENT_DATE;
```

### Merchant Performance
```sql
SELECT * FROM analytics_merchant_performance
ORDER BY total_products DESC;
```

### Category Insights
```sql
SELECT * FROM analytics_category_insights
ORDER BY items_detected DESC;
```

### User Engagement
```sql
-- Top 20 most engaged users
SELECT * FROM analytics_user_engagement
ORDER BY total_boards DESC
LIMIT 20;

-- User retention (users active for 7+ days)
SELECT COUNT(*) as retained_users
FROM analytics_user_engagement
WHERE days_active >= 7;
```

## Quick Reference Queries

### Today's Performance
```sql
SELECT 
  signups,
  uploads,
  items_detected,
  products_matched,
  no_match_items,
  ROUND(100.0 * products_matched / NULLIF(items_detected, 0), 2) as match_rate_percent
FROM analytics_daily_summary
WHERE date = CURRENT_DATE;
```

### Week-over-Week Growth
```sql
WITH this_week AS (
  SELECT 
    SUM(signups) as signups,
    SUM(uploads) as uploads,
    SUM(products_matched) as matches
  FROM analytics_daily_summary
  WHERE date >= CURRENT_DATE - INTERVAL '7 days'
),
last_week AS (
  SELECT 
    SUM(signups) as signups,
    SUM(uploads) as uploads,
    SUM(products_matched) as matches
  FROM analytics_daily_summary
  WHERE date >= CURRENT_DATE - INTERVAL '14 days'
    AND date < CURRENT_DATE - INTERVAL '7 days'
)
SELECT 
  tw.signups as this_week_signups,
  lw.signups as last_week_signups,
  ROUND(100.0 * (tw.signups - lw.signups) / NULLIF(lw.signups, 0), 2) as signup_growth_percent,
  tw.uploads as this_week_uploads,
  lw.uploads as last_week_uploads,
  ROUND(100.0 * (tw.uploads - lw.uploads) / NULLIF(lw.uploads, 0), 2) as upload_growth_percent
FROM this_week tw, last_week lw;
```

### Conversion Funnel
```sql
SELECT 
  SUM(signups) as step1_signups,
  SUM(uploads) as step2_uploads,
  SUM(items_detected) as step3_items_detected,
  SUM(products_matched) as step4_products_matched,
  ROUND(100.0 * SUM(uploads) / NULLIF(SUM(signups), 0), 2) as signup_to_upload_percent,
  ROUND(100.0 * SUM(products_matched) / NULLIF(SUM(items_detected), 0), 2) as detection_to_match_percent
FROM analytics_daily_summary
WHERE date >= CURRENT_DATE - INTERVAL '30 days';
```

## Exporting Data

### Export to CSV (via Supabase Dashboard)
1. Run your query in SQL Editor
2. Click "Download CSV" button
3. Open in Excel/Google Sheets

### Export via API (for automation)
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Get daily summary
const { data } = await supabase
  .from('analytics_daily_summary')
  .select('*')
  .gte('date', '2024-01-01')
  .order('date', { ascending: false });

console.log(data);
```

## Monitoring Alerts

Set up alerts for key metrics:

### Low Match Rate Alert
```sql
-- Run daily to check if match rate drops below 70%
SELECT 
  date,
  items_detected,
  products_matched,
  ROUND(100.0 * products_matched / NULLIF(items_detected, 0), 2) as match_rate
FROM analytics_daily_summary
WHERE date = CURRENT_DATE
  AND (products_matched * 100.0 / NULLIF(items_detected, 0)) < 70;
```

### High No-Match Rate Alert
```sql
-- Alert if no-match rate exceeds 30%
SELECT 
  date,
  items_with_no_matches,
  affected_boards
FROM analytics_no_matches
WHERE date = CURRENT_DATE
  AND items_with_no_matches > 10;
```

## Performance Tips

1. **Use date filters** to limit data range for faster queries
2. **Create materialized views** for frequently accessed metrics (optional)
3. **Schedule regular VACUUM** on tables for optimal performance
4. **Monitor index usage** and add indexes as needed

## Support

For questions or issues with the metrics dashboard:
- Check Supabase Dashboard → Logs for errors
- Review index performance in Dashboard → Database → Indexes
- Contact support if views are not updating