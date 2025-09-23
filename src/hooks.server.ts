import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { randomUUID } from 'node:crypto';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';

const supabase: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => event.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            event.cookies.set(name, value, { ...options, path: '/' });
          });
        }
      }
    }
  );

  event.locals.safeGetSession = async () => {
    const { data: { user }, error } = await event.locals.supabase.auth.getUser();
    if (error || !user) return { session: null, user: null };
    const { data: { session } } = await event.locals.supabase.auth.getSession();
    return { session, user };
  };

  let voterToken = event.cookies.get('vtr');
  if (!voterToken) {
    voterToken = randomUUID();
    event.cookies.set('vtr', voterToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365
    });
  }
  event.locals.voterToken = voterToken;

  return resolve(event, {
    filterSerializedResponseHeaders: (name) =>
      name === 'content-range' || name === 'x-supabase-api-version'
  });
};

const authGuard: Handle = async ({ event, resolve }) => {
  const { session, user } = await event.locals.safeGetSession();
  event.locals.session = session;
  event.locals.user = user;

  if (!session && event.url.pathname.startsWith('/private')) {
    throw redirect(303, '/auth');
  }
  if (session && event.url.pathname === '/auth') {
    throw redirect(303, '/private');
  }

  return resolve(event);
};

export const handle: Handle = sequence(supabase, authGuard);
