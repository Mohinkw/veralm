import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://yabkgewlphzovqdwuihd.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_yqWU2uJREvONK_Mr8yX-1Q_kVp659fE';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Server-side client with service role key (for admin operations)
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || serviceKey.includes('placeholder')) {
    console.warn('[Supabase] SUPABASE_SERVICE_ROLE_KEY is missing or placeholder; server mutations may fail RLS.');
  }
  const key = serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type SupabaseClient = ReturnType<typeof createClient>;
