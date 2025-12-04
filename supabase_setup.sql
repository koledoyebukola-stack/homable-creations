-- AI-Powered Home Decor Shopping Assistant - Database Setup
-- Run this SQL script in your Supabase SQL Editor

BEGIN;

-- Create boards table
CREATE TABLE IF NOT EXISTS app_8574c59127_boards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    name TEXT NOT NULL,
    inspiration_image_url TEXT NOT NULL,
    total_cost DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create detected_items table
CREATE TABLE IF NOT EXISTS app_8574c59127_detected_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    board_id UUID REFERENCES app_8574c59127_boards(id) ON DELETE CASCADE NOT NULL,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL,
    style TEXT,
    position_x INTEGER,
    position_y INTEGER,
    confidence DECIMAL(3, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create products table
CREATE TABLE IF NOT EXISTS app_8574c59127_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    detected_item_id UUID REFERENCES app_8574c59127_detected_items(id) ON DELETE CASCADE NOT NULL,
    product_name TEXT NOT NULL,
    retailer TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    image_url TEXT,
    product_url TEXT NOT NULL,
    rating DECIMAL(2, 1),
    review_count INTEGER,
    shipping_info TEXT,
    availability TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create saved_items table
CREATE TABLE IF NOT EXISTS app_8574c59127_saved_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    board_id UUID REFERENCES app_8574c59127_boards(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES app_8574c59127_products(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(board_id, product_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS boards_user_idx ON app_8574c59127_boards(user_id);
CREATE INDEX IF NOT EXISTS detected_items_board_idx ON app_8574c59127_detected_items(board_id);
CREATE INDEX IF NOT EXISTS products_detected_item_idx ON app_8574c59127_products(detected_item_id);
CREATE INDEX IF NOT EXISTS saved_items_board_idx ON app_8574c59127_saved_items(board_id);

-- Enable Row Level Security (RLS)
ALTER TABLE app_8574c59127_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_8574c59127_detected_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_8574c59127_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_8574c59127_saved_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for boards
CREATE POLICY "Users can view their own boards" ON app_8574c59127_boards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own boards" ON app_8574c59127_boards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own boards" ON app_8574c59127_boards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own boards" ON app_8574c59127_boards
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for detected_items
CREATE POLICY "Users can view detected items from their boards" ON app_8574c59127_detected_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM app_8574c59127_boards
            WHERE app_8574c59127_boards.id = app_8574c59127_detected_items.board_id
            AND app_8574c59127_boards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create detected items for their boards" ON app_8574c59127_detected_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM app_8574c59127_boards
            WHERE app_8574c59127_boards.id = app_8574c59127_detected_items.board_id
            AND app_8574c59127_boards.user_id = auth.uid()
        )
    );

-- RLS Policies for products
CREATE POLICY "Users can view products from their detected items" ON app_8574c59127_products
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM app_8574c59127_detected_items di
            JOIN app_8574c59127_boards b ON b.id = di.board_id
            WHERE di.id = app_8574c59127_products.detected_item_id
            AND b.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create products for their detected items" ON app_8574c59127_products
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM app_8574c59127_detected_items di
            JOIN app_8574c59127_boards b ON b.id = di.board_id
            WHERE di.id = app_8574c59127_products.detected_item_id
            AND b.user_id = auth.uid()
        )
    );

-- RLS Policies for saved_items
CREATE POLICY "Users can view their saved items" ON app_8574c59127_saved_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM app_8574c59127_boards
            WHERE app_8574c59127_boards.id = app_8574c59127_saved_items.board_id
            AND app_8574c59127_boards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can save items to their boards" ON app_8574c59127_saved_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM app_8574c59127_boards
            WHERE app_8574c59127_boards.id = app_8574c59127_saved_items.board_id
            AND app_8574c59127_boards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete saved items from their boards" ON app_8574c59127_saved_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM app_8574c59127_boards
            WHERE app_8574c59127_boards.id = app_8574c59127_saved_items.board_id
            AND app_8574c59127_boards.user_id = auth.uid()
        )
    );

COMMIT;
