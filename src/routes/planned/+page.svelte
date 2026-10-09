<script lang="ts">
    import type { PageData } from "./$types";
    import Shuffle from "@lucide/svelte/icons/shuffle";
    import Save from "@lucide/svelte/icons/save";
    import Trash2 from "@lucide/svelte/icons/trash-2";
    import Undo2 from "@lucide/svelte/icons/undo-2";
    import ArrowLeftRight from "@lucide/svelte/icons/arrow-left-right";
    import { onMount } from "svelte";
    import { beforeNavigate } from "$app/navigation";
    import { TEAM_LABELS, formatTimeOfDay } from "$lib/domain/home";
    import { shuffle } from "$lib/utils/random";
    import { toast } from "svelte-sonner";
    import Navbar from "$lib/Navbar/Navbar.svelte";
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

    // ── Annulla / modifiche non salvate ──
    type Snapshot = { A: SquadPlayer[]; B: SquadPlayer[]; P: SquadPlayer[] };
    const snapshot = (): Snapshot => ({
        A: squadsA.map((p) => ({ ...p })),
        B: squadsB.map((p) => ({ ...p })),
        P: squadsP.map((p) => ({ ...p })),
    });
    const signature = (s: Snapshot) =>
        JSON.stringify(
            (["A", "B", "P"] as const).map((t) =>
                s[t]
                    .map((p) => `${p.player_id}:${p.is_goalkeeper ? 1 : 0}`)
                    .sort(),
            ),
        );

    let history: Snapshot[] = [];
    let savedSignature = signature(snapshot());
    let saving = false;

    function remember() {
        history = [...history.slice(-19), snapshot()];
    }

    function undo() {
        const last = history.at(-1);
        if (!last) return;
        history = history.slice(0, -1);
        squadsA = last.A;
        squadsB = last.B;
        squadsP = last.P;
    }

    $: currentSignature = signature({ A: squadsA, B: squadsB, P: squadsP });
    $: dirty = currentSignature !== savedSignature;
    $: imbalance = squadsA.length - squadsB.length;

    onMount(() => {
        const warn = (e: BeforeUnloadEvent) => {
            if (!dirty) return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    });

    beforeNavigate(({ cancel, type }) => {
        if (type === "leave" || !dirty) return;
        if (!confirm("Hai modifiche alle squadre non salvate. Uscire comunque?"))
            cancel();
    });

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
        remember();
        removeFromAllTeams(player.player_id);
        if (dest === "A") squadsA = [...squadsA, player];
        if (dest === "B") squadsB = [...squadsB, player];
        if (dest === "P") squadsP = [...squadsP, player];
    }

    // Sposta nella lista "Convocati" (disponibili) — era il problema mancante
    function returnToPool(player: SquadPlayer) {
        moveTo(player, "P");
    }

    function toggleGoalkeeper(player: SquadPlayer) {
        remember();
        const flip = (list: SquadPlayer[]) =>
            list.map((p) =>
                p.player_id === player.player_id
                    ? { ...p, is_goalkeeper: !p.is_goalkeeper }
                    : p,
            );
        squadsA = flip(squadsA);
        squadsB = flip(squadsB);
        squadsP = flip(squadsP);
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
        remember();
        shuffle(allPlayers, Math.random);
        const mid = Math.ceil(allPlayers.length / 2);
        squadsA = allPlayers.slice(0, mid);
        squadsB = allPlayers.slice(mid);
        squadsP = [];
        toast.success("Squadre generate casualmente", {
            action: { label: "Annulla", onClick: undo },
        });
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
        saving = true;
        try {
            const res = await fetch(`/api/fixture/${fixtureId}/players`, {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ players }),
            });
            if (!res.ok) {
                const msg = await res
                    .json()
                    .then((b) => b?.message)
                    .catch(() => null);
                toast.error(msg ?? "Errore salvataggio squadre");
                return;
            }
            savedSignature = currentSignature;
            history = [];
            toast.success("Squadre salvate");
        } catch {
            toast.error("Connessione assente: squadre non salvate");
        } finally {
            saving = false;
        }
    }
</script>

<div class="mx-auto max-w-4xl px-4 sm:px-6 pt-6 sm:pt-10">
    <Navbar />
</div>

