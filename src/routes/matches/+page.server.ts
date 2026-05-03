import { supabase } from "$lib/supabaseClient";

function normalizeSeasonFilter(raw: string | null, seasonValues: string[]) {
  if (!raw || raw === "all") return "all";
  if (raw === "__none__") return "__none__";
  return seasonValues.includes(raw) ? raw : "all";
}

export async function load({ locals, url }: { locals: any; url: URL }) {
  const { data: seasonRows } = await supabase
    .from("matches")
    .select("season, match_date")
    .order("match_date", { ascending: false });

  const seasonOptions = Array.from(
    new Set(
      (seasonRows ?? [])
        .map((row) => row.season?.trim())
        .filter((season): season is string => Boolean(season)),
    ),
  ).map((season) => ({ value: season, label: season }));

  const selectedSeason = normalizeSeasonFilter(
    url.searchParams.get("season"),
    seasonOptions.map((season) => season.value),
  );

  const matchesPromise = supabase
    .from("matches")
    .select(
      `
    match_date,
    luogo,
    match_id,
    season,
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
    seasonOptions,
    selectedSeason,
    isAuthenticated: isAuthenticated,
    players: players,
  };
}
