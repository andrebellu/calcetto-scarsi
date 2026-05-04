<script lang="ts">
    export let match: any;

    const itDate = new Intl.DateTimeFormat("it-IT", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
    });

    function formatDate(d: string | null | undefined) {
        if (!d) return "";
        const dt = new Date(d);
        return Number.isFinite(dt.getTime()) ? itDate.format(dt) : d;
    }

    function getTeamPlayers(players: any[], team: string) {
        return (Array.isArray(players) ? players : []).filter(
            (p) => p.team === team,
        );
    }

    $: blue = getTeamPlayers(match.player_match, "blu");
    $: red = getTeamPlayers(match.player_match, "rossi");
    $: blueScore = Number(match.team_blue_score ?? 0);
    $: redScore = Number(match.team_red_score ?? 0);
    $: isDraw = blueScore === redScore;
    $: blueWins = blueScore > redScore;
    $: redWins = redScore > blueScore;
</script>

<div
    class="rounded-2xl border bg-card overflow-hidden transition-shadow hover:shadow-md"
>
    <!-- Top bar: meta info + punteggio -->
    <div
        class="flex items-center justify-between gap-4 px-4 py-3 border-b bg-muted/20"
    >
        <!-- Meta -->
        <div class="flex items-center gap-2 min-w-0 flex-1">
            <div class="min-w-0">
                <p class="font-semibold text-sm truncate">{match.luogo}</p>
                <p class="text-xs text-muted-foreground">
                    {formatDate(match.match_date)}
                </p>
                {#if match.season}
                    <span
                        class="shrink-0 text-[0.5rem] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary-700 dark:text-primary-300"
                    >
                        {match.season}
                    </span>
                {/if}
            </div>
        </div>

        <!-- Punteggio centrale -->
        <div class="flex items-center gap-2 shrink-0">
            <div class="flex flex-col items-center">
                <span
                    class="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-1"
                    >Blu</span
                >
                <span
                    class="inline-flex items-center justify-center w-10 h-9 rounded-lg font-bold text-lg
          {blueWins
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'}"
                >
                    {blueScore}
                </span>
            </div>
            <span class="text-muted-foreground font-bold text-base pb-0.5"
                >–</span
            >
            <div class="flex flex-col items-center">
                <span
                    class="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1"
                    >Rossi</span
                >
                <span
                    class="inline-flex items-center justify-center w-10 h-9 rounded-lg font-bold text-lg
          {redWins
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'}"
                >
                    {redScore}
                </span>
            </div>
        </div>
    </div>

    <!-- Giocatori -->
    <div class="grid grid-cols-2 divide-x">
        <!-- Blu -->
        <div class="p-3 space-y-1">
            {#each blue as player}
                <div
                    class="flex items-center justify-between gap-2 text-sm py-0.5"
                >
                    <span class="truncate text-foreground font-medium"
                        >{player.players?.name ?? player.name}</span
                    >
                    <div class="flex items-center gap-1 shrink-0">
                        {#if Number(player.goals) > 0}
                            <span
                                class="text-xs font-semibold text-blue-600 dark:text-blue-400"
                            >
                                ⚽ {player.goals}
                            </span>
                        {/if}
                        {#if Number(player.autogol) > 0}
                            <span class="text-xs font-semibold text-red-500">
                                ✗ {player.autogol}
                            </span>
                        {/if}
                    </div>
                </div>
            {/each}
            {#if blue.length === 0}
                <p class="text-xs text-muted-foreground italic">
                    Nessun giocatore
                </p>
            {/if}
        </div>

        <!-- Rossi -->
        <div class="p-3 space-y-1">
            {#each red as player}
                <div
                    class="flex items-center justify-between gap-2 text-sm py-0.5"
                >
                    <span class="truncate text-foreground font-medium"
                        >{player.players?.name ?? player.name}</span
                    >
                    <div class="flex items-center gap-1 shrink-0">
                        {#if Number(player.goals) > 0}
                            <span
                                class="text-xs font-semibold text-red-600 dark:text-red-400"
                            >
                                ⚽ {player.goals}
                            </span>
                        {/if}
                        {#if Number(player.autogol) > 0}
                            <span class="text-xs font-semibold text-blue-500">
                                ✗ {player.autogol}
                            </span>
                        {/if}
                    </div>
                </div>
            {/each}
            {#if red.length === 0}
                <p class="text-xs text-muted-foreground italic">
                    Nessun giocatore
                </p>
            {/if}
        </div>
    </div>

    <!-- Footer: pareggio o MVP/SVP -->
    {#if isDraw || match.mvpPlayers?.length || match.svpPlayers?.length}
        <div
            class="px-4 py-2 border-t bg-muted/10 flex items-center gap-3 flex-wrap text-xs text-muted-foreground"
        >
            {#if isDraw}
                <span class="font-medium">Pareggio</span>
            {/if}
            {#if match.mvpPlayers?.length}
                <span>
                    🏆 <span class="font-semibold text-foreground"
                        >{match.mvpPlayers
                            .map((p: any) => p.name)
                            .join(", ")}</span
                    >
                    <span class="text-muted-foreground"
                        >({match.mvpGoals} gol)</span
                    >
                </span>
            {/if}
            {#if match.svpPlayers?.length}
                <span>
                    💪 <span class="font-semibold text-foreground"
                        >{match.svpPlayers
                            .map((p: any) => p.name)
                            .join(", ")}</span
                    >
                    <span class="text-muted-foreground"
                        >({match.svpGoals} gol)</span
                    >
                </span>
            {/if}
        </div>
    {/if}
</div>
