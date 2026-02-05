-- Storefronts and vendor products (Phase 1)
-- Run manually in Supabase SQL Editor.
-- Storage: bucket storefront-assets (public read). Path: storefronts/{storefront_id}/products/{product_id}/main.{ext}

BEGIN;

-- storefronts table
CREATE TABLE IF NOT EXISTS storefronts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  whatsapp_number TEXT NOT NULL,  -- digits only, e.g. 2348033241259; link: https://wa.me/{digits}
  instagram_handle TEXT,
  vendor_type TEXT NOT NULL CHECK (vendor_type IN ('carpenter', 'decor_store')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  active_since TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_storefronts_slug ON storefronts(slug);
CREATE INDEX IF NOT EXISTS idx_storefronts_status ON storefronts(status);

COMMENT ON TABLE storefronts IS 'Vendor catalog pages (carpenters, decor stores). Slug used in URL: /stores/:slug';
COMMENT ON COLUMN storefronts.vendor_type IS 'Allowed: carpenter | decor_store';
COMMENT ON COLUMN storefronts.instagram_handle IS 'Optional; without @';

-- vendor_products table (slug globally unique: {storefront-slug}-{product-slug})
CREATE TABLE IF NOT EXISTS vendor_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  storefront_id UUID NOT NULL REFERENCES storefronts(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  room TEXT,
  material TEXT,
  price_min DECIMAL(12,2),   -- nullable: "Price on request" when both null
  price_max DECIMAL(12,2),   -- nullable
  currency TEXT,             -- nullable; no price → "Price on request"
  image_url TEXT,
  image_urls TEXT[],
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vendor_products_storefront_id ON vendor_products(storefront_id);
CREATE INDEX IF NOT EXISTS idx_vendor_products_slug ON vendor_products(slug);

COMMENT ON TABLE vendor_products IS 'Catalog items (past work). Slug format: {storefront-slug}-{product-slug}, e.g. wafco-construction-limited-beige-lounge-chair';
COMMENT ON COLUMN vendor_products.slug IS 'Globally unique. Format: {storefront-slug}-{product-slug}';

-- RLS: allow read for all (so paused storefronts can show "temporarily unavailable" page)
ALTER TABLE storefronts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "storefronts_select_all"
  ON storefronts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "vendor_products_select_all"
  ON vendor_products FOR SELECT
  TO public
  USING (true);

-- Storage: create bucket "storefront-assets" in Dashboard (Public read).
-- Path structure: storefronts/{storefront_id}/products/{product_id}/main.{ext}
-- Policy below allows public read once bucket exists.
CREATE POLICY "storefront_assets_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'storefront-assets');

COMMIT;
