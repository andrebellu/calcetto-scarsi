<script lang="ts">
    import MatchDialog from "$lib/Match/MatchDialog.svelte";
    import Match from "$lib/Match/Match.svelte";
    import Navbar from "$lib/Navbar/Navbar.svelte";
    import { goto, invalidate } from "$app/navigation";
    import { fade } from "svelte/transition";
    import * as Popover from "$lib/components/ui/popover/index.js";
    import * as Command from "$lib/components/ui/command/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
    import Skeleton from "$lib/components/ui/skeleton/skeleton.svelte";
    import SlidersHorizontal from "@lucide/svelte/icons/sliders-horizontal";
    import X from "@lucide/svelte/icons/x";

    const { data } = $props<{
        data: {
            session: any | null;
            user: any | null;
            supabase: any;
            streamed: { matches: Promise<any[]> };
            players: any[] | null;
            seasonOptions?: Array<{ value: string; label: string }>;
            selectedSeason?: string;
            error?: string;
            isAuthenticated: boolean;
        };
    }>();

    let matches = $state<any[]>([]);

    $effect(() => {
        data.streamed.matches.then((res: any[]) => {
            matches = res || [];
        });
    });

    let activeSeason = $state(data.selectedSeason ?? "all");
    $effect(() => {
        activeSeason = data.selectedSeason ?? "all";
    });

    const dialogData = $derived({
        matches: matches,
        players: Array.isArray(data.players) ? data.players : [],
        isAuthenticated: data.isAuthenticated,
    });

    let sortKey = $state<"date_desc" | "date_asc">("date_desc");
    let playerOpen = $state(false);
    let playerFilterId = $state<string | null>(null);
    let playerTrigger: HTMLButtonElement = $state(null!);

    function keyOf(m: any) {
        const d = m.match_date ?? m?.match?.match_date ?? m.date;
        const ts = typeof d === "number" ? d : Date.parse(d ?? "");
        return Number.isFinite(ts) ? ts : 0;
    }

    function seasonMatchesFilter(matchSeason: string | null | undefined) {
        const normalized = matchSeason?.trim() || null;
        if (activeSeason === "all") return true;
        if (activeSeason === "__none__") return !normalized;
        return normalized === activeSeason;
    }

    function applySeasonFilter(nextSeason: string) {
        if (typeof window === "undefined") return;
        const url = new URL(window.location.href);
        if (!nextSeason || nextSeason === "all")
            url.searchParams.delete("season");
        else url.searchParams.set("season", nextSeason);
        goto(`${url.pathname}${url.search}${url.hash}`, {
            replaceState: true,
            noScroll: true,
            keepFocus: true,
        });
    }

    const filtered = $derived(
        (() => {
            const normalized = matches
                .filter((m: any) => seasonMatchesFilter(m.season))
                .map((m: any) => {
                    const pms = Array.isArray(m.player_match)
                        ? m.player_match
                        : [];
                    const players = pms.map((pm: any) => ({
                        name: pm?.players?.name ?? "",
                        player_id: pm?.players?.player_id ?? null,
                        goals: Number(pm?.goals ?? 0),
                        autogol: Number(pm?.autogol ?? 0),
                        is_winner: Boolean(pm?.is_winner ?? false),
                        team: pm?.team ?? null,
                    }));

                    const blue = players.filter((p: any) => p.team === "blu");
                    const red = players.filter((p: any) => p.team === "rossi");
                    const blueScore = Number(m.team_blue_score ?? 0);
                    const redScore = Number(m.team_red_score ?? 0);
                    const winnerTeam =
                        blueScore > redScore
                            ? "blu"
                            : redScore > blueScore
                              ? "rossi"
                              : null;
                    const loserTeam = winnerTeam
                        ? winnerTeam === "blu"
                            ? "rossi"
                            : "blu"
                        : null;

                    function topFor(teamPlayers: any[]) {
                        const maxGoals = teamPlayers.reduce(
                            (mx: number, p: any) =>
                                Math.max(mx, Number(p.goals || 0)),
                            0,
                        );
                        const top =
                            maxGoals > 0
                                ? teamPlayers.filter(
                                      (p: any) =>
                                          Number(p.goals || 0) === maxGoals,
                                  )
                                : [];
                        return { maxGoals, top };
                    }

                    let mvpPlayers: any[] = [],
                        svpPlayers: any[] = [],
                        mvpGoals = 0,
                        svpGoals = 0;
                    if (winnerTeam) {
                        const { maxGoals, top } = topFor(
                            winnerTeam === "blu" ? blue : red,
                        );
                        mvpPlayers = top;
                        mvpGoals = maxGoals;
                    }
                    if (loserTeam) {
                        const { maxGoals, top } = topFor(
                            loserTeam === "blu" ? blue : red,
                        );
                        svpPlayers = top;
                        svpGoals = maxGoals;
                    }

                    const mvpIds = new Set(
                        (mvpPlayers ?? []).map((p: any) => String(p.player_id)),
                    );
                    const svpIds = new Set(
                        (svpPlayers ?? []).map((p: any) => String(p.player_id)),
                    );
                    const playersWithBadges = players.map((p: any) => ({
                        ...p,
                        is_mvp: mvpIds.has(String(p.player_id)),
                        is_svp: svpIds.has(String(p.player_id)),
                    }));

                    return {
                        ...m,
                        players: playersWithBadges,
                        mvpPlayers,
                        svpPlayers,
                        mvpGoals,
                        svpGoals,
                    };
                });

            if (!playerFilterId) return normalized;
            return normalized.filter(
                (m: any) =>
                    Array.isArray(m.players) &&
                    m.players.some(
                        (p: any) =>
                            String(p.player_id) === String(playerFilterId),
                    ),
            );
        })(),
    );

    const sorted = $derived(
        (() => {
            const arr = [...filtered];
            const dir = sortKey === "date_desc" ? -1 : 1;
            arr.sort((a, b) => dir * (keyOf(a) - keyOf(b)));
            return arr;
        })(),
    );

    async function refreshMatches() {
        await invalidate(() => true);
    }

    function onSavedLocal(e: CustomEvent<any>) {
        const payload = e?.detail;
        const newMatch = {
            match_id: payload?.match_id,
            match_date: payload?.match_date ?? payload?.match?.match_date,
            luogo: payload?.luogo ?? payload?.match?.luogo,
            season: payload?.season ?? payload?.match?.season ?? null,
            match_number: payload?.match_number ?? null,
            team_blue_score:
                payload?.team_blue_score ??
                payload?.match?.team_blue_score ??
                0,
            team_red_score:
                payload?.team_red_score ?? payload?.match?.team_red_score ?? 0,
            created_at: new Date().toISOString(),
            players: [],
        };
        matches.unshift(newMatch);
        refreshMatches();
    }

    const playerOptions = $derived(
        Array.isArray(data.players)
            ? data.players.map((p: any) => ({
                  value: String(p.player_id),
                  label: p.name,
              }))
            : [],
    );

    const activeFilterCount = $derived(
        (playerFilterId ? 1 : 0) +
            (activeSeason !== "all" ? 1 : 0) +
            (sortKey !== "date_desc" ? 1 : 0),
    );

    function resetPlayerFilter() {
        playerFilterId = null;
    }

    function labelForPlayer(id: string | null) {
        if (!id) return "Tutti i giocatori";
        return (
            playerOptions.find((o) => o.value === id)?.label ?? "Sconosciuto"
        );
    }
