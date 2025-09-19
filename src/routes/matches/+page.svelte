<script lang="ts">
    import MatchDialog from "$lib/Match/MatchDialog.svelte";
    import Match from "$lib/Match/Match.svelte";
    import Navbar from "$lib/Navbar/Navbar.svelte";
    import { invalidate } from "$app/navigation";

    const { data } = $props<{
        data: {
            session: any | null;
            user: any | null;
            supabase: any;
            matches: any[] | null;
            players: any[] | null;
            error?: string;
            isAuthenticated: boolean;
        };
    }>();

    // Normalizza per il dialog
    const dialogData = {
        matches: Array.isArray(data.matches) ? data.matches : [],
        players: Array.isArray(data.players) ? data.players : [],
    };

    async function refreshMatches() {
        await invalidate(() => true);
    }
</script>

<div class="max-w-3xl mx-auto py-8 flex flex-col">
    <Navbar />
    <div class="flex flex-col gap-2">
        <MatchDialog
            data={dialogData}
            on:saved={refreshMatches}
            isAuthenticated={data.isAuthenticated}
        />
    </div>
    {#if Array.isArray(data.matches) && data.matches.length}
        <div class="space-y-8">
            {#each data.matches as match}
                <Match {match} />
            {/each}
        </div>
    {:else}
        <div class="text-center text-surface-500">Nessuna partita trovata.</div>
    {/if}
</div>
