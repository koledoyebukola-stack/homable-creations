-- Migration: Add AI Vision Integration Tables
-- This replaces the old app_8574c59127_* tables with the new simplified schema

BEGIN;

-- Drop old tables if they exist (cascade will handle foreign keys)
DROP TABLE IF EXISTS app_8574c59127_saved_items CASCADE;
DROP TABLE IF EXISTS app_8574c59127_products CASCADE;
DROP TABLE IF EXISTS app_8574c59127_detected_items CASCADE;
DROP TABLE IF EXISTS app_8574c59127_boards CASCADE;

-- TABLE: boards
CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id),
  name TEXT NOT NULL DEFAULT 'Untitled room',
  cover_image_url TEXT,
  source_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  detected_items_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS boards_user_id_idx ON boards (user_id);

-- Enable RLS
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

-- Policies for boards
CREATE POLICY "Users can view their own boards" ON boards
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own boards" ON boards
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own boards" ON boards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own boards" ON boards
  FOR DELETE USING (auth.uid() = user_id);

-- TABLE: detected_items
CREATE TABLE IF NOT EXISTS detected_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT,
  style TEXT,
  dominant_color TEXT,
  materials TEXT[],
  tags TEXT[],
  description TEXT,
  confidence NUMERIC,
  position JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS detected_items_board_id_idx ON detected_items (board_id);

-- Enable RLS
ALTER TABLE detected_items ENABLE ROW LEVEL SECURITY;

-- Policies for detected_items
CREATE POLICY "Users can view items from their boards" ON detected_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = detected_items.board_id
      AND (boards.user_id = auth.uid() OR boards.user_id IS NULL)
    )
  );

CREATE POLICY "Service role can insert detected_items" ON detected_items
  FOR INSERT WITH CHECK (true);

-- TABLE: products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT,
  merchant TEXT,
  product_name TEXT NOT NULL,
  category TEXT,
  price NUMERIC,
  currency TEXT DEFAULT 'USD',
  product_url TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  color TEXT,
  materials TEXT[],
  style TEXT,
  tags TEXT[],
  rating NUMERIC,
  review_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS products_category_idx ON products (category);
CREATE INDEX IF NOT EXISTS products_tags_idx ON products USING GIN (tags);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policies for products (public read)
CREATE POLICY "Anyone can view products" ON products
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert products" ON products
  FOR INSERT WITH CHECK (true);

-- TABLE: item_product_matches
CREATE TABLE IF NOT EXISTS item_product_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_item_id UUID NOT NULL REFERENCES detected_items (id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  match_score NUMERIC NOT NULL,
  is_top_pick BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS item_product_matches_item_idx ON item_product_matches (detected_item_id);

-- Enable RLS
ALTER TABLE item_product_matches ENABLE ROW LEVEL SECURITY;

-- Policies for item_product_matches
CREATE POLICY "Users can view matches for their items" ON item_product_matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM detected_items
      JOIN boards ON boards.id = detected_items.board_id
      WHERE detected_items.id = item_product_matches.detected_item_id
      AND (boards.user_id = auth.uid() OR boards.user_id IS NULL)
    )
  );

CREATE POLICY "Service role can insert matches" ON item_product_matches
  FOR INSERT WITH CHECK (true);

COMMIT;