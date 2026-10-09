// Logica di dominio pura (senza Supabase) per sondaggi e convocazioni.
// Tenerla qui permette di riusarla negli endpoint e di testarla con Vitest.

import { mulberry32, shuffle } from '$lib/utils/random';

export const TEAMS = ['A', 'B', 'P'] as const;
export type Team = (typeof TEAMS)[number];

export const VOTE_CHOICES = ['yes', 'no'] as const;
export type VoteChoice = (typeof VOTE_CHOICES)[number];

export type PollOptionLike = {
  option_id: number;
  match_date: string | null;
  time_of_day: string | null;
};

export type FixturePlayerInput = {
  player_id: string;
  team: Team;
  is_goalkeeper: boolean;
};

export type FixturePlayerRow = FixturePlayerInput & {
  fixture_id: number;
  gk_order?: number;
};

export class ValidationError extends Error {}

export function isTeam(value: unknown): value is Team {
  return typeof value === 'string' && (TEAMS as readonly string[]).includes(value);
}

export function isVoteChoice(value: unknown): value is VoteChoice {
  return typeof value === 'string' && (VOTE_CHOICES as readonly string[]).includes(value);
}

/** Converte un parametro di rotta in un id intero positivo, oppure null. */
export function parsePositiveInt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Conta i voti "yes" per opzione. */
export function countYesVotes(votes: Array<{ option_id: number; choice?: string | null }>) {
  const counts = new Map<number, number>();
  for (const v of votes) {
    if (v.choice !== undefined && v.choice !== 'yes') continue;
    counts.set(v.option_id, (counts.get(v.option_id) ?? 0) + 1);
  }
  return counts;
}

/**
 * Ordina le opzioni: più voti "yes", poi data più vicina, poi orario, poi id.
 * Non modifica l'array in ingresso.
 */
export function rankPollOptions<T extends PollOptionLike>(options: T[], counts: Map<number, number>): T[] {
  return options.slice().sort((a, b) => {
    const ca = counts.get(a.option_id) ?? 0;
    const cb = counts.get(b.option_id) ?? 0;
    if (cb !== ca) return cb - ca;
    const da = a.match_date ?? '';
    const db = b.match_date ?? '';
    if (da !== db) return da < db ? -1 : 1;
    const ta = a.time_of_day ?? '';
    const tb = b.time_of_day ?? '';
    if (ta !== tb) return ta < tb ? -1 : 1;
    return a.option_id - b.option_id;
  });
}

export function pickWinnerOptionId(
  options: PollOptionLike[],
  votes: Array<{ option_id: number; choice?: string | null }>
): number | null {
  return rankPollOptions(options, countYesVotes(votes))[0]?.option_id ?? null;
}

/**
 * Valida e normalizza la lista giocatori ricevuta dal client.
 * - rifiuta squadre diverse da A/B/P e player_id mancanti;
 * - rifiuta lo stesso giocatore assegnato a due squadre diverse;
 * - elimina i duplicati identici.
 */
export function normalizeFixturePlayers(input: unknown): FixturePlayerInput[] {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) throw new ValidationError('players deve essere un array');

  const byId = new Map<string, FixturePlayerInput>();
  for (const raw of input) {
    const p = raw as Partial<Record<keyof FixturePlayerInput, unknown>> | null;
    const playerId = typeof p?.player_id === 'string' ? p.player_id.trim() : '';
    if (!playerId) throw new ValidationError('player_id mancante');
    if (!isTeam(p?.team)) throw new ValidationError(`Squadra non valida per ${playerId}`);

    const existing = byId.get(playerId);
    if (existing && existing.team !== p.team) {
      throw new ValidationError(`Giocatore ${playerId} assegnato a più squadre`);
    }
    byId.set(playerId, {
      player_id: playerId,
      team: p.team,
      is_goalkeeper: !!p.is_goalkeeper
    });
  }
  return Array.from(byId.values());
}

/**
 * Prepara le righe di fixture_player con un ordine portieri deterministico
 * (stesso fixture_id → stesso ordine) per le squadre A e B.
 */
export function buildFixturePlayerRows(fixtureId: number, players: FixturePlayerInput[]): FixturePlayerRow[] {
  const rows: FixturePlayerRow[] = players.map((p) => ({ fixture_id: fixtureId, ...p }));
  const rowsA = rows.filter((r) => r.team === 'A');
  const rowsB = rows.filter((r) => r.team === 'B');
  shuffle(rowsA, mulberry32(fixtureId * 1337 + 65)).forEach((r, i) => (r.gk_order = i + 1));
  shuffle(rowsB, mulberry32(fixtureId * 1337 + 66)).forEach((r, i) => (r.gk_order = i + 1));
  return rows;
}

/** Rimuove duplicati mantenendo il primo elemento per ogni player_id. */
export function uniqueByPlayerId<T extends { player_id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.player_id)) return false;
    seen.add(r.player_id);
    return true;
  });
}
