import { supabase } from "$lib/supabaseClient";

export async function load() {
  const { count: playersCount, error: playersError } = await supabase
    .from("players")
    .select('*', { count: 'exact', head: true });

const { count: tempPlayersCount, error: tempPlayersError } = await supabase
  .from("players")
  .select('*', { count: 'exact', head: true })
  .eq('is_temporary', true);


  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("team_blue_score, team_red_score");

  let totalGoals = 0;
  if (matches) {
    totalGoals = matches.reduce(
      (sum, m) => sum + (m.team_blue_score || 0) + (m.team_red_score || 0),
      0
    );
  }

  return {
    playersCount: playersCount ?? 0,
    totalGoals,
    tempPlayersCount: tempPlayersCount ?? 0,
    totalMatches: matches ? matches.length : 0,
    error: playersError || matchesError,
  };
}