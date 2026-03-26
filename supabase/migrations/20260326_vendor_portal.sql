BEGIN;

-- Vendor portal database changes:
-- 1) storefronts.vendor_user_id (nullable, unique)
-- 2) vendor_products.status + availability
-- 3) pending-review storage bucket + policies
-- 4) RLS policies for vendor CRUD on their own rows

-- 1) Claimable vendor user ownership on storefronts
ALTER TABLE storefronts
  ADD COLUMN IF NOT EXISTS vendor_user_id uuid REFERENCES auth.users(id);

-- Unique constraint allows multiple NULLs in Postgres, matching "nullable, unique".
CREATE UNIQUE INDEX IF NOT EXISTS idx_storefronts_vendor_user_id_unique
  ON storefronts(vendor_user_id);

-- 2) vendor_products status and availability
ALTER TABLE vendor_products
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE vendor_products
  DROP CONSTRAINT IF EXISTS vendor_products_status_check;
ALTER TABLE vendor_products
  ADD CONSTRAINT vendor_products_status_check
  CHECK (status IN ('active', 'pending', 'paused'));

ALTER TABLE vendor_products
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'in_stock';

ALTER TABLE vendor_products
  DROP CONSTRAINT IF EXISTS vendor_products_availability_check;
ALTER TABLE vendor_products
  ADD CONSTRAINT vendor_products_availability_check
  CHECK (availability IN ('in_stock', 'sold_out', 'made_to_order'));

-- Optional extra info for vendor submissions
ALTER TABLE vendor_products
  ADD COLUMN IF NOT EXISTS description text;

-- 3) pending-review bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pending-review',
  'pending-review',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  public = EXCLUDED.public;

-- Helper for folder matching:
-- Object path: {storefront_id}/{timestamp}.{ext}
-- storage.foldername(name) for that object path returns the folder parts excluding file.
-- We validate the first folder segment is the vendor's storefront.id.

-- 4) RLS Policies
-- storefronts:
-- - vendor can SELECT and UPDATE own row where vendor_user_id = auth.uid()
-- - vendor can also UPDATE to "claim" row when vendor_user_id is NULL
-- - public still needs SELECT for signup validation

-- Drop vendor-unfriendly public select policy for vendor_products only; storefronts keep existing public select.
-- vendor storefront SELECT policy (authenticated)
DROP POLICY IF EXISTS "storefronts_vendor_select_own" ON storefronts;
CREATE POLICY "storefronts_vendor_select_own"
  ON storefronts
  FOR SELECT
  TO authenticated
  USING (vendor_user_id = auth.uid());

-- Claim when vendor_user_id is NULL
DROP POLICY IF EXISTS "storefronts_vendor_claim_when_null" ON storefronts;
CREATE POLICY "storefronts_vendor_claim_when_null"
  ON storefronts
  FOR UPDATE
  TO authenticated
  USING (vendor_user_id IS NULL)
  WITH CHECK (vendor_user_id = auth.uid());

-- Update already-owned storefront
DROP POLICY IF EXISTS "storefronts_vendor_update_own" ON storefronts;
CREATE POLICY "storefronts_vendor_update_own"
  ON storefronts
  FOR UPDATE
  TO authenticated
  USING (vendor_user_id = auth.uid())
  WITH CHECK (vendor_user_id = auth.uid());

-- vendor_products:
-- - public/anon select only active products
-- - vendors select/insert/update their own products regardless of status
DROP POLICY IF EXISTS "vendor_products_select_all" ON vendor_products;
CREATE POLICY "vendor_products_select_active_public"
  ON vendor_products
  FOR SELECT
  TO public
  USING (status = 'active');

DROP POLICY IF EXISTS "vendor_products_vendor_select_own" ON vendor_products;
CREATE POLICY "vendor_products_vendor_select_own"
  ON vendor_products
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM storefronts s
      WHERE s.id = vendor_products.storefront_id
        AND s.vendor_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "vendor_products_vendor_insert_own" ON vendor_products;
CREATE POLICY "vendor_products_vendor_insert_own"
  ON vendor_products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM storefronts s
      WHERE s.id = vendor_products.storefront_id
        AND s.vendor_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "vendor_products_vendor_update_own" ON vendor_products;
CREATE POLICY "vendor_products_vendor_update_own"
  ON vendor_products
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM storefronts s
      WHERE s.id = vendor_products.storefront_id
        AND s.vendor_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM storefronts s
      WHERE s.id = vendor_products.storefront_id
        AND s.vendor_user_id = auth.uid()
    )
  );

-- Storage policies for pending-review bucket.
-- Vendor can upload and read only within their own storefront folder.

DROP POLICY IF EXISTS "pending_review_vendor_insert_own_folder" ON storage.objects;
CREATE POLICY "pending_review_vendor_insert_own_folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pending-review'
    AND EXISTS (
      SELECT 1
      FROM storefronts s
      WHERE s.id = ((storage.foldername(name))[1])::uuid
        AND s.vendor_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pending_review_vendor_select_own_folder" ON storage.objects;
CREATE POLICY "pending_review_vendor_select_own_folder"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pending-review'
    AND EXISTS (
      SELECT 1
      FROM storefronts s
      WHERE s.id = ((storage.foldername(name))[1])::uuid
        AND s.vendor_user_id = auth.uid()
    )
  );

COMMIT;

