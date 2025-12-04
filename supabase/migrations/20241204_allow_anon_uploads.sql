-- Enable anonymous uploads to inspiration-images bucket
-- This allows logged-out users to upload images

BEGIN;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "allow_anon_insert_inspiration_images" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_insert_inspiration_images" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_read_inspiration_images" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_delete_own_inspiration_images" ON storage.objects;

-- Allow anonymous users to INSERT into inspiration-images bucket
CREATE POLICY "allow_anon_insert_inspiration_images"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'inspiration-images');

-- Allow authenticated users to INSERT into inspiration-images bucket
CREATE POLICY "allow_authenticated_insert_inspiration_images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inspiration-images');

-- Allow public read access to inspiration-images
CREATE POLICY "allow_public_read_inspiration_images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'inspiration-images');

-- Allow authenticated users to delete their own images
CREATE POLICY "allow_authenticated_delete_own_inspiration_images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'inspiration-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

COMMIT;