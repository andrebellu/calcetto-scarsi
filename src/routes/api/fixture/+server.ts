// src/routes/api/fixture/+server.ts
import { json, error } from "@sveltejs/kit";
export const POST = async ({ request, locals }) => {
  const supabase = locals.supabase;
  const body = await request.json(); // { poll_id, option_id, match_date, luogo, start_time }
  const { data, error: e } = await supabase.from('fixture').insert({
    poll_id: body.poll_id,
    match_date: body.match_date,
    luogo: body.luogo,
    start_time: body.start_time,
    status: 'draft'
  }).select('fixture_id').single();
  if (e) throw error(500, e.message);
  return json({ fixture_id: data.fixture_id });
};
