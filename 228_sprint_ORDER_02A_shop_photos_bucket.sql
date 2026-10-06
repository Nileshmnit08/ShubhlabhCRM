-- Create shop_photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop_photos', 'shop_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload to their own folder
-- Folder name should match their auth.uid()
CREATE POLICY "Allow users to upload their own shop photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'shop_photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow authenticated users to update their own shop photos
CREATE POLICY "Allow users to update their own shop photos"
ON storage.objects
FOR UPDATE
TO authenticated
WITH CHECK (
    bucket_id = 'shop_photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to read their own shop photos (if public=false, but we set public=true for simple access)
-- Since it's public=true, anyone can read it anyway. But we can still restrict SELECT if needed.
-- Let's just allow read access to anyone for now, or restrict to owner.
CREATE POLICY "Allow users to read their own shop photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'shop_photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
