-- Add display_order to explore_scenes for manual control of homepage Explore gallery order
ALTER TABLE explore_scenes
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT NULL;

COMMENT ON COLUMN explore_scenes.display_order IS 'Lower values show first. NULL = use created_at DESC. Used for homepage Explore ordering.';
