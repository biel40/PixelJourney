import { defineMiddleware } from 'astro:middleware';
import { supabase } from '../lib/supabase';

export const onRequest = defineMiddleware(async ({ request, redirect }, next) => {
  const url = new URL(request.url);

  // Dejar pasar rutas públicas y la propia página de login
  if (!url.pathname.startsWith('/admin') || url.pathname === '/admin/login') {
    return next();
  }

  // TODO: restore — skips auth when Supabase is not configured
  const supabaseConfigured = !!import.meta.env.SUPABASE_URL;
  if (!supabaseConfigured) return next();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/admin/login');
  }

  return next();
});
