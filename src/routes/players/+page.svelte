<script>
  import Card from "$lib/Card/Card.svelte";
  export let data;
</script>

<div class="min-h-screen py-10 px-4">
  <div class="max-w-5xl mx-auto">
    <h1
      class="text-4xl font-bold mb-8 text-center text-primary-600 drop-shadow"
    >
      Giocatori
    </h1>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-6">
      {#each data.players as player}
        <Card
          name={player.name}
          goals={player.goals}
          temp={player.is_temporary}
          wins={player.wins}
          matchesPlayed={player.matchesPlayed}
          winRate={player.winRate}
          golPerMatch={player.golPerMatch}
        />
      {/each}
    </div>
  </div>
</div>
