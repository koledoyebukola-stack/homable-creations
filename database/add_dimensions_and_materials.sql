-- Migration: Add dimensions and room_materials fields
-- Execute this in Supabase SQL Editor

BEGIN;

-- Add dimensions column to detected_items table
ALTER TABLE detected_items 
ADD COLUMN IF NOT EXISTS dimensions JSONB;

-- Add room_materials column to boards table
ALTER TABLE boards 
ADD COLUMN IF NOT EXISTS room_materials JSONB;

COMMIT;