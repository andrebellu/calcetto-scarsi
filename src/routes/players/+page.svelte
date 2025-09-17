<script>
  import Card from "$lib/Card/Card.svelte";
  import CardAdd from "$lib/Card/CardAdd.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";

  export let data;
  let isAuthenticated = data.isAuthenticated;

  function addPlayer() {
    // Implementa qui la logica per aggiungere un giocatore
    alert("Aggiungi giocatore!");
  }

  function addTempPlayer() {
    // Implementa qui la logica per aggiungere un giocatore temporaneo
    alert("Aggiungi giocatore temporaneo!");
  }
</script>

<div class="min-h-screen py-10 px-4">
  <div class="max-w-5xl mx-auto">
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-4xl font-bold text-primary-600 drop-shadow">
        Giocatori fissi
      </h1>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-6 mb-12">
      {#each data.players.filter((p) => !p.is_temporary) as player}
        <Card
          name={player.name}
          goals={player.goals}
          wins={player.wins}
          matchesPlayed={player.matchesPlayed}
          winRate={player.winRate}
          golPerMatch={player.golPerMatch}
        />
      {/each}
      <CardAdd {isAuthenticated} temp={false} />
    </div>
    <h2 class="text-2xl font-bold text-red-400 mb-4 mt-2">
      Giocatori temporanei
    </h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-6 mb-12">
      {#each data.players.filter((p) => p.is_temporary) as player}
        <Card
          name={player.name}
          goals={player.goals}
          wins={player.wins}
          matchesPlayed={player.matchesPlayed}
          winRate={player.winRate}
          golPerMatch={player.golPerMatch}
        />
      {/each}
      <CardAdd {isAuthenticated} temp={true} />
    </div>
  </div>
</div>

<Dialog.Root>
  <Dialog.Trigger>Open</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Are you sure absolutely sure?</Dialog.Title>
      <Dialog.Description>
        This action cannot be undone. This will permanently delete your account
        and remove your data from our servers.
      </Dialog.Description>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>
