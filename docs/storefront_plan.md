# Storefront / Marketplace Plan (Plan Only — Do Not Build Yet)

## 1. Codebase Audit

### 1.1 Supabase usage

- **Auth**: Used for user sessions (Header, ItemDetection, ProductMatches, Checklists, etc.). No vendor/auth accounts today; storefronts will be managed manually (Table Editor / SQL).
- **Tables referenced in app**: `boards`, `detected_items`, `products`, `item_product_matches`. Naming in migrations is short (`boards`, not `app_8574c59127_boards`).
- **Storage**: 
  - Bucket `inspiration-images`: user uploads for analyze flow (`api.uploadImage`), path `{user_id|anon}/{timestamp}.{ext}`.
  - Bucket `room-images`: Design Space flow (`designSpace.ts`).
- **Pattern**: Edge function `app_8574c59127_search_products` returns retailer product matches; `getProductsForItem` reads `item_product_matches` + `products`. The existing **`products`** table is **retailer product matches** (merchant, product_url, detected_item_id, etc.). It should **not** be repurposed for vendor catalog products; add new tables for storefronts and vendor products.

### 1.2 Market detection (Nigeria vs others)

- **Source of truth**: `boards.country` (ISO 3166-1 alpha-2, e.g. `NG`). Set at board creation from `LocationSelector` (stored in `homable_selected_country`) or optional `?test_country=`; IP detection used as fallback in LocationSelector (default Nigeria in code).
- **ItemDetection**: `effectiveCountry = activeMarket ?? board?.country ?? null`; `isNigeria = effectiveCountry === 'NG'`. Used to show/hide:
  - “See Local Stores” → `/shops/{slugify(item.item_name)}` (Nigeria only)
  - Carpenter specs, “See international stores” toggle, Western retailers visibility.
- **ProductMatches**: `boardData?.country === 'NG'` drives Nigeria-specific UI and skipping product search for Nigerian non-furniture.
- **Integration point**: Any “go to Shops” or “show vendor results” logic should continue to branch on the **same** country (e.g. `board.country === 'NG'` or session-selected country). No new market-detection system needed; reuse existing `country` on the board (and any session override) and keep Nigeria-only behavior for storefront discovery.

### 1.3 Existing shops/stores conventions

- **Routes**:
  - `/shops` → ShopsHome (marketing/coming-soon).
  - `/shops/:query` → ShopsSearch (placeholder). Query is slug from item name (e.g. `round-coffee-table`).
  - `/shops/products/:slug` → ShopsProductDetail (placeholder).
  - `/stores/ayo-custom-furniture` → DemoStorefront (single hardcoded demo; no dynamic `/stores/:slug` yet).
- **Navigation to Shops**: Only from ItemDetection when `isNigeria`; “See Local Stores” → `navigate(\`/shops/${slugify(item.item_name)}\`)`.
- **Slug**: `slugify()` in `src/lib/slugify.ts`: lowercase, spaces → hyphens, strip non-alphanumeric.
- **Best integration points**:
  - **ShopsSearch** (`/shops/:query`): Replace placeholder with real search: resolve `query` to search term, call new API to fetch matching vendor products + storefronts, render products first then storefront cards; handle empty state with “No exact product found” + relevant storefronts + Find on Instagram / copy name / WhatsApp.
  - **ShopsProductDetail** (`/shops/products/:slug`): Resolve `slug` to a single vendor product (new table), show product + link to parent storefront + WhatsApp CTA with prefilled message.
  - **Storefront page**: Add dynamic route `/stores/:slug`. Resolve `slug` to a storefront row (new table); if not found or paused → show “temporarily unavailable” page; if active → render catalog (reuse/adapt DemoStorefront layout). Demo stays at `/stores/ayo-custom-furniture` until you replace it with real data or a redirect.

---

## 2. Proposed v1 schema

### 2.1 Tables

**Option A (recommended): New tables, leave `products` as-is**

