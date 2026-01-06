-- Remove any automatic updated_at triggers from detected_items table
DROP TRIGGER IF EXISTS handle_updated_at ON public.detected_items;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

-- Remove updated_at column if it exists
ALTER TABLE public.detected_items DROP COLUMN IF EXISTS updated_at;

-- Do the same for boards table
DROP TRIGGER IF EXISTS handle_updated_at ON public.boards;
ALTER TABLE public.boards DROP COLUMN IF EXISTS updated_at;
