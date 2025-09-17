<script lang="ts">
    import { dndzone } from "svelte-dnd-action";
    import Match from "$lib/Match/Match.svelte";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";

    export let data;
    const { matches, players } = data;

    let dialogOpen = false;

    let luogo = "";
    let match_date = "";
    let match_number = "";
    let team_blue_score = 0;
    let team_red_score = 0;

    // Dati
    let bluePlayers: any[] = [];
    let redPlayers: any[] = [];
    let unassignedPlayers: any[] = players
        ? players.map((p) => ({ ...p, id: p.player_id, goals: 0, ownGoals: 0 }))
        : [];

    // Mantieni stats quando la lib rimpiazza i riferimenti degli oggetti
    function mergeStats(newItems: any[], prev: any[]) {
        const map = new Map(prev.map((p) => [p.id, p]));
        return newItems.map((p) => ({
            ...p,
            goals: map.get(p.id)?.goals ?? 0,
            ownGoals: map.get(p.id)?.ownGoals ?? 0,
        }));
    }

    // Ogni zona aggiorna solo la propria lista con e.detail.items
    function onConsiderBlue(e) {
        bluePlayers = mergeStats(e.detail.items, bluePlayers);
    }
    function onFinalizeBlue(e) {
        bluePlayers = mergeStats(e.detail.items, bluePlayers);
    }

    function onConsiderRed(e) {
        redPlayers = mergeStats(e.detail.items, redPlayers);
    }
    function onFinalizeRed(e) {
        redPlayers = mergeStats(e.detail.items, redPlayers);
    }

    function onConsiderUnassigned(e) {
        unassignedPlayers = mergeStats(e.detail.items, unassignedPlayers);
    }
    function onFinalizeUnassigned(e) {
        unassignedPlayers = mergeStats(e.detail.items, unassignedPlayers);
    }

    // Debug opzionale
    // $: console.log({ bluePlayers, redPlayers, unassignedPlayers });
</script>

