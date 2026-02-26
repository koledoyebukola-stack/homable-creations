-- Add user_id and country to analytics events (for Nigerian journey tracking)
ALTER TABLE app_8574c59127_analytics_events
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS country text;

CREATE INDEX IF NOT EXISTS analytics_events_country_idx ON app_8574c59127_analytics_events(country) WHERE country IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx ON app_8574c59127_analytics_events(user_id) WHERE user_id IS NOT NULL;

COMMENT ON COLUMN app_8574c59127_analytics_events.user_id IS 'Authenticated user when known (e.g. Nigerian journey tracking)';
COMMENT ON COLUMN app_8574c59127_analytics_events.country IS 'Country code for segment (e.g. NG for Nigerian-only events)';
