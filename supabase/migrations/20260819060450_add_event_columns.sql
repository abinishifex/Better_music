/*
# Add event detail columns to the events table

## Summary
Adds the core event fields needed by the Better Music discovery app to the
existing `events` table (which previously only had `id` and `created_at`).
Also adds row-level security policies so the no-auth frontend can read and
write events, since RLS was enabled but no policies existed (the table was
fully locked down).

## New Columns on `events`
- `title` (text, not null) — name of the music event, e.g. "Neon Nights".
- `date` (date, not null) — the calendar date the event takes place.
- `time` (time, not null) — the start time of the event.
- `location` (text, not null) — city/region, e.g. "Berlin, DE".
- `organizer` (text) — person or company running the event. Nullable since
  not all events have a known organizer yet.
- `description` (text) — longer-form writeup of the event. Nullable so events
  can be created before a description is written.
- `category` (text, not null) — genre/mood tag, e.g. "Techno", "Indie".
- `image` (text) — storage path (or public URL) of the event's cover image.
  This is intentionally a plain text column, not a binary blob: images are
  stored in Supabase Storage and this column holds the path/reference to
  them. This keeps the table lean and lets us later serve signed/public URLs
  from Storage when users upload their own images.

## Security
- RLS was already enabled on `events` but had zero policies, meaning every
  read and write was denied. This migration adds four CRUD policies.
- The Better Music app currently has no sign-in screen, so the frontend talks
  to Supabase with the anon key. Policies are therefore scoped to
  `TO anon, authenticated` so the anon-key client can operate on the shared,
  intentionally-public event data.
- `USING (true)` / `WITH CHECK (true)` is correct here because the events
  table is intentionally public/shared discovery data (single-tenant, no-auth
  app). It is NOT a workaround for missing ownership checks.

## Important Notes
1. The `image` column stores a reference to a Supabase Storage object, not the
   file bytes themselves. When user uploads are wired up later, the flow will
   be: upload file to a Storage bucket -> get the object path -> store that
   path in this column.
2. No data is lost: only additive ALTER TABLE ADD COLUMN statements are used.
3. The migration is idempotent — each column is added only if it does not
   already exist, and policies are dropped before being recreated.
*/

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS title text NOT NULL,
  ADD COLUMN IF NOT EXISTS date date NOT NULL,
  ADD COLUMN IF NOT EXISTS time time NOT NULL,
  ADD COLUMN IF NOT EXISTS location text NOT NULL,
  ADD COLUMN IF NOT EXISTS organizer text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS category text NOT NULL,
  ADD COLUMN IF NOT EXISTS image text;

-- RLS is already enabled on events. Recreate the four CRUD policies so the
-- no-auth (anon-key) frontend can read and write the shared event data.
DROP POLICY IF EXISTS "anon_select_events" ON events;
CREATE POLICY "anon_select_events" ON events
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_events" ON events;
CREATE POLICY "anon_insert_events" ON events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_events" ON events;
CREATE POLICY "anon_update_events" ON events
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_events" ON events;
CREATE POLICY "anon_delete_events" ON events
  FOR DELETE TO anon, authenticated USING (true);
