// src/routes/+page.server.ts
import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabaseClient';

export const load: PageServerLoad = async ({ locals }) => {
  const isAuthenticated = !!locals?.user;

  // contatori esistenti
  const { count: playersCount } = await supabase.from('players').select('*', { count: 'exact', head: true });
  const { count: tempPlayersCount } = await supabase.from('players').select('*', { count: 'exact', head: true }).eq('is_temporary', true);
  const { data: matches } = await supabase.from('matches').select('team_blue_score, team_red_score');
  const totalGoals = (matches ?? []).reduce((s, m) => s + (m.team_blue_score || 0) + (m.team_red_score || 0), 0);

  // ultima convocazione: fixture più recente confermata
  const { data: fx, error: fxErr } = await supabase
    .from('fixture')
    .select('fixture_id, poll_id, match_date, luogo, start_time, status, created_at')
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })
    .order('fixture_id', { ascending: false })
    .limit(1)
    .maybeSingle(); // zero/una riga senza errore [web:229]

  // se serve legare al sondaggio più recente, si può anche: .order('poll_id', { ascending: false })

  const dataDecisa = !!fx;
  const prossimaPartita = fx
    ? {
        data: fx.match_date,   // formattare lato client se serve
        ora: fx.start_time,
        luogo: fx.luogo,
        poll_id: fx.poll_id,
        fixture_id: fx.fixture_id
      }
    : null;

  return {
    playersCount: playersCount ?? 0,
    totalGoals,
    tempPlayersCount: tempPlayersCount ?? 0,
    totalMatches: matches ? matches.length : 0,
    isAuthenticated,
    dataDecisa,
    prossimaPartita
  };
};
