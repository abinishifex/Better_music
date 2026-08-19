/*
# Rebuild events table for authenticated event management

## Summary
Rebuilds the events table to support authenticated event management with
UUID primary keys, user ownership, and image URL storage. Also creates a
public storage bucket for event images with appropriate policies.

## Important Notes
1. The existing events table contained only 4 seeded test rows (no real user
   data) and is dropped and recreated to support the new UUID-based schema.
2. The table now uses UUID primary keys (gen_random_uuid()) instead of bigint.
3. The old `image` column is replaced by `image_url`.
4. A `user_id` column is added for ownership tracking with DEFAULT auth.uid().
5. RLS policies are scoped to authenticated users with ownership checks
   for INSERT, UPDATE, and DELETE. SELECT is open to all authenticated
   users so everyone can browse events.
6. A public storage bucket `event-images` is created with policies for
   authenticated uploads and public reads.

## New Table: events
- id (uuid, PK, default gen_random_uuid())
- title (text, not null)
- date (date, not null)
- time (time, not null)
- location (text, not null)
- description (text, nullable)
- image_url (text, nullable) — public URL of the event image in Storage
- category (text, not null, default 'Other') — genre tag for filtering
- organizer (text, nullable) — optional organizer name
- user_id (uuid, not null, references auth.users, default auth.uid())
- created_at (timestamptz, default now())

## Security — events table
- RLS enabled
- SELECT: all authenticated users can read all events (shared discovery data)
- INSERT: authenticated users can insert rows where user_id = auth.uid()
- UPDATE: authenticated users can update rows where user_id = auth.uid()
- DELETE: authenticated users can delete rows where user_id = auth.uid()

## Security — storage.objects (event-images bucket)
- SELECT: public read (public bucket)
- INSERT: authenticated users can upload to event-images bucket
- DELETE: authenticated users can delete from event-images bucket
*/

-- Drop existing events table (contains only seeded test data, no real users)
DROP TABLE IF EXISTS events CASCADE;

-- Create new events table with UUID primary key and user ownership
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  location text NOT NULL,
  description text,
  image_url text,
  category text NOT NULL DEFAULT 'Other',
  organizer text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop old policies from previous migration (idempotent)
DROP POLICY IF EXISTS "anon_select_events" ON events;
DROP POLICY IF EXISTS "anon_insert_events" ON events;
DROP POLICY IF EXISTS "anon_update_events" ON events;
DROP POLICY IF EXISTS "anon_delete_events" ON events;

-- SELECT: all authenticated users can read all events
CREATE POLICY "select_events" ON events FOR SELECT
  TO authenticated USING (true);

-- INSERT: authenticated users can insert rows where user_id = auth.uid()
CREATE POLICY "insert_own_events" ON events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- UPDATE: authenticated users can update rows where user_id = auth.uid()
CREATE POLICY "update_own_events" ON events FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DELETE: authenticated users can delete rows where user_id = auth.uid()
CREATE POLICY "delete_own_events" ON events FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Create public storage bucket for event images
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event-images bucket
DROP POLICY IF EXISTS "read_event_images" ON storage.objects;
CREATE POLICY "read_event_images" ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "upload_event_images" ON storage.objects;
CREATE POLICY "upload_event_images" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'event-images');

DROP POLICY IF EXISTS "delete_event_images" ON storage.objects;
CREATE POLICY "delete_event_images" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'event-images');
