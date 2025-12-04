BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'products'
          AND column_name = 'is_seed'
    ) THEN
        ALTER TABLE products
        ADD COLUMN is_seed boolean DEFAULT false;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_products_is_seed
  ON products(is_seed)
  WHERE is_seed = true;

CREATE INDEX IF NOT EXISTS idx_products_seed_category
  ON products(is_seed, category)
  WHERE is_seed = true;

COMMIT;