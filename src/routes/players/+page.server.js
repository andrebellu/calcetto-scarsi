import { supabase } from "$lib/supabaseClient";

export async function load({ locals }) {
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("*");

  const { data: playerMatches, error: playerMatchesError } = await supabase
    .from("player_match")
    .select("goals, player_id, is_winner");

  const { count: totalMatches, error: totalMatchesError } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true });

  let isAuthenticated = false;
  if (locals && locals.user) {
    isAuthenticated = true;
  }

  const playersWithStats = (players ?? []).map((player) => {
    const goals = (playerMatches ?? [])
      .filter((pm) => pm.player_id === player.player_id)
      .reduce((sum, pm) => sum + (pm.goals || 0), 0);

    const wins = (playerMatches ?? []).filter(
      (pm) => pm.player_id === player.player_id && pm.is_winner
    ).length;

    const matchesPlayed = (playerMatches ?? [])
      .map((pm) => pm.player_id)
      .filter((id) => id === player.player_id).length;
    const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;
    const golPerMatch = matchesPlayed > 0 ? (goals / matchesPlayed).toFixed(2) : 0;
    player.winRate = winRate;
    player.golPerMatch = golPerMatch;
    return { ...player, goals, wins, matchesPlayed, winRate, golPerMatch };
  });

  return {
    players: playersWithStats,
    isAuthenticated,
    error: playersError || playerMatchesError,
  };
}
