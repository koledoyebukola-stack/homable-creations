-- Add feed_product_id for correct Rakuten offerid format
-- The feed uses offerid=<LSN OID>.<feed_product_id>; we must use feed_product_id, not sku.

ALTER TABLE public.affiliate_products
ADD COLUMN IF NOT EXISTS feed_product_id TEXT;

COMMENT ON COLUMN public.affiliate_products.feed_product_id IS
  'Rakuten feed product ID (column 0) used in offerid; required for valid affiliate links.';
