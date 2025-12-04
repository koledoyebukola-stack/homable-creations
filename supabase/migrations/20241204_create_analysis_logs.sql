-- Create analysis_logs table for tracking user analysis metrics
CREATE TABLE IF NOT EXISTS analysis_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  number_of_items_detected INTEGER NOT NULL DEFAULT 0,
  number_of_items_with_products INTEGER NOT NULL DEFAULT 0,
  number_of_products_shown INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS analysis_logs_user_idx ON analysis_logs(user_id);
CREATE INDEX IF NOT EXISTS analysis_logs_board_idx ON analysis_logs(board_id);
CREATE INDEX IF NOT EXISTS analysis_logs_created_at_idx ON analysis_logs(created_at DESC);

-- Enable RLS
ALTER TABLE analysis_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own logs
CREATE POLICY "allow_read_own_logs" ON analysis_logs FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Allow users to insert their own logs
CREATE POLICY "allow_insert_own_logs" ON analysis_logs FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);