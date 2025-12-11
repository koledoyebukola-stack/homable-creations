-- Checklists Feature Database Schema
-- Execute this in Supabase SQL Editor

BEGIN;

-- Create checklists table
CREATE TABLE IF NOT EXISTS app_8574c59127_checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  board_id UUID REFERENCES boards,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create checklist_items table
CREATE TABLE IF NOT EXISTS app_8574c59127_checklist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID REFERENCES app_8574c59127_checklists ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS checklists_user_idx ON app_8574c59127_checklists(user_id);
CREATE INDEX IF NOT EXISTS checklists_created_idx ON app_8574c59127_checklists(created_at DESC);
CREATE INDEX IF NOT EXISTS checklist_items_checklist_idx ON app_8574c59127_checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS checklist_items_sort_idx ON app_8574c59127_checklist_items(checklist_id, sort_order);

-- Enable Row Level Security
ALTER TABLE app_8574c59127_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_8574c59127_checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checklists
DROP POLICY IF EXISTS "Users can view own checklists" ON app_8574c59127_checklists;
CREATE POLICY "Users can view own checklists" ON app_8574c59127_checklists
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own checklists" ON app_8574c59127_checklists;
CREATE POLICY "Users can create own checklists" ON app_8574c59127_checklists
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own checklists" ON app_8574c59127_checklists;
CREATE POLICY "Users can update own checklists" ON app_8574c59127_checklists
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own checklists" ON app_8574c59127_checklists;
CREATE POLICY "Users can delete own checklists" ON app_8574c59127_checklists
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for checklist_items
DROP POLICY IF EXISTS "Users can view items of own checklists" ON app_8574c59127_checklist_items;
CREATE POLICY "Users can view items of own checklists" ON app_8574c59127_checklist_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_8574c59127_checklists
      WHERE id = checklist_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create items in own checklists" ON app_8574c59127_checklist_items;
CREATE POLICY "Users can create items in own checklists" ON app_8574c59127_checklist_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_8574c59127_checklists
      WHERE id = checklist_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update items in own checklists" ON app_8574c59127_checklist_items;
CREATE POLICY "Users can update items in own checklists" ON app_8574c59127_checklist_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_8574c59127_checklists
      WHERE id = checklist_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete items in own checklists" ON app_8574c59127_checklist_items;
CREATE POLICY "Users can delete items in own checklists" ON app_8574c59127_checklist_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_8574c59127_checklists
      WHERE id = checklist_id AND user_id = auth.uid()
    )
  );

COMMIT;