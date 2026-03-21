-- Curated spotlight for Explore grids (NG). Order featured rows with display_order.
-- Application shows at most 3 as "Top Pick" on NG homepage + Upload Explore tab.

ALTER TABLE public.explore_scenes
ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.explore_scenes.is_featured IS 'When true, scene is eligible for featured ordering; UI shows max 3 as Top Pick on NG.';
