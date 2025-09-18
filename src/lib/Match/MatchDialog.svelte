<script lang="ts">
  // import { dndzone } from "svelte-dnd-action"; // DnD disattivato
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { onMount, createEventDispatcher, tick } from "svelte";
  import * as Command from "$lib/components/ui/command/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import CheckIcon from "@lucide/svelte/icons/check";
  import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
  import { cn } from "$lib/utils.js";

  const { data } = $props<{
    data: { matches?: any[] | null; players?: any[] | null };
  }>();

  const dispatch = createEventDispatcher();
  let open = $state(false);

  let luogo = $state("");
  let match_date = $state("");
  let match_number = $state<number | "">("");
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
      match_number: match_number || undefined,
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || res.statusText);
      }
      luogo = "";
      match_date = "";
      match_number = "";
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
</script>

<Dialog.Root bind:open>
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-2xl font-bold text-primary-500">Storico Partite</h2>
    <Dialog.Trigger
      class="bg-primary-500 text-white px-4 py-2 rounded shadow inline-flex items-center gap-2"
    >
      Aggiungi partita
    </Dialog.Trigger>
  </div>

  <Dialog.Content
    class="rounded-3xl shadow-xl border border-white/30 bg-white/20 backdrop-blur-lg p-6 w-[95vw] max-w-5xl"
  >
    <Dialog.Header>
      <Dialog.Title class="text-xl font-semibold text-gray-900"
        >Aggiungi nuova partita</Dialog.Title
      >
      <Dialog.Description class="text-sm text-gray-500"
        >Inserisci i dati e assegna i giocatori alle squadre.</Dialog.Description
      >
    </Dialog.Header>

    <form class="space-y-4 mt-4" on:submit|preventDefault={submitMatch}>
      <div class="flex items-center justify-center gap-4 text-lg font-semibold">
        <span
          class="inline-flex items-center justify-center w-16 h-8 bg-blue-100 text-blue-700 font-bold rounded text-lg shadow"
          >{team_blue_score}</span
        >
        <span class="text-xl font-bold text-gray-500">-</span>
        <span
          class="inline-flex items-center justify-center w-16 h-8 bg-red-100 text-red-700 font-bold rounded text-lg shadow"
          >{team_red_score}</span
        >
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          class="border p-2 w-full rounded"
          bind:value={luogo}
          placeholder="Luogo"
        />
        <input
          class="border p-2 w-full rounded"
          type="date"
          bind:value={match_date}
        />
        <input
          class="border p-2 w-full rounded"
          type="number"
          min="1"
          bind:value={match_number}
          placeholder="Match n. (opzionale)"
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Popover.Root bind:open={cbBlueOpen}>
          <Popover.Trigger bind:ref={cbBlueTrigger}>
            {#snippet child({ props })}
              <Button
                {...props}
                variant="outline"
                class="w-full justify-between"
                role="combobox"
                aria-expanded={cbBlueOpen}
              >
                {cbBlueValue
                  ? freeOptions.find((o) => o.value === cbBlueValue)?.label
                  : "Aggiungi a Blu…"}
                <ChevronsUpDownIcon class="opacity-50" />
              </Button>
            {/snippet}
          </Popover.Trigger>
          <Popover.Content class="w-[320px] p-0">
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
                class="w-full justify-between"
                role="combobox"
                aria-expanded={cbRedOpen}
              >
                {cbRedValue
                  ? freeOptions.find((o) => o.value === cbRedValue)?.label
                  : "Aggiungi a Rossi…"}
                <ChevronsUpDownIcon class="opacity-50" />
              </Button>
            {/snippet}
          </Popover.Trigger>
          <Popover.Content class="w-[320px] p-0">
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

      <div class="flex gap-4">
        <div class="flex-1">
          <label class="text-blue-500 font-semibold flex items-center gap-2"
            >Squadra Blu</label
          >
          <div
            class="relative min-h-[260px] max-h-[260px] overflow-y-scroll pr-2 box-border border rounded-2xl p-2 mb-2 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))] [grid-auto-rows:84px] contain-layout ring-2 ring-transparent bg-gradient-to-tr from-blue-100/60 via-blue-200/60 to-blue-50/80 [scrollbar-width:none] [scrollbar-color:transparent_transparent] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:bg-transparent"
          >
            {#each bluePlayers as player (player.id)}
              <div
                class="bg-blue-50 text-blue-900 rounded shadow-sm cursor-default flex flex-col justify-between h-[84px] min-h-[84px] max-h-[84px] p-2 select-none w-full"
              >
                <div class="flex items-center justify-between">
                  <div class="truncate text-sm font-medium">{player.name}</div>
                </div>
                <div class="flex items-center gap-2">
                  <label
                    class="flex items-center gap-1 text-xs"
                    on:mousedown|stopPropagation={stopEditDrag}
                    on:touchstart|stopPropagation={stopEditDrag}
                  >
                    <span class="px-1 rounded bg-blue-200 text-blue-900">G</span
                    >
                    <input
                      type="number"
                      min="0"
                      bind:value={player.goals}
                      on:change={() => (bluePlayers = [...bluePlayers])}
                      title="Gol"
                      class="w-12 h-7 px-2 py-1 text-center border rounded text-sm"
                    />
                  </label>
                  <label
                    class="flex items-center gap-1 text-xs"
                    on:mousedown|stopPropagation={stopEditDrag}
                    on:touchstart|stopPropagation={stopEditDrag}
                  >
                    <span class="px-1 rounded bg-blue-200 text-blue-900">A</span
                    >
                    <input
                      type="number"
                      min="0"
                      bind:value={player.ownGoals}
                      on:change={() => (bluePlayers = [...bluePlayers])}
                      title="Autogol"
                      class="w-12 h-7 px-2 py-1 text-center border rounded text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    class="w-7 h-7 border rounded text-sm"
                    title="Rimuovi"
                    on:click={() => removeFromBlue(player.id)}>×</button
                  >
                </div>
              </div>
            {/each}
          </div>
        </div>

        <div class="flex-1">
          <label class="text-red-500 font-semibold flex items-center gap-2"
            >Squadra Rossi</label
          >
          <div
            class="relative min-h-[260px] max-h-[260px] overflow-y-scroll pr-2 box-border border rounded-2xl p-2 mb-2 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))] [grid-auto-rows:84px] contain-layout ring-2 ring-transparent bg-gradient-to-tr from-red-100/70 via-red-300/60 to-red-50/80 [scrollbar-width:none] [scrollbar-color:transparent_transparent] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:bg-transparent"
          >
            {#each redPlayers as player (player.id)}
              <div
                class="bg-red-50 text-red-900 rounded shadow-sm cursor-default flex flex-col justify-between h-[84px] min-h-[84px] max-h-[84px] p-2 select-none w-full"
              >
                <div class="flex items-center justify-between">
                  <div class="truncate text-sm font-medium">{player.name}</div>
                </div>
                <div class="flex items-center gap-2">
                  <label
                    class="flex items-center gap-1 text-xs"
                    on:mousedown|stopPropagation={stopEditDrag}
                    on:touchstart|stopPropagation={stopEditDrag}
                  >
                    <span class="px-1 rounded bg-red-200 text-red-900">G</span>
                    <input
                      type="number"
                      min="0"
                      bind:value={player.goals}
                      on:change={() => (redPlayers = [...redPlayers])}
                      title="Gol"
                      class="w-12 h-7 px-2 py-1 text-center border rounded text-sm"
                    />
                  </label>
                  <label
                    class="flex items-center gap-1 text-xs"
                    on:mousedown|stopPropagation={stopEditDrag}
                    on:touchstart|stopPropagation={stopEditDrag}
                  >
                    <span class="px-1 rounded bg-red-200 text-red-900">A</span>
                    <input
                      type="number"
                      min="0"
                      bind:value={player.ownGoals}
                      on:change={() => (redPlayers = [...redPlayers])}
                      title="Autogol"
                      class="w-12 h-7 px-2 py-1 text-center border rounded text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    class="w-7 h-7 border rounded text-sm"
                    title="Rimuovi"
                    on:click={() => removeFromRed(player.id)}>×</button
                  >
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <div>
        <label class="font-bold mb-1 block">Giocatori disponibili</label>
        <div
          class="relative min-h-[260px] max-h-[260px] overflow-y-scroll pr-2 box-border border rounded-2xl p-2 grid gap-2 bg-gray-50 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))] [grid-auto-rows:64px] contain-layout ring-2 ring-transparent [scrollbar-width:none] [scrollbar-color:transparent_transparent] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:bg-transparent"
        >
          {#each unassignedPlayers as player (player.id)}
            <div
              class="bg-white text-gray-900 rounded shadow-sm cursor-default flex items-center justify-between h-16 min-h-16 max-h-16 rounded-2xl p-2 select-none w-full"
            >
              <span class="truncate text-lg font-medium uppercase"
                >{player.name}</span
              >
              <!-- DnD non implementato: niente handle -->
            </div>
          {/each}
        </div>
      </div>

      {#if errorMsg}
        <div class="text-red-600 text-sm">{errorMsg}</div>
      {/if}

      <Dialog.Footer class="mt-4 flex items-center justify-end gap-3">
        <Dialog.Close class="px-3 py-2 rounded border">Annulla</Dialog.Close>
        <Button
          class="bg-primary-500 text-white"
          on:click={submitMatch}
          disabled={!canSubmit() || saving}
        >
          {saving ? "Salvataggio..." : "Salva partita"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
