-- Structured product attributes for inspiration ↔ vendor matching (JSONB document per product).
-- Keys follow the Homable attribute schema (shared + category-specific); new keys need no migration.

BEGIN;

CREATE TABLE IF NOT EXISTS public.vendor_product_attributes (
  vendor_product_id UUID PRIMARY KEY
    REFERENCES public.vendor_products(id) ON DELETE CASCADE,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vendor_product_attributes_object CHECK (jsonb_typeof(attributes) = 'object')
);

CREATE INDEX IF NOT EXISTS vendor_product_attributes_attributes_gin
  ON public.vendor_product_attributes
  USING gin (attributes jsonb_path_ops);

COMMENT ON TABLE public.vendor_product_attributes IS
  'One row per vendor product. attributes JSONB holds shared + category-specific keys for matching; interpret optional keys using vendor_products.category.';
COMMENT ON COLUMN public.vendor_product_attributes.attributes IS
  'Shared: mood_tags, room_type, color_family, primary_color, secondary_color, style, finish_tone, price_tier, nigerian_made, lead_time, customizable, weight_class, care_difficulty, is_featured. Category keys (e.g. seating_type, artwork_type) per Homable schema.';

ALTER TABLE public.vendor_product_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_product_attributes_select_all"
  ON public.vendor_product_attributes
  FOR SELECT
  TO public
  USING (true);

COMMIT;
