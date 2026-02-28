-- Link detected items from image analysis to affiliate_products (Canada)
-- This is separate from item_product_matches (which links to the legacy products table).
-- One row per (detected_item_id, affiliate_product_id) with a numeric match_score.

BEGIN;

CREATE TABLE IF NOT EXISTS item_affiliate_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_item_id uuid NOT NULL REFERENCES detected_items(id) ON DELETE CASCADE,
  affiliate_product_id uuid NOT NULL REFERENCES affiliate_products(id) ON DELETE CASCADE,
  match_score numeric NOT NULL,
  is_top_pick boolean DEFAULT false,
  rank integer,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Ensure idempotent upserts by (detected_item_id, affiliate_product_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'item_affiliate_matches_unique_item_product'
  ) THEN
    ALTER TABLE item_affiliate_matches
      ADD CONSTRAINT item_affiliate_matches_unique_item_product
      UNIQUE (detected_item_id, affiliate_product_id);
  END IF;
END;
$$;

-- Helpful indexes for lookups from items or affiliate products
CREATE INDEX IF NOT EXISTS idx_item_affiliate_matches_item
  ON item_affiliate_matches(detected_item_id);

CREATE INDEX IF NOT EXISTS idx_item_affiliate_matches_affiliate_product
  ON item_affiliate_matches(affiliate_product_id);

ALTER TABLE item_affiliate_matches ENABLE ROW LEVEL SECURITY;

-- Public read (results are derived product matches, no PII)
CREATE POLICY "item_affiliate_matches_public_read"
  ON item_affiliate_matches
  FOR SELECT
  USING (true);

COMMENT ON TABLE item_affiliate_matches IS
  'AI-matched affiliate products for detected_items (Canada experience).';

COMMIT;

