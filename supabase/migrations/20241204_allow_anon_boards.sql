-- Allow anonymous users to create boards and detected items
-- This enables the full upload flow for logged-out users

BEGIN;

-- Modify boards table to allow anon user_id values
-- The user_id column should accept both real UUIDs and temporary anon IDs

-- Drop existing RLS policies on boards
DROP POLICY IF EXISTS "allow_read_own_boards" ON boards;
DROP POLICY IF EXISTS "allow_insert_own_boards" ON boards;
DROP POLICY IF EXISTS "allow_update_own_boards" ON boards;
DROP POLICY IF EXISTS "allow_delete_own_boards" ON boards;

-- Allow anyone (anon + authenticated) to INSERT boards
CREATE POLICY "allow_insert_boards"
ON boards
FOR INSERT
TO public
WITH CHECK (true);

-- Allow anyone to SELECT boards (for viewing results)
CREATE POLICY "allow_select_boards"
ON boards
FOR SELECT
TO public
USING (true);

-- Allow authenticated users to UPDATE their own boards
CREATE POLICY "allow_update_own_boards"
ON boards
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id::uuid);

-- Allow authenticated users to DELETE their own boards
CREATE POLICY "allow_delete_own_boards"
ON boards
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id::uuid);

-- Drop existing RLS policies on detected_items
DROP POLICY IF EXISTS "allow_read_detected_items" ON detected_items;
DROP POLICY IF EXISTS "allow_insert_detected_items" ON detected_items;

-- Allow anyone to INSERT detected_items (needed for analysis)
CREATE POLICY "allow_insert_detected_items"
ON detected_items
FOR INSERT
TO public
WITH CHECK (true);

-- Allow anyone to SELECT detected_items (for viewing results)
CREATE POLICY "allow_select_detected_items"
ON detected_items
FOR SELECT
TO public
USING (true);

-- Drop existing RLS policies on products
DROP POLICY IF EXISTS "allow_read_all_products" ON products;
DROP POLICY IF EXISTS "allow_insert_products" ON products;

-- Allow anyone to SELECT products
CREATE POLICY "allow_select_products"
ON products
FOR SELECT
TO public
USING (true);

-- Allow anyone to INSERT products (needed for search results)
CREATE POLICY "allow_insert_products"
ON products
FOR INSERT
TO public
WITH CHECK (true);

COMMIT;