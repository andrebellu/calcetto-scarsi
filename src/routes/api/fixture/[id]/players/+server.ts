import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireUser } from '$lib/server/auth';
import { ValidationError, normalizeFixturePlayers, parsePositiveInt } from '$lib/domain/fixture';

type FixturePlayerWithName = {
  player_id: string;
  team: string | null;
  is_goalkeeper: boolean | null;
  players: { name: string } | { name: string }[] | null;
};

export const GET: RequestHandler = async ({ params, locals }) => {
  const fixture_id = parsePositiveInt(params.id);
  if (!fixture_id) throw error(400, 'fixture_id non valido');

  const { data, error: e } = await locals.supabase
    .from('fixture_player')
    .select('player_id, team, is_goalkeeper, players!inner(name)')
    .eq('fixture_id', fixture_id);
  if (e) throw error(500, e.message);

  return json(
    ((data ?? []) as FixturePlayerWithName[]).map((r) => {
      const player = Array.isArray(r.players) ? r.players[0] : r.players;
      return {
        player_id: r.player_id,
        name: player?.name ?? 'N/D',
        team: r.team,
        is_goalkeeper: r.is_goalkeeper
      };
    })
  );
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  // Prima questo endpoint accettava modifiche alle squadre anche senza login.
  await requireUser(locals);

  const fixture_id = parsePositiveInt(params.id);
  if (!fixture_id) throw error(400, 'fixture_id non valido');

  const body = (await request.json().catch(() => null)) as { players?: unknown } | null;
  if (!body) throw error(400, 'JSON non valido');

  let players;
  try {
    players = normalizeFixturePlayers(body.players);
  } catch (e) {
    if (e instanceof ValidationError) throw error(400, e.message);
    throw e;
  }

  const rows = players.map((p) => ({ fixture_id, ...p }));
  if (rows.length === 0) return json({ ok: true });

  const { error: e } = await locals.supabase
    .from('fixture_player')
    .upsert(rows, { onConflict: 'fixture_id,player_id' });
  if (e) throw error(500, e.message);

  return json({ ok: true });
};