- **`storefronts`**
  - `id` uuid PK
  - `slug` text UNIQUE NOT NULL — URL identifier (e.g. `ayo-custom-furniture`)
  - `name` text NOT NULL — business name
  - `location` text — e.g. “Lagos, Nigeria”
  - `description` text — short blurb
  - `logo_url` text — optional; Supabase Storage URL
  - `banner_url` text — optional
  - `whatsapp_number` text NOT NULL — full number for wa.me link (e.g. 2348012345678)
  - `instagram_handle` text — optional, without @
  - `status` text NOT NULL DEFAULT 'active' — `active` | `paused`
  - `active_since` timestamptz — optional; first paid/activated date for “Active since {month}”
  - `created_at`, `updated_at` timestamptz

- **`vendor_products`** (catalog items = past work, not SKU inventory)
  - `id` uuid PK
  - `storefront_id` uuid NOT NULL REFERENCES storefronts(id) ON DELETE CASCADE
  - `slug` text NOT NULL — URL-safe product identifier; unique per storefront (e.g. `modern-dining-chair`)
  - `name` text NOT NULL — display name (Wayfair-style)
  - `category` text — e.g. Chairs, Tables, Beds, Storage
  - `room` text — optional; Living, Bedroom, Dining, etc.
  - `material` text — optional; Wood, Upholstered, Mixed
  - `price_min` decimal(12,2) — optional; null = “Price on request” or range
  - `price_max` decimal(12,2) — optional
  - `currency` text DEFAULT 'NGN'
  - `image_url` text — main image (Supabase Storage URL)
  - `image_urls` text[] — optional extra images
  - `sort_order` int DEFAULT 0 — for ordering in storefront
  - `created_at`, `updated_at` timestamptz
  - UNIQUE(storefront_id, slug)

Indexes: `storefronts(slug)`, `storefronts(status)`, `vendor_products(storefront_id)`, `vendor_products(storefront_id, slug)`. Full-text or simple `name/category` search can be added later for `/shops/{query}`.

**Carpenter’s 30 images + prices**: One row per product. Each row = one “past work” item: one main image (required), optional extra images in `image_urls`. Price as single value (`price_min` only) or range (`price_min`, `price_max`). Category/room/material can be set per product for filtering and search.

### 2.2 Storage

- **Bucket**: e.g. `storefront-assets` (or reuse a dedicated bucket name you prefer).
  - **Structure**:
    - `storefronts/{storefront_id}/logo.{ext}` — vendor logo
    - `storefronts/{storefront_id}/banner.{ext}` — banner image
    - `storefronts/{storefront_id}/products/{product_id}/main.{ext}` and optionally `1.{ext}`, `2.{ext}` for galleries
  - **Access**: Public read (or signed URLs if you prefer). RLS on storage if you later add vendor auth; for v1 manual uploads, bucket can be public read.
- **URLs in DB**: Store full public URLs (from `getPublicUrl`) in `logo_url`, `banner_url`, `vendor_products.image_url` and `image_urls`.

### 2.3 RLS (v1)

- **storefronts**: `SELECT` for all rows where `status = 'active'` (and optionally allow `status = 'paused'` only for direct URL access to show “temporarily unavailable” — see 3.2). No INSERT/UPDATE/DELETE from app in v1 (manual in Table Editor).
- **vendor_products**: `SELECT` for all rows whose `storefront_id` points to an active storefront; for paused storefronts you can either hide products in API or allow SELECT and rely on storefront page to show “unavailable”. No INSERT/UPDATE/DELETE from app in v1.

---

## 3. Recommendations

### 3.1 `/shops/{query}` matching logic (simple v1)

