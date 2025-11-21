<script lang="ts">
  import Card from "$lib/Card/Card.svelte";
  import CardAdd from "$lib/Card/CardAdd.svelte";
  import Navbar from "$lib/Navbar/Navbar.svelte";
  import { fade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import Skeleton from "$lib/components/ui/skeleton/skeleton.svelte";

  const { data } = $props<{
    data: {
      isAuthenticated: boolean;
      streamed: {
        players: Promise<
          Array<{
            name: string;
            is_temporary: boolean;
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

  $effect(() => {
    data.streamed.players.then((res) => {
      players = res || [];
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

<div class="mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
  <Navbar />

  <header
    class="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
  >
    <div>
      <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold text-primary-500">
        Giocatori
      </h1>
      <p class="text-[13px] sm:text-sm text-muted-foreground mt-1">
        Elenco completo dei giocatori fissi e temporanei con statistiche
        aggregate.
      </p>
    </div>

    <section
      aria-labelledby="legend-title"
      class="rounded-lg p-3 sm:p-4 bg-accent/10 border border-accent/30"
    >
      <h2 id="legend-title" class="sr-only">Legenda simboli</h2>

      <dl
        class="flex items-center gap-2 sm:gap-3 overflow-x-auto sm:overflow-visible no-scrollbar
           text-[11px] sm:text-sm text-muted-foreground px-1 sm:flex-wrap"
      >
        <div class="flex items-center gap-1 shrink-0">
          <dt
            aria-hidden="true"
            class="material-symbols-outlined text-[15px] text-green-600"
          >
            sports_soccer
          </dt>
          <dd>Gol</dd>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <dt
            aria-hidden="true"
            class="material-symbols-outlined text-[15px] text-blue-600"
          >
            stadium
          </dt>
          <dd>Presenze</dd>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <dt
            aria-hidden="true"
            class="material-symbols-outlined text-[15px] text-yellow-600"
          >
            bar_chart
          </dt>
          <dd>Gol/Partita</dd>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <dt
            aria-hidden="true"
            class="material-symbols-outlined text-[15px] text-purple-500"
          >
            emoji_events
          </dt>
          <dd>Vittorie</dd>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <dt
            aria-hidden="true"
            class="material-symbols-outlined text-[15px] text-pink-600"
          >
            percent
          </dt>
          <dd>Win%</dd>
        </div>
      </dl>
    </section>
  </header>

  <!-- Toolbar -->
  <div
    class="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center mb-4 sm:mb-6"
  >
    <input
      type="search"
      placeholder="Cerca giocatore…"
      class="w-full sm:w-auto flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      bind:value={query}
      aria-label="Cerca giocatore"
    />

    <div class="flex gap-2 overflow-x-auto no-scrollbar">
      <button
        type="button"
        class="px-3 sm:px-4 py-2 rounded-2xl font-semibold border transition-all hover:bg-primary hover:text-white"
        class:bg-primary={showFixed}
        class:text-white={showFixed}
        onclick={() => (showFixed = !showFixed)}
        aria-pressed={showFixed}
      >
        {showFixed ? "Mostra fissi ✓" : "Mostra fissi"}
      </button>

      <button
        type="button"
        class="px-3 sm:px-4 py-2 rounded-2xl font-semibold border transition-all hover:bg-primary hover:text-white"
        class:bg-primary={showTemporary}
        class:text-white={showTemporary}
        onclick={() => (showTemporary = !showTemporary)}
        aria-pressed={showTemporary}
      >
        {showTemporary ? "Mostra temporanei ✓" : "Mostra temporanei"}
      </button>
    </div>
  </div>

  {#await data.streamed.players}
    <div class="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3 mb-8">
      <Skeleton class="h-48 w-full rounded-xl" />
      <Skeleton class="h-48 w-full rounded-xl" />
      <Skeleton class="h-48 w-full rounded-xl" />
    </div>
  {:then _}
    <!-- Fissi -->
    {#if showFixed}
      <section
        class="mb-8 sm:mb-12"
        in:fade={{ duration: 120 }}
        out:fade={{ duration: 90 }}
      >
        <div class="flex items-baseline justify-between mb-3 sm:mb-4">
          <h2
            class="text-xl sm:text-2xl md:text-3xl font-bold text-primary-600"
          >
            Giocatori fissi
          </h2>
          <span class="text-xs sm:text-sm text-muted-foreground">
            {fixedPlayers.length} elementi
          </span>
        </div>

        <div class="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
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

    <!-- Temporanei -->
    {#if showTemporary}
      <section
        class="mb-8 sm:mb-12"
        in:fade={{ duration: 120 }}
        out:fade={{ duration: 90 }}
      >
        <div class="flex items-baseline justify-between mb-3 sm:mb-4">
          <h2 class="text-xl sm:text-2xl md:text-3xl font-bold text-red-600">
            Giocatori temporanei
          </h2>
          <span class="text-xs sm:text-sm text-muted-foreground">
            {tempPlayers.length} elementi
          </span>
        </div>

        <div class="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
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
  {/await}
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
