import { createClient } from '@supabase/supabase-js';

// TODO: restore real env vars after demo
// const SUPABASE_URL = import.meta.env.SUPABASE_URL;
// const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
// const SUPABASE_ANON_KEY = import.meta.env.SUPABASE_ANON_KEY;
const SUPABASE_URL = import.meta.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const SUPABASE_ANON_KEY = import.meta.env.SUPABASE_ANON_KEY ?? '';

// Cliente con service role — bypassa RLS, solo usar en rutas de servidor
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Cliente con anon key — respeta RLS, safe para SSR público
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