<main class="mx-auto w-full max-w-4xl px-4 sm:px-6 pt-0 pb-6 sm:pb-10 space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
        <div class="space-y-1">
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
                Convocazioni
            </h1>
            {#if data.dataDecisa && partita}
                <p class="text-sm text-muted-foreground">
                    {[
                        formatDate(partita.data),
                        partita.luogo,
                        formatTimeOfDay(partita.ora)
                            ? `ore ${formatTimeOfDay(partita.ora)}`
                            : null,
                    ]
                        .filter(Boolean)
                        .join(" · ")}
                </p>
            {:else}
                <p class="text-sm text-muted-foreground">
                    Nessuna convocazione confermata.
                </p>
            {/if}
        </div>
        {#if data.isAuthenticated}
            <a
                href="/poll"
                class="shrink-0 text-sm font-medium text-primary hover:underline"
                >Crea sondaggio →</a
            >
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
            {#snippet playerRow(player: SquadPlayer, team: "A" | "B" | "P")}
                <li
                    draggable="true"
                    ondragstart={(e) => handleDragStart(e, player)}
                    class="flex items-center justify-between gap-2 pl-3 pr-1.5 py-1.5 rounded-lg border cursor-grab active:cursor-grabbing transition-colors
                        {team === 'A'
                        ? 'bg-team-blue/10 border-team-blue/25'
                        : team === 'B'
                          ? 'bg-team-red/10 border-team-red/25'
                          : 'bg-muted/50 border-transparent hover:border-border'}"
                >
                    <span class="text-sm font-medium truncate">{player.name}</span>
                    <div class="flex items-center gap-1 flex-shrink-0">
                        <button
                            type="button"
                            class="h-8 px-2 rounded-md text-[11px] font-bold transition-colors
                                {player.is_goalkeeper
                                ? 'bg-secondary-500/20 text-secondary-400'
                                : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted'}"
                            onclick={() => toggleGoalkeeper(player)}
                            aria-pressed={player.is_goalkeeper}
                            title={player.is_goalkeeper
                                ? "Togli il ruolo di portiere"
                                : "Segna come portiere"}
                        >
                            GK
                        </button>
                        {#if team === "P"}
                            <button
                                type="button"
                                class="h-8 min-w-8 rounded-md text-xs font-bold bg-team-blue/15 text-team-blue hover:bg-team-blue/25 transition-colors"
                                onclick={() => moveTo(player, "A")}
                                aria-label="Sposta {player.name} nei {TEAM_LABELS.A}"
                                >A</button
                            >
                            <button
                                type="button"
                                class="h-8 min-w-8 rounded-md text-xs font-bold bg-team-red/15 text-team-red hover:bg-team-red/25 transition-colors"
                                onclick={() => moveTo(player, "B")}
                                aria-label="Sposta {player.name} nei {TEAM_LABELS.B}"
                                >B</button
                            >
                        {:else}
                            {@const other = team === "A" ? "B" : "A"}
                            <button
                                type="button"
                                class="size-8 flex items-center justify-center rounded-md transition-colors
                                    {other === 'A'
                                    ? 'text-team-blue hover:bg-team-blue/15'
                                    : 'text-team-red hover:bg-team-red/15'}"
                                onclick={() => moveTo(player, other)}
                                aria-label="Sposta {player.name} nei {TEAM_LABELS[other]}"
                                title="Sposta nei {TEAM_LABELS[other]}"
                            >
                                <ArrowLeftRight class="size-4" />
                            </button>
                            <button
                                type="button"
                                class="size-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                onclick={() => returnToPool(player)}
                                aria-label="Rimetti {player.name} tra i disponibili"
                                title="Rimetti tra i disponibili"
                            >
                                <Trash2 class="size-4" />
                            </button>
                        {/if}
                    </div>
                </li>
            {/snippet}

            {#snippet column(
                team: "A" | "B" | "P",
                label: string,
                list: SquadPlayer[],
                tone: string,
            )}
                <div
                    class="p-3 space-y-2 border-t md:border-t-0 first:border-t-0"
                    ondrop={(e) => handleDrop(e, team)}
                    ondragover={(e) => e.preventDefault()}
                    role="group"
                    aria-label={label}
                >
                    <p
                        class="text-xs font-semibold uppercase tracking-wider px-1 {tone}"
                    >
                        {label}
                        <span class="font-normal text-muted-foreground"
                            >({list.length})</span
                        >
                    </p>
                    <ul class="space-y-1.5 min-h-[120px]">
                        {#each list as player (player.player_id)}
                            {@render playerRow(player, team)}
                        {/each}
                        {#if list.length === 0}
                            <li
                                class="flex items-center justify-center h-24 rounded-lg border border-dashed text-xs text-muted-foreground"
                            >
                                {team === "P"
                                    ? "Tutti assegnati"
                                    : "Trascina qui o usa i pulsanti"}
                            </li>
                        {/if}
                    </ul>
                </div>
            {/snippet}

            <section
                class="rounded-2xl border bg-card shadow-sm overflow-hidden"
            >
                <div
                    class="px-4 py-3 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <h2 class="font-semibold">Gestione squadre</h2>
                            {#if dirty}
                                <span
                                    class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-secondary-500/15 text-secondary-400"
                                    >Modifiche non salvate</span
                                >
                            {/if}
                        </div>
                        <p class="text-xs text-muted-foreground mt-0.5">
                            {#if Math.abs(imbalance) > 1}
                                <span class="font-medium text-secondary-400">
                                    {imbalance > 0
                                        ? TEAM_LABELS.A
                                        : TEAM_LABELS.B} ha {Math.abs(imbalance)}
                                    giocatori in più.
                                </span>
                            {:else}
                                Trascina i giocatori o usa i pulsanti. GK segna
                                il portiere.
                            {/if}
                        </p>
                    </div>
                    <div class="flex gap-2 flex-shrink-0">
                        <button
                            type="button"
                            class="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40"
                            onclick={undo}
                            disabled={history.length === 0}
                            title="Annulla l'ultima modifica"
                        >
                            <Undo2 class="size-4" /> Annulla
                        </button>
                        <button
                            type="button"
                            class="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40"
                            onclick={generateTeams}
                            disabled={orderedP.length +
                                orderedA.length +
                                orderedB.length ===
                                0}
                        >
                            <Shuffle class="size-4" /> Genera
                        </button>
                        <button
                            type="button"
                            class="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
                            onclick={saveTeams}
                            disabled={!fixtureId || !dirty || saving}
                        >
                            <Save class="size-4" />
                            {saving ? "Salvo…" : dirty ? "Salva" : "Salvato"}
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-0 md:grid-cols-3 md:divide-x">
                    {@render column(
                        "P",
                        "Disponibili",
                        orderedP,
                        "text-muted-foreground",
                    )}
                    {@render column(
                        "A",
                        `Squadra ${TEAM_LABELS.A}`,
                        orderedA,
                        "text-team-blue",
                    )}
                    {@render column(
                        "B",
                        `Squadra ${TEAM_LABELS.B}`,
                        orderedB,
                        "text-team-red",
                    )}
                </div>
            </section>
        {/if}

        <!-- ── VISTA PUBBLICA: squadre read-only ── -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
                class="rounded-2xl border border-team-blue/25 overflow-hidden"
            >
                <div
                    class="px-4 py-3 bg-team-blue/10 border-b border-team-blue/25 flex items-center justify-between"
                >
                    <h2 class="font-semibold text-team-blue">
                        Squadra {TEAM_LABELS.A}
                    </h2>
                    <span
                        class="text-xs font-medium text-team-blue bg-team-blue/15 px-2 py-0.5 rounded-full"
                        >{orderedA.length}</span
                    >
                </div>
                <ul class="divide-y divide-team-blue/15">
                    {#each orderedA as p (p.player_id)}
                        <li
                            class="flex items-center justify-between px-4 py-2.5"
                        >
                            <span class="text-sm font-medium">{p.name}</span>
                            {#if p.is_goalkeeper}
                                <span
                                    class="text-[11px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary-500 font-medium"
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
                class="rounded-2xl border border-team-red/25 overflow-hidden"
            >
                <div
                    class="px-4 py-3 bg-team-red/10 border-b border-team-red/25 flex items-center justify-between"
                >
                    <h2 class="font-semibold text-team-red">
                        Squadra {TEAM_LABELS.B}
                    </h2>
                    <span
                        class="text-xs font-medium text-team-red bg-team-red/15 px-2 py-0.5 rounded-full"
                        >{orderedB.length}</span
                    >
                </div>
                <ul class="divide-y divide-team-red/15">
                    {#each orderedB as p (p.player_id)}
                        <li
                            class="flex items-center justify-between px-4 py-2.5"
                        >
                            <span class="text-sm font-medium">{p.name}</span>
                            {#if p.is_goalkeeper}
                                <span
                                    class="text-[11px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary-500 font-medium"
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
                                    class="text-[11px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary-500 font-medium"
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
