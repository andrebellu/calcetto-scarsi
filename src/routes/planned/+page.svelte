<script lang="ts">
    import type { PageData } from "./$types";
    import ChevronLeft from "@lucide/svelte/icons/chevron-left";
    import Shuffle from "@lucide/svelte/icons/shuffle";
    import Save from "@lucide/svelte/icons/save";
    import Trash2 from "@lucide/svelte/icons/trash-2";
    import { shuffle } from "$lib/utils/random";
    import { toast } from "svelte-sonner";
    import { Toaster } from "svelte-sonner";
    export let data: PageData;

    const partita = data.prossimaPartita;
    const fixtureId = partita?.fixture_id ?? null;

    type SquadPlayer = {
        player_id: string;
        name: string;
        is_goalkeeper: boolean;
        gk_order?: number;
    };

    let squadsA: SquadPlayer[] = [...(data.squads?.A ?? [])];
    let squadsB: SquadPlayer[] = [...(data.squads?.B ?? [])];
    let squadsP: SquadPlayer[] = [...(data.squads?.P ?? [])];

    $: orderedA = squadsA
        .slice()
        .sort(
            (p1, p2) =>
                (p1.gk_order ?? Number.MAX_SAFE_INTEGER) -
                (p2.gk_order ?? Number.MAX_SAFE_INTEGER),
        );
    $: orderedB = squadsB
        .slice()
        .sort(
            (p1, p2) =>
                (p1.gk_order ?? Number.MAX_SAFE_INTEGER) -
                (p2.gk_order ?? Number.MAX_SAFE_INTEGER),
        );
    $: orderedP = squadsP.slice();

    const itDate = new Intl.DateTimeFormat("it-IT", {
        weekday: "long",
        day: "2-digit",
        month: "long",
    });
    function formatDate(d: string | null | undefined) {
        if (!d) return d;
        const dt = new Date(d);
        return Number.isFinite(dt.getTime()) ? itDate.format(dt) : d;
    }

    function removeFromAllTeams(player_id: string) {
        squadsA = squadsA.filter((p) => p.player_id !== player_id);
        squadsB = squadsB.filter((p) => p.player_id !== player_id);
        squadsP = squadsP.filter((p) => p.player_id !== player_id);
    }

    function moveTo(player: SquadPlayer, dest: "A" | "B" | "P") {
        removeFromAllTeams(player.player_id);
        if (dest === "A") squadsA = [...squadsA, player];
        if (dest === "B") squadsB = [...squadsB, player];
        if (dest === "P") squadsP = [...squadsP, player];
    }

    // Sposta nella lista "Convocati" (disponibili) — era il problema mancante
    function returnToPool(player: SquadPlayer) {
        removeFromAllTeams(player.player_id);
        squadsP = [...squadsP, player];
    }

    function handleDragStart(event: DragEvent, player: SquadPlayer) {
        event.dataTransfer?.setData("application/json", JSON.stringify(player));
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    }

    function handleDrop(event: DragEvent, dest: "A" | "B" | "P") {
        event.preventDefault();
        const text = event.dataTransfer?.getData("application/json");
        if (!text) return;
        moveTo(JSON.parse(text) as SquadPlayer, dest);
    }

    function generateTeams() {
        const allPlayers = [...squadsP, ...squadsA, ...squadsB];
        if (!allPlayers.length) return;
        shuffle(allPlayers, Math.random);
        const mid = Math.ceil(allPlayers.length / 2);
        squadsA = allPlayers.slice(0, mid);
        squadsB = allPlayers.slice(mid);
        squadsP = [];
        toast.success("Squadre generate casualmente");
    }

    async function saveTeams() {
        if (!fixtureId) {
            toast.error("Fixture non disponibile");
            return;
        }
        const players = [
            ...squadsA.map((p) => ({
                player_id: p.player_id,
                team: "A" as const,
                is_goalkeeper: p.is_goalkeeper,
            })),
            ...squadsB.map((p) => ({
                player_id: p.player_id,
                team: "B" as const,
                is_goalkeeper: p.is_goalkeeper,
            })),
            ...squadsP.map((p) => ({
                player_id: p.player_id,
                team: "P" as const,
                is_goalkeeper: p.is_goalkeeper,
            })),
        ];
        const res = await fetch(`/api/fixture/${fixtureId}/players`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ players }),
        });
        if (!res.ok) {
            toast.error("Errore salvataggio squadre");
            return;
        }
        toast.success("Squadre salvate");
    }
</script>

<Toaster position="top-center" richColors />

<!-- Top nav -->
<div
    class="sticky top-0 z-20 backdrop-blur-md bg-background/80 border-b border-border/50"