- **Decode query**: `decodeURIComponent(query).replace(/-/g, ' ')` → search term (e.g. `round coffee table`).
- **Matching**:
  - **Products first**: Query `vendor_products` (join `storefronts` where `storefronts.status = 'active'`) where:
    - `name` ILIKE `%term%` OR
    - `category` ILIKE `%term%` OR
    - `room` ILIKE `%term%`  
    Order by relevance (e.g. name match > category match) then `sort_order`/`created_at`. Limit (e.g. 20).
  - **Storefronts second**: Same search term, match storefronts that have at least one product matching the same conditions, or all active storefronts with product count. Return storefront cards (e.g. name, location, logo, product count, link to `/stores/{slug}`).
- **Response order**: [matching products], then [relevant storefronts]. Front end: render “Products” section first, then “Vendors who can help” (or similar).
- **Fallback (no or few results)**:
  - Always show storefront cards if any active storefronts exist (e.g. “No exact product found” + “These vendors may be able to make it” + list).
  - Keep “Find on Instagram”, copy item name, and CTA to discuss with vendors. Never show a dead empty page.

### 3.2 Paused status

- **Definition**: `storefronts.status = 'paused'` (e.g. non-payment). No admin UI in v1; set via Table Editor.
- **Visibility**:
  - **Shops home**: List only `status = 'active'`.
  - **Shops search** (`/shops/{query}`): Only include products and storefronts where `status = 'active'`.
  - **Direct storefront URL** (`/stores/:slug`): If slug resolves to a storefront with `status = 'paused'` → show a **neutral “temporarily unavailable”** page (no 404, no blame). Same page if slug not found (optional: you can use 404 for not-found and “temporarily unavailable” only for paused).
- **Product URL** (`/shops/products/:slug`): If product’s storefront is paused (or product not found), redirect to the same neutral “temporarily unavailable” page (or to `/shops` with a message). Do not 404 product URLs so that old links degrade gracefully.
- **Analyze flow**: When user taps “See Local Stores” from ItemDetection, they go to `/shops/{query}`. That page fetches active products + active storefronts. If there are **no active storefronts at all**, the page should still render: show “No local vendors listed yet” (or similar) and keep “Find on Instagram” / copy name so the flow never breaks. No dependency on a single vendor’s payment.

### 3.3 Safe fallbacks

- **No active storefronts**: Shops search and Shops home show “No vendors listed yet” / “Check back soon” and retain all non-vendor CTAs (Instagram, copy name). ItemDetection continues to work (carpenter specs, international retailers for Nigeria when expanded, etc.).
- **Product slug collision**: `vendor_products(storefront_id, slug)` unique; product detail URL can be `/shops/products/:slug` globally if slug is globally unique, or you can namespace by storefront later (e.g. `/stores/:storeSlug/products/:productSlug`) to avoid cross-vendor slug clashes. v1: simplest is global product slug unique across all vendor_products (e.g. `{storefront_id}-{slug}` in DB for uniqueness, display slug in URL as you prefer).
- **Broken image URLs**: Use `onError` and placeholder in UI; avoid broken layout.

---

## 4. Phased plan

### Phase 1 — Schema and one storefront (smallest increment)

1. **Migrations**
   - Create `storefronts` and `vendor_products` tables, indexes, RLS as above.
   - Create storage bucket and policy (e.g. public read for storefront-assets).
2. **Seed one vendor**
   - Insert one row into `storefronts` (e.g. Ayo Custom Furniture, slug `ayo-custom-furniture`, status `active`, WhatsApp number, etc.).
   - Add 5–10 rows to `vendor_products` with names, categories, and image URLs (use placeholder URLs or upload 1–2 images to Storage and paste URLs). This validates schema and RLS.
3. **No route or UI changes yet** — just DB and one manual seed.

**Deliverable**: Tables and bucket exist; one active storefront with a few products queryable via SQL.

---

### Phase 2 — Dynamic storefront page

