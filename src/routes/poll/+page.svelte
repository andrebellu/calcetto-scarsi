<script lang="ts">
  import { PieChart, Arc, Text } from "layerchart";
  import TrendingUpIcon from "@lucide/svelte/icons/trending-up";
  import * as Chart from "$lib/components/ui/chart/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { buttonVariants } from "$lib/components/ui/button/index.js";

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
  }>();

  // stato voto
  let busy = $state(false);
  let msg = $state<string | null>(null);
  // selezione UI corrente
  let busyId = $state<number | null>(null);
  const votedSet = $derived(
    new Set((data.myVotes ?? []).map((v) => v.option_id))
  ); // stato creazione sondaggio
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

  // toggleVote in +page.svelte
  async function toggleVote(option_id: number, checked: boolean) {
    if (!data.poll || !data.canVote || busyId !== null) return;
    busyId = option_id;
    const base = `/api/poll/${data.poll.poll_id}/vote`;

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

  // mapping dati per il pie: label compatta e valore dal count
  const chartData = $derived(
    (data.options ?? [])
      .map((opt) => {
        const label =
          `${opt.match_date ?? ""} ${opt.start_time ?? ""}`.trim() ||
          opt.luogo ||
          `Opzione ${opt.option_id}`;
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
  const chartConfig = {
    value: { label: "Voti" },
  } satisfies Chart.ChartConfig;

  const players: Array<{ player_id: string; name: string }> =
    data.players as any;
  let tempPlayerId = $state<string>("");
  let chosenPlayerId = $state<string | null>(data.chosenPlayerId ?? null);

  async function confirmPlayerFinal() {
    // Fissa il giocatore in memoria UI; il vincolo di immutabilità è nel trigger DB
    chosenPlayerId = tempPlayerId;
  }
</script>

{#if data.isLogged}
  <div class="mx-auto max-w-3xl p-6 space-y-6">
    <h2 class="text-xl font-bold mb-3">Crea nuovo sondaggio</h2>
    <div class="space-y-3">
      <input
        class="w-full border rounded-lg px-3 py-2"
        placeholder="Titolo"
        bind:value={title}
      />
      {#each newOptions as opt, i}
        <div class="grid grid-cols-3 gap-2">
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
        <div class="flex gap-2">
          <input
            class="flex-1 border rounded-lg px-2 py-2"
            placeholder="Note (opzionali)"
            bind:value={opt.note}
          />
          {#if newOptions.length > 1}
            <button
              type="button"
              class="px-3 py-2 border rounded-lg"
              on:click={() => removeRow(i)}>−</button
            >
          {/if}
        </div>
      {/each}
      <div class="flex items-center gap-3">
        <button
          class="px-3 py-2 border rounded-lg"
          type="button"
          on:click={addRow}>+ Aggiungi orario</button
        >
        <button
          class="px-4 py-2 rounded-lg text-white bg-primary-600 disabled:opacity-60"
          on:click={createPoll}
          disabled={busy || !title || newOptions.length === 0}
          >Crea sondaggio</button
        >
      </div>
      {#if msg}<p class="text-sm mt-1">{msg}</p>{/if}
    </div>
  </div>
{/if}

{#if data.poll}
  <div class="mx-auto max-w-3xl p-6 space-y-6">
    <header class="space-y-1">
      <h1 class="text-3xl font-bold tracking-tight">{data.poll.title}</h1>
      <p class="text-sm text-muted-foreground">
        Vota uno o più giorni disponibili; un secondo clic sulla stessa data
        rimuove il voto. Stato: {data.poll.status}.
      </p>
    </header>
    <section class="rounded-2xl border p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">Giocatore</h3>
        {#if chosenPlayerId}
          <span
            class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700"
            >bloccato</span
          >
        {/if}
      </div>

      {#if !chosenPlayerId}
        <div class="flex gap-2">
          <select
            class="border rounded-lg px-3 py-2 flex-1"
            bind:value={tempPlayerId}
          >
            <option value="" disabled>Seleziona giocatore…</option>
            {#each players as p}
              <option value={p.player_id} class="text-black">{p.name}</option>
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
                <AlertDialog.Title>Confermare il giocatore?</AlertDialog.Title>
                <AlertDialog.Description>
                  Questa scelta sarà <span class="font-bold"> definitiva</span>
                  per questo sondaggio e non potrà essere modificata. <br />
                  <br />
                  <span class="font-bold"
                    >Si chiede di votare solo con il proprio giocatore e
                    solamente da un dispositivo.</span
                  >
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
      {:else}
        <p class="text-sm">
          Giocatore selezionato: {players.find(
            (p) => p.player_id === chosenPlayerId
          )?.name ?? "N/D"}
        </p>
      {/if}
    </section>

    <!-- Lista opzioni -->
    <section class="space-y-3">
      {#each data.options as opt}
        <label class="flex items-center gap-3 p-3 rounded-xl border">
          <input
            type="checkbox"
            checked={votedSet.has(opt.option_id)}
            disabled={!data.canVote ||
              busyId === opt.option_id ||
              !chosenPlayerId}
            on:change={(e) =>
              toggleVote(opt.option_id, (e.target as HTMLInputElement).checked)}
          />
          <div class="flex-1">
            <div class="font-semibold">
              {opt.luogo} • {opt.match_date} • {opt.start_time}
            </div>
            {#if opt.note}
              <div class="text-sm text-muted-foreground">{opt.note}</div>
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
                {@const label = visibleData[index].label}
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
  </div>
{/if}
