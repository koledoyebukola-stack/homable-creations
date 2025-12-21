BEGIN;

-- Create analytics events table
CREATE TABLE IF NOT EXISTS app_8574c59127_analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for query optimization
CREATE INDEX IF NOT EXISTS analytics_events_name_idx ON app_8574c59127_analytics_events(event_name);
CREATE INDEX IF NOT EXISTS analytics_events_created_idx ON app_8574c59127_analytics_events(created_at DESC);

-- Setup Row Level Security (RLS)
ALTER TABLE app_8574c59127_analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (fire-and-forget tracking)
CREATE POLICY "allow_anonymous_insert_events" ON app_8574c59127_analytics_events 
  FOR INSERT 
  TO anon 
  WITH CHECK (true);

-- Allow authenticated users to insert events
CREATE POLICY "allow_authenticated_insert_events" ON app_8574c59127_analytics_events 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

COMMIT;
