<script>
  export let isAuthenticated;
  export let temp;
  function addPlayer() {
    alert("Aggiungi giocatore!");
  }

  function addTempPlayer() {
    alert("Aggiungi giocatore temporaneo!");
  }
</script>

<button
  class="rounded-2xl border border-dashed border-white/15 bg-card/40 backdrop-blur-md flex items-center justify-center min-h-[92px] sm:min-h-[100px] p-3 sm:p-4 text-3xl font-light text-muted-foreground transition-all hover:border-primary-500/70 hover:text-primary-400 hover:bg-primary/10 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:border-white/15 disabled:hover:text-muted-foreground disabled:hover:bg-card/40"
  title="Aggiungi giocatore"
  on:click={temp ? addTempPlayer : addPlayer}
  disabled={!isAuthenticated}
>
  +
</button>