<div class="min-h-screen py-8">
    <div class="max-w-4xl mx-auto px-4">
        <h1 class="text-3xl font-bold text-primary-500 mb-8">
            Storico Partite
        </h1>

        <Dialog.Root bind:open={dialogOpen}>
            <Dialog.Trigger
                class="bg-primary-500 text-white px-4 py-2 rounded shadow inline-block cursor-pointer select-none"
            >
                Aggiungi partita
            </Dialog.Trigger>

            <Dialog.Content class="overflow-visible z-50">
                <Dialog.Header>
                    <Dialog.Title>Aggiungi nuova partita</Dialog.Title>
                    <Dialog.Description
                        >Inserisci i dati della partita qui sotto.</Dialog.Description
                    >
                </Dialog.Header>

                <form class="space-y-4 mt-4">
                    <input
                        class="border p-2 w-full rounded"
                        bind:value={luogo}
                        placeholder="Luogo"
                    />
                    <input
                        class="border p-2 w-full rounded"
                        type="date"
                        bind:value={match_date}
                    />
                    <div class="flex gap-4">
                        <!-- Blu -->
                        <div class="flex-1">
                            <label class="font-bold text-blue-600 mb-1 block"
                                >Blu</label
                            >
                            <div
                                class="relative min-h-[260px] max-h-[260px] border rounded p-2 mb-2 overflow-y-auto
                                       grid gap-2
                                       [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]
                                       data-[dnd-over=true]:ring-2 data-[dnd-over=true]:ring-blue-300"
                                use:dndzone={{
                                    items: bluePlayers,
                                    flipDurationMs: 0,
                                    dropTargetStyle: {
                                        outline: "transparent 0px solid",
                                    }, // evita outline giallo che spinge il layout
                                    dropTargetClasses: [
                                        "ring-2",
                                        "ring-blue-300",
                                    ], // la lib aggiunge/rimuove quando over
                                }}
                                on:consider={onConsiderBlue}
                                on:finalize={onFinalizeBlue}
                            >
                                {#each bluePlayers as player (player.id)}
                                    <div
                                        class="bg-blue-50 text-blue-900 rounded shadow-sm cursor-move
                                                flex flex-col justify-between
                                                h-[84px] min-h-[84px] max-h-[84px]
                                                p-2 select-none"
                                    >
                                        <div
                                            class="truncate text-sm font-medium"
                                        >
                                            {player.name}
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <label
                                                class="flex items-center gap-1 text-xs"
                                            >
                                                <span
                                                    class="px-1 rounded bg-blue-200 text-blue-900"
                                                    >G</span
                                                >
                                                <input
                                                    type="number"
                                                    min="0"
                                                    bind:value={player.goals}
                                                    on:change={() =>
                                                        (bluePlayers = [
                                                            ...bluePlayers,
                                                        ])}
                                                    title="Gol"
                                                    class="w-12 h-7 px-2 py-1 text-center border rounded text-sm"
                                                />
                                            </label>
                                            <label
                                                class="flex items-center gap-1 text-xs"
                                            >
                                                <span
                                                    class="px-1 rounded bg-blue-200 text-blue-900"
                                                    >A</span
                                                >
                                                <input
                                                    type="number"
                                                    min="0"
                                                    bind:value={player.ownGoals}
                                                    on:change={() =>
                                                        (bluePlayers = [
                                                            ...bluePlayers,
                                                        ])}
                                                    title="Autogol"
                                                    class="w-12 h-7 px-2 py-1 text-center border rounded text-sm"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>

                        <!-- Rossi -->
                        <div class="flex-1">
                            <label class="font-bold text-red-600 mb-1 block"
                                >Rossi</label
                            >
                            <div
                                class="relative min-h-[260px] max-h-[260px] border rounded p-2 mb-2 overflow-y-auto
                                       grid gap-2
                                       [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]
                                       data-[dnd-over=true]:ring-2 data-[dnd-over=true]:ring-red-300"
                                use:dndzone={{
                                    items: redPlayers,
                                    flipDurationMs: 0,
                                    dropTargetStyle: {
                                        outline: "transparent 0px solid",
                                    },
                                    dropTargetClasses: [
                                        "ring-2",
                                        "ring-red-300",
                                    ],
                                }}
                                on:consider={onConsiderRed}
                                on:finalize={onFinalizeRed}
                            >
                                {#each redPlayers as player (player.id)}
                                    <div
                                        class="bg-red-50 text-red-900 rounded shadow-sm cursor-move
                                                flex flex-col justify-between
                                                h-[84px] min-h-[84px] max-h-[84px]
                                                p-2 select-none"
                                    >
                                        <div
                                            class="truncate text-sm font-medium"
                                        >
                                            {player.name}
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <label
                                                class="flex items-center gap-1 text-xs"
                                            >
                                                <span
                                                    class="px-1 rounded bg-red-200 text-red-900"
                                                    >G</span
                                                >
                                                <input
                                                    type="number"
                                                    min="0"
                                                    bind:value={player.goals}
                                                    on:change={() =>
                                                        (redPlayers = [
                                                            ...redPlayers,
                                                        ])}
                                                    title="Gol"
                                                    class="w-12 h-7 px-2 py-1 text-center border rounded text-sm"
                                                />
                                            </label>
                                            <label
                                                class="flex items-center gap-1 text-xs"
                                            >
                                                <span
                                                    class="px-1 rounded bg-red-200 text-red-900"
                                                    >A</span
                                                >
                                                <input
                                                    type="number"
                                                    min="0"
                                                    bind:value={player.ownGoals}
                                                    on:change={() =>
                                                        (redPlayers = [
                                                            ...redPlayers,
                                                        ])}
                                                    title="Autogol"
                                                    class="w-12 h-7 px-2 py-1 text-center border rounded text-sm"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </div>

                    <!-- Disponibili -->
                    <div class="mt-2">
                        <label class="font-bold mb-1 block"
                            >Giocatori disponibili</label
                        >
                        <div
                            class="relative min-h-[260px] max-h-[260px] border rounded p-2 overflow-y-auto
                                   grid gap-2 bg-gray-50
                                   [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]
                                   data-[dnd-over=true]:ring-2 data-[dnd-over=true]:ring-gray-300"
                            use:dndzone={{
                                items: unassignedPlayers,
                                flipDurationMs: 0,
                                dropTargetStyle: {
                                    outline: "transparent 0px solid",
                                },
                                dropTargetClasses: ["ring-2", "ring-gray-300"],
                            }}
                            on:consider={onConsiderUnassigned}
                            on:finalize={onFinalizeUnassigned}
                        >
                            {#each unassignedPlayers as player (player.id)}
                                <div
                                    class="bg-white text-gray-900 rounded shadow-sm cursor-move
                                            flex items-center justify-between
                                            h-16 min-h-16 max-h-16 rounded-2xl
                                            p-2 select-none"
                                >
                                    <span
                                        class="truncate text-lg font-medium uppercase"
                                        >{player.name}</span
                                    >
                                </div>
                            {/each}
                        </div>
                    </div>
                </form>
            </Dialog.Content>
        </Dialog.Root>

        {#if matches && matches.length > 0}
            <div class="space-y-8 mt-8">
                {#each matches as match}
                    <Match {match} />
                {/each}
            </div>
        {:else}
            <div class="text-center text-surface-500 mt-8">
                Nessuna partita trovata.
            </div>
        {/if}
    </div>
</div>
