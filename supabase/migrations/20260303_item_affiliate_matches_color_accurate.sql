-- Add color_accurate to item_affiliate_matches for "Closest available match" label
-- When false, the product card shows a subtle label instead of implying color accuracy.

ALTER TABLE public.item_affiliate_matches
ADD COLUMN IF NOT EXISTS color_accurate boolean DEFAULT true;

COMMENT ON COLUMN public.item_affiliate_matches.color_accurate IS
  'False when product color does not match detected item dominant_color; UI shows "Closest available match".';
