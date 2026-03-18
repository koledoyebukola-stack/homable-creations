-- Ensure the 9 TV Wall explore scenes have correct location and metadata.
-- Fixes existing rows that may have been created with wrong location (e.g. null or CA).
-- Run after 20260310_tv_wall_explore_scenes.sql.

BEGIN;

UPDATE explore_scenes
SET
  location = 'NG',
  room_type = 'wall_styling',
  status = 'published',
  hero_image_url = CASE slug
    WHEN 'soft-life-minimalist' THEN 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Soft%20Life%20Minimalist.png'
    WHEN 'midnight-blu-premium' THEN 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Midnight%20Blu%20Premium.png'
    WHEN 'bookshelf-wall' THEN 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Bookshelf%20Wall.png'
    WHEN 'full-option' THEN 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Full%20Option.png'
    WHEN 'oga-at-the-top' THEN 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Oga%20At%20The%20Top.png'
    WHEN 'arch-of-grace' THEN 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Arch%20Of%20Grace.png'
    WHEN 'vibes-on-vibes' THEN 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Vibes%20on%20Vibes.png'
    WHEN 'marble-no-be-small' THEN 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Marble%20No%20Be%20Small.png'
    WHEN 'wood-flute' THEN 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Wood%20Flute.png'
    ELSE hero_image_url
  END,
  title = CASE slug
    WHEN 'soft-life-minimalist' THEN 'Soft Life Minimalist'
    WHEN 'midnight-blu-premium' THEN 'Midnight Blu Premium'
    WHEN 'bookshelf-wall' THEN 'Bookshelf Wall'
    WHEN 'full-option' THEN 'Full Option'
    WHEN 'oga-at-the-top' THEN 'Oga At The Top'
    WHEN 'arch-of-grace' THEN 'Arch Of Grace'
    WHEN 'vibes-on-vibes' THEN 'Vibes On Vibes'
    WHEN 'marble-no-be-small' THEN 'Marble No Be Small'
    WHEN 'wood-flute' THEN 'Wood Flute'
    ELSE title
  END,
  updated_at = now()
WHERE slug IN (
  'soft-life-minimalist',
  'midnight-blu-premium',
  'bookshelf-wall',
  'full-option',
  'oga-at-the-top',
  'arch-of-grace',
  'vibes-on-vibes',
  'marble-no-be-small',
  'wood-flute'
);

COMMIT;
