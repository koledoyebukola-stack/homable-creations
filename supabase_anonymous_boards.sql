-- Update boards table to allow NULL user_id for anonymous users
BEGIN;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own boards" ON app_8574c59127_boards;
DROP POLICY IF EXISTS "Users can create their own boards" ON app_8574c59127_boards;
DROP POLICY IF EXISTS "Users can update their own boards" ON app_8574c59127_boards;
DROP POLICY IF EXISTS "Users can delete their own boards" ON app_8574c59127_boards;

-- Modify user_id column to allow NULL
ALTER TABLE app_8574c59127_boards 
ALTER COLUMN user_id DROP NOT NULL;

-- Create new RLS policies that support anonymous users
CREATE POLICY "allow_anonymous_board_creation" ON app_8574c59127_boards
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "allow_view_own_or_anonymous_boards" ON app_8574c59127_boards
    FOR SELECT 
    USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "allow_update_own_boards" ON app_8574c59127_boards
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "allow_delete_own_boards" ON app_8574c59127_boards
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Update detected_items policies to support anonymous boards
DROP POLICY IF EXISTS "Users can view detected items from their boards" ON app_8574c59127_detected_items;
DROP POLICY IF EXISTS "Users can create detected items for their boards" ON app_8574c59127_detected_items;

CREATE POLICY "allow_view_detected_items" ON app_8574c59127_detected_items
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM app_8574c59127_boards
            WHERE app_8574c59127_boards.id = app_8574c59127_detected_items.board_id
            AND (app_8574c59127_boards.user_id IS NULL OR app_8574c59127_boards.user_id = auth.uid())
        )
    );

CREATE POLICY "allow_create_detected_items" ON app_8574c59127_detected_items
    FOR INSERT 
    WITH CHECK (true);

-- Update products policies to support anonymous boards
DROP POLICY IF EXISTS "Users can view products from their detected items" ON app_8574c59127_products;
DROP POLICY IF EXISTS "Users can create products for their detected items" ON app_8574c59127_products;

CREATE POLICY "allow_view_products" ON app_8574c59127_products
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM app_8574c59127_detected_items di
            JOIN app_8574c59127_boards b ON b.id = di.board_id
            WHERE di.id = app_8574c59127_products.detected_item_id
            AND (b.user_id IS NULL OR b.user_id = auth.uid())
        )
    );

CREATE POLICY "allow_create_products" ON app_8574c59127_products
    FOR INSERT 
    WITH CHECK (true);

-- Update saved_items policies to support anonymous boards
DROP POLICY IF EXISTS "Users can view their saved items" ON app_8574c59127_saved_items;
DROP POLICY IF EXISTS "Users can save items to their boards" ON app_8574c59127_saved_items;
DROP POLICY IF EXISTS "Users can delete saved items from their boards" ON app_8574c59127_saved_items;

CREATE POLICY "allow_view_saved_items" ON app_8574c59127_saved_items
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM app_8574c59127_boards
            WHERE app_8574c59127_boards.id = app_8574c59127_saved_items.board_id
            AND (app_8574c59127_boards.user_id IS NULL OR app_8574c59127_boards.user_id = auth.uid())
        )
    );

CREATE POLICY "allow_create_saved_items" ON app_8574c59127_saved_items
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "allow_delete_saved_items" ON app_8574c59127_saved_items
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM app_8574c59127_boards
            WHERE app_8574c59127_boards.id = app_8574c59127_saved_items.board_id
            AND (app_8574c59127_boards.user_id IS NULL OR app_8574c59127_boards.user_id = auth.uid())
        )
    );

COMMIT;