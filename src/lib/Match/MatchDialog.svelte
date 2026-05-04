<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { onMount, createEventDispatcher, tick } from "svelte";
    import * as Command from "$lib/components/ui/command/index.js";
    import * as Popover from "$lib/components/ui/popover/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import CheckIcon from "@lucide/svelte/icons/check";
    import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
    import { Toaster, toast } from "svelte-sonner";
    import { cn } from "$lib/utils.js";
    import Plus from "@lucide/svelte/icons/plus";
    import Minus from "@lucide/svelte/icons/minus";
    import X from "@lucide/svelte/icons/x";

    const { data } = $props<{
        data: {
            matches?: any[] | null;
            players?: any[] | null;
            isAuthenticated: boolean;
        };
    }>();

    const dispatch = createEventDispatcher();

    let open = $state(false);
    let luogo = $state("");
    let match_date = $state("");
    let season = $state("");
    let team_blue_score = $state(0);
    let team_red_score = $state(0);
    let bluePlayers = $state<any[]>([]);
    let redPlayers = $state<any[]>([]);
    let unassignedPlayers = $state<any[]>([]);
    let cbBlueOpen = $state(false);
    let cbBlueValue = $state<string>("");
    let cbBlueTrigger: HTMLButtonElement = $state(null!);
    let cbRedOpen = $state(false);
    let cbRedValue = $state<string>("");
    let cbRedTrigger: HTMLButtonElement = $state(null!);

    function defaultSeason() {
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        return month < 7
            ? `Inverno/Primavera ${year}`
            : `Autunno/Inverno ${year}`;
    }

    onMount(() => {
        const players = Array.isArray(data?.players) ? data!.players! : [];
        unassignedPlayers = players.map((p: any) => ({
            ...p,
            id: p.player_id,
            goals: 0,
            ownGoals: 0,
        }));
        season = defaultSeason();
    });

    $effect(() => {
        if (typeof document === "undefined") return;
        if (open) {
            season = defaultSeason();
            const sbw =
                window.innerWidth - document.documentElement.clientWidth;
            document.documentElement.style.setProperty("--sbw", sbw + "px");
            document.body.style.overflow = "hidden";
            document.body.style.paddingRight = "var(--sbw)";
        } else {
            document.body.style.overflow = "";
            document.body.style.paddingRight = "";
        }
    });

    $effect(() => {
        const blueGoals = bluePlayers.reduce(
            (s, p) => s + Number(p.goals || 0),
            0,
        );
        const redGoals = redPlayers.reduce(
            (s, p) => s + Number(p.goals || 0),
            0,
        );
        const blueOwn = bluePlayers.reduce(
            (s, p) => s + Number(p.ownGoals || 0),
            0,
        );
        const redOwn = redPlayers.reduce(
            (s, p) => s + Number(p.ownGoals || 0),
            0,
        );
        team_blue_score = blueGoals + redOwn;
        team_red_score = redGoals + blueOwn;
    });

    let freeOptions = $derived(
        unassignedPlayers.map((p) => ({ value: p.id, label: p.name })),
    );

    async function selectForBlue(id: string) {
        if (!id) return;
        const idx = unassignedPlayers.findIndex((p) => p.id === id);
        if (idx === -1) return;
        const [p] = unassignedPlayers.splice(idx, 1);
        bluePlayers = [...bluePlayers, p];
        unassignedPlayers = [...unassignedPlayers];
        cbBlueValue = "";
        cbBlueOpen = false;
        await tick();
        cbBlueTrigger?.focus();
    }
    async function selectForRed(id: string) {
        if (!id) return;
        const idx = unassignedPlayers.findIndex((p) => p.id === id);
        if (idx === -1) return;
        const [p] = unassignedPlayers.splice(idx, 1);
        redPlayers = [...redPlayers, p];
        unassignedPlayers = [...unassignedPlayers];
        cbRedValue = "";
        cbRedOpen = false;
        await tick();
        cbRedTrigger?.focus();
    }

    function removeFromBlue(id: string) {
        const i = bluePlayers.findIndex((p) => p.id === id);
        if (i === -1) return;
        const [p] = bluePlayers.splice(i, 1);
        unassignedPlayers = [...unassignedPlayers, p];
        bluePlayers = [...bluePlayers];
    }
    function removeFromRed(id: string) {
        const i = redPlayers.findIndex((p) => p.id === id);
        if (i === -1) return;
        const [p] = redPlayers.splice(i, 1);
        unassignedPlayers = [...unassignedPlayers, p];
        redPlayers = [...redPlayers];
    }

    function adjustGoal(
        player: any,
        list: "blue" | "red",
        field: "goals" | "ownGoals",
        delta: number,
    ) {
        player[field] = Math.max(0, Number(player[field] || 0) + delta);
        if (list === "blue") bluePlayers = [...bluePlayers];
        else redPlayers = [...redPlayers];
    }

    function canSubmit() {
        return (
            luogo.trim() &&
            match_date &&
            season.trim() &&
            bluePlayers.length > 0 &&
            redPlayers.length > 0
        );
    }

    let saving = $state(false);
    let errorMsg = $state("");

    async function submitMatch() {
        if (!canSubmit() || saving) return;
        saving = true;
        errorMsg = "";
        const payload = {
            luogo,
            match_date,
            season: season.trim(),
            team_blue_score,
            team_red_score,
            blue: bluePlayers.map((p) => ({
                player_id: p.player_id ?? p.id,
                goals: Number(p.goals || 0),
                autogol: Number(p.ownGoals || 0),
            })),
            red: redPlayers.map((p) => ({
                player_id: p.player_id ?? p.id,
                goals: Number(p.goals || 0),
                autogol: Number(p.ownGoals || 0),
            })),
        };
        try {
            const res = await fetch("/api/match/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const dataResp = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(dataResp?.message || res.statusText);
            toast.success("Partita aggiunta!", {
                duration: 3500,
                dismissable: true,
            });
            const newMatch = {
                match_id: dataResp?.match_id ?? crypto.randomUUID(),
                match_date,
                luogo,
                season: season.trim(),
                match_number: dataResp?.match_number ?? null,
                team_blue_score,
                team_red_score,
                created_at: new Date().toISOString(),
                players: [],
            };
            luogo = "";
            match_date = "";
            bluePlayers = [];
            redPlayers = [];
            unassignedPlayers = (
                Array.isArray(data?.players) ? data!.players! : []
            ).map((p: any) => ({
                ...p,
                id: p.player_id,
                goals: 0,
                ownGoals: 0,
            }));
            open = false;
            dispatch("saved", newMatch);
        } catch (e: any) {
            errorMsg = e?.message || "Errore inatteso";
        } finally {
            saving = false;
        }
    }

    $effect(() => {
        if (errorMsg)
            toast.error(errorMsg, { duration: 4000, dismissable: true });
    });
</script>

<Toaster position="top-center" richColors />

<Dialog.Root bind:open>
    {#if data.isAuthenticated}
        <Dialog.Trigger
            class="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Aggiungi partita"
        >
            <svg
                class="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 4v16m8-8H4"
                /></svg
            >
            Aggiungi partita
        </Dialog.Trigger>
    {/if}

    <Dialog.Content
        class="w-[95vw] max-w-4xl max-h-[92dvh] overflow-y-auto rounded-2xl p-0"
    >
        <!-- Header dialog -->
        <div class="px-6 pt-6 pb-4 border-b">
            <Dialog.Title class="text-lg font-semibold"
                >Aggiungi nuova partita</Dialog.Title
            >
            <Dialog.Description class="text-sm text-muted-foreground mt-0.5"
                >Inserisci i dati e assegna i giocatori alle squadre.</Dialog.Description
            >

            <!-- Scoreboard live -->
            <div class="flex items-center justify-center gap-4 mt-4">
                <div class="flex flex-col items-center gap-1">
                    <span
                        class="text-xs font-bold text-blue-500 uppercase tracking-wider"
                        >Blu</span
                    >
                    <span
                        class="inline-flex items-center justify-center w-16 h-12 rounded-xl bg-blue-500 text-white font-bold text-2xl shadow-sm"
                        >{team_blue_score}</span
                    >
                </div>
                <span class="text-2xl font-bold text-muted-foreground pb-5"
                    >–</span
                >
                <div class="flex flex-col items-center gap-1">
                    <span
                        class="text-xs font-bold text-red-500 uppercase tracking-wider"
                        >Rossi</span
                    >
                    <span
                        class="inline-flex items-center justify-center w-16 h-12 rounded-xl bg-red-500 text-white font-bold text-2xl shadow-sm"
                        >{team_red_score}</span
                    >
                </div>
            </div>
        </div>

        <div class="px-6 py-5 space-y-5">
            <!-- Campi base -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="space-y-1.5">
                    <label
                        for="luogo"
                        class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                        >Luogo</label
                    >
                    <input
                        id="luogo"
                        class="w-full rounded-lg border px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary"
                        bind:value={luogo}
                        placeholder="Es. Campo A"
                    />
                </div>
                <div class="space-y-1.5">
                    <label
                        for="match_date"
                        class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                        >Data</label
                    >
                    <input
                        id="match_date"
                        class="w-full rounded-lg border px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary"
                        type="date"
                        bind:value={match_date}
                    />
                </div>
                <div class="space-y-1.5">
                    <label
                        for="matches_season"
                        class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                        >Stagione</label
                    >
                    <input
                        id="matches_season"
                        class="w-full rounded-lg border px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary"
                        bind:value={season}
                        placeholder="Es. Inverno 2026"
                    />
                </div>
            </div>

            <!-- Squadre -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <!-- BLU -->
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <span
                            class="text-sm font-semibold text-blue-600 dark:text-blue-400"
                            >Squadra Blu <span
                                class="font-normal text-muted-foreground"
                                >({bluePlayers.length})</span
                            ></span
                        >
                        <Popover.Root bind:open={cbBlueOpen}>
                            <Popover.Trigger bind:ref={cbBlueTrigger}>
                                {#snippet child({ props })}
                                    <Button
                                        {...props}
                                        variant="outline"
                                        size="sm"
                                        class="h-7 text-xs gap-1"
                                    >
                                        <Plus class="size-3" /> Aggiungi
                                    </Button>
                                {/snippet}
                            </Popover.Trigger>
                            <Popover.Content
                                class="w-60 p-0 rounded-xl"
                                align="end"
                            >
                                <Command.Root>
                                    <Command.Input
                                        placeholder="Cerca giocatore…"
                                    />
                                    <Command.List>
                                        <Command.Empty
                                            >Nessun giocatore trovato.</Command.Empty
                                        >
                                        <Command.Group value="disponibili">
                                            {#each freeOptions as opt (opt.value)}
                                                <Command.Item
                                                    value={opt.label}
                                                    onSelect={() =>
                                                        selectForBlue(
                                                            opt.value,
                                                        )}
                                                >
                                                    <CheckIcon
                                                        class={cn(
                                                            cbBlueValue !==
                                                                opt.value &&
                                                                "text-transparent",
                                                        )}
                                                    />
                                                    {opt.label}
                                                </Command.Item>
                                            {/each}
                                        </Command.Group>
                                    </Command.List>
                                </Command.Root>
                            </Popover.Content>
                        </Popover.Root>
                    </div>

                    <div
                        class="min-h-[200px] max-h-[280px] overflow-y-auto rounded-xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/10 p-2 space-y-1.5"
                    >
                        {#each bluePlayers as player (player.id)}
                            <div
                                class="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-neutral-900 border border-blue-100 dark:border-blue-900/30 shadow-sm"
                            >
                                <span
                                    class="flex-1 text-sm font-medium truncate"
                                    >{player.name}</span
                                >
                                <!-- Gol -->
                                <div class="flex items-center gap-1">
                                    <span
                                        class="text-[10px] text-muted-foreground"
                                        >⚽</span
                                    >
                                    <button
                                        class="size-5 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                        onclick={() =>
                                            adjustGoal(
                                                player,
                                                "blue",
                                                "goals",
                                                -1,
                                            )}
                                        ><Minus class="size-2.5" /></button
                                    >
                                    <span
                                        class="w-5 text-center text-xs font-semibold tabular-nums"
                                        >{player.goals}</span
                                    >
                                    <button
                                        class="size-5 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                        onclick={() =>
                                            adjustGoal(
                                                player,
                                                "blue",
                                                "goals",
                                                1,
                                            )}><Plus class="size-2.5" /></button
                                    >
                                </div>
                                <!-- Autogol -->
                                <div class="flex items-center gap-1">
                                    <span
                                        class="text-[10px] text-muted-foreground"
                                        >✗</span
                                    >
                                    <button
                                        class="size-5 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                        onclick={() =>
                                            adjustGoal(
                                                player,
                                                "blue",
                                                "ownGoals",
                                                -1,
                                            )}
                                        ><Minus class="size-2.5" /></button
                                    >
                                    <span
                                        class="w-5 text-center text-xs font-semibold tabular-nums"
                                        >{player.ownGoals}</span
                                    >
                                    <button
                                        class="size-5 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                        onclick={() =>
                                            adjustGoal(
                                                player,
                                                "blue",
                                                "ownGoals",
                                                1,
                                            )}><Plus class="size-2.5" /></button
                                    >
                                </div>
                                <button
                                    class="size-5 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                                    onclick={() => removeFromBlue(player.id)}
                                    ><X class="size-3" /></button
                                >
                            </div>
                        {/each}
                        {#if bluePlayers.length === 0}
                            <div
                                class="flex items-center justify-center h-32 text-xs text-muted-foreground italic"
                            >
                                Aggiungi giocatori alla squadra
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- ROSSI -->
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <span
                            class="text-sm font-semibold text-red-600 dark:text-red-400"
                            >Squadra Rossi <span
                                class="font-normal text-muted-foreground"
                                >({redPlayers.length})</span
                            ></span
                        >
                        <Popover.Root bind:open={cbRedOpen}>
                            <Popover.Trigger bind:ref={cbRedTrigger}>
                                {#snippet child({ props })}
                                    <Button
                                        {...props}
                                        variant="outline"
                                        size="sm"
                                        class="h-7 text-xs gap-1"
                                    >
                                        <Plus class="size-3" /> Aggiungi
                                    </Button>
                                {/snippet}
                            </Popover.Trigger>
                            <Popover.Content
                                class="w-60 p-0 rounded-xl"
                                align="end"
                            >
                                <Command.Root>
                                    <Command.Input
                                        placeholder="Cerca giocatore…"
                                    />
                                    <Command.List>
                                        <Command.Empty
                                            >Nessun giocatore trovato.</Command.Empty
                                        >
                                        <Command.Group value="disponibili">
                                            {#each freeOptions as opt (opt.value)}
                                                <Command.Item
                                                    value={opt.label}
                                                    onSelect={() =>
                                                        selectForRed(opt.value)}
                                                >
                                                    <CheckIcon
                                                        class={cn(
                                                            cbRedValue !==
                                                                opt.value &&
                                                                "text-transparent",
                                                        )}
                                                    />
                                                    {opt.label}
                                                </Command.Item>
                                            {/each}
                                        </Command.Group>
                                    </Command.List>
                                </Command.Root>
                            </Popover.Content>
                        </Popover.Root>
                    </div>

                    <div
                        class="min-h-[200px] max-h-[280px] overflow-y-auto rounded-xl border border-red-200/60 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10 p-2 space-y-1.5"
                    >
                        {#each redPlayers as player (player.id)}
                            <div
                                class="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-neutral-900 border border-red-100 dark:border-red-900/30 shadow-sm"
                            >
                                <span
                                    class="flex-1 text-sm font-medium truncate"
                                    >{player.name}</span
                                >
                                <!-- Gol -->
                                <div class="flex items-center gap-1">
                                    <span
                                        class="text-[10px] text-muted-foreground"
                                        >⚽</span
                                    >
                                    <button
                                        class="size-5 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                        onclick={() =>
                                            adjustGoal(
                                                player,
                                                "red",
                                                "goals",
                                                -1,
                                            )}
                                        ><Minus class="size-2.5" /></button
                                    >
                                    <span
                                        class="w-5 text-center text-xs font-semibold tabular-nums"
                                        >{player.goals}</span
                                    >
                                    <button
                                        class="size-5 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                        onclick={() =>
                                            adjustGoal(
                                                player,
                                                "red",
                                                "goals",
                                                1,
                                            )}><Plus class="size-2.5" /></button
                                    >
                                </div>
                                <!-- Autogol -->
                                <div class="flex items-center gap-1">
                                    <span
                                        class="text-[10px] text-muted-foreground"
                                        >✗</span
                                    >
                                    <button
                                        class="size-5 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                        onclick={() =>
                                            adjustGoal(
                                                player,
                                                "red",
                                                "ownGoals",
                                                -1,
                                            )}
                                        ><Minus class="size-2.5" /></button
                                    >
                                    <span
                                        class="w-5 text-center text-xs font-semibold tabular-nums"
                                        >{player.ownGoals}</span
                                    >
                                    <button
                                        class="size-5 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                        onclick={() =>
                                            adjustGoal(
                                                player,
                                                "red",
                                                "ownGoals",
                                                1,
                                            )}><Plus class="size-2.5" /></button
                                    >
                                </div>
                                <button
                                    class="size-5 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                                    onclick={() => removeFromRed(player.id)}
                                    ><X class="size-3" /></button
                                >
                            </div>
                        {/each}
                        {#if redPlayers.length === 0}
                            <div
                                class="flex items-center justify-center h-32 text-xs text-muted-foreground italic"
                            >
                                Aggiungi giocatori alla squadra
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t flex items-center justify-between gap-3">
            <Dialog.Close>
                <Button variant="ghost" class="text-muted-foreground"
                    >Annulla</Button
                >
            </Dialog.Close>
            <Button
                onclick={submitMatch}
                disabled={!canSubmit() || saving}
                class="min-w-[130px]"
            >
                {saving ? "Salvataggio..." : "Salva partita"}
            </Button>
        </div>
    </Dialog.Content>
</Dialog.Root>
