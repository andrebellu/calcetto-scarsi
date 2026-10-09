// Stato "operativo" della home: risponde a "che cosa devo fare adesso?".
// Funzione pura: il loader raccoglie i dati, qui si decide cosa mostrare.

import { countYesVotes, rankPollOptions, type PollOptionLike } from './fixture';

/** Giocatori necessari per una partita (stessa soglia usata dalle notifiche push). */
export const PLAYERS_NEEDED = 8;

export type HomeFixture = {
  fixture_id: number;
  poll_id: number | null;
  match_date: string | null;
  time_of_day: string | null;
  luogo: string | null;
  created_at: string;
};

export type HomePoll = {
  poll_id: number;
  title: string | null;
  status: string | null;
  created_at: string;
};

export type HomeOption = PollOptionLike & { luogo: string | null };

export type HomeVote = { option_id: number; choice: string | null; player_id: string | null };

export type MyFixtureRole = 'A' | 'B' | 'P' | null;

export type HomeStatus =
  | {
      kind: 'match';
      fixture_id: number;
      match_date: string | null;
      time_of_day: string | null;
      luogo: string | null;
      /** Ruolo dell'utente se la sua identità è nota, altrimenti `unknown`. */
      me: { known: false } | { known: true; name: string | null; team: MyFixtureRole };
    }
  | {
      kind: 'poll';
      poll_id: number;
      title: string | null;
      hasVoted: boolean;
      respondents: number;
      regularPlayers: number;
      best: {
        option_id: number;
        match_date: string | null;
        time_of_day: string | null;
        luogo: string | null;
        yes: number;
        missing: number;
      } | null;
      optionsAtQuota: number;
    }
  | { kind: 'idle' };

export type HomeStatusInput = {
  fixture: HomeFixture | null;
  openPoll: HomePoll | null;
  options: HomeOption[];
  votes: HomeVote[];
  myVotesCount: number;
  regularPlayers: number;
  me: { known: false } | { known: true; name: string | null; team: MyFixtureRole };
};

/**
 * Un sondaggio aperto più recente della convocazione ha la precedenza:
 * significa che si sta già organizzando la partita successiva.
 */
export function shouldShowPoll(fixture: HomeFixture | null, openPoll: HomePoll | null): boolean {
  if (!openPoll) return false;
  if (!fixture) return true;
  return new Date(openPoll.created_at).getTime() > new Date(fixture.created_at).getTime();
}

export function buildHomeStatus(input: HomeStatusInput): HomeStatus {
  const { fixture, openPoll } = input;

  if (openPoll && shouldShowPoll(fixture, openPoll)) {
    const counts = countYesVotes(input.votes);
    const ranked = rankPollOptions(input.options, counts);
    const top = ranked[0];
    const yes = top ? counts.get(top.option_id) ?? 0 : 0;
    const respondents = new Set(input.votes.map((v) => v.player_id).filter(Boolean)).size;

    return {
      kind: 'poll',
      poll_id: openPoll.poll_id,
      title: openPoll.title,
      hasVoted: input.myVotesCount > 0,
      respondents,
      regularPlayers: input.regularPlayers,
      best: top
        ? {
            option_id: top.option_id,
            match_date: top.match_date,
            time_of_day: top.time_of_day,
            luogo: top.luogo,
            yes,
            missing: Math.max(0, PLAYERS_NEEDED - yes)
          }
        : null,
      optionsAtQuota: input.options.filter((o) => (counts.get(o.option_id) ?? 0) >= PLAYERS_NEEDED).length
    };
  }

  if (fixture) {
    return {
      kind: 'match',
      fixture_id: fixture.fixture_id,
      match_date: fixture.match_date,
      time_of_day: fixture.time_of_day,
      luogo: fixture.luogo,
      me: input.me
    };
  }

  return { kind: 'idle' };
}

/** Nome del cookie con l'identità del giocatore per un sondaggio (come in /poll). */
export function identityCookieName(pollId: number, userId: string | null | undefined) {
  return userId ? `poll_identity_${pollId}_${userId}` : `poll_identity_${pollId}_anon`;
}

/** Nomi squadra mostrati in UI (A = blu, B = rossa), come nella gestione squadre. */
export const TEAM_LABELS = { A: 'Finocchi', B: 'Pomodori' } as const;

/** "2026-10-10" → Date locale (evita lo slittamento di giorno dovuto a UTC). */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

/** "21:00:00" → "21:00"; testo libero lasciato com'è; vuoto → null. */
export function formatTimeOfDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : value.trim() || null;
}
