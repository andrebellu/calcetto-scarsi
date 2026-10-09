import { describe, expect, it } from "vitest";
import {
  PLAYERS_NEEDED,
  buildHomeStatus,
  formatTimeOfDay,
  identityCookieName,
  parseLocalDate,
  shouldShowPoll,
  type HomeStatusInput,
} from "./home";

const fixture = {
  fixture_id: 10,
  poll_id: 3,
  match_date: "2026-10-15",
  time_of_day: "21:00:00",
  luogo: "Campo 1",
  created_at: "2026-10-01T10:00:00Z",
};
const poll = { poll_id: 4, title: "Settimana prossima", status: "open", created_at: "2026-10-05T10:00:00Z" };

const base: HomeStatusInput = {
  fixture: null,
  openPoll: null,
  options: [],
  votes: [],
  myVotesCount: 0,
  regularPlayers: 14,
  me: { known: false },
};

describe("shouldShowPoll", () => {
  it("mostra il sondaggio se non c'è convocazione", () => {
    expect(shouldShowPoll(null, poll)).toBe(true);
  });
  it("mostra il sondaggio solo se più recente della convocazione", () => {
    expect(shouldShowPoll(fixture, poll)).toBe(true);
    expect(shouldShowPoll(fixture, { ...poll, created_at: "2026-09-01T00:00:00Z" })).toBe(false);
  });
});

describe("buildHomeStatus", () => {
  it("idle senza sondaggi né partite", () => {
    expect(buildHomeStatus(base).kind).toBe("idle");
  });

  it("partita confermata con ruolo dell'utente", () => {
    const s = buildHomeStatus({ ...base, fixture, me: { known: true, name: "Andrea", team: "A" } });
    expect(s).toMatchObject({ kind: "match", fixture_id: 10, me: { known: true, team: "A" } });
  });

  it("sondaggio: data in testa, mancanti e risposte", () => {
    const options = [
      { option_id: 1, match_date: "2026-10-20", time_of_day: null, luogo: "A" },
      { option_id: 2, match_date: "2026-10-21", time_of_day: null, luogo: "B" },
    ];
    const votes = [
      ...Array.from({ length: 6 }, (_, i) => ({ option_id: 2, choice: "yes", player_id: `p${i}` })),
      { option_id: 1, choice: "yes", player_id: "p0" },
      { option_id: 1, choice: "no", player_id: "p9" },
    ];
    const s = buildHomeStatus({ ...base, fixture, openPoll: poll, options, votes, myVotesCount: 1 });
    expect(s.kind).toBe("poll");
    if (s.kind !== "poll") return;
    expect(s.hasVoted).toBe(true);
    expect(s.best).toMatchObject({ option_id: 2, yes: 6, missing: PLAYERS_NEEDED - 6 });
    expect(s.respondents).toBe(7);
    expect(s.optionsAtQuota).toBe(0);
  });

  it("missing non scende sotto zero", () => {
    const options = [{ option_id: 1, match_date: "2026-10-20", time_of_day: null, luogo: null }];
    const votes = Array.from({ length: 10 }, (_, i) => ({ option_id: 1, choice: "yes", player_id: `p${i}` }));
    const s = buildHomeStatus({ ...base, openPoll: poll, options, votes });
    expect(s.kind === "poll" && s.best?.missing).toBe(0);
    expect(s.kind === "poll" && s.optionsAtQuota).toBe(1);
  });
});

describe("formattazione", () => {
  it("parseLocalDate non slitta di giorno", () => {
    const d = parseLocalDate("2026-10-15")!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 15]);
    expect(parseLocalDate(null)).toBeNull();
    expect(parseLocalDate("boh")).toBeNull();
  });
  it("formatTimeOfDay", () => {
    expect(formatTimeOfDay("21:00:00")).toBe("21:00");
    expect(formatTimeOfDay("9:30")).toBe("09:30");
    expect(formatTimeOfDay("sera")).toBe("sera");
    expect(formatTimeOfDay(null)).toBeNull();
  });
  it("identityCookieName", () => {
    expect(identityCookieName(3, null)).toBe("poll_identity_3_anon");
    expect(identityCookieName(3, "u1")).toBe("poll_identity_3_u1");
  });
});
