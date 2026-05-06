-- 1. Tighten storage policies for listing-images
DROP POLICY IF EXISTS "listing images auth upload" ON storage.objects;
DROP POLICY IF EXISTS "listing images own delete" ON storage.objects;
DROP POLICY IF EXISTS "listing images own update" ON storage.objects;

CREATE POLICY "listing images auth upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'listing-images'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "listing images own update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'listing-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "listing images own delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'listing-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 2. Tighten storage policies for avatars
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "avatars auth upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars own update" ON storage.objects;
DROP POLICY IF EXISTS "avatars own delete" ON storage.objects;

CREATE POLICY "avatars public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "avatars own upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "avatars own update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "avatars own delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Lock down notifications insert: only allow users to insert notifications for themselves.
-- System notifications are inserted by SECURITY DEFINER triggers which bypass RLS.
DROP POLICY IF EXISTS "notif insert system" ON public.notifications;

CREATE POLICY "notif insert own"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Allow conversation participants to update their conversation row (for read-status maintenance)
DROP POLICY IF EXISTS "conv update participants" ON public.conversations;
CREATE POLICY "conv update participants"
ON public.conversations FOR UPDATE
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);