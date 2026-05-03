<script lang="ts">
  import HomeCard from "$lib/HomeCard/HomeCard.svelte";
  import { homeCards } from "$lib/homeCardsData";
  export let data;
</script>

<div class="min-h-dvh flex flex-col items-center justify-center bg-transparent px-4 py-8 md:py-12">
  <div class="w-full max-w-4xl px-0 md:px-8">

    <!-- Admin pill -->
    {#if data.isAuthenticated}
      <div class="inline-flex items-center gap-2 bg-green-950/40 text-green-400 text-xs font-medium px-3 py-1.5 rounded-full border border-green-800/50 mb-5">
        <span class="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
        Loggato come admin
      </div>
    {:else}
      <div class="mb-5">
        <a
                href="/auth"
                class="inline-flex items-center gap-2 text-sm text-surface-400 hover:text-primary-400 transition"
        >
          <span class="material-symbols-outlined text-base">lock</span>
          Entra come admin
        </a>
      </div>
    {/if}

    <!-- Title -->
    <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight leading-none mb-6">
      <span class="font-light text-surface-200">Calcetto per</span><br />
      <span class="text-primary-500">scarsi</span>
    </h1>

    <!-- Stats strip -->
    <div class="flex flex-wrap gap-3 mb-8">
      <div class="bg-surface-800/50 border border-surface-700/50 rounded-lg px-4 py-2.5 flex flex-col">
        <span class="text-xl font-medium text-surface-100 leading-none">
          {data.playersCount}
          {#if data.tempPlayersCount > 0}
            <span class="text-sm text-red-400 font-medium">+{data.tempPlayersCount} temp</span>
          {/if}
        </span>
        <span class="text-[11px] uppercase tracking-widest text-surface-400 mt-1">Giocatori</span>
      </div>
      <div class="bg-surface-800/50 border border-surface-700/50 rounded-lg px-4 py-2.5 flex flex-col">
        <span class="text-xl font-medium text-surface-100 leading-none">{data.totalMatches}</span>
        <span class="text-[11px] uppercase tracking-widest text-surface-400 mt-1">Partite</span>
      </div>
      <div class="bg-surface-800/50 border border-surface-700/50 rounded-lg px-4 py-2.5 flex flex-col">
        <span class="text-xl font-medium text-surface-100 leading-none">{data.totalGoals}</span>
        <span class="text-[11px] uppercase tracking-widest text-surface-400 mt-1">Gol totali</span>
      </div>
    </div>

    <!-- Next match / Poll banner -->
    {#if data.dataDecisa && data.prossimaPartita}
      <div class="w-full bg-surface-800/40 border border-primary-600/60 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div class="flex items-center gap-4">
          <div class="w-11 h-11 bg-primary-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
            <span class="material-symbols-outlined text-primary-400">stadium</span>
          </div>
          <div>
            <p class="font-semibold text-surface-100">{data.prossimaPartita.luogo}</p>
            <p class="text-sm text-surface-400">
              {new Date(data.prossimaPartita.data).toLocaleDateString("it-IT", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })} · ore {data.prossimaPartita.ora}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          {#if data.isAuthenticated}
            <a
                    href="/poll"
                    class="text-sm text-surface-400 border border-surface-600 rounded-lg px-4 py-2 hover:border-surface-400 transition"
            >
              Crea sondaggio →
            </a>
          {/if}
          <a
                  href="/planned"
                  class="text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white rounded-lg px-4 py-2 transition"
          >
            Convocazioni →
          </a>
        </div>
      </div>
    {:else}
      <div class="w-full bg-surface-800/40 border border-secondary-600/60 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div class="flex items-center gap-4">
          <div class="w-11 h-11 bg-secondary-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
            <span class="material-symbols-outlined text-secondary-400">poll</span>
          </div>
          <div>
            <p class="font-semibold text-surface-100">Sondaggio</p>
            <p class="text-sm text-surface-400">Vota per la prossima partita</p>
          </div>
        </div>
        <a
                href="/poll"
                class="text-sm font-medium bg-secondary-600 hover:bg-secondary-500 text-white rounded-lg px-4 py-2 transition flex-shrink-0"
        >
          Vai al sondaggio →
        </a>
      </div>
    {/if}

    <!-- Nav cards grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
      {#each homeCards as card}
        <HomeCard {...card}>
          Vai a {card.title.toLowerCase()} →
        </HomeCard>
      {/each}
    </div>

  </div>
</div>