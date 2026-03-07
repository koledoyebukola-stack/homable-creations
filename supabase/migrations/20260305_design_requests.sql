BEGIN;

-- design_requests: one row per design request (payment_pending → paid → in_progress → delivered)
CREATE TABLE IF NOT EXISTS design_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  room_type TEXT NOT NULL,
  budget_ngn INTEGER NOT NULL,
  style TEXT NOT NULL,
  notes TEXT,
  photo_urls TEXT[],
  status TEXT NOT NULL DEFAULT 'payment_pending' CHECK (status IN ('payment_pending', 'paid', 'in_progress', 'delivered')),
  country TEXT NOT NULL DEFAULT 'NG',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  payment_confirmed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_design_requests_reference_code ON design_requests(reference_code);
CREATE INDEX IF NOT EXISTS idx_design_requests_status ON design_requests(status);
CREATE INDEX IF NOT EXISTS idx_design_requests_created_at ON design_requests(created_at DESC);

COMMENT ON TABLE design_requests IS 'Design My Space (Beta): NG custom design requests; reference_code format HOM-XXXX';

-- RLS: allow anonymous insert so form works without login; restrict SELECT to service role / admin later if needed
ALTER TABLE design_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "design_requests_allow_anon_insert"
  ON design_requests FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow public to SELECT by reference_code so users could look up status (optional; can remove and use backend only)
CREATE POLICY "design_requests_allow_select_by_reference"
  ON design_requests FOR SELECT
  TO anon
  USING (true);

-- Storage bucket: design-requests (private); create via SQL so migrations are self-contained
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'design-requests',
  'design-requests',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow anon to upload to design-requests (path: design-requests/{request_id}/{filename})
CREATE POLICY "design_requests_storage_anon_insert"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'design-requests' AND name LIKE 'design-requests/%');

-- No public read (bucket is private); signed URLs via service role when needed
COMMIT;
