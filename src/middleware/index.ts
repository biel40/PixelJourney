import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async ({ request, redirect }, next) => {
  const url = new URL(request.url);

  if (!url.pathname.startsWith('/admin') || url.pathname === '/admin/login') {
    return next();
  }

  if (!import.meta.env.SUPABASE_URL) {
    return next();
  }

  const { supabase } = await import('../lib/supabase');
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/admin/login');
  }

  return next();
});
