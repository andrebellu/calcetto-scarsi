// src/routes/poll/+page.server.ts
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, depends }) => {
  const supabase = locals.supabase;
  const { user, session } = await locals.safeGetSession();
  const token = locals.voterToken;

  depends("poll:data");

  // 1) ultimo sondaggio (singolo)
  const { data: poll, error: pollErr } = await supabase
    .from("poll")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 1b) ultimi tre sondaggi (lista)
  const { data: recentPolls = [] } = await supabase
    .from("poll")
    .select("poll_id, title, status, created_at")
    .order("created_at", { ascending: false })
    .limit(3);

  if (pollErr || !poll) {
    return {
      poll: null,
      options: [],
      counts: {},
      myVotes: [],
      session,
      isLogged: !!user,
      canVote: false,
      recentPolls, // nuova proprietà per la UI
    };
  }

  const { data: allPlayers } = await supabase
    .from("players")
    .select("player_id, name, is_temporary")
    .eq("is_temporary", false)
    .order("name", { ascending: true });
  const safeAllPlayers = allPlayers ?? [];

  const { data: usedRows = [] } = await supabase
    .from("poll_vote")
    .select("player_id")
    .eq("poll_id", poll.poll_id)
    .not("player_id", "is", null);

  const usedSet = new Set<string>(
    (usedRows ?? []).map((r) => r.player_id).filter(Boolean)
  );

  // Se RLS blocca, mostra pagina “nessun sondaggio”
  if (pollErr || !poll) {
    return {
      poll: null,
      options: [],
      counts: {},
      myVotes: [],
      session,
      isLogged: !!user,
      canVote: false,
    };
  }

  // 2) opzioni
  const { data: options } = await supabase
    .from("poll_option")
    .select("option_id, match_date, luogo, start_time, note")
    .eq("poll_id", poll.poll_id)
    .order("match_date", { ascending: true });

  // 3) voto personale (user o anon con token)
  let myVotes: Array<{
    option_id: number;
    choice: string;
    player_id: string | null;
  }> = [];
  if (user) {
    const { data } = await supabase
      .from("poll_vote")
      .select("option_id, choice, player_id")
      .eq("poll_id", poll.poll_id)
      .eq("voter_id", user.id);
    myVotes = data ?? [];
  } else {
    const { data } = await supabase
      .from("poll_vote")
      .select("option_id, choice, player_id")
      .eq("poll_id", poll.poll_id)
      .eq("voter_token", token);
    myVotes = data ?? [];
  }

  const firstWithPlayer = myVotes.find((v) => v.player_id);
  let chosenPlayerId = firstWithPlayer?.player_id ?? null;
  {
    const base = supabase
      .from("poll_vote")
      .select("player_id")
      .eq("poll_id", poll.poll_id)
      .not("player_id", "is", null)
      .limit(1)
      .maybeSingle();

    const { data: p } = user
      ? await base.eq("voter_id", user.id)
      : await base.eq("voter_token", token);

    chosenPlayerId = p?.player_id ?? null;
  }

  // 4) conteggi pubblici
  const { data: allVotes } = await supabase
    .from("poll_vote")
    .select("option_id, choice")
    .eq("poll_id", poll.poll_id);

  const counts: Record<number, number> = {};
  for (const v of allVotes ?? [])
    if (v.choice === "yes")
      counts[v.option_id] = (counts[v.option_id] ?? 0) + 1;

  const availablePlayers = safeAllPlayers.filter(
    (p) => p.player_id === chosenPlayerId || !usedSet.has(p.player_id)
  );

  return {
    poll,
    options: options ?? [],
    counts,
    myVotes,
    session,
    isLogged: !!user,
    canVote: poll.status === "open",
    chosenPlayerId,
    players: availablePlayers,
    recentPolls,
  };
};