1. **Route**: Add `/stores/:slug` in App.tsx; resolve `slug` to `storefronts` (by `slug`). If not found or `status = 'paused'` → render “Temporarily unavailable” page. If active → fetch storefront + `vendor_products` for that storefront.
2. **Page**: Reuse/adapt DemoStorefront layout: hero (name, location, logo, banner, “Custom orders available”, WhatsApp CTA), then product grid. Filters (category, price range) can be client-side only on fetched products. Vanity: product count, “Active since”, etc.
3. **CTA**: Single “Discuss on WhatsApp” (floating on desktop, sticky on mobile) linking to `wa.me/{whatsapp_number}`.
4. **Demo**: Keep `/stores/ayo-custom-furniture` either as hardcoded demo or point it to the same component fed by API when `slug === 'ayo-custom-furniture'` so the real storefront becomes the demo.

**Deliverable**: Visiting `/stores/ayo-custom-furniture` (or the seeded slug) shows real data; paused or bad slug shows “temporarily unavailable”.

---

### Phase 3 — Shops search page (real results)

1. **API**: Function (or inline in ShopsSearch) that given `query` (slug decoded to search term):
   - Fetches matching `vendor_products` (join active storefronts), then active storefronts that have matching products (or all active storefronts with counts).
2. **ShopsSearch UI**: Replace placeholder. Show “Products” (cards linking to `/shops/products/:slug` and storefront), then “Vendors” (cards linking to `/stores/:slug`). Fallback: “No exact product found” + list relevant storefronts + “Find on Instagram” + copy name.
3. **ItemDetection**: No change; already navigates to `/shops/{slugify(item.item_name)}`. That page will now show real results.

**Deliverable**: From ItemDetection “See Local Stores”, user lands on a populated search page (products first, then storefronts) or a friendly empty state.

---

### Phase 4 — Product detail page and WhatsApp prefill

1. **Resolve slug**: For `/shops/products/:slug` decide uniqueness (global slug vs storefront-scoped). If global: single `vendor_products` row by slug (and ensure slug unique across table). Fetch product + storefront.
2. **Page**: Product image(s), name, category, price/range, “Sold by {storefront.name}” link to `/stores/{storefront.slug}`, “Discuss on WhatsApp” with prefilled message: e.g. “Hi, I’m interested in {product.name}. {link to this product page}”.
3. **Paused/missing**: If product missing or storefront paused → redirect to “temporarily unavailable” page.

**Deliverable**: Product detail page works; WhatsApp opens with product name and link.

---

### Phase 5 — Shops home and polish

1. **Shops home**: List active storefronts (e.g. cards with name, logo, location, product count) linking to `/stores/:slug`. Remove or reduce “Coming Soon” if you’re live.
2. **Paused flow**: Implement “temporarily unavailable” page and redirects from `/stores/:slug` and `/shops/products/:slug` when paused or not found.
3. **Analytics**: Optional; “page views” for storefronts can be a simple `storefront_views` table or event log; vanity “Featured on Homable” can be a boolean on `storefronts` or a separate feature flag. Not required for v1.

**Deliverable**: Shops home shows active vendors; full flow from analyze → search → product → storefront works; paused vendors never break the experience.

---

## 5. Summary

| Area | Recommendation |
|------|----------------|
| **Schema** | New `storefronts` + `vendor_products`; keep existing `products` for retailer matches. |
| **Storage** | New bucket (e.g. `storefront-assets`) with `storefronts/{id}/` and `storefronts/{id}/products/{id}/` paths. |
| **30 images + prices** | 30 rows in `vendor_products`, one main image per row (optional extra in `image_urls`); price as `price_min` or range. |
| **/shops/{query}** | Decode slug → search term; query products (name/category/room) then storefronts; return products first, then storefront cards; fallback with “no exact match” + storefronts + Instagram/copy. |
| **Paused** | Hide from home and search; direct storefront/product URLs show “temporarily unavailable”; analyze flow never depends on one vendor. |
| **Order** | Phase 1 schema + seed → Phase 2 dynamic storefront page → Phase 3 Shops search → Phase 4 Product detail + prefilled WhatsApp → Phase 5 Shops home + paused handling. |

Stop here. No implementation until you approve this plan.
