<script>
  export let isAuthenticated;
  export let temp;
  function addPlayer() {
    // Implementa qui la logica per aggiungere un giocatore
    alert("Aggiungi giocatore!");
  }

  function addTempPlayer() {
    // Implementa qui la logica per aggiungere un giocatore temporaneo
    alert("Aggiungi giocatore temporaneo!");
  }
</script>

<button
  class="card shadow-lg bg-surface-100-900/30 backdrop-blur-md border border-white/30 flex items-center justify-center p-8 text-4xl hover:bg-primary-500/40 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-100-900/30"
  title="Aggiungi giocatore"
  on:click={temp ? addTempPlayer : addPlayer}
  disabled={!isAuthenticated}
>
  +
</button>
