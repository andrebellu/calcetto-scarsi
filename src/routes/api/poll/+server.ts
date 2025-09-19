// src/routes/api/poll/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
  const supabase = locals.supabase;
  const { user } = await locals.safeGetSession();
  if (!user) throw error(401, 'Unauthorized');

  const body = await request.json();
  const { title, options } = body as {
    title: string;
    options: Array<{ match_date: string; luogo: string; start_time: string; note?: string }>;
  };

  const { data: newPoll, error: pollErr } = await supabase
    .from('poll')
    .insert({ title, status: 'open', created_by: user.id })
    .select('*')
    .single();
  if (pollErr) throw error(500, pollErr.message);

  const rows = (options ?? []).map((o) => ({
    poll_id: newPoll.poll_id,
    match_date: o.match_date,
    luogo: o.luogo,
    start_time: o.start_time,
    note: o.note ?? null
  }));
  if (rows.length) {
    const { error: optErr } = await supabase.from('poll_option').insert(rows);
    if (optErr) throw error(500, optErr.message);
  }

  return json({ poll_id: newPoll.poll_id });
};
