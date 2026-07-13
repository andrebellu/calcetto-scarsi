import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendPushToPlayers } from '$lib/server/push';

export const POST: RequestHandler = async ({ locals, params }) => {
  const supabase = locals.supabase;
  const { user } = await locals.safeGetSession();
  if (!user) throw error(401, 'Unauthorized');

  const poll_id = Number(params.id);
  if (!poll_id || Number.isNaN(poll_id)) throw error(400, 'poll_id non valido');

  const { data: poll } = await supabase.from('poll').select('title').eq('poll_id', poll_id).maybeSingle();

  const [{ data: players }, { data: votedRows }] = await Promise.all([
    supabase.from('players').select('player_id').eq('is_temporary', false),
    supabase.from('poll_vote').select('player_id').eq('poll_id', poll_id).not('player_id', 'is', null),
  ]);

  const votedSet = new Set((votedRows ?? []).map((r) => r.player_id));
  const nonVoterIds = (players ?? [])
    .map((p) => p.player_id)
    .filter((id) => id && !votedSet.has(id));

  await sendPushToPlayers(nonVoterIds, {
    title: 'Promemoria sondaggio',
    body: `Non hai ancora votato per "${poll?.title ?? 'il prossimo match'}"!`,
    url: '/poll',
  });

  return json({ ok: true, remindedCount: nonVoterIds.length });
};
