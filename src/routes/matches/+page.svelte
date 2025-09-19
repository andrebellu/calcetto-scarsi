<script lang="ts">
    import MatchDialog from "$lib/Match/MatchDialog.svelte";
    import Match from "$lib/Match/Match.svelte";
    import Navbar from "$lib/Navbar/Navbar.svelte";
    import { invalidate } from "$app/navigation";
    import { fade } from "svelte/transition";

    const { data } = $props<{
        data: {
            session: any | null;
            user: any | null;
            supabase: any;
            matches: any[] | null;
            players: any[] | null;
            error?: string;
            isAuthenticated: boolean;
        };
    }>();

    const dialogData = {
        matches: Array.isArray(data.matches) ? data.matches : [],
        players: Array.isArray(data.players) ? data.players : [],
    };

    // Stato UI
    let query = $state("");
    let debounced = $state("");
    let sortKey = $state<"date_desc" | "date_asc">("date_desc");

    // Debounce
    let t: any;
    $effect(() => {
        clearTimeout(t);
        t = setTimeout(() => (debounced = query), 250);
        return () => clearTimeout(t);
    });

    function keyOf(m: any) {
        const d = m.match_date ?? m?.match?.match_date ?? m.date;
        const ts = typeof d === "number" ? d : Date.parse(d ?? "");
        return Number.isFinite(ts) ? ts : 0;
    }

    // CORRETTO: usare espressione (IIFE) dentro $derived
    const filtered = $derived(
        (() => {
            const list = Array.isArray(data.matches) ? data.matches : [];
            const q = debounced.trim().toLowerCase();
            if (!q) return list;
            return list.filter((m) => {
                const luogo = (m.luogo || "").toLowerCase();
                const d = String(m.match_date || "");
                return luogo.includes(q) || d.includes(q);
            });
        })()
    );

    const sorted = $derived(
        (() => {
            const arr = [...filtered];
            const dir = sortKey === "date_desc" ? -1 : 1;
            arr.sort((a, b) => dir * (keyOf(a) - keyOf(b)));
            return arr;
        })()
    );

    async function refreshMatches() {
        await invalidate(() => true);
    }

    function onSavedLocal(e: CustomEvent<any>) {
        const payload = e?.detail;
        const match_id = payload?.match_id;
        const match_date = payload?.match_date ?? payload?.match?.match_date;
        const luogo = payload?.luogo ?? payload?.match?.luogo;
        const match_number = payload?.match_number ?? null;
        const team_blue_score =
            payload?.team_blue_score ?? payload?.match?.team_blue_score ?? 0;
        const team_red_score =
            payload?.team_red_score ?? payload?.match?.team_red_score ?? 0;

        const newMatch = {
            match_id,
            match_date,
            luogo,
            match_number,
            team_blue_score,
            team_red_score,
            created_at: new Date().toISOString(),
            players: [],
        };

        if (Array.isArray(data.matches)) {
            data.matches.unshift(newMatch);
        }
        refreshMatches();
    }
</script>

<div class="mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
    <Navbar />

    <div class="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div
            class="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between"
        >
            <header class="flex flex-col">
                <h1
                    class="text-2xl sm:text-3xl md:text-4xl font-bold text-primary-500"
                >
                    Storico Partite
                </h1>
                <p class="text-[13px] sm:text-sm text-muted-foreground mt-1">
                    Aggiungi nuove partite e consulta i risultati passati.
                    Filtra per luogo o data.
                </p>
            </header>

            <div
                class="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center"
            >
                <input
                    type="search"
                    placeholder="Cerca per luogo o data (YYYY-MM-DD)…"
                    class="w-full sm:w-72 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    bind:value={query}
                    aria-label="Cerca"
                />
                <select
                    class="rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    bind:value={sortKey}
                    aria-label="Ordina per data"
                >
                    <option value="date_desc">Più recenti</option>
                    <option value="date_asc">Più vecchie</option>
                </select>
            </div>
        </div>

        <div>
            <MatchDialog
                data={dialogData}
                on:saved={onSavedLocal}
                isAuthenticated={data.isAuthenticated}
            />
        </div>
    </div>

    {#if Array.isArray(sorted) && sorted.length}
        <div class="space-y-4 sm:space-y-6">
            {#each sorted as match (match.match_id ?? match.created_at ?? `${match.match_date}-${match.luogo}-${match.match_number ?? ""}`)}
                <div in:fade={{ duration: 120 }}>
                    <Match {match} />
                </div>
            {/each}
        </div>
    {:else}
        <div class="text-center text-surface-500 py-10">
            Nessuna partita trovata.
        </div>
    {/if}
</div>

<style>
    .no-scrollbar::-webkit-scrollbar {
        display: none;
    }
    .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
</style>
