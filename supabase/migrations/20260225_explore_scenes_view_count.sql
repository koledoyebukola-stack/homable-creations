-- Add view_count to explore_scenes and keep it in sync with explore_scene_views

BEGIN;

-- Add column (default 0)
ALTER TABLE explore_scenes
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

-- Backfill from existing explore_scene_views
UPDATE explore_scenes es
SET view_count = COALESCE(
  (SELECT COUNT(*)::integer FROM explore_scene_views esv WHERE esv.scene_id = es.id),
  0
);

-- Trigger: increment view_count when a new view is recorded
CREATE OR REPLACE FUNCTION increment_explore_scene_view_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE explore_scenes
  SET view_count = view_count + 1
  WHERE id = NEW.scene_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_explore_scene_view_count ON explore_scene_views;
CREATE TRIGGER trg_increment_explore_scene_view_count
  AFTER INSERT ON explore_scene_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_explore_scene_view_count();

COMMENT ON COLUMN explore_scenes.view_count IS 'Total number of user views (from explore_scene_views), kept in sync by trigger';

COMMIT;
