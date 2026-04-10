-- Allow owners to update their own AI generation rows (e.g. fill generated_image_url, set shared).

BEGIN;

CREATE POLICY "ai_generations_owner_update"
  ON public.ai_generations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
