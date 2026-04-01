-- AI Room: room_type on generations + public share lookup + product pool RPCs for Edge Function

BEGIN;

ALTER TABLE public.ai_generations
  ADD COLUMN IF NOT EXISTS room_type TEXT;

COMMENT ON COLUMN public.ai_generations.room_type IS
  'Room context from AI Room Generator: living_room, bedroom, dining_room, home_office, wall_styling, etc.';

-- Public read of one generation by share slug (no auth). Used by /room/:share_slug.
CREATE OR REPLACE FUNCTION public.get_ai_generation_by_share_slug(p_slug text)
RETURNS SETOF public.ai_generations
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.ai_generations
  WHERE share_slug = p_slug
    AND generated_image_url IS NOT NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_ai_generation_by_share_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ai_generation_by_share_slug(text) TO anon, authenticated;

-- Pool for mood_tags-based selection (non–wall_styling room types)
CREATE OR REPLACE FUNCTION public.ai_room_products_by_mood_tags(p_mood text)
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  material text,
  image_url text,
  price_min numeric,
  price_max numeric,
  attributes jsonb,
  vendor_name text,
  whatsapp_number text,
  storefront_slug text,
  storefront_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    vp.id,
    vp.name,
    vp.category,
    vp.material,
    vp.image_url,
    vp.price_min,
    vp.price_max,
    vpa.attributes,
    s.name,
    s.whatsapp_number,
    s.slug,
    s.id
  FROM public.vendor_products vp
  JOIN public.vendor_product_attributes vpa ON vpa.vendor_product_id = vp.id
  JOIN public.storefronts s ON s.id = vp.storefront_id AND s.status = 'active'
  WHERE vpa.attributes->'mood_tags' @> to_jsonb(ARRAY[p_mood]::text[])
    AND vp.image_url IS NOT NULL
    AND btrim(vp.image_url) <> ''
  ORDER BY random()
  LIMIT 18;
$$;

REVOKE ALL ON FUNCTION public.ai_room_products_by_mood_tags(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_room_products_by_mood_tags(text) TO anon, authenticated;

-- Pool for wall_styling only: fixed Explore scenes, no mood_tags filter
CREATE OR REPLACE FUNCTION public.ai_room_products_wall_styling_scenes()
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  material text,
  image_url text,
  price_min numeric,
  price_max numeric,
  attributes jsonb,
  vendor_name text,
  whatsapp_number text,
  storefront_slug text,
  storefront_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    vp.id,
    vp.name,
    vp.category,
    vp.material,
    vp.image_url,
    vp.price_min,
    vp.price_max,
    COALESCE(vpa.attributes, '{}'::jsonb) AS attributes,
    s.name,
    s.whatsapp_number,
    s.slug,
    s.id
  FROM public.vendor_products vp
  LEFT JOIN public.vendor_product_attributes vpa ON vpa.vendor_product_id = vp.id
  JOIN public.explore_scene_items esi ON esi.vendor_product_id = vp.id
  JOIN public.storefronts s ON s.id = vp.storefront_id AND s.status = 'active'
  WHERE esi.scene_id = ANY (
    ARRAY[
      '10012ae6-cb51-4a59-81a8-13e73be2f234'::uuid,
      'b5330d7d-4266-4878-b533-38927c7fe1de'::uuid,
      'cf58df83-6ac3-478b-886e-e90867b9f64f'::uuid,
      'e507942a-b659-42ef-9839-6351b6abee63'::uuid,
      'dbc0ead6-cda2-46dd-9992-e68b687d4193'::uuid,
      '3090bd13-75e9-4ed1-b87e-ec59c4d3f275'::uuid
    ]::uuid[]
  )
    AND esi.item_type = 'catalog_product'
    AND vp.image_url IS NOT NULL
    AND btrim(vp.image_url) <> ''
  ORDER BY random()
  LIMIT 6;
$$;

REVOKE ALL ON FUNCTION public.ai_room_products_wall_styling_scenes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_room_products_wall_styling_scenes() TO anon, authenticated;

COMMIT;
