<script lang="ts">
  import Award from "@lucide/svelte/icons/award";
  import CrownIcon from "@lucide/svelte/icons/crown";
  import { Badge } from "$lib/components/ui/badge/index.js";

  export let match;

  /**
   * @param {Array<{team: string, is_winner: boolean, goals: number, autogol: number, players: {name?: string, player_id?: string|number}}>} players
   * @param {string} team
   */
  function getTeamPlayers(players, team) {
    return (Array.isArray(players) ? players : []).filter(
      (p) => p.team === team
    );
  }

  // Vincitori (badge squadra)
  $: bluWinners = getTeamPlayers(match.player_match, "blu").some(
    (p) => p.is_winner
  );
  $: rossiWinners = getTeamPlayers(match.player_match, "rossi").some(
    (p) => p.is_winner
  );

  // Helper robusto per identificare il giocatore (usa id se presente, fallback al nome)
  function pid(pm: any) {
    return String(pm?.players?.player_id ?? pm?.players?.name ?? "");
  }

  // Determina squadra vincente/perdente dalla scoreboard
  $: winnerTeam =
    Number(match.team_blue_score ?? 0) > Number(match.team_red_score ?? 0)
      ? "blu"
      : Number(match.team_red_score ?? 0) > Number(match.team_blue_score ?? 0)
        ? "rossi"
        : null;

  $: loserTeam = winnerTeam ? (winnerTeam === "blu" ? "rossi" : "blu") : null;

  // Liste per squadra
  $: bluList = getTeamPlayers(match.player_match, "blu");
  $: rossiList = getTeamPlayers(match.player_match, "rossi");

  // Calcola i top scorer per una lista squadra
  function topSet(list: any[]) {
    const maxGoals = (list ?? []).reduce(
      (mx, pm) => Math.max(mx, Number(pm?.goals || 0)),
      0
    );
    const ids =
      maxGoals >= 0
        ? new Set(
            (list ?? [])
              .filter((pm) => Number(pm?.goals || 0) === maxGoals)
              .map((pm) => pid(pm))
          )
        : new Set<string>();
    return { maxGoals, ids };
  }

  // Set di MVP/SVP per evidenziare i nomi
  $: mvpSet =
    winnerTeam === "blu"
      ? topSet(bluList).ids
      : winnerTeam === "rossi"
        ? topSet(rossiList).ids
        : new Set();

  $: svpSet =
    loserTeam === "blu"
      ? topSet(bluList).ids
      : loserTeam === "rossi"
        ? topSet(rossiList).ids
        : new Set();
</script>

<div
  class="rounded-3xl shadow-xl bg-accent/20 backdrop-blur-lg p-6 max-w-7xl mx-auto"
>
  <div
    class="flex flex-col md:flex-row md:justify-between md:items-center mb-4"
  >
    <div>
      <div class="text-sm text-gray-500">Partita #{match.match_id}</div>
      <div class="text-lg font-semibold">{match.luogo}</div>
      <div class="text-xs text-gray-400">{match.match_date}</div>
    </div>
    <div class="flex items-center gap-2 mt-4 md:mt-0 justify-center">
      <div class="flex flex-col items-center">
        <span class="text-blue-500 font-bold text-xl">Blu</span>
        <span class="flex items-center gap-2 mt-1">
          <span
            class="inline-flex items-center justify-center w-16 h-8 bg-blue-100 text-blue-700 font-bold rounded text-lg shadow"
          >
            {match.team_blue_score}
          </span>
          <span class="text-xl font-bold text-gray-500">-</span>
        </span>
      </div>
      <div class="flex flex-col items-center">
        <span class="text-red-500 font-bold text-xl">Rossi</span>
        <span class="flex items-center gap-2 mt-1">
          <span
            class="inline-flex items-center justify-center w-16 h-8 bg-red-100 text-red-700 font-bold rounded text-lg shadow"
          >
            {match.team_red_score}
          </span>
        </span>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
    <!-- Squadra Blu -->
    <div class="rounded-2xl p-4 bg-accent/50 border border-blue-300">
      <div class="flex flex-row items-center text-center">
        <h2 class="text-blue-300 font-bold flex items-center gap-2 text-2xl">
          Squadra Blu
          {#if bluWinners}
            <span
              class="ml-2 bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-semibold shadow"
            >
              Vincitori
            </span>
          {/if}
        </h2>
      </div>
      <ul class="divide-y divide-blue-200">
        {#each getTeamPlayers(match.player_match, "blu") as player}
          <li class="py-2 flex items-center justify-between">
            <span class="font-medium text-blue-300 flex items-center gap-1.5">
              {player.players.name}
            </span>
            <span class="flex items-center gap-2">
              <span
                class="inline-flex items-center justify-center min-w-14 h-8 bg-blue-100 text-blue-700 font-bold rounded text-base shadow"
              >
                {player.goals} gol
              </span>
              {#if player.autogol > 0}
                <span
                  class="inline-flex items-center justify-center min-w-14 h-8 bg-red-100 text-red-700 font-bold rounded text-base shadow"
                >
                  {player.autogol} aut.
                </span>
              {/if}
            </span>
          </li>
        {/each}
      </ul>
    </div>

    <!-- Squadra Rossi -->
    <div class="rounded-2xl p-4 bg-accent/50 border border-red-400">
      <div class="flex flex-row items-center text-center">
        <h2 class="text-red-400 font-bold flex items-center gap-2 text-2xl">
          Squadra Rossi
        </h2>
        {#if rossiWinners}
          <span
            class="ml-2 bg-red-100 text-red-500 px-3 py-1 rounded text-xs font-semibold shadow"
          >
            Vincitori
          </span>
        {/if}
      </div>
      <ul class="divide-y divide-red-200">
        {#each getTeamPlayers(match.player_match, "rossi") as player}
          <li class="py-2 flex items-center justify-between">
            <span class="font-medium text-red-400 flex items-center gap-1.5">
              {player.players.name}
            </span>
            <span class="flex items-center gap-2">
              <span
                class="inline-flex items-center justify-center min-w-14 h-8 bg-red-100 text-red-700 font-bold rounded text-base shadow"
              >
                {player.goals} gol
              </span>
              {#if player.autogol > 0}
                <span
                  class="inline-flex items-center justify-center min-w-14 h-8 bg-blue-100 text-blue-700 font-bold rounded text-base shadow"
                >
                  {player.autogol} aut.
                </span>
              {/if}
            </span>
          </li>
        {/each}
      </ul>
    </div>
  </div>
</div>
