-- Track ALL detail page views (signed-in + anonymous) in explore_scenes.view_count
-- Keep explore_scene_views for per-user History/analytics; view_count is total engagement

BEGIN;

-- Remove trigger: view_count no longer tied to explore_scene_views INSERT (avoids double-count when we add RPC)
DROP TRIGGER IF EXISTS trg_increment_explore_scene_view_count ON explore_scene_views;

-- RPC: increment view_count for a scene (callable by anon + authenticated for every detail page load)
CREATE OR REPLACE FUNCTION public.increment_explore_scene_view_count(p_scene_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE explore_scenes
  SET view_count = view_count + 1
  WHERE id = p_scene_id;
END;
$$;

-- Allow anonymous and authenticated to call (so all visitors increment view_count)
GRANT EXECUTE ON FUNCTION public.increment_explore_scene_view_count(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_explore_scene_view_count(uuid) TO authenticated;

COMMENT ON FUNCTION public.increment_explore_scene_view_count(uuid) IS
  'Increments explore_scenes.view_count for the given scene; call on every detail page load (anon + signed-in).';

COMMIT;
