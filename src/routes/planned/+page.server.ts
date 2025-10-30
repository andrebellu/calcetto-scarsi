import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabaseClient';

export const load: PageServerLoad = async ({ locals }) => {
  const isAuthenticated = !!locals?.user;

  // ultima convocazione confermata
  const { data: fx, error: fxErr } = await supabase
    .from('fixture')
    .select('fixture_id, poll_id, match_date, luogo, time_of_day, status, created_at')
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })
    .order('fixture_id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fxErr) {
    return { isAuthenticated, dataDecisa: false, prossimaPartita: null, squads: null, error: fxErr.message };
  }
  if (!fx) {
    return { isAuthenticated, dataDecisa: false, prossimaPartita: null, squads: null };
  }

  // assegnazioni: A/B/P con nome e gk_order
  const { data: rows } = await supabase
    .from('fixture_player')
    .select('player_id, team, is_goalkeeper, gk_order, players!inner(name)')
    .eq('fixture_id', fx.fixture_id);

  const squads = {
    A: [] as Array<{ player_id: string; name: string; is_goalkeeper: boolean; gk_order?: number }>,
    B: [] as Array<{ player_id: string; name: string; is_goalkeeper: boolean; gk_order?: number }>,
    P: [] as Array<{ player_id: string; name: string; is_goalkeeper: boolean; gk_order?: number }>
  };

  for (const r of rows ?? []) {
    const name = (r as any).players?.name ?? 'N/D';
    const item = { player_id: r.player_id, name, is_goalkeeper: !!r.is_goalkeeper, gk_order: r.gk_order ?? undefined };
    if (r.team === 'A') squads.A.push(item);
    else if (r.team === 'B') squads.B.push(item);
    else squads.P.push(item);
  }

  const prossimaPartita = {
    data: fx.match_date,
    ora: fx.time_of_day,
    luogo: fx.luogo,
    fixture_id: fx.fixture_id,
    poll_id: fx.poll_id
  };

  return {
    isAuthenticated,
    dataDecisa: true,
    prossimaPartita,
    squads
  };
};
