-- RPC: match vendor products by JSONB containment on vendor_product_attributes.attributes
-- - INNER JOIN: only products with an attribute row
-- - Empty or null criteria: zero rows (no full scan)
-- - Match: stored attributes must contain all criteria keys/values (@>); arrays use JSONB superset semantics

BEGIN;

COMMENT ON COLUMN public.vendor_product_attributes.attributes IS
  'Structured keys: shared (mood_tags, room_type, style, …) plus prefixed category keys (seating_shape, dining_seating_capacity, artwork_size, tables_shape, lighting_finish, mirror_shape, rug_material, planter_style, storage_finish, bed_size, …).';

CREATE OR REPLACE FUNCTION public.match_vendor_products_by_attributes(
  criteria jsonb,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  storefront_id uuid,
  slug text,
  name text,
  category text,
  room text,
  material text,
  dimension_width numeric,
  dimension_height numeric,
  dimension_unit text,
  price_min numeric,
  price_max numeric,
  currency text,
  image_url text,
  image_urls text[],
  sort_order integer,
  created_at timestamptz,
  updated_at timestamptz,
  attributes jsonb,
  attributes_created_at timestamptz,
  attributes_updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    vp.id,
    vp.storefront_id,
    vp.slug,
    vp.name,
    vp.category,
    vp.room,
    vp.material,
    vp.dimension_width,
    vp.dimension_height,
    vp.dimension_unit,
    vp.price_min,
    vp.price_max,
    vp.currency,
    vp.image_url,
    vp.image_urls,
    vp.sort_order,
    vp.created_at,
    vp.updated_at,
    vpa.attributes,
    vpa.created_at,
    vpa.updated_at
  FROM public.vendor_products vp
  INNER JOIN public.vendor_product_attributes vpa
    ON vpa.vendor_product_id = vp.id
  WHERE
    criteria IS NOT NULL
    AND jsonb_typeof(criteria) = 'object'
    AND criteria <> '{}'::jsonb
    AND vpa.attributes @> criteria
  ORDER BY vp.sort_order ASC, vp.created_at ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 500)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

COMMENT ON FUNCTION public.match_vendor_products_by_attributes(jsonb, integer, integer) IS
  'Returns vendor_products with attributes where vpa.attributes @> criteria. Null, non-object, or {} criteria yields no rows.';

GRANT EXECUTE ON FUNCTION public.match_vendor_products_by_attributes(jsonb, integer, integer)
  TO anon, authenticated;

COMMIT;
