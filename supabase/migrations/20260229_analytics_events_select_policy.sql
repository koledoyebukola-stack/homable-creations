-- Allow authenticated users to SELECT their own analytics events (e.g. for History "Products I Contacted").
-- Without this, INSERT succeeds but SELECT returns no rows due to RLS.
CREATE POLICY "allow_authenticated_select_own_events"
  ON app_8574c59127_analytics_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
