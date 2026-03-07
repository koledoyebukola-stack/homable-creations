BEGIN;

-- Fix storage RLS: allow anon INSERT to design-requests bucket (any path).
-- Previous policy used name LIKE 'design-requests/%'; storage object name may not include that prefix.
DROP POLICY IF EXISTS "design_requests_storage_anon_insert" ON storage.objects;
CREATE POLICY "design_requests_storage_anon_insert"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'design-requests');

-- Make budget_ngn nullable and remove NOT NULL so form can omit budget.
ALTER TABLE design_requests
  ALTER COLUMN budget_ngn DROP NOT NULL;

COMMIT;
