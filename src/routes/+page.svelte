<script>
  import Badge from "$lib/Badge/Badge.svelte";
  export let data;

  let dataDecisa = false;
  let prossimaPartita = {
    data: "20-09-2025",
    ora: "17.30",
    luogo: "Lograto",
  };
</script>

<div
  class="min-h-screen flex flex-col items-center justify-center relative bg-transparent"
>
  <div class="mb-10 mt-8 text-center">
    <h1 class="text-5xl md:text-6xl font-extrabold tracking-tight">
      <span class="font-light">Calcetto per</span>
      <span class="font-bold text-primary-500"> scarsi</span>
    </h1>
    <div class="flex justify-center mt-4 gap-2 items-center">
      <div class="relative">
        <Badge
          content={`${data.playersCount} giocatori`}
          redContent={`${data.tempPlayersCount} temp`}
        />
      </div>
      <Badge content={`${data.totalMatches} partite`} redContent={0} />
      <Badge content={`${data.totalGoals} gol`} redContent={0} />
    </div>

    {#if data.isAuthenticated}
      <div
        class="mt-4 text-green-400 font-semibold flex justify-center items-center"
      >
        <span class="material-symbols-outlined align-middle mr-2">verified</span
        >Sei loggato come admin
      </div>
    {:else}
      <div class="flex justify-center mt-6">
        <a
          href="/auth"
          class="rounded-3xl bg-surface-200/10 shadow-lg border border-white/30 px-8 py-3 text-lg font-semibold text-primary-700 backdrop-blur-md transition hover:scale-105 hover:shadow-2xl"
        >
          <span class="material-symbols-outlined align-middle mr-2">lock</span>
          Entra come admin
        </a>
      </div>
    {/if}
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl px-12">
    <!-- Giocatori -->
    <a
      href="/players"
      class="group block rounded-3xl bg-surface-200 shadow-xl hover:shadow-2xl border border-primary-300 hover:border-primary-400 transition-all p-8 text-center relative overflow-hidden backdrop-blur-md hover:scale-101"
    >
      <span class="material-symbols-outlined text-primary-400 mb-2 transition"
        >apparel</span
      >
      <h2 class="text-2xl font-bold text-surface-900 mb-1">Giocatori</h2>
      <p class="text-surface-600 mb-3">Gestisci giocatori</p>
      <div class="mt-2 text-primary-500 font-semibold group-hover:underline">
        Vai ai giocatori →
      </div>
    </a>

    <!-- Partite -->
    <a
      href="/matches"
      class="group block rounded-3xl bg-surface-200 shadow-xl hover:shadow-2xl border border-primary-300 hover:border-primary-400 transition-all p-8 text-center relative overflow-hidden backdrop-blur-md hover:scale-101"
    >
      <span
        class="material-symbols-outlined text-8xl text-primary-400 mb-2 transition"
        >sports_soccer</span
      >
      <h2 class="text-2xl font-bold text-surface-900 mb-1">Partite</h2>
      <p class="text-surface-600 mb-3">Gestisci partite</p>
      <div class="mt-2 text-primary-500 font-semibold group-hover:underline">
        Vai a partite →
      </div>
    </a>

    <!-- Statistiche -->
    <a
      href="/stats"
      class="group block rounded-3xl bg-surface-200 shadow-xl hover:shadow-2xl border border-primary-300 hover:border-primary-400 transition-all p-8 text-center relative overflow-hidden backdrop-blur-md hover:scale-101"
    >
      <span
        class="material-symbols-outlined text-8xl text-secondary-400 mb-2 transition"
        >bar_chart</span
      >
      <h2 class="text-2xl font-bold text-surface-900 mb-1">Statistiche</h2>
      <p class="text-surface-600 mb-3">Risultati e statistiche giocatori</p>
      <div class="mt-2 text-secondary-500 font-semibold group-hover:underline">
        Vai alle statistiche →
      </div>
    </a>

    <!-- Sondaggio prossima partita -->
    {#if dataDecisa}
      <div
        class="group block rounded-3xl bg-surface-200 shadow-xl hover:shadow-2xl border border-primary-300 hover:border-primary-400 transition-all p-8 text-center relative overflow-hidden backdrop-blur-md"
      >
        <span
          class="material-symbols-outlined text-8xl text-secondary-400 mb-2 transition"
          >stadium</span
        >
        <h2 class="text-2xl font-bold text-surface-900 mb-1">
          {prossimaPartita.luogo}
        </h2>
        <p class="text-surface-600 mb-3">
          Prossima partita: {prossimaPartita.data} alle {prossimaPartita.ora}
        </p>
        <div
          class="mt-2 text-secondary-500 font-semibold group-hover:underline"
        >
          Arrivare mezz'ora prima!
        </div>
      </div>
    {:else}
      <a
        href="/poll"
        class="group block rounded-3xl bg-surface-200 shadow-xl hover:shadow-2xl border border-primary-300 hover:border-primary-400 transition-all p-8 text-center relative overflow-hidden backdrop-blur-md hover:scale-101"
      >
        <span
          class="material-symbols-outlined text-8xl text-secondary-400 mb-2 transition"
          >poll</span
        >
        <h2 class="text-2xl font-bold text-surface-900 mb-1">Sondaggio</h2>
        <p class="text-surface-600 mb-3">Vota per la prossima partita</p>
        <div
          class="mt-2 text-secondary-500 font-semibold group-hover:underline"
        >
          Vai al sondaggio →
        </div>
      </a>
    {/if}
  </div>
</div>
