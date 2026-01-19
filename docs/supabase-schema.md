# Supabase Database Schema Documentation

This document summarizes the complete database schema for the Homable Creations application, including all tables, views, storage buckets, triggers, and functions.

## Tables

### `boards`

**Purpose:** Stores room boards created by users. Each board represents a room analysis session with an uploaded inspiration image.

**Columns:**
- `id` (UUID, PRIMARY KEY) - Default: `gen_random_uuid()`
- `user_id` (UUID, NULLABLE) - References `auth.users(id)`. Can be NULL for anonymous users.
- `name` (TEXT, NOT NULL) - Default: `'Untitled room'`
- `cover_image_url` (TEXT, NULLABLE)
- `source_image_url` (TEXT, NULLABLE)
- `status` (TEXT, NOT NULL) - Default: `'draft'`
- `detected_items_count` (INTEGER) - Default: `0`
- `country` (VARCHAR(2), NULLABLE) - ISO 3166-1 alpha-2 country code (e.g., 'NG' for Nigeria)
- `room_materials` (JSONB, NULLABLE) - Room-level materials data
- `created_at` (TIMESTAMPTZ) - Default: `NOW()`
- `updated_at` (TIMESTAMPTZ, NULLABLE) - Note: Updated_at trigger was removed in migration `20260106_remove_updated_at_trigger.sql`

**Primary Key:** `id`

**Foreign Keys:**
- `user_id` → `auth.users(id)` (nullable, no constraint due to anonymous user support)

**Indexes:**
- `boards_user_id_idx` on `user_id`
- `idx_boards_country` on `country`
- `idx_boards_created_at` on `created_at`

**RLS:** Enabled

**RLS Policies:**
- `allow_insert_boards` - Public INSERT (allows anonymous users)
- `allow_select_boards` - Public SELECT (allows anonymous users)
- `allow_update_own_boards` - Authenticated users can UPDATE their own boards
- `allow_delete_own_boards` - Authenticated users can DELETE their own boards

---

### `detected_items`

**Purpose:** Stores items detected in uploaded room images by AI vision analysis.

**Columns:**
- `id` (UUID, PRIMARY KEY) - Default: `gen_random_uuid()`
- `board_id` (UUID, NOT NULL) - References `boards(id)` ON DELETE CASCADE
- `item_name` (TEXT, NOT NULL)
- `category` (TEXT, NULLABLE)
- `style` (TEXT, NULLABLE)
- `dominant_color` (TEXT, NULLABLE)
- `materials` (TEXT[], NULLABLE) - Array of material names
- `tags` (TEXT[], NULLABLE) - Array of tags
- `description` (TEXT, NULLABLE)
- `confidence` (NUMERIC, NULLABLE)
- `position` (JSONB, NULLABLE) - Position coordinates in the image
- `dimensions` (JSONB, NULLABLE) - Item dimensions data
- `intent_class` (VARCHAR(50), NULLABLE) - Classification: `'buildable_furniture'`, `'soft_goods'`, `'lighting'`, `'decor'`, `'electronics'`, or NULL
- `created_at` (TIMESTAMPTZ) - Default: `NOW()`

**Primary Key:** `id`

**Foreign Keys:**
- `board_id` → `boards(id)` ON DELETE CASCADE

**Indexes:**
- `detected_items_board_id_idx` on `board_id`
- `idx_detected_items_created_at` on `created_at`
- `idx_detected_items_intent_class` on `intent_class`

**Constraints:**
- Check constraint on `intent_class`: Must be NULL or one of: `'buildable_furniture'`, `'soft_goods'`, `'lighting'`, `'decor'`, `'electronics'`

**RLS:** Enabled

**RLS Policies:**
- `allow_select_detected_items` - Public SELECT (allows anonymous users)
- `allow_insert_detected_items` - Public INSERT (allows anonymous users)
- `Service role can insert detected_items` - Service role can INSERT

---

### `products`

**Purpose:** Stores product information from various retailers (Amazon, Walmart, Wayfair, etc.). Products can be seed data or API-fetched results.

**Columns:**
- `id` (UUID, PRIMARY KEY) - Default: `gen_random_uuid()`
- `external_id` (TEXT, NULLABLE) - External product identifier (e.g., Amazon ASIN)
- `merchant` (TEXT, NULLABLE) - Retailer name (e.g., 'Amazon', 'Walmart', 'Wayfair')
- `product_name` (TEXT, NOT NULL)
- `category` (TEXT, NULLABLE)
- `price` (NUMERIC, NULLABLE)
- `currency` (TEXT) - Default: `'USD'`
- `product_url` (TEXT, NOT NULL)
- `image_url` (TEXT, NULLABLE)
- `description` (TEXT, NULLABLE)
- `color` (TEXT, NULLABLE)
- `materials` (TEXT[], NULLABLE) - Array of material names
- `style` (TEXT, NULLABLE)
- `tags` (TEXT[], NULLABLE) - Array of tags
- `rating` (NUMERIC, NULLABLE)
- `review_count` (INTEGER, NULLABLE)
- `is_seed` (BOOLEAN) - Default: `false`. Indicates if product is seed data vs API-fetched
- `created_at` (TIMESTAMPTZ) - Default: `NOW()`

