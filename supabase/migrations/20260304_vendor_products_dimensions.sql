-- Vendor product dimensions for artwork, rugs, and furniture
-- Adds optional width/height fields and a constrained unit column.

ALTER TABLE vendor_products
  ADD COLUMN IF NOT EXISTS dimension_width NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS dimension_height NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS dimension_unit TEXT
    CHECK (dimension_unit IN ('in', 'ft', 'cm', 'm'));

