import { supabase } from "$lib/supabaseClient";

export async function load({ locals }: { locals: any }) {
  let currentUserPlayerId = null;
  if (locals.session) {
    const { data } = await supabase
      .from("players")
      .select("id")
      .eq("user_id", locals.session.user.id)
      .single();
    currentUserPlayerId = data?.id;
  }

  const playersPromise = Promise.all([
    supabase.from("players").select("*"),
    supabase.from("player_match").select("goals, player_id, is_winner"),
  ]).then(([playersRes, matchesRes]) => {
    const players = playersRes.data ?? [];
    const playerMatches = matchesRes.data ?? [];

    return players.map((player) => {
      const playerKey = player.player_id ?? player.id;
      const samePlayer = (pm: any) => String(pm.player_id) === String(playerKey);

      const goals = playerMatches
        .filter(samePlayer)
        .reduce((sum, pm) => sum + (pm.goals || 0), 0);

      const wins = playerMatches.filter(
        (pm) => samePlayer(pm) && pm.is_winner
      ).length;

      const matchesPlayed = playerMatches
        .map((pm) => pm.player_id)
        .filter((id) => String(id) === String(playerKey)).length;
      const winRate =
        matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;
      const golPerMatch =
        matchesPlayed > 0 ? (goals / matchesPlayed).toFixed(2) : 0;

      // @ts-ignore
      player.winRate = winRate;
      // @ts-ignore
      player.golPerMatch = golPerMatch;

      return {
        ...player,
        goals,
        wins,
        matchesPlayed,
        winRate,
        golPerMatch,
        is_claimable: player.user_id === null && !player.is_temporary
      };
    });
  });

  const { count: totalMatches, error: totalMatchesError } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true });

  let isAuthenticated = false;
  if (locals && locals.user) {
    isAuthenticated = true;
  }

  console.log("Current User Player ID:", currentUserPlayerId);

  return {
    streamed: {
      players: playersPromise.then(p => {
        console.log("Claimable players:", p.filter(x => x.is_claimable).map(x => x.name));
        return p;
      }),
    },
    isAuthenticated,
    currentUserPlayerId,
    error: null,
  };
}

export const actions = {
  claim: async ({ request, locals }: { request: any, locals: any }) => {
    const { supabase, session } = locals;
    if (!session) return { error: "Non autorizzato" };

    const formData = await request.formData();
    const playerId = formData.get("playerId");

    const { error } = await supabase
      .from("players")
      .update({ user_id: session.user.id })
      .eq("id", playerId)
      .is("user_id", null);

    if (error) return { error: "Errore durante il collegamento" };
    return { success: true };
  }
};
