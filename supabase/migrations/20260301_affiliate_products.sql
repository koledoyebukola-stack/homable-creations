-- Affiliate products catalog (Canada market)
-- Stores products from Rakuten affiliate partners (Ashley, TOV, etc.)
-- SKU is the unique identifier for upsert; one row per product variant.

BEGIN;

CREATE TABLE IF NOT EXISTS affiliate_products (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  sku            TEXT        NOT NULL UNIQUE,          -- Shopify variant ID / feed SKU
  product_name   TEXT        NOT NULL,
  category       TEXT,                                 -- top-level (e.g. Furniture)
  subcategory    TEXT,                                 -- secondary (e.g. Office Furniture~~Desks)
  affiliate_url  TEXT        NOT NULL,                 -- Rakuten click-tracking URL (buy button)
  image_url      TEXT,
  price          NUMERIC(10,2),                        -- regular price
  sale_price     NUMERIC(10,2),                        -- null when not on sale
  description    TEXT,
  brand          TEXT,
  model_number   TEXT,
  availability   TEXT,                                 -- 'in stock' | 'out of stock'
  upc            TEXT,
  currency       TEXT        DEFAULT 'CAD',
  color          TEXT,
  retailer       TEXT        NOT NULL,                 -- 'ashley' | 'tov' | etc.
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Speed up AI-matching queries by category, availability, and retailer
CREATE INDEX IF NOT EXISTS idx_affiliate_products_category   ON affiliate_products(category);
CREATE INDEX IF NOT EXISTS idx_affiliate_products_retailer   ON affiliate_products(retailer);
CREATE INDEX IF NOT EXISTS idx_affiliate_products_available  ON affiliate_products(availability);
CREATE INDEX IF NOT EXISTS idx_affiliate_products_price      ON affiliate_products(price);

-- RLS: public read (product cards), service-role write (import script)
ALTER TABLE affiliate_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affiliate_products_public_read"
  ON affiliate_products FOR SELECT
  USING (true);

-- auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION set_affiliate_products_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_affiliate_products_updated_at ON affiliate_products;
CREATE TRIGGER trg_affiliate_products_updated_at
  BEFORE UPDATE ON affiliate_products
  FOR EACH ROW EXECUTE FUNCTION set_affiliate_products_updated_at();

COMMENT ON TABLE affiliate_products IS 'Canada affiliate product catalog (Rakuten partners). Used for AI item matching on the Canadian explore flow.';
COMMENT ON COLUMN affiliate_products.affiliate_url IS 'Rakuten click-tracking URL — use as the href for the Buy button. Never direct product URLs.';
COMMENT ON COLUMN affiliate_products.retailer IS 'Lowercase retailer slug: ashley | tov | coleman | wayfair etc.';

COMMIT;
