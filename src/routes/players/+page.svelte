<script>
    import Card from "$lib/Card/Card.svelte";
    import CardAdd from "$lib/Card/CardAdd.svelte";
    import Navbar from "$lib/Navbar/Navbar.svelte";
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

<div class="max-w-3xl mx-auto py-8">
    <Navbar />
    <div class="space-y-8 mt-8">
        <section>
            <div class="flex items-center justify-between mb-8">
                <h1 class="text-4xl font-bold text-primary-600 drop-shadow">
                    Giocatori fissi
                </h1>
            </div>
            <div
                class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-6 mb-12"
            >
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
        </section>
        <section>
            <h1 class="text-4xl font-bold text-red-600 drop-shadow mb-6">
                Giocatori temporanei
            </h1>
            <div
                class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-6 mb-12"
            >
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
        </section>
    </div>
</div>
