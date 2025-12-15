-- Specs History Table for storing user specifications
CREATE TABLE IF NOT EXISTS app_8574c59127_specs_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  category TEXT NOT NULL,
  specifications JSONB NOT NULL,
  search_queries TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for query optimization
CREATE INDEX IF NOT EXISTS specs_history_user_idx ON app_8574c59127_specs_history(user_id);
CREATE INDEX IF NOT EXISTS specs_history_created_idx ON app_8574c59127_specs_history(created_at DESC);

-- Setup Row Level Security (RLS)
ALTER TABLE app_8574c59127_specs_history ENABLE ROW LEVEL SECURITY;

-- Users can read their own specs history
CREATE POLICY "allow_read_own_specs" ON app_8574c59127_specs_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own specs history
CREATE POLICY "allow_insert_own_specs" ON app_8574c59127_specs_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own specs history
CREATE POLICY "allow_delete_own_specs" ON app_8574c59127_specs_history
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
