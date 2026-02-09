-- Add human-readable location_display field to storefronts
-- Run manually in Supabase SQL Editor.

ALTER TABLE storefronts
ADD COLUMN IF NOT EXISTS location_display TEXT;

-- Update existing Wafco storefront to have display location
UPDATE storefronts
SET location = 'NG',
    location_display = 'Ikeja, Lagos, Nigeria'
WHERE slug = 'wafco-construction-limited';

