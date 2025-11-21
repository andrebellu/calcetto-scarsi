import { supabase } from "$lib/supabaseClient";

export async function load({ locals }: { locals: any }) {
  const matchesPromise = supabase
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
    .order("match_number", { ascending: false })
    .then(({ data, error }) => {
      if (error) throw error;
      return data;
    });

  const { data: players } = await supabase.from("players").select("*");

  let isAuthenticated = false;
  if (locals && locals.user) {
    isAuthenticated = true;
  }

  return {
    streamed: {
      matches: matchesPromise,
    },
    isAuthenticated: isAuthenticated,
    players: players,
  };
}
