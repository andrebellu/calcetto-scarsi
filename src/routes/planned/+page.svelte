<script lang="ts">
  import type { PageData } from "./$types";
  export let data: PageData;

  // utili per formattazione opzionale lato client
  const partita = data.prossimaPartita;

  // Ordine portieri: usa gk_order da DB se presente, altrimenti mantiene l’ordine originale
  const orderedA = (data.squads?.A ?? [])
    .slice()
    .sort(
      (p1, p2) =>
        (p1.gk_order ?? Number.MAX_SAFE_INTEGER) -
        (p2.gk_order ?? Number.MAX_SAFE_INTEGER)
    );
  const orderedB = (data.squads?.B ?? [])
    .slice()
    .sort(
      (p1, p2) =>
        (p1.gk_order ?? Number.MAX_SAFE_INTEGER) -
        (p2.gk_order ?? Number.MAX_SAFE_INTEGER)
    );
</script>

<div class="mx-auto w-full max-w-4xl px-4 py-6 md:py-10">
  <header class="mb-5 md:mb-8 text-center">
    <h1 class="text-3xl font-extrabold tracking-tight md:text-4xl">
      Convocazioni
    </h1>

    {#if data.dataDecisa && partita}
      <div
        class="mt-3 inline-flex flex-col items-center gap-2 rounded-2xl border px-4 py-3 text-surface-700 shadow-sm md:px-5"
      >
        <p class="text-base leading-tight">
          Prossima partita:
          <span class="font-semibold">{partita.luogo}</span>
          • <span class="font-semibold">{partita.data}</span>
          alle <span class="font-semibold">{partita.ora}</span>
        </p>
        <p class="text-sm text-surface-500">
          Ricordarsi di arrivare <span class="font-semibold">30 min</span> prima.
        </p>
      </div>
    {:else}
      <p class="mt-3 text-surface-600">Nessuna convocazione confermata.</p>
    {/if}

    <nav class="mt-4 flex items-center justify-center gap-4">
      <a href="/" class="text-primary-600 underline">Torna alla home</a>
      {#if data.isAuthenticated}
        <a href="/poll" class="text-secondary-600 underline"
          >Crea nuovo sondaggio</a
        >
      {/if}
    </nav>
  </header>

  {#if data.dataDecisa && data.squads}
    <!-- Dettagli partita (mobile-first) -->
    <section class="mb-4 block md:hidden">
      <div class="rounded-xl bg-surface-100/60 border p-4">
        <h2 class="text-lg font-semibold mb-1">Dettagli partita</h2>
        <p class="text-sm text-surface-600">
          {partita?.luogo} — {partita?.data} — {partita?.ora}
        </p>
      </div>
    </section>

    <!-- Squadre -->
    <section class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <!-- Squadra A: bordo rosso -->
      <div
        class="rounded-2xl border border-red-400 p-4 shadow-sm backdrop-blur"
      >
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-lg font-bold">Squadra A</h2>
          <span
            class="text-xs rounded-full bg-red-100 text-red-700 px-2 py-0.5"
          >
            {data.squads.A.length} convocati
          </span>
        </div>

        {#if data.squads.A.length > 0}
          <ul class="divide-y divide-red-100">
            {#each data.squads.A as p (p.player_id)}
              <li class="flex items-center justify-between py-2">
                <span class="text-sm">{p.name}</span>
                {#if p.is_goalkeeper}
                  <span
                    class="text-[11px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800"
                    >GK</span
                  >
                {/if}
              </li>
            {/each}
          </ul>
        {:else}
          <p class="text-sm text-muted-foreground">
            Nessun giocatore assegnato
          </p>
        {/if}
      </div>

      <!-- Squadra B: bordo blu -->
      <div
        class="rounded-2xl border border-blue-400 p-4 shadow-sm backdrop-blur"
      >
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-lg font-bold">Squadra B</h2>
          <span
            class="text-xs rounded-full bg-blue-100 text-blue-700 px-2 py-0.5"
          >
            {data.squads.B.length} convocati
          </span>
        </div>

        {#if data.squads.B.length > 0}
          <ul class="divide-y divide-blue-100">
            {#each data.squads.B as p (p.player_id)}
              <li class="flex items-center justify-between py-2">
                <span class="text-sm">{p.name}</span>
                {#if p.is_goalkeeper}
                  <span
                    class="text-[11px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800"
                    >GK</span
                  >
                {/if}
              </li>
            {/each}
          </ul>
        {:else}
          <p class="text-sm text-muted-foreground">
            Nessun giocatore assegnato
          </p>
        {/if}
      </div>
    </section>

    <!-- Ordine portieri (mini-timeline mobile, lista numerata da md+) -->
    <section class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      <!-- Ordine A -->
      <div class="rounded-2xl border border-red-400 p-4 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold">Ordine portieri — A</h3>
          <span
            class="text-[11px] rounded-full bg-red-100 text-red-700 px-2 py-0.5"
          >
            {orderedA.length} GK
          </span>
        </div>

        <!-- Mobile: timeline verticale -->
        <ul class="md:hidden relative pl-6 border-l border-red-200 space-y-3">
          {#if orderedA.length}
            {#each orderedA as p, i (p.player_id)}
              <li class="relative">
                <span
                  class="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-red-200"
                ></span>
                <div
                  class="flex items-center justify-between rounded-lg bg-red-400/80 border border-red-100 px-3 py-1.5"
                >
                  <span class="text-sm">{p.name}</span>
                  <span
                    class="text-xs rounded-full bg-white px-2 py-0.5 text-red-700"
                    >#{i + 1}</span
                  >
                </div>
              </li>
            {/each}
          {:else}
            <li class="text-sm text-muted-foreground">Nessun giocatore</li>
          {/if}
        </ul>

        <!-- Desktop/Tablet: lista numerata -->
        <ol class="hidden md:block list-decimal list-inside space-y-1">
          {#if orderedA.length}
            {#each orderedA as p, i (p.player_id)}
              <li
                class="flex items-center justify-between rounded-lg border border-red-100 bg-red-400 px-3 py-1.5"
              >
                <span class="text-sm">{p.name}</span>
                <span
                  class="text-xs rounded-full bg-white px-2 py-0.5 text-red-700"
                  >#{i + 1}</span
                >
              </li>
            {/each}
          {:else}
            <li class="text-sm text-muted-foreground list-none">
              Nessun giocatore
            </li>
          {/if}
        </ol>
      </div>

      <!-- Ordine B -->
      <div class="rounded-2xl border border-blue-400 p-4 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold">Ordine portieri — B</h3>
          <span
            class="text-[11px] rounded-full bg-blue-100 text-blue-700 px-2 py-0.5"
          >
            {orderedB.length} GK
          </span>
        </div>

        <!-- Mobile: timeline verticale -->
        <ul class="md:hidden relative pl-6 border-l border-blue-200 space-y-3">
          {#if orderedB.length}
            {#each orderedB as p, i (p.player_id)}
              <li class="relative">
                <span
                  class="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-blue-200"
                ></span>
                <div
                  class="flex items-center justify-between rounded-lg bg-blue-400/80 border border-blue-100 px-3 py-1.5"
                >
                  <span class="text-sm">{p.name}</span>
                  <span
                    class="text-xs rounded-full bg-white px-2 py-0.5 text-blue-700"
                    >#{i + 1}</span
                  >
                </div>
              </li>
            {/each}
          {:else}
            <li class="text-sm text-muted-foreground">Nessun giocatore</li>
          {/if}
        </ul>

        <!-- Desktop/Tablet: lista numerata -->
        <ol class="hidden md:block list-decimal list-inside space-y-1">
          {#if orderedB.length}
            {#each orderedB as p, i (p.player_id)}
              <li
                class="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-400 px-3 py-1.5"
              >
                <span class="text-sm">{p.name}</span>
                <span
                  class="text-xs rounded-full bg-white px-2 py-0.5 text-blue-700"
                  >#{i + 1}</span
                >
              </li>
            {/each}
          {:else}
            <li class="text-sm text-muted-foreground list-none">
              Nessun giocatore
            </li>
          {/if}
        </ol>
      </div>
    </section>

    <!-- Panchina (mobile-first, intera larghezza) -->
    {#if data.squads.P?.length}
      <section class="mt-4 rounded-2xl border p-4 shadow-sm backdrop-blur">
        <h3 class="text-base font-semibold mb-2">Panchina</h3>
        <ul class="flex flex-wrap gap-2">
          {#each data.squads.P as p (p.player_id)}
            <li class="text-sm rounded-full border px-3 py-1">{p.name}</li>
          {/each}
        </ul>
      </section>
    {/if}
  {/if}
</div>
