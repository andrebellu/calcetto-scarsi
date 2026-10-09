import type { PageServerLoad } from './$types';
import {
  buildHomeStatus,
  identityCookieName,
  type HomeFixture,
  type HomeOption,
  type HomePoll,
  type HomeStatusInput,
  type HomeVote,
  type MyFixtureRole
} from '$lib/domain/home';

export const load: PageServerLoad = async ({ locals, cookies }) => {
  // Client legato alla richiesta: rispetta sessione/cookie e le policy RLS.
  const supabase = locals.supabase;
  const user = locals.user;
  const isAuthenticated = !!user;

  const today = new Date().toISOString().split('T')[0];

  const [
    { count: playersCount },
    { count: tempPlayersCount },
    { data: matches },
    { data: latestFixture },
    { data: openPoll }
  ] = await Promise.all([
    supabase.from('players').select('*', { count: 'exact', head: true }),
    supabase.from('players').select('*', { count: 'exact', head: true }).eq('is_temporary', true),
    supabase.from('matches').select('team_blue_score, team_red_score'),
    supabase
      .from('fixture')
      .select('fixture_id, poll_id, match_date, luogo, time_of_day, status, created_at')
      .eq('status', 'confirmed')
      .gte('match_date', today)
      .order('match_date', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('poll')
      .select('poll_id, title, status, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  const totalGoals = (matches ?? []).reduce(
    (s: number, m: { team_blue_score: number | null; team_red_score: number | null }) =>
      s + (m.team_blue_score || 0) + (m.team_red_score || 0),
    0
  );
  const regularPlayers = Math.max(0, (playersCount ?? 0) - (tempPlayersCount ?? 0));

  const fixture = (latestFixture as HomeFixture | null) ?? null;
  const poll = (openPoll as HomePoll | null) ?? null;

  const input: HomeStatusInput = {
    fixture,
    openPoll: poll,
    options: [],
    votes: [],
    myVotesCount: 0,
    regularPlayers,
    me: { known: false }
  };

  // Dati aggiuntivi solo per lo stato che verrà mostrato.
  const pollIsCurrent = !!poll && (!fixture || new Date(poll.created_at) > new Date(fixture.created_at));

  if (poll && pollIsCurrent) {
    const myPlayerId = cookies.get(identityCookieName(poll.poll_id, user?.id));
    const [{ data: options }, { data: votes }, { count: myVotesCount }] = await Promise.all([
      supabase
        .from('poll_option')
        .select('option_id, match_date, time_of_day, luogo')
        .eq('poll_id', poll.poll_id),
      supabase.from('poll_vote').select('option_id, choice, player_id').eq('poll_id', poll.poll_id),
      myPlayerId
        ? supabase
            .from('poll_vote')
            .select('option_id', { count: 'exact', head: true })
            .eq('poll_id', poll.poll_id)
            .eq('player_id', myPlayerId)
        : supabase
            .from('poll_vote')
            .select('option_id', { count: 'exact', head: true })
            .eq('poll_id', poll.poll_id)
            .eq('voter_token', locals.voterToken)
    ]);
    input.options = (options ?? []) as HomeOption[];
    input.votes = (votes ?? []) as HomeVote[];
    input.myVotesCount = myVotesCount ?? 0;
  } else if (fixture?.poll_id) {
    const myPlayerId = cookies.get(identityCookieName(fixture.poll_id, user?.id));
    if (myPlayerId) {
      const [{ data: row }, { data: player }] = await Promise.all([
        supabase
          .from('fixture_player')
          .select('team')
          .eq('fixture_id', fixture.fixture_id)
          .eq('player_id', myPlayerId)
          .maybeSingle(),
        supabase.from('players').select('name').eq('player_id', myPlayerId).maybeSingle()
      ]);
      input.me = {
        known: true,
        name: (player as { name?: string } | null)?.name ?? null,
        team: ((row as { team?: string } | null)?.team ?? null) as MyFixtureRole
      };
    }
  }

  const home = buildHomeStatus(input);

  return {
    playersCount: playersCount ?? 0,
    totalGoals,
    tempPlayersCount: tempPlayersCount ?? 0,
    totalMatches: matches ? matches.length : 0,
    isAuthenticated,
    home
  };
};
