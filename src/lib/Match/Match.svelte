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

<div class="bg-surface-200 rounded-3xl shadow-xl p-6 border border-primary-200">
    <div
        class="flex flex-col md:flex-row md:justify-between md:items-center mb-4"
    >
        <div>
            <div class="text-sm text-surface-500">
                Partita #{match.match_number}
            </div>
            <div class="text-lg font-semibold text-surface-900">
                {match.luogo}
            </div>
            <div class="text-xs text-surface-400">{match.match_date}</div>
        </div>
        <div class="flex items-center gap-4 mt-4 md:mt-0">
            <div class="flex flex-col items-center">
                <span class="text-primary-400 font-bold text-xl">Blu</span>
                <span class="flex items-center gap-2 mt-1">
                    <span
                        class="inline-flex items-center justify-center w-16 h-8 bg-primary-100 text-primary-500 font-bold rounded text-lg"
                        >{match.team_blue_score}</span
                    >
                </span>
            </div>
            <span class="text-xl font-bold text-surface-600">-</span>
            <div class="flex flex-col items-center">
                <span class="text-secondary-400 font-bold text-xl">Rossi</span>
                <span class="flex items-center gap-2 mt-1">
                    <span
                        class="inline-flex items-center justify-center w-16 h-8 bg-secondary-100 text-secondary-500 font-bold rounded text-lg"
                        >{match.team_red_score}</span
                    >
                </span>
            </div>
        </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <!-- Squadra Blu -->
        <div>
            <div class="flex flex-row items-center text-center">
                <h2
                    class="text-primary-400 font-semibold flex items-center gap-2"
                >
                    Squadra Blu
                </h2>
                {#if bluWinners}
                    <span
                        class="ml-2 bg-green-100 text-green-700 px-3 py-1 rounded text-xs font-semibold"
                        >Vincitori</span
                    >
                {/if}
            </div>
            <ul class="divide-y divide-surface-300">
                {#each getTeamPlayers(match.player_match, "blu") as player}
                    <li class="py-2 flex items-center justify-between">
                        <span class="font-medium text-primary-700"
                            >{player.players.name}</span
                        >
                        <span class="flex items-center gap-2">
                            <span
                                class="inline-flex items-center justify-center w-14 h-8 bg-primary-100 text-primary-700 font-bold rounded text-base"
                                >{player.goals} gol</span
                            >
                            {#if player.autogol > 0}
                                <span
                                    class="inline-flex items-center justify-center w-14 h-8 bg-secondary-100 text-secondary-700 font-bold rounded text-base"
                                    >{player.autogol} aut.</span
                                >
                            {/if}
                        </span>
                    </li>
                {/each}
            </ul>
        </div>
        <!-- Squadra Rossi -->
        <div>
            <div class="flex flex-row items-center text-center">
                <h2
                    class="text-secondary-400 font-semibold flex items-center gap-2"
                >
                    Squadra Rossi
                </h2>
                {#if rossiWinners}
                    <span
                        class="ml-2 bg-green-100 text-green-700 px-3 py-1 rounded text-xs font-semibold"
                        >Vincitori</span
                    >
                {/if}
            </div>
            <ul class="divide-y divide-surface-300">
                {#each getTeamPlayers(match.player_match, "rossi") as player}
                    <li class="py-2 flex items-center justify-between">
                        <span class="font-medium text-secondary-700"
                            >{player.players.name}</span
                        >
                        <span class="flex items-center gap-2">
                            <span
                                class="inline-flex items-center justify-center w-14 h-8 bg-secondary-500 text-white font-bold rounded text-base border border-secondary-700"
                                >{player.goals} gol</span
                            >
                            {#if player.autogol > 0}
                                <span
                                    class="inline-flex items-center justify-center w-14 h-8 bg-secondary-700 text-white font-bold rounded text-base border border-secondary-900"
                                    >{player.autogol} aut.</span
                                >
                            {/if}
                        </span>
                    </li>
                {/each}
            </ul>
        </div>
    </div>
</div>
