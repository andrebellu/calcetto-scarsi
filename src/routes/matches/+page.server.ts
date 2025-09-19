import { supabase } from "$lib/supabaseClient";

export async function load({ locals }: { locals: any }) {
  const { data: playerMatches, error: playerMatchesError } = await supabase
    .from("matches")
    .select(
      `
    match_date,
    luogo,
    match_id,
    team_blue_score,
    team_red_score,
    match_number,
    player_match!inner (
      goals,
      autogol,
      is_winner,
      team,
      players (
        player_id,
        name
      )
    )
  `
    )
    .order("match_date", { ascending: false })
    .order("match_number", { ascending: false });

  if (playerMatchesError) {
    console.error("Error fetching data:", playerMatchesError);
    return {
      matches: null,
      error: playerMatchesError.message,
    };
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("*");

  let isAuthenticated = false;
  if (locals && locals.user) {
    isAuthenticated = true;
  }

  return {
    matches: playerMatches,
    isAuthenticated: isAuthenticated,
    error: null,
    players: players,
  };
}
