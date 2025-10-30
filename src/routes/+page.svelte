<script lang="ts">
  import Badge from "$lib/Badge/Badge.svelte";
  import HomeCard from "$lib/HomeCard/HomeCard.svelte";
  import { homeCards } from "$lib/homeCardsData";

  export let data;
</script>

<div
  class="min-h-dvh flex flex-col items-center justify-center bg-transparent px-4 py-6 md:py-10"
>
  <!-- 🔹 Header -->
  <div class="mb-6 md:mb-10 text-center">
    <h1
      class="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight"
    >
      <span class="font-light">Calcetto per</span>
      <span class="font-bold text-primary-500"> scarsi</span>
    </h1>

    <div
      class="flex justify-center mt-3 md:mt-4 gap-2 md:gap-3 items-center flex-wrap"
    >
      <Badge
        content={`${data.playersCount} giocatori`}
        redContent={`${data.tempPlayersCount} temp`}
      />
      <Badge content={`${data.totalMatches} partite`} redContent={0} />
      <Badge content={`${data.totalGoals} gol`} redContent={0} />
    </div>

    {#if data.isAuthenticated}
      <div
        class="mt-3 md:mt-4 text-green-400 font-semibold flex justify-center items-center text-sm md:text-base"
      >
        <span class="material-symbols-outlined align-middle mr-2">verified</span
        >
        Sei loggato come admin
      </div>
    {:else}
      <div class="flex justify-center mt-4 md:mt-6">
        <a
          href="/auth"
          class="rounded-3xl bg-surface-200/10 shadow-lg border border-white/30 px-6 py-2 md:px-8 md:py-3 text-base md:text-lg font-semibold text-primary-700 backdrop-blur-md transition hover:scale-105 hover:shadow-2xl"
        >
          <span class="material-symbols-outlined align-middle mr-2">lock</span>
          Entra come admin
        </a>
      </div>
    {/if}
  </div>

  <div
    class="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-8 w-full max-w-6xl px-0 md:px-12"
  >
    {#each homeCards as card}
      <HomeCard {...card}>
        Vai a {card.title.toLowerCase()} →
      </HomeCard>
    {/each}

    {#if data.dataDecisa && data.prossimaPartita}
      <HomeCard
        title={data.prossimaPartita.luogo}
        description={`Prossima partita: ${new Date(
          data.prossimaPartita.data
        ).toLocaleDateString("it-IT", {
          weekday: "long",
          day: "2-digit",
          month: "long",
        })} di ${data.prossimaPartita.ora}`}
        icon="stadium"
        link="/planned"
        color="secondary"
        highlight={true}
      >
        <a href="/planned">Vedi convocazioni →</a>
        {#if data.isAuthenticated}
          <div class="mt-1 text-primary-500 font-semibold text-sm md:text-base">
            <a href="/poll">Crea nuovo sondaggio →</a>
          </div>
        {/if}
      </HomeCard>
    {:else}
      <HomeCard
        title="Sondaggio"
        description="Vota per la prossima partita"
        icon="poll"
        link="/poll"
        color="secondary"
      >
        Vai al sondaggio →
      </HomeCard>
    {/if}
  </div>
</div>
