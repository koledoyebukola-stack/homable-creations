-- Link checklists to explore scene when created from explore flow (for "View Shopping List" attached state)
ALTER TABLE app_8574c59127_checklists
ADD COLUMN IF NOT EXISTS explore_scene_id uuid REFERENCES explore_scenes(id);

COMMENT ON COLUMN app_8574c59127_checklists.explore_scene_id IS 'When set, this checklist was created from this explore scene; used to show attached state on scene page.';
