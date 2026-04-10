-- Public share page: only rows explicitly marked shared; backfill existing slugs.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_ai_generation_by_share_slug(p_slug text)
RETURNS SETOF public.ai_generations
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.ai_generations
  WHERE share_slug = p_slug
    AND shared = true
    AND generated_image_url IS NOT NULL
  LIMIT 1;
$$;

UPDATE public.ai_generations
SET shared = true
WHERE generated_image_url IS NOT NULL
  AND share_slug IS NOT NULL
  AND btrim(share_slug) <> ''
  AND shared = false;

COMMIT;
