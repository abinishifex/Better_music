import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