**Primary Key:** `id`

**Foreign Keys:** None (standalone table)

**Indexes:**
- `products_category_idx` on `category`
- `products_tags_idx` on `tags` (GIN index)
- `idx_products_created_at` on `created_at`
- `idx_products_merchant` on `merchant`
- `idx_products_is_seed` on `is_seed` WHERE `is_seed = true`
- `idx_products_seed_category` on `(is_seed, category)` WHERE `is_seed = true`

**RLS:** Enabled

**RLS Policies:**
- `allow_select_products` - Public SELECT (anyone can view products)
- `allow_insert_products` - Public INSERT (allows anonymous users)
- `Service role can insert products` - Service role can INSERT

---

### `item_product_matches`

**Purpose:** Junction table linking detected items to matching products with match scores.

**Columns:**
- `id` (UUID, PRIMARY KEY) - Default: `gen_random_uuid()`
- `detected_item_id` (UUID, NOT NULL) - References `detected_items(id)` ON DELETE CASCADE
- `product_id` (UUID, NOT NULL) - References `products(id)` ON DELETE CASCADE
- `match_score` (NUMERIC, NOT NULL) - Similarity/match score between item and product
- `is_top_pick` (BOOLEAN) - Default: `false`
- `created_at` (TIMESTAMPTZ) - Default: `NOW()`

**Primary Key:** `id`

**Foreign Keys:**
- `detected_item_id` → `detected_items(id)` ON DELETE CASCADE
- `product_id` → `products(id)` ON DELETE CASCADE

**Indexes:**
- `item_product_matches_item_idx` on `detected_item_id`

**RLS:** Enabled

**RLS Policies:**
- `Users can view matches for their items` - Users can SELECT matches for items from their boards
- `Service role can insert matches` - Service role can INSERT

---

### `app_8574c59127_checklists`

**Purpose:** Stores user-created checklists for room projects.

**Columns:**
- `id` (UUID, PRIMARY KEY) - Default: `gen_random_uuid()`
- `user_id` (UUID, NOT NULL) - References `auth.users(id)`
- `name` (TEXT, NOT NULL)
- `board_id` (UUID, NULLABLE) - References `boards(id)`
- `created_at` (TIMESTAMPTZ, NOT NULL) - Default: `TIMEZONE('utc'::text, NOW())`
- `updated_at` (TIMESTAMPTZ, NOT NULL) - Default: `TIMEZONE('utc'::text, NOW())`

**Primary Key:** `id`

**Foreign Keys:**
- `user_id` → `auth.users(id)`
- `board_id` → `boards(id)`

**Indexes:**
- `checklists_user_idx` on `user_id`
- `checklists_created_idx` on `created_at DESC`

**RLS:** Enabled

**RLS Policies:**
- `Users can view own checklists` - Authenticated users can SELECT their own checklists
- `Users can create own checklists` - Authenticated users can INSERT their own checklists
- `Users can update own checklists` - Authenticated users can UPDATE their own checklists
- `Users can delete own checklists` - Authenticated users can DELETE their own checklists

---

### `app_8574c59127_checklist_items`

**Purpose:** Stores individual items within checklists.

**Columns:**
- `id` (UUID, PRIMARY KEY) - Default: `gen_random_uuid()`
- `checklist_id` (UUID, NOT NULL) - References `app_8574c59127_checklists(id)` ON DELETE CASCADE
- `item_name` (TEXT, NOT NULL)
- `is_completed` (BOOLEAN, NOT NULL) - Default: `false`
- `completed_at` (TIMESTAMPTZ, NULLABLE)
- `sort_order` (INTEGER, NOT NULL)
- `created_at` (TIMESTAMPTZ, NOT NULL) - Default: `TIMEZONE('utc'::text, NOW())`

**Primary Key:** `id`

**Foreign Keys:**
- `checklist_id` → `app_8574c59127_checklists(id)` ON DELETE CASCADE

**Indexes:**
- `checklist_items_checklist_idx` on `checklist_id`
- `checklist_items_sort_idx` on `(checklist_id, sort_order)`

**RLS:** Enabled

