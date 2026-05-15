import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Check if credentials are provided and are not the default placeholders
export const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseUrl !== 'https://your-project-id.supabase.co' && 
  supabaseUrl !== '' &&
  supabaseAnonKey && 
  supabaseAnonKey !== 'your-anon-key' &&
  supabaseAnonKey !== '';

// If not configured, use a dummy URL that won't throw on createClient but we'll avoid calling its methods
const finalUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co';
const finalKey = isSupabaseConfigured ? supabaseAnonKey : 'placeholder-key';

export const supabase = createClient(finalUrl, finalKey);
