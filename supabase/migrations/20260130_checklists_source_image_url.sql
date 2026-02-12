-- Add source_image_url to checklists for explore-scene hero image when created from explore flow
ALTER TABLE app_8574c59127_checklists
ADD COLUMN IF NOT EXISTS source_image_url text;

COMMENT ON COLUMN app_8574c59127_checklists.source_image_url IS 'Hero/source image URL when checklist was created from explore flow (no board_id).';
