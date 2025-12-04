-- Fix anonymous user support by removing foreign key constraint
-- This allows boards to be created without requiring user_id to exist in auth.users

BEGIN;

-- Drop the foreign key constraint on boards.user_id
ALTER TABLE boards DROP CONSTRAINT IF EXISTS boards_user_id_fkey;

-- Make user_id nullable to support anonymous users
ALTER TABLE boards ALTER COLUMN user_id DROP NOT NULL;

-- Update RLS policies to work with nullable user_id
DROP POLICY IF EXISTS "allow_insert_boards" ON boards;
DROP POLICY IF EXISTS "allow_select_boards" ON boards;
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

-- Allow authenticated users to UPDATE only their own boards
CREATE POLICY "allow_update_own_boards"
ON boards
FOR UPDATE
TO authenticated
USING (user_id IS NOT NULL AND user_id::uuid = (SELECT auth.uid()));

-- Allow authenticated users to DELETE only their own boards
CREATE POLICY "allow_delete_own_boards"
ON boards
FOR DELETE
TO authenticated
USING (user_id IS NOT NULL AND user_id::uuid = (SELECT auth.uid()));

COMMIT;