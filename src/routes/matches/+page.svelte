<script>
    import Match from "$lib/Match/Match.svelte";
    export let data;
    const { matches } = data;

    console.log(matches);
</script>

<div class="min-h-screen py-8">
    <div class="max-w-4xl mx-auto px-4">
        <h1 class="text-3xl font-bold text-center mb-8 text-primary-500">
            Storico Partite
        </h1>
        {#if matches && matches.length > 0}
            <div class="space-y-8">
                {#each matches as match}
                    <Match {match} />
                {/each}
            </div>
        {:else}
            <div class="text-center text-surface-500">
                Nessuna partita trovata.
            </div>
        {/if}
    </div>
</div>
