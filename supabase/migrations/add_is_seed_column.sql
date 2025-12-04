-- Add is_seed column to products table
-- Run this in Supabase SQL Editor

BEGIN;

-- Add is_seed column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'is_seed'
    ) THEN
        ALTER TABLE products ADD COLUMN is_seed boolean DEFAULT false;
    END IF;
END $$;

-- Create index on is_seed for faster queries
CREATE INDEX IF NOT EXISTS idx_products_is_seed ON products(is_seed) WHERE is_seed = true;

-- Create composite index for seed product queries
CREATE INDEX IF NOT EXISTS idx_products_seed_category ON products(is_seed, category) WHERE is_seed = true;

COMMIT;