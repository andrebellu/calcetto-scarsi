<script lang="ts">
  // Import
  import MatchDialog from "$lib/Match/MatchDialog.svelte";
  import Match from "$lib/Match/Match.svelte";
  import Navbar from "$lib/Navbar/Navbar.svelte";
  import { invalidate } from "$app/navigation";
  import { fade } from "svelte/transition";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as Command from "$lib/components/ui/command/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import { onMount } from "svelte";

  // Props + derived dialog data
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
    isAuthenticated: data.isAuthenticated,
  };

  // UI state
  let sortKey = $state<"date_desc" | "date_asc">("date_desc");

  // Filtro giocatore (combobox)
  let playerOpen = $state(false);
  let playerFilterId = $state<string | null>(null);
  let playerTrigger: HTMLButtonElement = $state(null!);

  // Utils
  function keyOf(m: any) {
    const d = m.match_date ?? m?.match?.match_date ?? m.date;
    const ts = typeof d === "number" ? d : Date.parse(d ?? "");
    return Number.isFinite(ts) ? ts : 0;
  }

  // Derived data
  // Derived data
  const filtered = $derived(
    (() => {
      const list = Array.isArray(data.matches) ? data.matches : [];

      // Normalizza players da player_match e calcola MVP/SVP
      const normalized = list.map((m: any) => {
        const pms = Array.isArray(m.player_match) ? m.player_match : [];
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
          blueScore > redScore ? "blu" : redScore > blueScore ? "rossi" : null;
        const loserTeam = winnerTeam
          ? winnerTeam === "blu"
            ? "rossi"
            : "blu"
          : null;

        function topFor(teamPlayers: any[]) {
          const maxGoals = teamPlayers.reduce(
            (mx: number, p: any) => Math.max(mx, Number(p.goals || 0)),
            0
          );
          const top =
            maxGoals > 0
              ? teamPlayers.filter(
                  (p: any) => Number(p.goals || 0) === maxGoals
                )
              : [];
          return { maxGoals, top };
        }

        let mvpPlayers: any[] = [];
        let svpPlayers: any[] = [];
        let mvpGoals = 0;
        let svpGoals = 0;

        if (winnerTeam) {
          const { maxGoals, top } = topFor(winnerTeam === "blu" ? blue : red);
          mvpPlayers = top;
          mvpGoals = maxGoals;
        }
        if (loserTeam) {
          const { maxGoals, top } = topFor(loserTeam === "blu" ? blue : red);
          svpPlayers = top;
          svpGoals = maxGoals;
        }

        const mvpIds = new Set(
          (mvpPlayers ?? []).map((p: any) => String(p.player_id))
        );
        const svpIds = new Set(
          (svpPlayers ?? []).map((p: any) => String(p.player_id))
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

      // Filtro per giocatore selezionato (per id)
      return normalized.filter(
        (m: any) =>
          Array.isArray(m.players) &&
          m.players.some(
            (p: any) => String(p.player_id) === String(playerFilterId)
          )
      );
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

  // Actions
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

  // Helpers combobox giocatori
  const playerOptions = $derived(
    Array.isArray(data.players)
      ? data.players.map((p: any) => ({
          value: String(p.player_id),
          label: p.name,
        }))
      : []
  );

  function resetPlayerFilter() {
    playerFilterId = null;
  }

  function labelForPlayer(id: string | null) {
    if (!id) return "Filtra giocatore…";
    return (
      playerOptions.find(
        (o: { value: string; label: string }) => o.value === id
      )?.label ?? "Sconosciuto"
    );
  }
</script>

<div class="mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
  <Navbar />

  <div class="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
    <div
      class="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between"
    >
      <header class="flex flex-col">
        <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold text-primary-500">
          Storico Partite
        </h1>
        <p class="text-[13px] sm:text-sm text-muted-foreground mt-1">
          Aggiungi nuove partite e consulta i risultati passati. Filtra per
          giocatore o ordina per data.
        </p>
      </header>

      <div
        class="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center"
      >
        <!-- Combobox giocatore (Popover + Command) -->
        <Popover.Root bind:open={playerOpen}>
          <Popover.Trigger bind:ref={playerTrigger}>
            {#snippet child({ props }: { props: Record<string, any> })}
              <Button
                {...props}
                variant="outline"
                class="w-56 justify-between font-normal"
                aria-label="Filtra per giocatore"
              >
                {labelForPlayer(playerFilterId)}
                <ChevronDownIcon />
              </Button>
            {/snippet}
          </Popover.Trigger>
          <Popover.Content class="w-[320px] p-0" align="start">
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

        {#if playerFilterId}
          <Button
            type="button"
            variant="outline"
            class="px-3"
            aria-label="Azzera filtro giocatore"
            onclick={resetPlayerFilter}
          >
            Pulisci filtro
          </Button>
        {/if}

        <select
          class="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
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
