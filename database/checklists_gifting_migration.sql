-- Gifting/Claiming Feature Migration for Checklists
-- Execute this in Supabase SQL Editor

BEGIN;

-- Add gifting fields to checklists table
ALTER TABLE app_8574c59127_checklists
  ADD COLUMN IF NOT EXISTS gifting_enabled BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS gifting_token TEXT UNIQUE;

-- Create index for gifting_token lookups
CREATE INDEX IF NOT EXISTS checklists_gifting_token_idx ON app_8574c59127_checklists(gifting_token)
  WHERE gifting_token IS NOT NULL;

-- Add claiming fields to checklist_items table
-- We'll use a status enum instead of just is_completed to support: pending, claimed, completed
ALTER TABLE app_8574c59127_checklist_items
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' NOT NULL,
  ADD COLUMN IF NOT EXISTS claimed_by_name TEXT,
  ADD COLUMN IF NOT EXISTS claimed_by_user_id UUID REFERENCES auth.users,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS expected_date DATE,
  ADD COLUMN IF NOT EXISTS gift_note TEXT;

-- Create index for status lookups
CREATE INDEX IF NOT EXISTS checklist_items_status_idx ON app_8574c59127_checklist_items(checklist_id, status);

-- Migrate existing data: Set status based on is_completed
UPDATE app_8574c59127_checklist_items
SET status = CASE 
  WHEN is_completed = true THEN 'completed'
  ELSE 'pending'
END
WHERE status = 'pending'; -- Only update if still default

-- Add constraint to ensure status is one of: pending, claimed, completed
-- Drop existing constraint if it exists, then recreate
ALTER TABLE app_8574c59127_checklist_items
  DROP CONSTRAINT IF EXISTS checklist_items_status_check;
  
ALTER TABLE app_8574c59127_checklist_items
  ADD CONSTRAINT checklist_items_status_check 
  CHECK (status IN ('pending', 'claimed', 'completed'));

-- Update RLS policies to allow public read access for gifting-enabled checklists
-- This allows gifters (unauthenticated users) to view the checklist via token

-- Policy for public read access via gifting token
DROP POLICY IF EXISTS "Public can view gifting-enabled checklists" ON app_8574c59127_checklists;
CREATE POLICY "Public can view gifting-enabled checklists" ON app_8574c59127_checklists
  FOR SELECT
  USING (
    gifting_enabled = true AND 
    gifting_token IS NOT NULL
  );

-- Policy for public read access to items in gifting-enabled checklists
DROP POLICY IF EXISTS "Public can view items of gifting-enabled checklists" ON app_8574c59127_checklist_items;
CREATE POLICY "Public can view items of gifting-enabled checklists" ON app_8574c59127_checklist_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM app_8574c59127_checklists
      WHERE id = checklist_id 
      AND gifting_enabled = true 
      AND gifting_token IS NOT NULL
    )
  );

-- Policy for public to claim items (UPDATE status to 'claimed')
DROP POLICY IF EXISTS "Public can claim items in gifting-enabled checklists" ON app_8574c59127_checklist_items;
CREATE POLICY "Public can claim items in gifting-enabled checklists" ON app_8574c59127_checklist_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM app_8574c59127_checklists
      WHERE id = checklist_id 
      AND gifting_enabled = true 
      AND gifting_token IS NOT NULL
    )
    AND status = 'pending' -- Only allow claiming pending items
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_8574c59127_checklists
      WHERE id = checklist_id 
      AND gifting_enabled = true 
      AND gifting_token IS NOT NULL
    )
    AND status = 'claimed' -- Only allow setting to claimed
    AND claimed_by_name IS NOT NULL -- Require name
    AND claimed_at IS NOT NULL -- Require timestamp
  );

COMMIT;
