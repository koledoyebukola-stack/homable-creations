-- Explore scenes: keep only catalog_budget_ngn (Homable-sourced items).
-- Remove total_budget_ngn, custom_build_budget_ngn, decor_budget_ngn since we cannot
-- safely control prices of items outside Homable.

BEGIN;

ALTER TABLE explore_scenes
  DROP COLUMN IF EXISTS total_budget_ngn,
  DROP COLUMN IF EXISTS custom_build_budget_ngn,
  DROP COLUMN IF EXISTS decor_budget_ngn;

COMMIT;
