// src/routes/api/poll/[id]/finalize/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params }) => {
  const supabase = locals.supabase;
  const { user } = await locals.safeGetSession();
  if (!user) throw error(401, 'Unauthorized');

  const poll_id = Number(params.id);
  const { error: rpcErr } = await supabase.rpc('finalize_poll', { p_poll_id: poll_id });
  if (rpcErr) throw error(500, rpcErr.message);

  const { error: updErr } = await supabase.from('poll').update({ status: 'closed' }).eq('poll_id', poll_id);
  if (updErr) throw error(500, updErr.message);

  return json({ ok: true });
};
