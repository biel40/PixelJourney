import { createClient } from '@supabase/supabase-js';

// Cliente con service role — bypassa RLS, solo usar en rutas de servidor
export const supabaseAdmin = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Cliente con anon key — respeta RLS, safe para SSR público
export const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_ANON_KEY,
);
