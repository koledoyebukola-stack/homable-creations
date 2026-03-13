-- AI Room Generator: generations table
-- Stores each paid AI room generation, linked to user and products.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mood TEXT NOT NULL,
  original_image_url TEXT NOT NULL,
  generated_image_url TEXT NULL,
  product_ids UUID[] NOT NULL DEFAULT '{}',
  paystack_reference TEXT NOT NULL UNIQUE,
  amount_paid INTEGER NOT NULL,
  shared BOOLEAN NOT NULL DEFAULT FALSE,
  share_slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS ai_generations_user_id_idx
  ON public.ai_generations (user_id);

CREATE INDEX IF NOT EXISTS ai_generations_shared_idx
  ON public.ai_generations (shared);

ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_generations_owner_select"
  ON public.ai_generations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ai_generations_owner_insert"
  ON public.ai_generations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_generations_shared_select"
  ON public.ai_generations
  FOR SELECT
  USING (shared = TRUE);

COMMIT;
