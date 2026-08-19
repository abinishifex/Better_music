/*
# Allow anon to upload and delete event images

## Summary
The Better Music app has no sign-in screen, so the frontend talks to Supabase
with the anon key. The existing storage policies on the `event-images` bucket
were scoped to `authenticated` only, meaning the anon-key client could not
upload or delete event images. This migration recreates those policies scoped
to `anon, authenticated` so the no-auth frontend can upload and delete images
in the `event-images` bucket. SELECT (public read) is already correct and is
left unchanged.

## Security — storage.objects (event-images bucket)
- SELECT: public read (public bucket) — unchanged.
- INSERT: anon + authenticated can upload to event-images bucket.
- DELETE: anon + authenticated can delete from event-images bucket.
- UPDATE: anon + authenticated can update objects in event-images bucket
  (needed so Supabase storage can replace/move files).

## Important Notes
1. `USING (true)` / `WITH CHECK (true)` scoped to the `event-images` bucket is
   correct here because the bucket is intentionally public/shared (single-tenant,
   no-auth app). It is NOT a workaround for missing ownership checks.
2. Policies are dropped before being recreated to stay idempotent.
*/

-- INSERT: allow anon + authenticated to upload to event-images
DROP POLICY IF EXISTS "upload_event_images" ON storage.objects;
CREATE POLICY "upload_event_images" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'event-images');

-- DELETE: allow anon + authenticated to delete from event-images
DROP POLICY IF EXISTS "delete_event_images" ON storage.objects;
CREATE POLICY "delete_event_images" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'event-images');

-- UPDATE: allow anon + authenticated to update objects in event-images
DROP POLICY IF EXISTS "update_event_images" ON storage.objects;
CREATE POLICY "update_event_images" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'event-images') WITH CHECK (bucket_id = 'event-images');