</script>

<div class="mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 sm:py-10">
    <Navbar />

    <!-- Header -->
    <div class="mb-6 sm:mb-8">
        <div class="flex items-start justify-between gap-4">
            <div>
                <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
                    Storico Partite
                </h1>
                <p class="text-sm text-muted-foreground mt-1">
                    {#await data.streamed.matches then m}
                        {m?.length ?? 0} partite trovate
                    {/await}
                </p>
            </div>
            {#if data.isAuthenticated}
                <div class="flex-shrink-0">
                    <MatchDialog data={dialogData} on:saved={onSavedLocal} />
                </div>
            {/if}
        </div>
    </div>

    <!-- Filtri compatti -->
    <div class="flex flex-wrap gap-2 mb-6">
        <!-- Stagione -->
        <select
            class="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
            bind:value={activeSeason}
            onchange={() => applySeasonFilter(activeSeason)}
            aria-label="Filtra per stagione"
        >
            <option value="all">Tutte le stagioni</option>
            <option value="__none__">Senza stagione</option>
            {#each data.seasonOptions ?? [] as option (option.value)}
                <option value={option.value}>{option.label}</option>
            {/each}
        </select>

        <!-- Giocatore -->
        <Popover.Root bind:open={playerOpen}>
            <Popover.Trigger bind:ref={playerTrigger}>
                {#snippet child({ props }: { props: Record<string, any> })}
                    <Button
                        {...props}
                        variant="outline"
                        class="h-9 gap-1.5 font-normal text-sm {playerFilterId
                            ? 'border-primary-500 text-primary-600'
                            : ''}"
                        aria-label="Filtra per giocatore"
                    >
                        {labelForPlayer(playerFilterId)}
                        {#if playerFilterId}
                            <button
                                class="ml-0.5 hover:text-destructive transition-colors"
                                onclick={(e) => {
                                    e.stopPropagation();
                                    resetPlayerFilter();
                                }}
                                aria-label="Rimuovi filtro giocatore"
                            >
                                <X class="size-3" />
                            </button>
                        {:else}
                            <ChevronDownIcon class="size-3.5 opacity-60" />
                        {/if}
                    </Button>
                {/snippet}
            </Popover.Trigger>
            <Popover.Content class="w-[260px] p-0" align="start">
                <Command.Root>
                    <Command.Input placeholder="Cerca giocatore…" />
                    <Command.List>
                        <Command.Empty>Nessun giocatore trovato.</Command.Empty>
                        <Command.Group value="giocatori">
                            {#each playerOptions as opt (opt.value)}
                                <Command.Item
                                    value={opt.label}
                                    onSelect={() => {
                                        playerFilterId = opt.value;
                                        playerOpen = false;
                                        playerTrigger?.focus();
                                    }}
                                >
                                    {opt.label}
                                </Command.Item>
                            {/each}
                        </Command.Group>
                    </Command.List>
                </Command.Root>
            </Popover.Content>
        </Popover.Root>

        <!-- Ordine -->
        <Popover.Root>
            <Popover.Trigger>
                {#snippet child({ props })}
                    <Button
                        {...props}
                        variant="outline"
                        class="h-9 gap-1.5 font-normal text-sm"
                        aria-label="Ordina per data"
                    >
                        {sortKey === "date_desc"
                            ? "Più recenti"
                            : "Più vecchie"}
                        <ChevronDownIcon class="size-3.5 opacity-60" />
                    </Button>
                {/snippet}
            </Popover.Trigger>
            <Popover.Content class="w-[180px] p-0" align="start">
                <Command.Root>
                    <Command.List>
                        <Command.Group value="ordina">
                            <Command.Item
                                value="Più recenti"
                                onSelect={() => {
                                    sortKey = "date_desc";
                                }}>Più recenti</Command.Item
                            >
                            <Command.Item
                                value="Più vecchie"
                                onSelect={() => {
                                    sortKey = "date_asc";
                                }}>Più vecchie</Command.Item
                            >
                        </Command.Group>
                    </Command.List>
                </Command.Root>
            </Popover.Content>
        </Popover.Root>

        <!-- Chip filtri attivi -->
        {#if activeFilterCount > 0}
            <button
                class="h-9 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground border border-dashed transition-colors flex items-center gap-1.5"
                onclick={() => {
                    playerFilterId = null;
                    activeSeason = "all";
                    sortKey = "date_desc";
                    applySeasonFilter("all");
                }}
            >
                <X class="size-3" /> Azzera filtri ({activeFilterCount})
            </button>
        {/if}
    </div>

    <!-- Lista partite -->
    {#await data.streamed.matches}
        <div class="space-y-3">
            {#each [1, 2, 3] as _}
                <Skeleton class="h-36 w-full rounded-2xl" />
            {/each}
        </div>
    {:then _}
        {#if Array.isArray(sorted) && sorted.length}
            <div class="space-y-3">
                {#each sorted as match (match.match_id ?? match.created_at ?? `${match.match_date}-${match.luogo}-${match.match_number ?? ""}`)}
                    <div in:fade={{ duration: 100 }}>
                        <Match {match} />
                    </div>
                {/each}
            </div>
        {:else}
            <div
                class="flex flex-col items-center justify-center py-20 gap-3 text-center"
            >
                <div
                    class="size-14 rounded-2xl bg-muted flex items-center justify-center"
                >
                    <SlidersHorizontal class="size-6 text-muted-foreground" />
                </div>
                <div>
                    <p class="font-medium">Nessuna partita trovata</p>
                    <p class="text-sm text-muted-foreground mt-0.5">
                        Prova a cambiare i filtri
                    </p>
                </div>
                {#if activeFilterCount > 0}
                    <Button
                        variant="outline"
                        size="sm"
                        onclick={() => {
                            playerFilterId = null;
                            activeSeason = "all";
                            sortKey = "date_desc";
                            applySeasonFilter("all");
                        }}
                    >
                        Azzera filtri
                    </Button>
                {/if}
            </div>
        {/if}
    {/await}
</div>
