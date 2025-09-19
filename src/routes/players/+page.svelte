<script lang="ts">
  import Card from "$lib/Card/Card.svelte";
  import CardAdd from "$lib/Card/CardAdd.svelte";
  import Navbar from "$lib/Navbar/Navbar.svelte";
  import { fade } from "svelte/transition";
  import { flip } from "svelte/animate";

  const { data } = $props<{
    isAuthenticated: boolean;
    players: Array<{
      name: string;
      is_temporary: boolean;
      goals: number;
      wins: number;
      matchesPlayed: number;
      winRate: number;
      golPerMatch: number;
    }>;
  }>();

  let isAuthenticated = data.isAuthenticated;

  // stato ricerca e toggle
  let query = $state("");
  let debounced = $state("");
  let showTemporary = $state(true);
  let showFixed = $state(true);

  // debounce: traccia "query" SINCRONAMENTE
  let t: any;
  $effect(() => {
    const q = query; // registra la dipendenza sincrona
    clearTimeout(t);
    t = setTimeout(() => (debounced = q), 250);
    return () => clearTimeout(t);
  });

  // query normalizzata derivata
  const qLower = $derived(debounced.trim().toLowerCase());

  // filtri derivati (niente effetti, niente store manuali)
  const fixedPlayers = $derived(
    (data.players || []).filter((p) => {
      if (p.is_temporary) return false;
      if (!qLower) return true;
      return (p.name || "").toLowerCase().includes(qLower);
    })
  );

  const tempPlayers = $derived(
    (data.players || []).filter((p) => {
      if (!p.is_temporary) return false;
      if (!qLower) return true;
      return (p.name || "").toLowerCase().includes(qLower);
    })
  );
</script>

<div class="mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
  <Navbar />

  <header class="mb-4 sm:mb-6">
    <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold text-primary-500">
      Giocatori
    </h1>
    <p class="text-[13px] sm:text-sm text-muted-foreground mt-1">
      Elenco completo dei giocatori fissi e temporanei con statistiche
      aggregate.
    </p>
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

  <!-- Fissi -->
  {#if showFixed}
    <section
      class="mb-8 sm:mb-12"
      in:fade={{ duration: 120 }}
      out:fade={{ duration: 90 }}
    >
      <div class="flex items-baseline justify-between mb-3 sm:mb-4">
        <h2 class="text-xl sm:text-2xl md:text-3xl font-bold text-primary-600">
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
