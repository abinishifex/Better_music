/*
# Rebuild events table for no-auth discovery app

## Summary
Rebuilds the `events` table to match the existing Better Music frontend, which
has no sign-in screen and talks to Supabase with the anon key. The previous
version of the table used UUID ids, an `image_url` column, a `user_id` owner
column, and `TO authenticated`-only RLS policies — which meant the anon-key
frontend received zero rows and rendered a blank page. This migration drops
that empty table and recreates it with an integer identity id, an `image`
column, no owner column, and `TO anon, authenticated` CRUD policies
(including DELETE) so the no-auth frontend can read and manage events. Seeds
six sample events so the app renders content on first load.

## New Table: events (rebuilt)
- id (int, PK, generated identity) — numeric id matching the frontend's
  EventRow type.
- title (text, not null) — name of the music event.
- description (text) — longer writeup of the event.
- location (text, not null) — city/region, e.g. "Berlin, DE".
- organizer (text) — person or company running the event.
- date (date, not null) — calendar date the event takes place.
- time (time, not null) — start time of the event.
- category (text, not null) — genre/mood tag for filtering.
- image (text) — public URL of the event cover image.
- created_at (timestamptz, default now()) — row creation timestamp.

## Security
- RLS enabled on events.
- Four CRUD policies scoped to `TO anon, authenticated` because the Better
  Music app has no sign-in screen, so the frontend talks to Supabase with the
  anon key. `USING (true)` / `WITH CHECK (true)` is correct here because the
  events table is intentionally public/shared discovery data (single-tenant,
  no-auth app). It is NOT a workaround for missing ownership checks.
- A DELETE policy is explicitly included so the frontend can permanently
  remove an event row by id.

## Important Notes
1. The previous events table contained zero rows (no real user data), so
   dropping and recreating it loses nothing.
2. The table uses an integer identity primary key (not uuid) to match the
   existing frontend code, which expects numeric ids.
3. The `image` column (not `image_url`) matches the frontend's EventRow type.
4. Seeded rows use relative dates (today, tomorrow, +2/+3/+5/+7 days) so the
   "Live now" / "Tonight" / "Tomorrow" badges stay meaningful over time.
*/

DROP TABLE IF EXISTS events CASCADE;

CREATE TABLE events (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title text NOT NULL,
  description text,
  location text NOT NULL,
  organizer text,
  date date NOT NULL,
  time time NOT NULL,
  category text NOT NULL,
  image text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

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

INSERT INTO events (title, description, location, organizer, date, time, category, image) VALUES
  ('Neon Pulse', 'A warehouse takeover with four DJs across two floors, strobe-lit and bass-heavy until sunrise.', 'Berlin, DE', 'Subsonic Collective', CURRENT_DATE, '23:00', 'Techno', 'https://images.pexels.com/photos/5423398/pexels-photo-5423398.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('Velvet Hours', 'Late-night jazz in a candlelit cellar. Trio sets, smoky horns, and a curated wine list.', 'Berlin, DE', 'Blue Door Sessions', CURRENT_DATE + INTERVAL '1 day', '21:00', 'Jazz', 'https://images.pexels.com/photos/9419224/pexels-photo-9419224.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('Static Bloom', 'Five indie bands on one stage, raw guitars and reverb, doors at eight.', 'Berlin, DE', 'Echo Promotions', CURRENT_DATE + INTERVAL '2 days', '20:00', 'Indie', 'https://images.pexels.com/photos/6270146/pexels-photo-6270146.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('808 District', 'Underground hip-hop showcase with local producers, guest MCs, and an open mic block.', 'Berlin, DE', 'District Sounds', CURRENT_DATE + INTERVAL '3 days', '22:00', 'Hip-Hop', 'https://images.pexels.com/photos/3101522/pexels-photo-3101522.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('Subterranean', 'A deep-techno all-nighter in a converted power station. Sound by Subsonic.', 'Berlin, DE', 'Subsonic Collective', CURRENT_DATE + INTERVAL '5 days', '23:30', 'Techno', 'https://images.pexels.com/photos/14483028/pexels-photo-14483028.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('Midnight Chord', 'Intimate indie-acoustic night, strings and harmonies in a former gallery space.', 'Berlin, DE', 'Echo Promotions', CURRENT_DATE + INTERVAL '7 days', '19:30', 'Indie', 'https://images.pexels.com/photos/27817811/pexels-photo-27817811.jpeg?auto=compress&cs=tinysrgb&h=650&w=940');
