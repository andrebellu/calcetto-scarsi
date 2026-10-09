import { describe, expect, it } from "vitest";
import {
  ValidationError,
  buildFixturePlayerRows,
  countYesVotes,
  isVoteChoice,
  normalizeFixturePlayers,
  parsePositiveInt,
  pickWinnerOptionId,
  rankPollOptions,
  uniqueByPlayerId,
} from "./fixture";

const opt = (option_id: number, match_date: string | null, time_of_day: string | null = null) => ({
  option_id,
  match_date,
  time_of_day,
});

describe("parsePositiveInt", () => {
  it("accetta interi positivi", () => {
    expect(parsePositiveInt("12")).toBe(12);
    expect(parsePositiveInt(3)).toBe(3);
  });
  it("rifiuta valori non validi", () => {
    for (const v of ["0", "-1", "1.5", "abc", "", null, undefined, NaN]) {
      expect(parsePositiveInt(v)).toBeNull();
    }
  });
});

describe("isVoteChoice", () => {
  it("accetta solo yes/no", () => {
    expect(isVoteChoice("yes")).toBe(true);
    expect(isVoteChoice("no")).toBe(true);
    expect(isVoteChoice("maybe")).toBe(false);
    expect(isVoteChoice(undefined)).toBe(false);
  });
});

describe("scelta della data vincente", () => {
  it("conta solo i voti yes", () => {
    const counts = countYesVotes([
      { option_id: 1, choice: "yes" },
      { option_id: 1, choice: "no" },
      { option_id: 2, choice: "yes" },
    ]);
    expect(counts.get(1)).toBe(1);
    expect(counts.get(2)).toBe(1);
  });

  it("vince l'opzione con più voti", () => {
    const options = [opt(1, "2026-10-10"), opt(2, "2026-10-12")];
    const votes = [
      { option_id: 2, choice: "yes" },
      { option_id: 2, choice: "yes" },
      { option_id: 1, choice: "yes" },
    ];
    expect(pickWinnerOptionId(options, votes)).toBe(2);
  });

  it("a parità vince la data più vicina, poi l'orario, poi l'id", () => {
    const options = [opt(3, "2026-10-12", "21:00"), opt(2, "2026-10-10", "21:00"), opt(1, "2026-10-10", "20:00")];
    expect(rankPollOptions(options, new Map()).map((o) => o.option_id)).toEqual([1, 2, 3]);
  });

  it("non modifica l'array originale", () => {
    const options = [opt(2, "2026-10-12"), opt(1, "2026-10-10")];
    rankPollOptions(options, new Map());
    expect(options.map((o) => o.option_id)).toEqual([2, 1]);
  });

  it("restituisce null senza opzioni", () => {
    expect(pickWinnerOptionId([], [])).toBeNull();
  });
});

describe("normalizeFixturePlayers", () => {
  it("restituisce [] se players è assente", () => {
    expect(normalizeFixturePlayers(undefined)).toEqual([]);
  });

  it("rifiuta input che non è un array", () => {
    expect(() => normalizeFixturePlayers({})).toThrow(ValidationError);
  });

  it("rifiuta squadre non valide", () => {
    expect(() => normalizeFixturePlayers([{ player_id: "a", team: "C" }])).toThrow(ValidationError);
  });

  it("rifiuta player_id mancanti", () => {
    expect(() => normalizeFixturePlayers([{ team: "A" }])).toThrow(ValidationError);
  });

  it("rifiuta lo stesso giocatore in due squadre", () => {
    expect(() =>
      normalizeFixturePlayers([
        { player_id: "a", team: "A" },
        { player_id: "a", team: "B" },
      ]),
    ).toThrow(/più squadre/);
  });

  it("elimina i duplicati identici e normalizza is_goalkeeper", () => {
    expect(
      normalizeFixturePlayers([
        { player_id: "a", team: "A" },
        { player_id: "a", team: "A", is_goalkeeper: 1 },
        { player_id: "b", team: "P" },
      ]),
    ).toEqual([
      { player_id: "a", team: "A", is_goalkeeper: true },
      { player_id: "b", team: "P", is_goalkeeper: false },
    ]);
  });
});

describe("buildFixturePlayerRows", () => {
  const players = [
    { player_id: "a", team: "A" as const, is_goalkeeper: false },
    { player_id: "b", team: "A" as const, is_goalkeeper: false },
    { player_id: "c", team: "B" as const, is_goalkeeper: false },
    { player_id: "d", team: "P" as const, is_goalkeeper: false },
  ];

  it("assegna gk_order 1..n per squadra e nessuno alle riserve", () => {
    const rows = buildFixturePlayerRows(42, players);
    const orderA = rows.filter((r) => r.team === "A").map((r) => r.gk_order).sort();
    expect(orderA).toEqual([1, 2]);
    expect(rows.find((r) => r.team === "B")?.gk_order).toBe(1);
    expect(rows.find((r) => r.team === "P")?.gk_order).toBeUndefined();
    expect(rows.every((r) => r.fixture_id === 42)).toBe(true);
  });

  it("è deterministico per lo stesso fixture_id", () => {
    const a = buildFixturePlayerRows(7, players);
    const b = buildFixturePlayerRows(7, players);
    expect(a).toEqual(b);
  });
});

describe("uniqueByPlayerId", () => {
  it("mantiene la prima occorrenza", () => {
    expect(uniqueByPlayerId([{ player_id: "a", n: 1 }, { player_id: "a", n: 2 }])).toEqual([{ player_id: "a", n: 1 }]);
  });
});
