import { json, error } from "@sveltejs/kit";
export const GET = async ({ params, locals }) => {
  const supabase = locals.supabase;
  const fixture_id = Number(params.id);
  const { data, error: e } = await supabase
    .from('fixture_player')
    .select('player_id, team, is_goalkeeper, players!inner(name)')
    .eq('fixture_id', fixture_id);
  if (e) throw error(500, e.message);
  return json(data.map(r => ({ player_id: r.player_id, name: (r as any).players.name, team: r.team, is_goalkeeper: r.is_goalkeeper })));
};
export const PUT = async ({ params, request, locals }) => {
  const supabase = locals.supabase;
  const fixture_id = Number(params.id);
  const body = await request.json(); // { players: [{ player_id, team, is_goalkeeper }] }
  const rows = (body.players ?? []).map((p) => ({ fixture_id, ...p }));
  const { error: e } = await supabase.from('fixture_player')
    .upsert(rows, { onConflict: 'fixture_id,player_id' });
  if (e) throw error(500, e.message);
  return json({ ok: true });
};
