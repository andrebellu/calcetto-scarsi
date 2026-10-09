// src/routes/api/poll/[id]/finalize/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parsePositiveInt } from '$lib/domain/fixture';
import { requireUser } from '$lib/server/auth';
import { sendPushToAllPlayers } from '$lib/server/push';

export const POST: RequestHandler = async ({ locals, params }) => {
  const supabase = locals.supabase;
  await requireUser(locals);

  const poll_id = parsePositiveInt(params.id);
  if (!poll_id) throw error(400, 'poll_id non valido');
  const { error: rpcErr } = await supabase.rpc('finalize_poll', { p_poll_id: poll_id });
  if (rpcErr) throw error(500, rpcErr.message);

  const { error: updErr } = await supabase.from('poll').update({ status: 'closed' }).eq('poll_id', poll_id);
  if (updErr) throw error(500, updErr.message);

  try {
    await sendPushToAllPlayers({
      title: 'Sondaggio chiuso',
      body: 'Il sondaggio è stato chiuso, a breve le squadre!',
      url: '/poll',
    });
  } catch (pushErr) {
    console.error('push notify-close error', pushErr);
  }

  return json({ ok: true });
};
