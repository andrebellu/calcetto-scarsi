// @ts-nocheck
import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabaseClient';

export const load: PageServerLoad = async ({ locals }) => {
  const isAuthenticated = !!locals?.user;

  // 🔹 Dati base
  const { count: playersCount } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true });

  const { count: tempPlayersCount } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('is_temporary', true);

  const { data: matches } = await supabase
    .from('matches')
    .select('team_blue_score, team_red_score');

  const totalGoals = (matches ?? []).reduce(
    (s, m) => s + (m.team_blue_score || 0) + (m.team_red_score || 0),
    0
  );

  const today = new Date().toISOString().split('T')[0];

  const { data: latestFixture, error: fxErr } = await supabase
    .from('fixture')
    .select('fixture_id, poll_id, match_date, luogo, time_of_day, status, created_at')
    .eq('status', 'confirmed')
    .gte('match_date', today)
    .order('match_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  let hasNewerPoll = false;
  if (latestFixture) {
    const { data: newerPoll } = await supabase
      .from('poll')
      .select('poll_id, created_at, status')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (newerPoll && new Date(newerPoll.created_at) > new Date(latestFixture.created_at)) {
      hasNewerPoll = true;
    }
  }

  const prossimaPartita =
    latestFixture && !hasNewerPoll
      ? {
          data: latestFixture.match_date,
          ora: latestFixture.time_of_day,
          luogo: latestFixture.luogo,
          poll_id: latestFixture.poll_id,
          fixture_id: latestFixture.fixture_id,
        }
      : null;

  const dataDecisa = !!prossimaPartita;

  return {
    playersCount: playersCount ?? 0,
    totalGoals,
    tempPlayersCount: tempPlayersCount ?? 0,
    totalMatches: matches ? matches.length : 0,
    isAuthenticated,
    dataDecisa,
    prossimaPartita,
  };
};
