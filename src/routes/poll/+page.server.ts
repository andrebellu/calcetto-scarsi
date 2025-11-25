// src/routes/poll/+page.server.ts
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, depends }) => {
  const supabase = locals.supabase;
  const { user, session } = await locals.safeGetSession();
  const token = locals.voterToken;

  depends("poll:data");

  const { data: poll, error: pollErr } = await supabase
    .from("poll")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: recentPolls = [] } = await supabase
    .from("poll")
    .select("poll_id, title, status, created_at")
    .order("created_at", { ascending: false })
    .limit(3);

  if (pollErr || !poll) {
    return {
      poll: null,
      recentPolls,
      session,
      isLogged: !!user,
      canVote: false,
      streamed: {
        pollData: Promise.resolve({
          options: [],
          counts: {},
          myVotes: [],
          chosenPlayerId: null,
          players: [],
          absentPlayers: [],
          isAbsent: false,
        }),
      },
    };
  }

  const pollDataPromise = Promise.all([
    // allPlayers
    supabase
      .from("players")
      .select("player_id, name, is_temporary")
      .eq("is_temporary", false)
      .order("name", { ascending: true }),
    // usedRows
    supabase
      .from("poll_vote")
      .select("player_id")
      .eq("poll_id", poll.poll_id)
      .not("player_id", "is", null),
    // options
    supabase
      .from("poll_option")
      .select("option_id, match_date, luogo, time_of_day, note")
      .eq("poll_id", poll.poll_id)
      .order("match_date", { ascending: true }),
    // myVotes
    user
      ? supabase
        .from("poll_vote")
        .select("option_id, choice, player_id")
        .eq("poll_id", poll.poll_id)
        .eq("voter_id", user.id)
      : supabase
        .from("poll_vote")
        .select("option_id, choice, player_id")
        .eq("poll_id", poll.poll_id)
        .eq("voter_token", token),
    // allVotes
    supabase
      .from("poll_vote")
      .select("option_id, choice")
      .eq("poll_id", poll.poll_id),
    // absences
    supabase
      .from("poll_absence")
      .select("player_id, players(name)")
      .eq("poll_id", poll.poll_id),
  ]).then(([playersRes, usedRowsRes, optionsRes, myVotesRes, allVotesRes, absencesRes]) => {
    const safeAllPlayers = playersRes.data ?? [];
    const usedRows = usedRowsRes.data ?? [];
    const options = optionsRes.data ?? [];
    const myVotes = myVotesRes.data ?? [];
    const allVotes = allVotesRes.data ?? [];
    const absences = absencesRes.data ?? [];

    const absentPlayers = absences.map((a: any) => ({
      player_id: a.player_id,
      name: a.players?.name ?? "Sconosciuto",
    }));

    const isAbsent = user ? absences.some((a) => a.player_id === user.id) : false;

    const usedSet = new Set<string>(
      usedRows.map((r) => r.player_id).filter(Boolean)
    );

    // chosenPlayerId logic
    const firstWithPlayer = myVotes.find((v) => v.player_id);
    let chosenPlayerId = firstWithPlayer?.player_id ?? null;

    // counts
    const counts: Record<number, number> = {};
    for (const v of allVotes)
      if (v.choice === "yes")
        counts[v.option_id] = (counts[v.option_id] ?? 0) + 1;

    const availablePlayers = safeAllPlayers.filter(
      (p) => p.player_id === chosenPlayerId || !usedSet.has(p.player_id)
    );

    return {
      options,
      counts,
      myVotes,
      chosenPlayerId,
      players: availablePlayers,
      absentPlayers,
      isAbsent,
    };
  });

  return {
    poll,
    recentPolls,
    session,
    isLogged: !!user,
    canVote: poll.status === "open",
    streamed: {
      pollData: pollDataPromise,
    },
  };
};
