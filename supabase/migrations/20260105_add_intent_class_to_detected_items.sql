-- Add intent_class column to detected_items table
-- This field is the single source of truth for item buildability classification
ALTER TABLE public.detected_items 
ADD COLUMN IF NOT EXISTS intent_class VARCHAR(50);

-- Create index for faster intent-based queries
CREATE INDEX IF NOT EXISTS idx_detected_items_intent_class 
ON public.detected_items(intent_class);

-- Add check constraint to ensure only valid intent classes
ALTER TABLE public.detected_items
DROP CONSTRAINT IF EXISTS check_intent_class;

ALTER TABLE public.detected_items
ADD CONSTRAINT check_intent_class 
CHECK (intent_class IS NULL OR intent_class IN (
  'buildable_furniture',
  'soft_goods',
  'lighting',
  'decor',
  'electronics'
));

-- Add comment
COMMENT ON COLUMN public.detected_items.intent_class IS 
'Intent classification determining structural nature and buildability: buildable_furniture (carpenter-appropriate), soft_goods (textiles), lighting (lamps/fixtures), decor (art/accessories), electronics (devices)';