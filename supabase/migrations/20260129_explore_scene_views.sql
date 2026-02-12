-- Track explore scene views for History page
-- Users can revisit previously explored rooms without starting over

BEGIN;

CREATE TABLE IF NOT EXISTS explore_scene_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES explore_scenes(id) ON DELETE CASCADE,
  scene_slug TEXT NOT NULL,
  scene_title TEXT NOT NULL,
  scene_image_url TEXT,
  viewed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, scene_id)
);

CREATE INDEX IF NOT EXISTS idx_explore_scene_views_user_id ON explore_scene_views(user_id);
CREATE INDEX IF NOT EXISTS idx_explore_scene_views_viewed_at ON explore_scene_views(viewed_at DESC);

-- RLS: users can only see their own views
ALTER TABLE explore_scene_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "explore_scene_views_select_own"
  ON explore_scene_views FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "explore_scene_views_insert_own"
  ON explore_scene_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "explore_scene_views_update_own"
  ON explore_scene_views FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE explore_scene_views IS 'Tracks which explore scenes users have viewed, for History page';

COMMIT;
