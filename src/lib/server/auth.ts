import { error } from '@sveltejs/kit';
import type { User } from '@supabase/supabase-js';

/**
 * Restituisce l'utente verificato (via auth.getUser) o risponde 401.
 * Oggi "autenticato" coincide con "organizzatore" (account admin condiviso):
 * se in futuro servono ruoli distinti, questo è l'unico punto da cambiare.
 */
export async function requireUser(locals: App.Locals): Promise<User> {
  const { user } = await locals.safeGetSession();
  if (!user) throw error(401, 'Non autenticato');
  return user;
}
