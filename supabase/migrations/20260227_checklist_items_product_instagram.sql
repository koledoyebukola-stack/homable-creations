-- Add product and Instagram link fields to checklist items (for Nigerian Explore lists)
-- When checklist has explore_scene_id, items can have vendor_product_slug and/or instagram_handle
ALTER TABLE app_8574c59127_checklist_items
ADD COLUMN IF NOT EXISTS vendor_product_slug text,
ADD COLUMN IF NOT EXISTS instagram_handle text;

COMMENT ON COLUMN app_8574c59127_checklist_items.vendor_product_slug IS 'Vendor product slug for "View Product" link when checklist is from explore scene (explore_scene_id).';
COMMENT ON COLUMN app_8574c59127_checklist_items.instagram_handle IS 'Instagram handle for "View on Instagram" when checklist is from explore scene (no vendor product).';
