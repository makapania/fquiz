import { createClient } from '@supabase/supabase-js';

export const supabaseBrowser = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

export const supabaseServer = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not set');
    throw new Error('Supabase URL not configured');
  }

  if (!serviceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
    throw new Error('Supabase service role key not configured');
  }

  // Service role key should bypass RLS
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};