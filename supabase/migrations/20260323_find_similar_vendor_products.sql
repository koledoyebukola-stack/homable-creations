-- Similar products by shared attribute criteria with relaxed fallback.
-- Uses JSONB containment (@>) on vendor_product_attributes; only active storefronts; excludes source product.

BEGIN;

CREATE OR REPLACE FUNCTION public.find_similar_vendor_products(
  p_product_id uuid,
  p_limit integer DEFAULT 6,
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
  attributes_updated_at timestamptz,
  match_score integer
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  src jsonb;
  c1 jsonb;
  c2 jsonb;
  c3 jsonb;
  c4 jsonb;
  c5 jsonb;
  lim int;
  off int;
  chosen jsonb;
  fallback jsonb;
  cnt bigint;
BEGIN
  SELECT vpa.attributes INTO src
  FROM public.vendor_product_attributes vpa
  WHERE vpa.vendor_product_id = p_product_id;

  IF NOT FOUND OR src IS NULL THEN
    RETURN;
  END IF;

  c1 := '{}'::jsonb;
  IF src ? 'seating_type' THEN
    c1 := c1 || jsonb_build_object('seating_type', src->'seating_type');
  END IF;
  IF src ? 'color_family' THEN
    c1 := c1 || jsonb_build_object('color_family', src->'color_family');
  END IF;
  IF src ? 'seating_material' THEN
    c1 := c1 || jsonb_build_object('seating_material', src->'seating_material');
  END IF;
  IF src ? 'style' THEN
    c1 := c1 || jsonb_build_object('style', src->'style');
  END IF;
  IF src ? 'room_type' THEN
    c1 := c1 || jsonb_build_object('room_type', src->'room_type');
  END IF;

  IF c1 = '{}'::jsonb THEN
    RETURN;
  END IF;

  lim := LEAST(GREATEST(COALESCE(p_limit, 6), 1), 50);
  off := GREATEST(COALESCE(p_offset, 0), 0);

  c2 := c1 - 'style';
  c3 := c2 - 'seating_material';

  IF src ? 'seating_type' AND src ? 'color_family' THEN
    c4 := jsonb_build_object(
      'seating_type', src->'seating_type',
      'color_family', src->'color_family'
    );
  ELSE
    c4 := '{}'::jsonb;
  END IF;

  IF src ? 'seating_type' THEN
    c5 := jsonb_build_object('seating_type', src->'seating_type');
  ELSE
    c5 := '{}'::jsonb;
  END IF;

  chosen := NULL;
  fallback := NULL;

  -- Walk strict → loose: pick first tier with >= 3 matches; else keep updating fallback to loosest tier with any match.
  SELECT COUNT(*) INTO cnt
  FROM public.vendor_products vp
  INNER JOIN public.vendor_product_attributes vpa ON vpa.vendor_product_id = vp.id
  INNER JOIN public.storefronts sf ON sf.id = vp.storefront_id AND sf.status = 'active'
  WHERE vp.id <> p_product_id
    AND vpa.attributes @> c1;
  IF cnt >= 3 THEN
    chosen := c1;
  ELSIF cnt > 0 THEN
    fallback := c1;
  END IF;

  IF chosen IS NULL AND c2 IS DISTINCT FROM c1 AND c2 <> '{}'::jsonb THEN
    SELECT COUNT(*) INTO cnt
    FROM public.vendor_products vp
    INNER JOIN public.vendor_product_attributes vpa ON vpa.vendor_product_id = vp.id
    INNER JOIN public.storefronts sf ON sf.id = vp.storefront_id AND sf.status = 'active'
    WHERE vp.id <> p_product_id
      AND vpa.attributes @> c2;
    IF cnt >= 3 THEN
      chosen := c2;
    ELSIF cnt > 0 THEN
      fallback := c2;
    END IF;
  END IF;

  IF chosen IS NULL AND c3 IS DISTINCT FROM c2 AND c3 <> '{}'::jsonb THEN
    SELECT COUNT(*) INTO cnt
    FROM public.vendor_products vp
    INNER JOIN public.vendor_product_attributes vpa ON vpa.vendor_product_id = vp.id
    INNER JOIN public.storefronts sf ON sf.id = vp.storefront_id AND sf.status = 'active'
    WHERE vp.id <> p_product_id
      AND vpa.attributes @> c3;
    IF cnt >= 3 THEN
      chosen := c3;
    ELSIF cnt > 0 THEN
      fallback := c3;
    END IF;
  END IF;

  IF chosen IS NULL AND c4 <> '{}'::jsonb AND c4 IS DISTINCT FROM c3 THEN
    SELECT COUNT(*) INTO cnt
    FROM public.vendor_products vp
    INNER JOIN public.vendor_product_attributes vpa ON vpa.vendor_product_id = vp.id
    INNER JOIN public.storefronts sf ON sf.id = vp.storefront_id AND sf.status = 'active'
    WHERE vp.id <> p_product_id
      AND vpa.attributes @> c4;
    IF cnt >= 3 THEN
      chosen := c4;
    ELSIF cnt > 0 THEN
      fallback := c4;
    END IF;
  END IF;

  IF chosen IS NULL
     AND c5 <> '{}'::jsonb
     AND c5 IS DISTINCT FROM c4
     AND c5 IS DISTINCT FROM c3
     AND c5 IS DISTINCT FROM c2
     AND c5 IS DISTINCT FROM c1
  THEN
    SELECT COUNT(*) INTO cnt
    FROM public.vendor_products vp
    INNER JOIN public.vendor_product_attributes vpa ON vpa.vendor_product_id = vp.id
    INNER JOIN public.storefronts sf ON sf.id = vp.storefront_id AND sf.status = 'active'
    WHERE vp.id <> p_product_id
      AND vpa.attributes @> c5;
    IF cnt >= 3 THEN
      chosen := c5;
    ELSIF cnt > 0 THEN
      fallback := c5;
    END IF;
  END IF;

  IF chosen IS NULL THEN
    chosen := fallback;
  END IF;

  IF chosen IS NULL OR chosen = '{}'::jsonb THEN
    RETURN;
  END IF;

  RETURN QUERY
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
    vpa.updated_at,
    (SELECT count(*)::int FROM jsonb_object_keys(chosen)) AS match_score
  FROM public.vendor_products vp
  INNER JOIN public.vendor_product_attributes vpa ON vpa.vendor_product_id = vp.id
  INNER JOIN public.storefronts sf ON sf.id = vp.storefront_id AND sf.status = 'active'
  WHERE vp.id <> p_product_id
    AND vpa.attributes @> chosen
  ORDER BY (SELECT count(*)::int FROM jsonb_object_keys(chosen)) DESC, vp.price_min ASC NULLS LAST
  LIMIT lim OFFSET off;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.find_similar_vendor_products(uuid, integer, integer) IS
  'Similar products by JSONB containment; relaxes tiers until >=3 matches (count before LIMIT), else uses loosest tier with any match; match_score = key count in chosen criteria; active storefronts only.';

GRANT EXECUTE ON FUNCTION public.find_similar_vendor_products(uuid, integer, integer)
  TO anon, authenticated;

COMMIT;
