import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase configuration. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? ''
);

const BUCKET = 'event-images';

export type EventRow = {
  id: number;
  title: string;
  description: string | null;
  location: string;
  organizer: string | null;
  date: string;
  time: string;
  category: string;
  image: string | null;
  created_at: string;
};

export type EventInput = {
  title: string;
  description: string | null;
  location: string;
  organizer: string | null;
  date: string;
  time: string;
  category: string;
  image: string | null;
};

export async function fetchEvents(): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export async function createEvent(input: EventInput): Promise<EventRow> {
  const { data, error } = await supabase
    .from('events')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as EventRow;
}

export async function updateEvent(id: number, input: Partial<EventInput>): Promise<EventRow> {
  const { data, error } = await supabase
    .from('events')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as EventRow;
}

export async function deleteEvent(id: number): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadEventImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteEventImage(publicUrl: string): Promise<void> {
  try {
    const url = new URL(publicUrl);
    const prefix = `/storage/v1/object/public/${BUCKET}/`;
    const idx = url.pathname.indexOf(prefix);
    if (idx === -1) return;
    const path = url.pathname.slice(idx + prefix.length);
    if (!path) return;
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
  } catch {
    // If the URL is malformed or already gone, swallow — don't block the delete.
  }
}
