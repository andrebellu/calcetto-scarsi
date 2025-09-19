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

  onMount(() => {
    const players = Array.isArray(data?.players) ? data!.players! : [];
    unassignedPlayers = players.map((p) => ({
      ...p,
      id: p.player_id,
      goals: 0,
      ownGoals: 0,
    }));
  });

  $effect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      const sbw = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.setProperty("--sbw", sbw + "px");
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = "var(--sbw)";
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
  });

  function stopEditDrag(e: Event) {
    e.stopPropagation();
  }

  $effect(() => {
    const blueGoals = bluePlayers.reduce((s, p) => s + Number(p.goals || 0), 0);
    const redGoals = redPlayers.reduce((s, p) => s + Number(p.goals || 0), 0);
    const blueOwn = bluePlayers.reduce(
      (s, p) => s + Number(p.ownGoals || 0),
      0
    );
    const redOwn = redPlayers.reduce((s, p) => s + Number(p.ownGoals || 0), 0);
    team_blue_score = blueGoals + redOwn;
    team_red_score = redGoals + blueOwn;
  });

  let freeOptions = $derived(
    unassignedPlayers.map((p) => ({ value: p.id, label: p.name }))
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

  function canSubmit() {
    return (
      luogo.trim() &&
      match_date &&
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
      const ok = res.ok;
      const dataResp = await res.json().catch(() => ({}));
      if (!ok) throw new Error(dataResp?.message || res.statusText);

      toast.success("Partita aggiunta con successo!", {
        duration: 3500,
        dismissable: true,
      });

      const newMatch = {
        match_id: dataResp?.match_id ?? crypto.randomUUID(),
        match_date,
        luogo,
        match_number: dataResp?.match_number ?? null,
        team_blue_score,
        team_red_score,
        created_at: new Date().toISOString(),
        players: [],
      };
      if (Array.isArray(data?.matches)) data.matches.unshift(newMatch);

      luogo = "";
      match_date = "";
      bluePlayers = [];
      redPlayers = [];
      unassignedPlayers = (
        Array.isArray(data?.players) ? data!.players! : []
      ).map((p) => ({
        ...p,
        id: p.player_id,
        goals: 0,
        ownGoals: 0,
      }));
      open = false;
      dispatch("saved");
    } catch (e: any) {
      errorMsg = e?.message || "Errore inatteso";
    } finally {
      saving = false;
    }
  }

  $effect(() => {
    if (errorMsg) toast.error(errorMsg, { duration: 4000, dismissable: true });
  });

  console.log(data.isAuthenticated);
</script>

<Toaster position="top-center" richColors />

<Dialog.Root bind:open>
  {#if data.isAuthenticated}
    <Dialog.Trigger
      class="group inline-flex items-center justify-center gap-2 rounded-xl px-4 sm:px-5 py-2.5
             font-semibold  bg-gradient-to-br from-primary-500 to-primary-600
             shadow-sm hover:shadow-md transition-all duration-200
             hover:from-primary-600 hover:to-primary-700
             active:scale-[0.98]
             focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2
             dark:focus-visible:ring-offset-neutral-900"
      aria-label="Aggiungi partita"
    >
      <span
        class="material-symbols-outlined text-[20px] sm:text-[22px] leading-none
               -ml-0.5 sm:-ml-1 transition-transform duration-200 flex items-center justify-center"
        aria-hidden="true"
      >
        add
      </span>
      <span>Aggiungi partita</span>
    </Dialog.Trigger>
  {/if}

  <Dialog.Content
    class="rounded-2xl md:rounded-3xl shadow-2xl border border-neutral-200 bg-white p-5 sm:p-7 md:p-8 w-[95vw] max-w-5xl dark:bg-neutral-900 dark:border-neutral-800"
  >
    <Dialog.Header>
      <Dialog.Title
        class="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-neutral-100"
      >
        Aggiungi nuova partita
      </Dialog.Title>
      <Dialog.Description
        class="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400"
      >
        Inserisci i dati e assegna i giocatori alle squadre.
      </Dialog.Description>
    </Dialog.Header>

    <form class="space-y-5 mt-3 sm:mt-4" on:submit|preventDefault={submitMatch}>
      <!-- Scoreboard -->
      <div
        class="flex items-center justify-center gap-3 sm:gap-5 text-base sm:text-lg font-semibold"
      >
        <span
          class="inline-flex items-center justify-center w-14 sm:w-16 h-9 bg-blue-600/10 text-blue-700 dark:text-blue-300 font-bold rounded-lg shadow-sm"
        >
          {team_blue_score}
        </span>
        <span
          class="text-xl sm:text-2xl font-bold text-neutral-500 dark:text-neutral-400"
          >-</span
        >
        <span
          class="inline-flex items-center justify-center w-14 sm:w-16 h-9 bg-red-600/10 text-red-700 dark:text-red-300 font-bold rounded-lg shadow-sm"
        >
          {team_red_score}
        </span>
      </div>

      <!-- Campi base -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="flex flex-col gap-1.5">
          <label
            for="luogo"
            class="text-sm font-medium text-neutral-700 dark:text-neutral-200"
          >
            Luogo
          </label>
          <input
            id="luogo"
            class="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-900 dark:border-neutral-700"
            bind:value={luogo}
            placeholder="Es. Campo A"
            aria-label="Luogo partita"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label
            for="match_date"
            class="text-sm font-medium text-neutral-700 dark:text-neutral-200"
          >
            Data
          </label>
          <input
            id="match_date"
            class="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-900 dark:border-neutral-700"
            type="date"
            bind:value={match_date}
            aria-label="Data partita"
          />
        </div>
      </div>

      <!-- Selezione giocatori -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Popover.Root bind:open={cbBlueOpen}>
          <Popover.Trigger bind:ref={cbBlueTrigger}>
            {#snippet child({ props })}
              <Button
                {...props}
                variant="outline"
                class="w-full justify-between rounded-xl"
              >
                {cbBlueValue
                  ? freeOptions.find((o) => o.value === cbBlueValue)?.label
                  : "Aggiungi a Blu…"}
                <ChevronsUpDownIcon class="opacity-60" />
              </Button>
            {/snippet}
          </Popover.Trigger>
          <Popover.Content class="w-[320px] p-0 rounded-xl">
            <Command.Root>
              <Command.Input placeholder="Cerca giocatore disponibile…" />
              <Command.List>
                <Command.Empty>Nessun giocatore trovato.</Command.Empty>
                <Command.Group value="disponibili">
                  {#each freeOptions as opt (opt.value)}
                    <Command.Item
                      value={opt.label}
                      onSelect={() => selectForBlue(opt.value)}
                    >
                      <CheckIcon
                        class={cn(
                          cbBlueValue !== opt.value && "text-transparent"
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

        <Popover.Root bind:open={cbRedOpen}>
          <Popover.Trigger bind:ref={cbRedTrigger}>
            {#snippet child({ props })}
              <Button
                {...props}
                variant="outline"
                class="w-full justify-between rounded-xl"
              >
                {cbRedValue
                  ? freeOptions.find((o) => o.value === cbRedValue)?.label
                  : "Aggiungi a Rossi…"}
                <ChevronsUpDownIcon class="opacity-60" />
              </Button>
            {/snippet}
          </Popover.Trigger>
          <Popover.Content class="w-[320px] p-0 rounded-xl">
            <Command.Root>
              <Command.Input placeholder="Cerca giocatore disponibile…" />
              <Command.List>
                <Command.Empty>Nessun giocatore trovato.</Command.Empty>
                <Command.Group value="disponibili">
                  {#each freeOptions as opt (opt.value)}
                    <Command.Item
                      value={opt.label}
                      onSelect={() => selectForRed(opt.value)}
                    >
                      <CheckIcon
                        class={cn(
                          cbRedValue !== opt.value && "text-transparent"
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

      <!-- Liste squadre -->
      <div class="flex flex-col sm:flex-row gap-5">
        <!-- Blu -->
        <div class="flex-1">
          <label
            class="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-2"
          >
            Squadra Blu
          </label>
          <div
            class="relative min-h-[220px] sm:min-h-[260px] max-h-[260px] overflow-y-auto pr-2 box-border border border-neutral-200 dark:border-neutral-800 rounded-2xl p-2 mb-2 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(128px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(140px,1fr))] [grid-auto-rows:92px] bg-white dark:bg-neutral-900 no-scrollbar"
            style="touch-action: pan-y;"
          >
            {#each bluePlayers as player (player.id)}
              <div
                class="bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/60 text-blue-900 dark:text-blue-200 rounded-xl shadow-sm cursor-default flex flex-col justify-between h-[92px] min-h-[92px] max-h-[92px] p-2"
              >
                <div class="flex items-center justify-between">
                  <div class="truncate text-sm font-medium">{player.name}</div>
                </div>
                <div class="flex items-center gap-2">
                  <label
                    class="flex items-center gap-1 text-xs"
                    on:touchstart|passive
                    on:mousedown|stopPropagation={stopEditDrag}
                  >
                    <span
                      class="px-1 rounded bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-200"
                      >G</span
                    >
                    <input
                      type="number"
                      min="0"
                      bind:value={player.goals}
                      on:change={() => (bluePlayers = [...bluePlayers])}
                      title="Gol"
                      class="w-12 h-7 px-2 py-1 text-center border border-neutral-300 dark:border-neutral-700 rounded text-sm bg-white dark:bg-neutral-900"
                    />
                  </label>
                  <label
                    class="flex items-center gap-1 text-xs"
                    on:touchstart|passive
                    on:mousedown|stopPropagation={stopEditDrag}
                  >
                    <span
                      class="px-1 rounded bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-200"
                      >A</span
                    >
                    <input
                      type="number"
                      min="0"
                      bind:value={player.ownGoals}
                      on:change={() => (bluePlayers = [...bluePlayers])}
                      title="Autogol"
                      class="w-12 h-7 px-2 py-1 text-center border border-neutral-300 dark:border-neutral-700 rounded text-sm bg-white dark:bg-neutral-900"
                    />
                  </label>
                  <button
                    type="button"
                    class="w-7 h-7 border border-neutral-300 dark:border-neutral-700 rounded text-sm hover:bg-blue-100/60 dark:hover:bg-blue-900/30"
                    title="Rimuovi"
                    on:click={() => removeFromBlue(player.id)}>×</button
                  >
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Rossi -->
        <div class="flex-1">
          <label
            class="text-red-600 dark:text-red-400 font-semibold flex items-center gap-2"
          >
            Squadra Rossi
          </label>
          <div
            class="relative min-h=[220px] sm:min-h-[260px] max-h-[260px] overflow-y-auto pr-2 box-border border border-neutral-200 dark:border-neutral-800 rounded-2xl p-2 mb-2 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(128px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(140px,1fr))] [grid-auto-rows:92px] bg-white dark:bg-neutral-900 no-scrollbar"
            style="touch-action: pan-y;"
          >
            {#each redPlayers as player (player.id)}
              <div
                class="bg-red-50/60 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/60 text-red-900 dark:text-red-200 rounded-xl shadow-sm cursor-default flex flex-col justify-between h-[92px] min-h-[92px] max-h-[92px] p-2"
              >
                <div class="flex items-center justify-between">
                  <div class="truncate text-sm font-medium">{player.name}</div>
                </div>
                <div class="flex items-center gap-2">
                  <label
                    class="flex items-center gap-1 text-xs"
                    on:touchstart|passive
                    on:mousedown|stopPropagation={stopEditDrag}
                  >
                    <span
                      class="px-1 rounded bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-200"
                      >G</span
                    >
                    <input
                      type="number"
                      min="0"
                      bind:value={player.goals}
                      on:change={() => (redPlayers = [...redPlayers])}
                      title="Gol"
                      class="w-12 h-7 px-2 py-1 text-center border border-neutral-300 dark:border-neutral-700 rounded text-sm bg-white dark:bg-neutral-900"
                    />
                  </label>
                  <label
                    class="flex items-center gap-1 text-xs"
                    on:touchstart|passive
                    on:mousedown|stopPropagation={stopEditDrag}
                  >
                    <span
                      class="px-1 rounded bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-200"
                      >A</span
                    >
                    <input
                      type="number"
                      min="0"
                      bind:value={player.ownGoals}
                      on:change={() => (redPlayers = [...redPlayers])}
                      title="Autogol"
                      class="w-12 h-7 px-2 py-1 text-center border border-neutral-300 dark:border-neutral-700 rounded text-sm bg-white dark:bg-neutral-900"
                    />
                  </label>
                  <button
                    type="button"
                    class="w-7 h-7 border border-neutral-300 dark:border-neutral-700 rounded text-sm hover:bg-red-100/60 dark:hover:bg-red-900/30"
                    title="Rimuovi"
                    on:click={() => removeFromRed(player.id)}>×</button
                  >
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <Dialog.Footer
        class="mt-3 sm:mt-4 flex items-center justify-end gap-2 sm:gap-3"
      >
        <Dialog.Close
          class="px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Annulla
        </Dialog.Close>
        <Button
          class="bg-primary-500 text-white rounded-lg px-4 py-2"
          onclick={submitMatch}
          disabled={!canSubmit() || saving}
        >
          {saving ? "Salvataggio..." : "Salva partita"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<style>
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
