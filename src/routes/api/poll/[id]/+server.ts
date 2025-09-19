import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
  const supabase = (locals as any).supabase;
  const pollId = Number(params.id);

  const { data: poll, error: pollErr } = await supabase
    .from('poll')
    .select('*')
    .eq('poll_id', pollId)
    .single();

  if (pollErr) throw error(404, 'Poll not found');

  const { data: options, error: optErr } = await supabase
    .from('poll_option')
    .select('option_id, match_date, luogo, start_time, note')
    .eq('poll_id', pollId)
    .order('match_date', { ascending: true });

  if (optErr) throw error(500, optErr.message);

  const { data: votes, error: vErr } = await supabase
    .from('poll_vote')
    .select('option_id, choice')
    .eq('poll_id', pollId);

  if (vErr) throw error(500, vErr.message);

  const counts: Record<number, number> = {};
  for (const v of votes ?? []) {
    if (v.choice === 'yes') counts[v.option_id] = (counts[v.option_id] ?? 0) + 1;
  }

  return json({ poll, options, counts });
};
