import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'cvs';

function assertEnv(name, value) {
  if (!value) {
    throw new Error(`${name} is missing`);
  }
}

export function getSupabaseAdmin() {
  assertEnv('SUPABASE_URL', SUPABASE_URL);
  assertEnv('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY', SUPABASE_SERVICE_ROLE_KEY);
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getSupabaseBucket() {
  return SUPABASE_BUCKET;
}
