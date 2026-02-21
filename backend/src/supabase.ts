// =============================================================================
// supabase.ts – Supabase client for Who Lies Tonight (WLT)
// Used server-side only for persisting completed game sessions.
// =============================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('[Supabase] Missing SUPABASE_URL or SUPABASE_KEY env vars.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
