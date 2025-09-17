<script>
  export let match;

  /**
   * @param {Array<{team: string, is_winner: boolean, goals: number, autogol: number, players: {name: string}}>} players
   * @param {string} team
   */
  function getTeamPlayers(players, team) {
    return players.filter((p) => p.team === team);
  }

  // Per badge vincitore squadra
  $: bluWinners = getTeamPlayers(match.player_match, "blu").some(
    (p) => p.is_winner
  );
  $: rossiWinners = getTeamPlayers(match.player_match, "rossi").some(
    (p) => p.is_winner
  );
</script>

<div
  class="rounded-3xl shadow-xl border border-white/30 bg-white/20 backdrop-blur-lg p-6 max-w-2xl mx-auto"
>
  <div
    class="flex flex-col md:flex-row md:justify-between md:items-center mb-4"
  >
    <div>
      <div class="text-sm text-gray-500">Partita #{match.match_number}</div>
      <div class="text-lg font-semibold text-gray-900">{match.luogo}</div>
      <div class="text-xs text-gray-400">{match.match_date}</div>
    </div>
    <div class="flex items-center gap-4 mt-4 md:mt-0">
      <div class="flex flex-col items-center">
        <span class="text-blue-500 font-bold text-xl">Blu</span>
        <span class="flex items-center gap-2 mt-1">
          <span
            class="inline-flex items-center justify-center w-16 h-8 bg-blue-100 text-blue-700 font-bold rounded text-lg shadow"
          >
            {match.team_blue_score}
          </span>
        </span>
      </div>
      <span class="text-xl font-bold text-gray-500">-</span>
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
    <div
      class="bg-gradient-to-tr from-blue-100/60 via-blue-200/60 to-blue-50/80 rounded-2xl p-4"
    >
      <div class="flex flex-row items-center text-center">
        <h2 class="text-blue-500 font-semibold flex items-center gap-2">
          Squadra Blu
        </h2>
        {#if bluWinners}
          <span
            class="ml-2 bg-green-100 text-green-700 px-3 py-1 rounded text-xs font-semibold shadow"
          >
            Vincitori
          </span>
        {/if}
      </div>
      <ul class="divide-y divide-blue-200">
        {#each getTeamPlayers(match.player_match, "blu") as player}
          <li class="py-2 flex items-center justify-between">
            <span class="font-medium text-blue-700">{player.players.name}</span>
            <span class="flex items-center gap-2">
              <span
                class="inline-flex items-center justify-center w-14 h-8 bg-blue-100 text-blue-700 font-bold rounded text-base shadow"
              >
                {player.goals} gol
              </span>
              {#if player.autogol > 0}
                <span
                  class="inline-flex items-center justify-center w-14 h-8 bg-red-100 text-red-700 font-bold rounded text-base shadow"
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
    <div
      class="bg-gradient-to-tr from-red-100/70 via-red-300/60 to-red-50/80 rounded-2xl p-4"
    >
      <div class="flex flex-row items-center text-center">
        <h2 class="text-red-500 font-semibold flex items-center gap-2">
          Squadra Rossi
        </h2>
        {#if rossiWinners}
          <span
            class="ml-2 bg-green-100 text-green-700 px-3 py-1 rounded text-xs font-semibold shadow"
          >
            Vincitori
          </span>
        {/if}
      </div>
      <ul class="divide-y divide-red-200">
        {#each getTeamPlayers(match.player_match, "rossi") as player}
          <li class="py-2 flex items-center justify-between">
            <span class="font-medium text-red-700">{player.players.name}</span>
            <span class="flex items-center gap-2">
              <span
                class="inline-flex items-center justify-center w-14 h-8 bg-red-100 text-red-700 font-bold rounded text-base shadow"
              >
                {player.goals} gol
              </span>
              {#if player.autogol > 0}
                <span
                  class="inline-flex items-center justify-center w-14 h-8 bg-blue-100 text-blue-700 font-bold rounded text-base shadow"
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
