-- Add updated_at column to detected_items table to fix schema cache error
ALTER TABLE public.detected_items 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to automatically update updated_at on row changes
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.detected_items;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.detected_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Also add updated_at to boards table if not exists
ALTER TABLE public.boards 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS set_updated_at ON public.boards;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.boards
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add comments
COMMENT ON COLUMN public.detected_items.updated_at IS 'Timestamp of last update';
COMMENT ON COLUMN public.boards.updated_at IS 'Timestamp of last update';