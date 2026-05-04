<script lang="ts">
    import Card from "$lib/Card/Card.svelte";
    import CardAdd from "$lib/Card/CardAdd.svelte";
    import Navbar from "$lib/Navbar/Navbar.svelte";
    import { fade } from "svelte/transition";
    import { flip } from "svelte/animate";
    import Skeleton from "$lib/components/ui/skeleton/skeleton.svelte";
    import { enhance } from "$app/forms";

    const { data } = $props<{
        data: {
            isAuthenticated: boolean;
            currentUserPlayerId: number | null;
            streamed: {
                players: Promise<
                    Array<{
                        id: number;
                        name: string;
                        is_temporary: boolean;
                        is_claimable: boolean;
                        goals: number;
                        wins: number;
                        matchesPlayed: number;
                        winRate: number;
                        golPerMatch: number;
                    }>
                >;
            };
        };
    }>();

    let isAuthenticated = data.isAuthenticated;
    let players = $state<any[]>([]);
    let showClaimModal = $state(false);
    let availablePlayers = $state<any[]>([]);

    $effect(() => {
        data.streamed.players.then((res) => {
            players = res || [];
            availablePlayers = res.filter((p: any) => p.is_claimable);
            if (
                data.isAuthenticated &&
                !data.currentUserPlayerId &&
                availablePlayers.length > 0
            ) {
                showClaimModal = true;
            }
        });
    });

    let query = $state("");
    let debounced = $state("");
    let showTemporary = $state(true);
    let showFixed = $state(true);

    let t: any;
    $effect(() => {
        const q = query;
        clearTimeout(t);
        t = setTimeout(() => (debounced = q), 250);
        return () => clearTimeout(t);
    });

    const qLower = $derived(debounced.trim().toLowerCase());

    const fixedPlayers = $derived(
        players.filter((p) => {
            if (p.is_temporary) return false;
            if (!qLower) return true;
            return (p.name || "").toLowerCase().includes(qLower);
        }),
    );

    const tempPlayers = $derived(
        players.filter((p) => {
            if (!p.is_temporary) return false;
            if (!qLower) return true;
            return (p.name || "").toLowerCase().includes(qLower);
        }),
    );
</script>

<div class="mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 sm:py-10">
    <Navbar />

    {#if showClaimModal}
        <div
            class="mb-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl"
            transition:fade
        >
            <p class="font-semibold text-amber-800 dark:text-amber-300 mb-1">
                Benvenuto! Chi sei?
            </p>
            <p class="text-sm text-amber-700 dark:text-amber-400 mb-3">
                Collega il tuo account al tuo storico partite.
            </p>
            <form method="POST" action="?/claim" use:enhance class="flex gap-2">
                <select
                    name="playerId"
                    class="flex-1 rounded-lg border border-amber-300 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
                >
                    {#each availablePlayers as player}
                        <option value={player.id}>{player.name}</option>
                    {/each}
                </select>
                <button
                    class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                    Sono io
                </button>
            </form>
        </div>
    {/if}

    <!-- Header -->
    <div class="mb-6 sm:mb-8">
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">Giocatori</h1>
        <p class="text-sm text-muted-foreground mt-1">
            {#await data.streamed.players then p}
                {p?.length ?? 0} giocatori · statistiche aggregate per stagione
            {/await}
        </p>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-wrap gap-2 mb-6 items-center">
        <input
            type="search"
            placeholder="Cerca giocatore…"
            class="h-9 flex-1 min-w-40 rounded-lg border px-3 text-sm bg-background outline-none focus:ring-2 focus:ring-primary"
            bind:value={query}
            aria-label="Cerca giocatore"
        />

        <button
            type="button"
            class="h-9 px-3 rounded-lg text-sm font-medium border transition-colors
        {showFixed
                ? 'bg-primary text-primary-foreground border-primary'
                : 'text-muted-foreground hover:text-foreground'}"
            onclick={() => (showFixed = !showFixed)}
            aria-pressed={showFixed}
        >
            Fissi {#if fixedPlayers.length > 0}<span
                    class="opacity-60 font-normal">({fixedPlayers.length})</span
                >{/if}
        </button>

        <button
            type="button"
            class="h-9 px-3 rounded-lg text-sm font-medium border transition-colors
        {showTemporary
                ? 'bg-red-500 text-white border-red-500'
                : 'text-muted-foreground hover:text-foreground'}"
            onclick={() => (showTemporary = !showTemporary)}
            aria-pressed={showTemporary}
        >
            Temporanei {#if tempPlayers.length > 0}<span
                    class="opacity-70 font-normal">({tempPlayers.length})</span
                >{/if}
        </button>
    </div>

    {#await data.streamed.players}
        <div class="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {#each [1, 2, 3, 4, 5, 6] as _}
                <Skeleton class="h-40 w-full rounded-2xl" />
            {/each}
        </div>
    {:then _}
        <!-- Giocatori fissi -->
        {#if showFixed}
            <section
                class="mb-8"
                in:fade={{ duration: 100 }}
                out:fade={{ duration: 80 }}
            >
                <div class="flex items-center justify-between mb-3">
                    <h2
                        class="text-sm font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                        Giocatori fissi
                    </h2>
                </div>
                <div
                    class="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {#each fixedPlayers as player (player.name)}
                        <div animate:flip>
                            <Card
                                name={player.name}
                                goals={player.goals}
                                wins={player.wins}
                                matchesPlayed={player.matchesPlayed}
                                winRate={player.winRate}
                                golPerMatch={player.golPerMatch}
                            />
                        </div>
                    {/each}
                    <CardAdd {isAuthenticated} temp={false} />
                </div>
            </section>
        {/if}

        <!-- Giocatori temporanei -->
        {#if showTemporary}
            <section
                class="mb-8"
                in:fade={{ duration: 100 }}
                out:fade={{ duration: 80 }}
            >
                <div class="flex items-center justify-between mb-3">
                    <h2
                        class="text-sm font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                        Giocatori temporanei
                    </h2>
                </div>
                <div
                    class="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {#each tempPlayers as player (player.name)}
                        <div animate:flip>
                            <Card
                                name={player.name}
                                goals={player.goals}
                                wins={player.wins}
                                matchesPlayed={player.matchesPlayed}
                                winRate={player.winRate}
                                golPerMatch={player.golPerMatch}
                            />
                        </div>
                    {/each}
                    <CardAdd {isAuthenticated} temp={true} />
                </div>
            </section>
        {/if}

        <!-- Empty state ricerca -->
        {#if qLower && fixedPlayers.length === 0 && tempPlayers.length === 0}
            <div
                class="flex flex-col items-center justify-center py-20 gap-2 text-center"
                in:fade
            >
                <span
                    class="material-symbols-outlined text-4xl text-muted-foreground/40"
                    >search_off</span
                >
                <p class="font-medium">Nessun giocatore trovato</p>
                <p class="text-sm text-muted-foreground">
                    Nessun risultato per "<span class="font-medium"
                        >{query}</span
                    >"
                </p>
            </div>
        {/if}
    {/await}
</div>
