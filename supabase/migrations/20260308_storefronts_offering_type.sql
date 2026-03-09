-- Storefront offering type: custom (build to order), imported (ready-made), or both.
-- Drives UI badges: "Custom orders available" vs "Imported".
ALTER TABLE storefronts
  ADD COLUMN IF NOT EXISTS offering_type TEXT NOT NULL DEFAULT 'custom'
  CHECK (offering_type IN ('custom', 'imported', 'both'));

COMMENT ON COLUMN storefronts.offering_type IS 'custom = build to order; imported = ready-made/imported; both = offers both. Drives "Custom orders available" vs "Imported" badge in UI.';