**RLS Policies:**
- `Users can view items of own checklists` - Authenticated users can SELECT items from their own checklists
- `Users can create items in own checklists` - Authenticated users can INSERT items in their own checklists
- `Users can update items in own checklists` - Authenticated users can UPDATE items in their own checklists
- `Users can delete items in own checklists` - Authenticated users can DELETE items from their own checklists

---

### `app_8574c59127_specs_history`

**Purpose:** Stores user specifications and search queries for product searches.

**Columns:**
- `id` (UUID, PRIMARY KEY) - Default: `gen_random_uuid()`
- `user_id` (UUID, NOT NULL) - References `auth.users(id)`
- `category` (TEXT, NOT NULL)
- `specifications` (JSONB, NOT NULL) - User specifications data
- `search_queries` (TEXT[], NOT NULL) - Array of search queries generated
- `created_at` (TIMESTAMPTZ, NOT NULL) - Default: `TIMEZONE('utc'::text, NOW())`

**Primary Key:** `id`

**Foreign Keys:**
- `user_id` → `auth.users(id)`

**Indexes:**
- `specs_history_user_idx` on `user_id`
- `specs_history_created_idx` on `created_at DESC`

**RLS:** Enabled

**RLS Policies:**
- `allow_read_own_specs` - Authenticated users can SELECT their own specs
- `allow_insert_own_specs` - Authenticated users can INSERT their own specs
- `allow_delete_own_specs` - Authenticated users can DELETE their own specs

---

### `app_8574c59127_analytics_events`

**Purpose:** Stores analytics events for tracking user behavior and application metrics.

**Columns:**
- `id` (UUID, PRIMARY KEY) - Default: `gen_random_uuid()`
- `event_name` (TEXT, NOT NULL)
- `metadata` (JSONB) - Default: `'{}'::jsonb`
- `created_at` (TIMESTAMPTZ, NOT NULL) - Default: `TIMEZONE('utc'::text, NOW())`

**Primary Key:** `id`

**Foreign Keys:** None

**Indexes:**
- `analytics_events_name_idx` on `event_name`
- `analytics_events_created_idx` on `created_at DESC`

**RLS:** Enabled

**RLS Policies:**
- `allow_anonymous_insert_events` - Anonymous users can INSERT events
- `allow_authenticated_insert_events` - Authenticated users can INSERT events

---

### `analysis_logs`

**Purpose:** Tracks analysis metrics for each board analysis session.

**Columns:**
- `id` (UUID, PRIMARY KEY) - Default: `gen_random_uuid()`
- `board_id` (UUID, NOT NULL) - References `boards(id)` ON DELETE CASCADE
- `user_id` (UUID, NOT NULL) - References `auth.users(id)` ON DELETE CASCADE
- `number_of_items_detected` (INTEGER, NOT NULL) - Default: `0`
- `number_of_items_with_products` (INTEGER, NOT NULL) - Default: `0`
- `number_of_products_shown` (INTEGER, NOT NULL) - Default: `0`
- `created_at` (TIMESTAMPTZ, NOT NULL) - Default: `TIMEZONE('utc'::text, NOW())`

**Primary Key:** `id`

**Foreign Keys:**
- `board_id` → `boards(id)` ON DELETE CASCADE
- `user_id` → `auth.users(id)` ON DELETE CASCADE

**Indexes:**
- `analysis_logs_user_idx` on `user_id`
- `analysis_logs_board_idx` on `board_id`
- `analysis_logs_created_at_idx` on `created_at DESC`

**RLS:** Enabled

**RLS Policies:**
- `allow_read_own_logs` - Authenticated users can SELECT their own logs
- `allow_insert_own_logs` - Authenticated users can INSERT their own logs

---

## Views

### Analytics Views

All analytics views are defined in `supabase/migrations/20241203_metrics_dashboard.sql`:

#### `analytics_product_clicks`
Tracks all product matches that could lead to purchases. Each row represents a potential purchase opportunity.

**Columns:** `product_id`, `product_name`, `merchant`, `price`, `product_url`, `is_seed`, `category`, `style`, `user_id`, `board_created_at`, `product_matched_at`

#### `analytics_homepage_impressions`
Daily homepage engagement measured by new board creations.

**Columns:** `date`, `total_boards_created`, `unique_users`

#### `analytics_signups`
Daily user registration tracking.

**Columns:** `date`, `new_signups`, `email_signups`, `anonymous_signups`

#### `analytics_uploads`
Daily image upload activity and success rate.

**Columns:** `date`, `total_uploads`, `unique_uploaders`, `successful_uploads`

#### `analytics_successful_matches`
Daily product matching success metrics.

**Columns:** `date`, `items_detected`, `products_matched`, `avg_match_score`, `boards_with_matches`