>
    <div
        class="mx-auto max-w-4xl px-4 sm:px-6 h-14 flex items-center justify-between"
    >
        <a
            href="/"
            class="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
            <ChevronLeft class="size-4" />
            Home
        </a>
        {#if data.isAuthenticated}
            <a
                href="/poll"
                class="text-sm font-medium text-primary hover:underline"
                >Crea sondaggio →</a
            >
        {/if}
    </div>
</div>

<main class="mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 sm:py-10 space-y-6">
    <!-- Header -->
    <div class="space-y-1">
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
            Convocazioni
        </h1>
        {#if data.dataDecisa && partita}
            <p class="text-sm text-muted-foreground">
                {formatDate(partita.data)} · {partita.luogo}{#if partita.ora}
                    · ore {partita.ora}{/if}
            </p>
        {:else}
            <p class="text-sm text-muted-foreground">
                Nessuna convocazione confermata.
            </p>
        {/if}
    </div>

    {#if data.dataDecisa && data.squads}
        <!-- Info pills -->
        <div class="flex flex-wrap gap-2">
            <span
                class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground"
            >
                <span class="material-symbols-outlined !text-[14px]"
                    >schedule</span
                >
                Arriva 30 min prima
            </span>
            <span
                class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground"
            >
                <span class="material-symbols-outlined !text-[14px]"
                    >groups</span
                >
                {orderedA.length + orderedB.length + orderedP.length} convocati totali
            </span>
        </div>

        <!-- ── ADMIN: gestione squadre ── -->
        {#if data.isAuthenticated}
            <section
                class="rounded-2xl border bg-card shadow-sm overflow-hidden"
            >
                <div
                    class="px-4 py-3 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                    <div>
                        <h2 class="font-semibold">Gestione squadre</h2>
                        <p class="text-xs text-muted-foreground mt-0.5">
                            Trascina i giocatori tra le colonne oppure usa i
                            pulsanti. Clicca × per rimettere un giocatore nei
                            disponibili.
                        </p>
                    </div>
                    <div class="flex gap-2 flex-shrink-0">
                        <button
                            type="button"
                            class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40"
                            onclick={generateTeams}
                            disabled={orderedP.length +
                                orderedA.length +
                                orderedB.length ===
                                0}
                        >
                            <Shuffle class="size-3.5" /> Genera
                        </button>
                        <button
                            type="button"
                            class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
                            onclick={saveTeams}
                            disabled={!fixtureId}
                        >
                            <Save class="size-3.5" /> Salva
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-0 md:grid-cols-3 md:divide-x">
                    <!-- Disponibili -->
                    <div
                        class="p-3 space-y-2"
                        ondrop={(e) => handleDrop(e, "P")}
                        ondragover={(e) => e.preventDefault()}
                    >
                        <p
                            class="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1"
                        >
                            Disponibili <span class="font-normal"
                                >({orderedP.length})</span
                            >
                        </p>
                        <ul class="space-y-1.5 min-h-[160px]">
                            {#each orderedP as player (player.player_id)}
                                <li
                                    draggable="true"
                                    ondragstart={(e) =>
                                        handleDragStart(e, player)}
                                    class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted cursor-grab active:cursor-grabbing border border-transparent hover:border-border transition-all"
                                >
                                    <span class="text-sm font-medium truncate"
                                        >{player.name}</span
                                    >
                                    <div class="flex gap-1 flex-shrink-0">
                                        <button
                                            class="size-5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                                            onclick={() => moveTo(player, "A")}
                                            >A</button
                                        >
                                        <button
                                            class="size-5 rounded text-[10px] font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                            onclick={() => moveTo(player, "B")}
                                            >B</button
                                        >
                                    </div>
                                </li>
                            {/each}
                            {#if orderedP.length === 0}
                                <li
                                    class="flex items-center justify-center h-28 text-xs text-muted-foreground italic"
                                >
                                    Trascina qui
                                </li>
                            {/if}
                        </ul>
                    </div>

                    <!-- Squadra A -->
                    <div
                        class="p-3 space-y-2 border-t md:border-t-0"
                        ondrop={(e) => handleDrop(e, "A")}
                        ondragover={(e) => e.preventDefault()}
                    >
                        <p
                            class="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider px-1"
                        >
                            Squadra Finocchi <span
                                class="font-normal text-muted-foreground"
                                >({orderedA.length})</span
                            >
                        </p>
                        <ul class="space-y-1.5 min-h-[160px]">
                            {#each orderedA as player (player.player_id)}
                                <li
                                    draggable="true"
                                    ondragstart={(e) =>
                                        handleDragStart(e, player)}
                                    class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 cursor-grab active:cursor-grabbing"
                                >
                                    <span class="text-sm font-medium truncate"
                                        >{player.name}</span
                                    >
                                    <div
                                        class="flex items-center gap-1 flex-shrink-0"
                                    >
                                        {#if player.is_goalkeeper}
                                            <span
                                                class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 font-medium"
                                                >GK</span
                                            >
                                        {/if}
                                        <button
                                            class="size-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                            onclick={() => returnToPool(player)}
                                            title="Rimuovi dalla squadra"
                                        >
                                            <Trash2 class="size-3" />
                                        </button>
                                    </div>
                                </li>
                            {/each}
                            {#if orderedA.length === 0}
                                <li
                                    class="flex items-center justify-center h-28 text-xs text-blue-400 italic"
                                >
                                    Trascina qui
                                </li>
                            {/if}
                        </ul>
                    </div>

                    <!-- Squadra B -->
                    <div
                        class="p-3 space-y-2 border-t md:border-t-0"
                        ondrop={(e) => handleDrop(e, "B")}
                        ondragover={(e) => e.preventDefault()}
                    >
                        <p
                            class="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider px-1"
                        >
                            Squadra Pomodori <span
                                class="font-normal text-muted-foreground"
                                >({orderedB.length})</span
                            >
                        </p>
                        <ul class="space-y-1.5 min-h-[160px]">
                            {#each orderedB as player (player.player_id)}
                                <li
                                    draggable="true"
                                    ondragstart={(e) =>
                                        handleDragStart(e, player)}
                                    class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 cursor-grab active:cursor-grabbing"
                                >
                                    <span class="text-sm font-medium truncate"
                                        >{player.name}</span
                                    >
                                    <div
                                        class="flex items-center gap-1 flex-shrink-0"
                                    >
                                        {#if player.is_goalkeeper}
                                            <span
                                                class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 font-medium"
                                                >GK</span
                                            >
                                        {/if}
                                        <button
                                            class="size-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                            onclick={() => returnToPool(player)}
                                            title="Rimuovi dalla squadra"
                                        >
                                            <Trash2 class="size-3" />
                                        </button>
                                    </div>
                                </li>
                            {/each}
                            {#if orderedB.length === 0}
                                <li
                                    class="flex items-center justify-center h-28 text-xs text-red-400 italic"
                                >
                                    Trascina qui
                                </li>
                            {/if}
                        </ul>
                    </div>
                </div>
            </section>
        {/if}

        <!-- ── VISTA PUBBLICA: squadre read-only ── -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
                class="rounded-2xl border border-blue-200 dark:border-blue-900 overflow-hidden"
            >
                <div
                    class="px-4 py-3 bg-blue-50/60 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-900 flex items-center justify-between"
                >
                    <h2 class="font-semibold text-blue-700 dark:text-blue-400">
                        Squadra Pomodori
                    </h2>
                    <span
                        class="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full"
                        >{orderedA.length}</span
                    >
                </div>
                <ul class="divide-y divide-blue-100 dark:divide-blue-900/30">
                    {#each orderedA as p (p.player_id)}
                        <li
                            class="flex items-center justify-between px-4 py-2.5"
                        >
                            <span class="text-sm font-medium">{p.name}</span>
                            {#if p.is_goalkeeper}
                                <span
                                    class="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 font-medium"
                                    >GK</span
                                >
                            {/if}
                        </li>
                    {/each}
                    {#if orderedA.length === 0}
                        <li
                            class="px-4 py-4 text-sm text-muted-foreground italic"
                        >
                            Nessun giocatore assegnato
                        </li>
                    {/if}
                </ul>
            </div>

            <div
                class="rounded-2xl border border-red-200 dark:border-red-900 overflow-hidden"
            >
                <div
                    class="px-4 py-3 bg-red-50/60 dark:bg-red-950/20 border-b border-red-200 dark:border-red-900 flex items-center justify-between"
                >
                    <h2 class="font-semibold text-red-700 dark:text-red-400">
                        Squadra Finocchi
                    </h2>
                    <span
                        class="text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded-full"
                        >{orderedB.length}</span
                    >
                </div>
                <ul class="divide-y divide-red-100 dark:divide-red-900/30">
                    {#each orderedB as p (p.player_id)}
                        <li
                            class="flex items-center justify-between px-4 py-2.5"
                        >
                            <span class="text-sm font-medium">{p.name}</span>
                            {#if p.is_goalkeeper}
                                <span
                                    class="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 font-medium"
                                    >GK</span
                                >
                            {/if}
                        </li>
                    {/each}
                    {#if orderedB.length === 0}
                        <li
                            class="px-4 py-4 text-sm text-muted-foreground italic"
                        >
                            Nessun giocatore assegnato
                        </li>
                    {/if}
                </ul>
            </div>
        </div>

        {#if orderedP.length > 0}
            <div class="rounded-2xl border overflow-hidden">
                <div
                    class="px-4 py-3 bg-muted/30 border-b flex items-center justify-between"
                >
                    <h2 class="font-semibold text-muted-foreground">
                        Convocati
                    </h2>
                    <span
                        class="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full"
                        >{orderedP.length}</span
                    >
                </div>
                <ul class="divide-y">
                    {#each orderedP as p (p.player_id)}
                        <li
                            class="flex items-center justify-between px-4 py-2.5"
                        >
                            <span class="text-sm font-medium">{p.name}</span>
                            {#if p.is_goalkeeper}
                                <span
                                    class="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 font-medium"
                                    >GK</span
                                >
                            {/if}
                        </li>
                    {/each}
                </ul>
            </div>
        {/if}
    {/if}
</main>
