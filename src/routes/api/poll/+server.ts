// src/routes/api/poll/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireUser } from '$lib/server/auth';
import { sendPushToAllPlayers } from '$lib/server/push';

export const POST: RequestHandler = async ({ locals, request }) => {
  const supabase = locals.supabase;
  const user = await requireUser(locals);

  const body = await request.json().catch(() => null);
  const { title: rawTitle, options } = (body ?? {}) as {
    title?: string;
    options?: Array<{ match_date: string; luogo: string; time_of_day: string; note?: string }>;
  };
  const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
  if (!title) throw error(400, 'Titolo obbligatorio');
  if (options !== undefined && !Array.isArray(options)) throw error(400, 'options deve essere un array');

  const { data: newPoll, error: pollErr } = await supabase
    .from('poll')
    .insert({ title, status: 'open', created_by: user.id })
    .select('*')
    .single();
  if (pollErr) {
    console.error(pollErr);
    throw error(500, pollErr.message);
  }

  const rows = (options ?? []).map((o) => ({
    poll_id: newPoll.poll_id,
    match_date: o.match_date || null,
    luogo: o.luogo || null,
    time_of_day: o.time_of_day || null,
    note: o.note || null
  }));
  if (rows.length) {
    const { error: optErr } = await supabase.from('poll_option').insert(rows);
    if (optErr) {
      console.error(optErr);
      throw error(500, optErr.message);
    }
  }

  try {
    await sendPushToAllPlayers({
      title: 'Nuovo sondaggio!',
      body: title,
      url: '/poll',
    });
  } catch (pushErr) {
    console.error('push notify-all error', pushErr);
  }

  return json({ poll_id: newPoll.poll_id });
};
