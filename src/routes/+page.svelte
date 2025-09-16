<script>
  import Badge from "$lib/Badge/Badge.svelte";
  export let data;
</script>

<div class="min-h-screen flex flex-col items-center justify-center">
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
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl px-12">
    <!-- Giocatori -->
    <a
      href="/players"
      class="group block rounded-3xl bg-surface-200 shadow-xl hover:shadow-2xl border border-primary-300 hover:border-primary-400 transition-all p-8 text-center relative overflow-hidden backdrop-blur-md hover:scale-101"
    >
      <span
        class="material-symbols-outlined text-primary-400 mb-2 group-hover:scale-110 transition"
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
        class="material-symbols-outlined text-8xl text-primary-400 mb-2 group-hover:scale-110 transition"
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
        class="material-symbols-outlined text-8xl text-secondary-400 mb-2 group-hover:scale-110 transition"
        >bar_chart</span
      >
      <h2 class="text-2xl font-bold text-surface-900 mb-1">Statistiche</h2>
      <p class="text-surface-600 mb-3">Risultati e statistiche giocatori</p>
      <div class="mt-2 text-secondary-500 font-semibold group-hover:underline">
        Vai alle statistiche →
      </div>
    </a>

    <!-- Generatore squadre -->
    <a
      href="/teams"
      class="group block rounded-3xl bg-surface-200 shadow-xl hover:shadow-2xl border border-primary-300 hover:border-primary-400 transition-all p-8 text-center relative overflow-hidden backdrop-blur-md hover:scale-101"
    >
      <span
        class="material-symbols-outlined text-8xl text-secondary-400 mb-2 group-hover:scale-110 transition"
        >groups</span
      >
      <h2 class="text-2xl font-bold text-surface-900 mb-1">
        Generatore squadre
      </h2>
      <p class="text-surface-600 mb-3">Crea squadre casuali o bilanciate</p>
      <div class="mt-2 text-secondary-500 font-semibold group-hover:underline">
        Vai al generatore →
      </div>
    </a>
  </div>
</div>