#### `analytics_no_matches`
Tracks items that were detected but had no product matches.

**Columns:** `date`, `items_with_no_matches`, `affected_boards`, `categories_affected`

#### `analytics_daily_summary`
Comprehensive daily metrics dashboard combining all key metrics.

**Columns:** `date`, `signups`, `uploads`, `unique_uploaders`, `items_detected`, `products_matched`, `avg_match_score`, `no_match_items`, `total_boards`

#### `analytics_merchant_performance`
Performance metrics by merchant (Amazon, Walmart, Wayfair, etc.).

**Columns:** `merchant`, `total_products`, `unique_items_matched`, `avg_match_score`, `avg_price`, `seed_products`, `api_products`

#### `analytics_category_insights`
Product category performance and trends.

**Columns:** `category`, `items_detected`, `products_matched`, `avg_match_score`, `boards_featuring_category`, `common_styles`

#### `analytics_user_engagement`
User-level engagement metrics for retention analysis.

**Columns:** `user_id`, `total_boards`, `total_items_detected`, `total_products_matched`, `first_board_date`, `last_board_date`, `days_active`

---

## Storage Buckets

### `inspiration-images`

**Purpose:** Stores uploaded inspiration images for room boards.

**Configuration:**
- Public bucket: Yes
- File size limit: 10 MB (configured in Supabase Dashboard)
- Allowed MIME types: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif`

**Storage Policies:**
- `allow_anon_insert_inspiration_images` - Anonymous users can INSERT (upload)
- `allow_authenticated_insert_inspiration_images` - Authenticated users can INSERT (upload)
- `allow_public_read_inspiration_images` - Public SELECT (anyone can read/view images)
- `allow_authenticated_delete_own_inspiration_images` - Authenticated users can DELETE their own images (based on folder structure matching user_id)

**Note:** The bucket must be created manually in the Supabase Dashboard. The SQL policies are defined in `supabase/migrations/20241204_allow_anon_uploads.sql`.

### `carpenter-specs`

**Purpose:** Stores generated carpenter specification PDFs for buildable furniture items. These PDFs are shared with carpenters via download links or WhatsApp.

**Configuration:**
- Public bucket: Yes
- File size limit: Unset (default 50 MB)
- Allowed MIME types: `application/pdf`

**Storage Policies:**
- Public READ access (anyone with link can download)
- INSERT controlled by backend / edge functions
- DELETE controlled by backend (if applicable)

**Usage Notes:**
- PDFs generated by AI / spec generation functions are uploaded here
- URLs from this bucket are embedded in the UI and shared externally

---

## Triggers

**Note:** There are currently no active triggers in the database. A trigger for automatically updating `updated_at` columns was created in migration `20260106_add_updated_at_to_detected_items.sql` but was subsequently removed in migration `20260106_remove_updated_at_trigger.sql`.

---

## Functions

### `handle_updated_at()` (Removed)

**Status:** This function was created and then removed.

**Purpose:** Was designed to automatically update `updated_at` timestamp on row updates.

**Note:** This function and its associated triggers were removed in migration `20260106_remove_updated_at_trigger.sql`. The `updated_at` columns were also removed from `detected_items` and `boards` tables.

---

## Schema Evolution Notes

1. **Initial Schema:** The original schema used tables prefixed with `app_8574c59127_*` (defined in `supabase_setup.sql`).

2. **Migration to Current Schema:** The `supabase_migration_ai_vision.sql` migration dropped the old tables and created the current simplified schema with `boards`, `detected_items`, `products`, and `item_product_matches`.

3. **Anonymous User Support:** Multiple migrations (`supabase_anonymous_boards.sql`, `20241204_allow_anon_boards.sql`, `20241204_fix_anon_users.sql`) modified RLS policies and removed foreign key constraints to support anonymous users.

4. **Product Seed Data:** The `is_seed` column was added to `products` table to distinguish between seed data and API-fetched products.

5. **Country Detection:** The `country` column was added to `boards` table for location-specific features (e.g., Nigeria).

6. **Intent Classification:** The `intent_class` column was added to `detected_items` to classify items by buildability (buildable_furniture, soft_goods, lighting, decor, electronics).

7. **Dimensions and Materials:** The `dimensions` column was added to `detected_items` and `room_materials` was added to `boards` for enhanced product matching.

---

## Legacy Tables (Deprecated)

The following tables were dropped in `supabase_migration_ai_vision.sql` and no longer exist:
- `app_8574c59127_boards`
- `app_8574c59127_detected_items`
- `app_8574c59127_products`
- `app_8574c59127_saved_items`

These have been replaced by the current schema tables listed above.
