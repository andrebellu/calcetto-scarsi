<script lang="ts">
  import { PieChart, Arc, Text } from "layerchart";
  import TrendingUpIcon from "@lucide/svelte/icons/trending-up";
  import * as Chart from "$lib/components/ui/chart/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import Button from "$lib/components/ui/button/button.svelte";
  import Badge from "$lib/components/ui/badge/badge.svelte";

  const { data } = $props<{
    poll: { poll_id: number; title: string; status: string } | null;
    options: Array<{
      option_id: number;
      match_date: string | null;
      luogo: string | null;
      start_time: string | null;
      note: string | null;
    }>;
    counts: Record<number, number>;
    myVotes: Array<{ option_id: number; choice: string }>;
    session: any;
    isLogged: boolean;
    canVote: boolean;
    // players, chosenPlayerId, recentPolls sono presenti
  }>();

  // stato voto
  let busy = $state(false);
  let msg = $state<string | null>(null);
  let busyId = $state<number | null>(null);
  const votedSet = $derived(
    new Set((data.myVotes ?? []).map((v) => v.option_id))
  );

  // stato creazione sondaggio
  let title = $state("");
  type NewOpt = {
    match_date: string;
    luogo: string;
    start_time: string;
    note?: string;
  };
  let newOptions = $state<NewOpt[]>([
    { match_date: "", luogo: "", start_time: "" },
  ]);

  function addRow() {
    newOptions = [...newOptions, { match_date: "", luogo: "", start_time: "" }];
  }
  function removeRow(i: number) {
    newOptions = newOptions.filter((_, idx) => idx !== i);
  }

  async function createPoll() {
    if (!data.isLogged) return;
    busy = true;
    msg = null;
    const res = await fetch("/api/poll", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, options: newOptions }),
    });
    busy = false;
    if (!res.ok) {
      msg = "Errore creazione sondaggio";
      return;
    }
    location.reload();
  }

  async function toggleVote(
    poll_id: number,
    option_id: number,
    checked: boolean
  ) {
    if (!poll_id || busyId !== null) return;
    busyId = option_id;
    const base = `/api/poll/${poll_id}/vote`;

    const res = checked
      ? await fetch(base, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            option_id,
            choice: "yes",
            player_id: chosenPlayerId,
          }),
        })
      : await fetch(`${base}?option_id=${option_id}`, { method: "DELETE" });

    busyId = null;
    if (!res.ok) return;
    if (checked) votedSet.add(option_id);
    else votedSet.delete(option_id);
    location.reload();
  }

  const itWeekday = new Intl.DateTimeFormat("it-IT", { weekday: "long" });
  const itDate = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
  }); // gg/mm

  // pie data
  const chartData = $derived(
    (data.options ?? [])
      .map((opt) => {
        const dt = opt.match_date ? new Date(opt.match_date) : null;
        const dayName = dt ? itWeekday.format(dt) : "";
        const dayShort = dt ? itDate.format(dt) : (opt.match_date ?? "");
        const when = [dayName, dayShort, opt.start_time ?? ""]
          .filter(Boolean)
          .join(" • ");
        const label = when || opt.luogo || `Opzione ${opt.option_id}`;
        return { label, value: data.counts[opt.option_id] ?? 0 };
      })
      .filter((d) => d.value > 0)
  );

  const palette = [
    "#6366f1",
    "#06b6d4",
    "#f59e0b",
    "#10b981",
    "#ef4444",
    "#8b5cf6",
    "#22c55e",
    "#f97316",
    "#3b82f6",
    "#eab308",
  ];
  const chartConfig = { value: { label: "Voti" } } satisfies Chart.ChartConfig;

  const players: Array<{ player_id: string; name: string }> =
    data.players as any;
  let tempPlayerId = $state<string>("");
  let chosenPlayerId = $state<string | null>(data.chosenPlayerId ?? null);
  async function confirmPlayerFinal() {
    chosenPlayerId = tempPlayerId;
  }

  let closing = $state(false);
  const isLogged = $derived(!!data.isLogged);

  // Stato tab per sondaggio: 'voto' | 'squadre'
  let tabByPoll = $state<Record<number, "voto" | "squadre">>({});
  const getTab = (id: number) => tabByPoll[id] ?? "voto";
  const setTab = (id: number, t: "voto" | "squadre") =>
    (tabByPoll = { ...tabByPoll, [id]: t });

  // Votanti e squadre per sondaggio
  type Voter = { player_id: string; name: string };
  let votersByPoll = $state<Record<number, Voter[]>>({});
  let teamsByPoll = $state<
    Record<number, { A: Voter[]; B: Voter[]; P?: Voter[] }>
  >({});

  async function loadVoters(poll_id: number) {
    const res = await fetch(`/api/poll/${poll_id}/vote`);
    if (!res.ok) return;
    const voters: { player_id: string; name: string }[] = await res.json();
    votersByPoll = { ...votersByPoll, [poll_id]: voters };
  }

  async function closePoll(poll_id?: number) {
    if (!data.poll && !poll_id) return;
    const id = poll_id ?? data.poll!.poll_id;
    closing = true;
    const res = await fetch(`/api/poll/${id}/finalize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    closing = false;
    if (!res.ok) {
      msg = "Errore chiusura sondaggio";
      return;
    }
    // Porta alla tab "Squadre" e carica i votanti
    setTab(id, "squadre");
    await loadVoters(id);
    // Facoltativo: riflettere nell'URL la tab attiva
    // goto(`/poll?tab=squadre&poll=${id}`, { replaceState: true });
    location.reload();
  }

  let showSpinner = $state(false);
  onMount(() => {
    if (!data.isLogged && !data.poll) {
      showSpinner = true;
      const t = setTimeout(() => {
        goto("/");
      }, 3000);
      return () => clearTimeout(t);
    }
  });

  // ---- helper teams state ----
  type TeamKey = "A" | "B" | "P" | "available";

  // garantisce la presenza delle liste per il sondaggio
  function ensureTeams(poll_id: number) {
    if (!teamsByPoll[poll_id]) {
      teamsByPoll = { ...teamsByPoll, [poll_id]: { A: [], B: [], P: [] } };
    }
    if (!votersByPoll[poll_id]) {
      votersByPoll = { ...votersByPoll, [poll_id]: [] };
    }
  }

  // rimuove un player da tutte le liste di un sondaggio
  function removeEverywhere(poll_id: number, player_id: string) {
    ensureTeams(poll_id);
    votersByPoll[poll_id] = (votersByPoll[poll_id] ?? []).filter(
      (v) => v.player_id !== player_id
    );
    teamsByPoll[poll_id].A = (teamsByPoll[poll_id].A ?? []).filter(
      (v) => v.player_id !== player_id
    );
    teamsByPoll[poll_id].B = (teamsByPoll[poll_id].B ?? []).filter(
      (v) => v.player_id !== player_id
    );
    teamsByPoll[poll_id].P = (teamsByPoll[poll_id].P ?? []).filter(
      (v) => v.player_id !== player_id
    );
  }

  // sposta un player nella destinazione scelta
  function moveTo(v: Voter, dest: "A" | "B" | "P", poll_id: number) {
    ensureTeams(poll_id);
    removeEverywhere(poll_id, v.player_id);
    teamsByPoll = {
      ...teamsByPoll,
      [poll_id]: {
        A:
          dest === "A"
            ? [...(teamsByPoll[poll_id].A ?? []), v]
            : (teamsByPoll[poll_id].A ?? []),
        B:
          dest === "B"
            ? [...(teamsByPoll[poll_id].B ?? []), v]
            : (teamsByPoll[poll_id].B ?? []),
        P:
          dest === "P"
            ? [...(teamsByPoll[poll_id].P ?? []), v]
            : (teamsByPoll[poll_id].P ?? []),
      },
    };
  }

  // rilascia su lista con DnD
  function handleDrop(e: DragEvent, dest: TeamKey, poll_id: number) {
    e.preventDefault();
    const text = e.dataTransfer?.getData("application/json");
    if (!text) return;
    const v: Voter & { is_goalkeeper?: boolean } = JSON.parse(text);
    if (dest === "available") {
      // torna tra i disponibili
      removeEverywhere(poll_id, v.player_id);
      votersByPoll = {
        ...votersByPoll,
        [poll_id]: [
          ...(votersByPoll[poll_id] ?? []),
          { player_id: v.player_id, name: v.name },
        ],
      };
    } else {
      moveTo(v, dest, poll_id);
    }
  }

  // prepara il payload DnD
  function handleDragStart(
    e: DragEvent,
    v: Voter & { is_goalkeeper?: boolean }
  ) {
    e.dataTransfer?.setData("application/json", JSON.stringify(v));
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
  }

  // flag portiere nella squadra corrente
  function toggleGK(v: Voter, checked: boolean, poll_id: number) {
    ensureTeams(poll_id);
    const updateFlag = (arr: Voter[]) =>
      arr.map((x) =>
        x.player_id === v.player_id
          ? ({ ...x, is_goalkeeper: checked } as Voter & {
              is_goalkeeper?: boolean;
            })
          : x
      );

    teamsByPoll = {
      ...teamsByPoll,
      [poll_id]: {
        A: updateFlag(teamsByPoll[poll_id].A ?? []),
        B: updateFlag(teamsByPoll[poll_id].B ?? []),
        P: updateFlag(teamsByPoll[poll_id].P ?? []),
      },
    };
  }

  // persistenza assegnazioni: crea/aggancia fixture by poll e upsert giocatori
  async function saveFixturePlayers(
    poll_id: number,
    teams?: {
      A: Voter[];
      B: Voter[];
      P?: (Voter & { is_goalkeeper?: boolean })[];
    }
  ) {
    ensureTeams(poll_id);
    const merged = teams ?? teamsByPoll[poll_id];
    if (!merged) return;

    const assignments = [
      ...(merged.A ?? []).map((v) => ({
        player_id: v.player_id,
        team: "A",
        is_goalkeeper: (v as any).is_goalkeeper ?? false,
      })),
      ...(merged.B ?? []).map((v) => ({
        player_id: v.player_id,
        team: "B",
        is_goalkeeper: (v as any).is_goalkeeper ?? false,
      })),
      ...(merged.P ?? []).map((v) => ({
        player_id: v.player_id,
        team: "P",
        is_goalkeeper: (v as any).is_goalkeeper ?? false,
      })),
    ];

    // Endpoint lato server suggerito: crea se manca la fixture per questo poll e poi upsert su fixture_player
    const res = await fetch(`/api/fixture/by-poll/${poll_id}/players`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ players: assignments }),
    });
    if (!res.ok) {
      msg = "Errore salvataggio convocati";
      return;
    }
    msg = "Convocati salvati";
  }

  // conferma convocati e blocca la fixture; poi opzionale redirect
  async function confirmFixture(poll_id: number) {
    const t = teamsByPoll[poll_id] ?? { A: [], B: [], P: [] };
    const players = [
      ...(t.A ?? []).map((v) => ({
        player_id: v.player_id,
        team: "A",
        is_goalkeeper: (v as any).is_goalkeeper ?? false,
      })),
      ...(t.B ?? []).map((v) => ({
        player_id: v.player_id,
        team: "B",
        is_goalkeeper: (v as any).is_goalkeeper ?? false,
      })),
      ...(t.P ?? []).map((v) => ({
        player_id: v.player_id,
        team: "P",
        is_goalkeeper: (v as any).is_goalkeeper ?? false,
      })),
    ];
    const res = await fetch(`/api/fixture/by-poll/${poll_id}/confirm`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ players }),
    });
    msg = res.ok ? "Convocati confermati" : "Errore conferma convocati";
  }
</script>

<div class="mx-auto max-w-3xl pt-4 sm:pt-6 px-3 sm:px-6">
  <Button href="/">Torna alla home</Button>
</div>

{#if data.isLogged}
  <div class="mx-auto max-w-3xl p-4 sm:p-6 space-y-4 sm:space-y-6">
    <h2 class="text-lg sm:text-xl font-bold mb-2 sm:mb-3">
      Crea nuovo sondaggio
    </h2>
    <div class="space-y-3 sm:space-y-4">
      <input
        class="w-full border rounded-lg px-3 py-2"
        placeholder="Titolo"
        bind:value={title}
      />

      {#each newOptions as opt, i}
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <input
            class="border rounded-lg px-2 py-2"
            type="date"
            bind:value={opt.match_date}
          />
          <input
            class="border rounded-lg px-2 py-2"
            placeholder="Luogo"
            bind:value={opt.luogo}
          />
          <input
            class="border rounded-lg px-2 py-2"
            type="time"
            bind:value={opt.start_time}
          />
        </div>

        <div class="flex flex-col sm:flex-row gap-2">
          <input
            class="flex-1 border rounded-lg px-2 py-2"
            placeholder="Note (opzionali)"
            bind:value={opt.note}
          />
          {#if newOptions.length > 1}
            <button
              type="button"
              class="px-3 py-2 border rounded-lg"
              onclick={() => removeRow(i)}
            >
              −
            </button>
          {/if}
        </div>
      {/each}

      <div class="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          class="px-3 py-2 border rounded-lg"
          type="button"
          onclick={addRow}
        >
          + Aggiungi orario
        </button>

        <button
          class="px-4 py-2 rounded-lg text-white bg-primary-600 disabled:opacity-60 w-full sm:w-auto"
          onclick={createPoll}
          disabled={busy || !title || newOptions.length === 0}
        >
          Crea sondaggio
        </button>
      </div>

      {#if msg}<p class="text-sm mt-1">{msg}</p>{/if}
    </div>
  </div>
{/if}

{#if data.recentPolls && data.recentPolls.length > 0}
  {#each data.recentPolls as recent (recent.poll_id)}
    <div class="mx-auto max-w-3xl p-4 sm:p-6 space-y-4 sm:space-y-6">
      <header class="space-y-2">
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
        >
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
            {recent.title}
          </h1>

          {#if isLogged && recent.status === "open"}
            <div class="mt-1 sm:mt-2 flex gap-2">
              <AlertDialog.Root>
                <AlertDialog.Trigger
                  class={buttonVariants({ variant: "destructive" })}
                  disabled={closing}
                >
                  {closing ? "Chiusura..." : "Chiudi sondaggio"}
                </AlertDialog.Trigger>

                <AlertDialog.Content class="max-w-md">
                  <AlertDialog.Header>
                    <AlertDialog.Title>
                      Chiudere definitivamente il sondaggio?
                    </AlertDialog.Title>
                    <AlertDialog.Description>
                      L’azione finalizza il sondaggio e imposta lo stato a
                      "closed". Operazione irreversibile.
                    </AlertDialog.Description>
                  </AlertDialog.Header>
                  <AlertDialog.Footer>
                    <AlertDialog.Cancel
                      class={buttonVariants({ variant: "outline" })}
                    >
                      Annulla
                    </AlertDialog.Cancel>
                    <AlertDialog.Action
                      class={buttonVariants({ variant: "destructive" })}
                      onclick={() => closePoll(recent.poll_id)}
                    >
                      Conferma chiusura
                    </AlertDialog.Action>
                  </AlertDialog.Footer>
                </AlertDialog.Content>
              </AlertDialog.Root>
            </div>
          {/if}
        </div>

        {#if recent.status === "closed"}
          <div class="flex items-center gap-2">
            <Badge class="bg-red-100 text-red-700">Sondaggio chiuso</Badge>
            {#if isLogged}
              <button
                class={buttonVariants({ variant: "default" })}
                onclick={async () => {
                  setTab?.(recent.poll_id, "squadre");
                  await loadVoters?.(recent.poll_id);
                }}
              >
                Vai a Squadre
              </button>
            {/if}
          </div>
        {:else if recent.status === "open"}
          <p class="text-sm text-muted-foreground">
            Per votare seleziona uno o più giorni disponibili; un secondo clic
            sulla stessa data rimuove il voto.
          </p>
          <Badge class="bg-green-100 text-green-700">Sondaggio aperto</Badge>
        {/if}
      </header>

      <!-- Tablist ARIA: Votazione | Squadre -->
      <div
        role="tablist"
        aria-label="Sezioni sondaggio"
        class="flex gap-2 border-b pb-2"
      >
        <button
          role="tab"
          aria-selected={getTab?.(recent.poll_id) === "voto"}
          aria-controls={`panel-voto-${recent.poll_id}`}
          id={`tab-voto-${recent.poll_id}`}
          class="px-3 py-1.5 rounded-md text-sm border data-[active=true]:bg-primary-600 data-[active=true]:text-white"
          data-active={getTab?.(recent.poll_id) === "voto"}
          onclick={() => setTab?.(recent.poll_id, "voto")}
        >
          Votazione
        </button>
        <button
          role="tab"
          aria-selected={getTab?.(recent.poll_id) === "squadre"}
          aria-controls={`panel-squadre-${recent.poll_id}`}
          id={`tab-squadre-${recent.poll_id}`}
          class="px-3 py-1.5 rounded-md text-sm border data-[active=true]:bg-primary-600 data-[active=true]:text-white"
          data-active={getTab?.(recent.poll_id) === "squadre"}
          onclick={async () => {
            setTab?.(recent.poll_id, "squadre");
            await loadVoters?.(recent.poll_id);
          }}
        >
          Squadre
        </button>
      </div>

      <!-- Pannello Votazione -->
      <section
        role="tabpanel"
        id={`panel-voto-${recent.poll_id}`}
        aria-labelledby={`tab-voto-${recent.poll_id}`}
        class="space-y-3"
        hidden={getTab?.(recent.poll_id) !== "voto"}
      >
        <section
          class="rounded-2xl border p-3 sm:p-4 space-y-3"
          class:hidden={recent.status === "closed"}
        >
          <div class="flex items-center justify-between">
            <h3 class="text-base sm:text-lg font-semibold">Giocatore</h3>
            {#if chosenPlayerId}
              <span
                class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700"
                >bloccato</span
              >
            {/if}
          </div>

          {#if !chosenPlayerId}
            <div class="flex flex-col sm:flex-row gap-2">
              <select
                class="border rounded-lg px-3 py-2 w-full sm:flex-1"
                bind:value={tempPlayerId}
              >
                <option value="" disabled>Seleziona giocatore…</option>
                {#each players as p}
                  <option value={p.player_id} class="text-black"
                    >{p.name}</option
                  >
                {/each}
              </select>

              <AlertDialog.Root>
                <AlertDialog.Trigger
                  class={buttonVariants({ variant: "default" })}
                  disabled={!tempPlayerId || tempPlayerId.length === 0}
                >
                  Conferma
                </AlertDialog.Trigger>

                <AlertDialog.Content class="max-w-md">
                  <AlertDialog.Header>
                    <AlertDialog.Title
                      >Confermare il giocatore?</AlertDialog.Title
                    >
                    <AlertDialog.Description>
                      Questa scelta sarà <span class="font-bold"
                        >definitiva</span
                      >
                      per questo sondaggio e non potrà essere modificata.
                      <br /><br />
                      <span class="font-bold">
                        Si chiede di votare solo con il proprio giocatore e
                        solamente da un dispositivo.
                      </span>
                    </AlertDialog.Description>
                  </AlertDialog.Header>
                  <AlertDialog.Footer>
                    <AlertDialog.Cancel
                      class={buttonVariants({ variant: "outline" })}
                    >
                      Annulla
                    </AlertDialog.Cancel>
                    <AlertDialog.Action
                      class={buttonVariants({ variant: "default" })}
                      onclick={confirmPlayerFinal}
                    >
                      Conferma
                    </AlertDialog.Action>
                  </AlertDialog.Footer>
                </AlertDialog.Content>
              </AlertDialog.Root>
            </div>

            <p class="text-xs text-muted-foreground">
              La scelta è definitiva per questo sondaggio.
            </p>
          {:else if chosenPlayerId}
            <p class="text-sm">
              Giocatore selezionato: {players.find(
                (p) => p.player_id === chosenPlayerId
              )?.name ?? "N/D"}
            </p>
          {:else if recent.status === "closed"}{/if}
        </section>

        <!-- Lista opzioni -->
        <section class="space-y-3" class:hidden={recent.status === "closed"}>
          {#each data.options as opt}
            {@const dt = opt.match_date ? new Date(opt.match_date) : null}
            {@const dayName = dt ? itWeekday.format(dt) : ""}
            {@const dayShort = dt ? itDate.format(dt) : (opt.match_date ?? "")}

            <label class="flex items-center gap-3 p-3 rounded-xl border">
              <input
                type="checkbox"
                checked={votedSet.has(opt.option_id)}
                disabled={recent.status !== "open" ||
                  busyId === opt.option_id ||
                  !chosenPlayerId}
                onchange={(e) =>
                  toggleVote(
                    recent.poll_id,
                    opt.option_id,
                    (e.currentTarget as HTMLInputElement).checked
                  )}
              />
              <div class="flex-1">
                <div class="font-semibold">
                  {opt.luogo} • {dayName}
                  {dayShort} • {opt.start_time}
                </div>
                {#if opt.note}
                  <div class="text-sm text-muted-foreground">
                    {opt.note}
                  </div>
                {/if}
              </div>
              <div class="text-sm text-gray-700 shrink-0">
                Voti: {data.counts[opt.option_id] ?? 0}
              </div>
            </label>
          {/each}
        </section>

        <!-- Grafico riepilogo -->
        <Card.Root class="flex flex-col">
          <Card.Header class="items-center text-center">
            <Card.Title>Preferenze per data</Card.Title>
            <Card.Description
              >Distribuzione dei voti tra le opzioni proposte</Card.Description
            >
          </Card.Header>
          <Card.Content class="flex-1">
            {#if chartData.length > 0}
              <Chart.Container
                config={chartConfig}
                class="mx-auto aspect-square max-h-[280px]"
              >
                <PieChart
                  data={chartData.map((d, i) => ({
                    ...d,
                    color: palette[i % palette.length],
                  }))}
                  key="label"
                  value="value"
                  cRange={palette}
                  c="color"
                  props={{
                    pie: {
                      innerRadius: 0.55,
                      padAngle: 0.01,
                      cornerRadius: 3,
                      motion: "tween",
                    },
                  }}
                >
                  {#snippet tooltip()}
                    <Chart.Tooltip hideLabel />
                  {/snippet}
                  {#snippet arc({ props, visibleData, index })}
                    {@const label = (visibleData as Array<{ label: string }>)[
                      index
                    ].label}
                    <Arc {...props}>
                      {#snippet children({ getArcTextProps })}
                        <Text
                          value={label}
                          {...getArcTextProps("centroid")}
                          font-size="11"
                          class="fill-background"
                        />
                      {/snippet}
                    </Arc>
                  {/snippet}
                </PieChart>
              </Chart.Container>
            {:else}
              <div class="text-sm text-muted-foreground text-center py-6">
                Nessun voto ancora registrato
              </div>
            {/if}
          </Card.Content>
          <Card.Footer class="flex-col gap-2 text-sm">
            <div class="flex items-center gap-2 font-medium leading-none">
              Trend aggiornato in tempo reale <TrendingUpIcon class="size-4" />
            </div>
            <div class="text-muted-foreground leading-none">
              Mostra il totale voti per ogni data proposta
            </div>
          </Card.Footer>
        </Card.Root>
      </section>

      <!-- Pannello Squadre (solo admin) -->
      <section
        role="tabpanel"
        id={`panel-squadre-${recent.poll_id}`}
        aria-labelledby={`tab-squadre-${recent.poll_id}`}
        hidden={getTab?.(recent.poll_id) !== "squadre"}
        class="rounded-2xl border p-3 sm:p-4 space-y-3"
      >
        {#if isLogged}
          <div class="flex flex-wrap items-center gap-2">
            <button
              class={buttonVariants({ variant: "outline" })}
              onclick={() => loadVoters(recent.poll_id)}
            >
              Carica votanti
            </button>
            <button
              class={buttonVariants({ variant: "default" })}
              onclick={() => confirmFixture(recent.poll_id)}
            >
              Conferma convocati
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <!-- Disponibili -->
            <div>
              <h4 class="font-semibold mb-2">Disponibili</h4>
              <ul
                class="space-y-1 border rounded-md p-2 min-h-40"
                ondrop={(e) => handleDrop?.(e, "available", recent.poll_id)}
              >
                {#each votersByPoll[recent.poll_id] ?? [] as v (v.player_id)}
                  <li
                    draggable="true"
                    ondragstart={(e) => handleDragStart?.(e, v)}
                    class="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-muted/40"
                  >
                    <span>{v.name}</span>
                    <div class="flex gap-1">
                      <button
                        class="text-xs px-2 py-1 border rounded"
                        onclick={() => moveTo?.(v, "A", recent.poll_id)}
                        >A</button
                      >
                      <button
                        class="text-xs px-2 py-1 border rounded"
                        onclick={() => moveTo?.(v, "B", recent.poll_id)}
                        >B</button
                      >
                    </div>
                  </li>
                {/each}
                {#if !(votersByPoll[recent.poll_id] ?? []).length}
                  <li class="text-sm text-muted-foreground">
                    Nessun votante caricato
                  </li>
                {/if}
              </ul>
            </div>

            <!-- Squadra A -->
            <div>
              <h4 class="font-semibold mb-2">Squadra A</h4>
              <ul
                class="space-y-1 border rounded-md p-2 min-h-40"
                ondrop={(e) => handleDrop?.(e, "A", recent.poll_id)}
              >
                {#each teamsByPoll?.[recent.poll_id]?.A ?? [] as v (v.player_id)}
                  <li
                    draggable="true"
                    ondragstart={(e) => handleDragStart?.(e, v)}
                    class="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-muted/40"
                  >
                    <span>{v.name}</span>
                  </li>
                {/each}
              </ul>
            </div>

            <!-- Squadra B -->
            <div>
              <h4 class="font-semibold mb-2">Squadra B</h4>
              <ul
                class="space-y-1 border rounded-md p-2 min-h-40"
                ondrop={(e) => handleDrop?.(e, "B", recent.poll_id)}
              >
                {#each teamsByPoll?.[recent.poll_id]?.B ?? [] as v (v.player_id)}
                  <li
                    draggable="true"
                    ondragstart={(e) => handleDragStart?.(e, v)}
                    class="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-muted/40"
                  >
                    <span>{v.name}</span>
                  </li>
                {/each}
              </ul>
            </div>
          </div>
        {/if}
      </section>
    </div>
  {/each}
{:else if !data.isLogged && !data.poll}
  <div
    class="mx-auto max-w-3xl p-6 flex flex-col items-center justify-center gap-4"
  >
    <p class="text-center text-muted-foreground">Nessun sondaggio attivo</p>
    {#if showSpinner}
      <svg class="animate-spin h-8 w-8 text-primary-500" viewBox="0 0 24 24">
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
          fill="none"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
    {/if}
  </div>
{/if}
