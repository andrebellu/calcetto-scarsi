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

  const buildFallbackConvocati = async () => {
    const { data: options, error: optionsErr } = await supabase
      .from('poll_option')
      .select('option_id, match_date, luogo, time_of_day')
      .eq('poll_id', fx.poll_id);
    if (optionsErr) throw optionsErr;

    const dayOptions = (options ?? []).filter((option) => {
      const sameDate = option.match_date === fx.match_date;
      const sameLocation = !fx.luogo || (option.luogo ?? null) === fx.luogo;
      return sameDate && sameLocation;
    });

    const voteRows = await Promise.all(
      dayOptions.map(async (option) => {
        const { data: votes, error: votesErr } = await supabase
          .from('poll_vote')
          .select('option_id')
          .eq('poll_id', fx.poll_id)
          .eq('option_id', option.option_id)
          .eq('choice', 'yes');
        if (votesErr) throw votesErr;
        return { option_id: option.option_id, votes: votes?.length ?? 0, match_date: option.match_date ?? '', time_of_day: option.time_of_day ?? '' };
      })
    );

    voteRows.sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      if (a.match_date !== b.match_date) return a.match_date < b.match_date ? -1 : 1;
      if (a.time_of_day !== b.time_of_day) return a.time_of_day < b.time_of_day ? -1 : 1;
      return a.option_id - b.option_id;
    });

    const selectedOptionId = voteRows[0]?.option_id;
    if (!selectedOptionId) return [] as Array<{ player_id: string; name: string; is_goalkeeper: boolean; gk_order?: number }>;

    const { data: voters, error: votersErr } = await supabase
      .from('poll_vote')
      .select('player_id, players!inner(name)')
      .eq('poll_id', fx.poll_id)
      .eq('option_id', selectedOptionId)
      .eq('choice', 'yes');
    if (votersErr) throw votersErr;

    const seen = new Set<string>();
    return (voters ?? [])
      .map((row: any) => ({
        player_id: row.player_id,
        name: row.players?.name ?? 'N/D',
        is_goalkeeper: false,
        gk_order: undefined,
      }))
      .filter((row) => {
        if (seen.has(row.player_id)) return false;
        seen.add(row.player_id);
        return true;
      });
  };

  // assegnazioni: A/B
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

  if (!rows || rows.length === 0) {
    squads.P = await buildFallbackConvocati();
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
