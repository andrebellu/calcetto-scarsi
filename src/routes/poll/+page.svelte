<script lang="ts">
  import { BarChart, type ChartContextValue } from "layerchart";
  import { scaleBand } from "d3-scale";
  import { cubicInOut } from "svelte/easing";
  import TrendingUpIcon from "@lucide/svelte/icons/trending-up";
  import * as Chart from "$lib/components/ui/chart/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import Button from "$lib/components/ui/button/button.svelte";
  import Badge from "$lib/components/ui/badge/badge.svelte";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down";
  import Plus from "@lucide/svelte/icons/plus";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import CalendarIcon from "@lucide/svelte/icons/calendar";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Clock from "@lucide/svelte/icons/clock";
  import { Toaster, toast } from "svelte-sonner";

  onMount(() => {
    if (!data.isLogged && !data.poll) {
      showSpinner = true;
      const t = setTimeout(() => {
        goto("/");
      }, 3000);
      return () => clearTimeout(t);
    }
  });

  const { data } = $props<{
    poll: { poll_id: number; title: string; status: string } | null;
    options: Array<{
      option_id: number;
      match_date: string | null;
      luogo: string | null;
      time_of_day: string | null;
      note: string | null;
    }>;
    counts: Record<number, number>;
    myVotes: Array<{ option_id: number; choice: string }>;
    session: any;
    isLogged: boolean;
    canVote: boolean;
  }>();

  // stato voto
  let busy = $state(false);
  let msg = $state<string | null>(null);
  let busyId = $state<number | null>(null);
  const votedSet = $derived(
    new Set((data.myVotes ?? []).map((v) => v.option_id)),
  );

  // stato creazione sondaggio
  let title = $state("");
  type NewOpt = {
    match_date: string;
    luogo: string;
    time_of_day: string;
    note?: string;
  };
  let newOptions = $state<NewOpt[]>([
    { match_date: "", luogo: "", time_of_day: "" },
  ]);

  function addRow() {
    newOptions = [
      ...newOptions,
      { match_date: "", luogo: "", time_of_day: "" },
    ];
  }
  function removeRow(i: number) {
    newOptions = newOptions.filter((_, idx) => idx !== i);
  }

  async function createPoll() {
    if (!data.isLogged) return;
    busy = true;
    msg = null;
    const res = await fetch("/api/poll", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, options: newOptions }),
    });
    busy = false;
    if (!res.ok) {
      msg = "Errore creazione sondaggio";
      return;
    }
    location.reload();
  }

  async function toggleVote(
    poll_id: number,
    option_id: number,
    checked: boolean,
  ) {
    if (!poll_id || busyId !== null) return;
    busyId = option_id;

    try {
      const base = `/api/poll/${poll_id}/vote`;
      const res = checked
        ? await fetch(base, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              option_id,
              choice: "yes",
              player_id: chosenPlayerId,
            }),
          })
        : await fetch(`${base}?option_id=${option_id}`, { method: "DELETE" });

      if (!res.ok) {
        toast.error("Errore nel voto");
        return;
      }

      // ✅ aggiorna lo stato in modo reattivo
      if (checked) {
        votedSet.add(option_id);
        data.counts = {
          ...data.counts,
          [option_id]: (data.counts[option_id] ?? 0) + 1,
        };
        toast.success("Voto aggiunto!");
      } else {
        votedSet.delete(option_id);
        data.counts = {
          ...data.counts,
          [option_id]: Math.max(0, (data.counts[option_id] ?? 1) - 1),
        };
        toast.success("Voto rimosso");
      }
    } catch (err) {
      console.error(err);
      toast.error("Errore di connessione");
    } finally {
      busyId = null;
    }
  }

  const itWeekday = new Intl.DateTimeFormat("it-IT", { weekday: "long" });
  const itDate = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
  }); // gg/mm

  const chartDataBars = $derived(
    (data.options ?? [])
      .map((opt) => {
        const dt = opt.match_date ? new Date(opt.match_date) : null;
        const dayName = dt ? itWeekday.format(dt) : "";
        const timeLabel = opt.time_of_day ?? "";
        const dayShort = dt ? itDate.format(dt) : (opt.match_date ?? "");
        const labelFull = [dayName, dayShort, timeLabel]
          .filter(Boolean)
          .join(" • ");
        const labelShort = [dayShort, timeLabel].filter(Boolean).join(" "); // es. "24/09 20:30"
        return {
          label: labelFull || opt.luogo || `Opzione ${opt.option_id}`,
          labelShort: labelShort || opt.luogo || `Opzione ${opt.option_id}`,
          value: data.counts[opt.option_id] ?? 0,
        };
      })
      .filter((d) => d.value > 0),
  );

  const chartConfig = {
    value: { label: "Voti", color: "var(--chart-1)" },
    label: { color: "var(--background)" },
  } satisfies Chart.ChartConfig;

  let context = $state<ChartContextValue>();

  const players: Array<{ player_id: string; name: string }> =
    data.players as any;
  let tempPlayerId = $state<string>("");
  let chosenPlayerId = $state<string | null>(data.chosenPlayerId ?? null);
  async function confirmPlayerFinal() {
    chosenPlayerId = tempPlayerId;
  }

  let closing = $state(false);
  const isLogged = $derived(!!data.isLogged);

  // Stato tab per sondaggio: 'voto' | 'squadre'
  let tabByPoll = $state<Record<number, "voto" | "squadre">>({});
  const getTab = (id: number) => tabByPoll[id] ?? "voto";
  const setTab = (id: number, t: "voto" | "squadre") =>
    (tabByPoll = { ...tabByPoll, [id]: t });

  // Votanti e squadre per sondaggio
  type Voter = { player_id: string; name: string };
  let votersByPoll = $state<Record<number, Voter[]>>({});
  let teamsByPoll = $state<
    Record<number, { A: Voter[]; B: Voter[]; P?: Voter[] }>
  >({});

  async function loadVoters(poll_id: number) {
    const res = await fetch(`/api/poll/${poll_id}/vote`);
    if (!res.ok) return;
    const voters: { player_id: string; name: string }[] = await res.json();
    votersByPoll = { ...votersByPoll, [poll_id]: voters };
  }

  async function closePoll(poll_id?: number) {
    if (!data.poll && !poll_id) return;
    const id = poll_id ?? data.poll!.poll_id;
    closing = true;
    const res = await fetch(`/api/poll/${id}/finalize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    closing = false;
    if (!res.ok) {
      msg = "Errore chiusura sondaggio";
      return;
    }
    // Porta alla tab "Squadre" e carica i votanti
    setTab(id, "squadre");
    await loadVoters(id);
    // Facoltativo: riflettere nell'URL la tab attiva
    // goto(`/poll?tab=squadre&poll=${id}`, { replaceState: true });
    location.reload();
  }

  let showSpinner = $state(false);

  // ---- helper teams state ----
  type TeamKey = "A" | "B" | "P" | "available";

  // garantisce la presenza delle liste per il sondaggio
  function ensureTeams(poll_id: number) {
    if (!teamsByPoll[poll_id]) {
      teamsByPoll = {
        ...teamsByPoll,
        [poll_id]: { A: [], B: [], P: [] },
      };
    }
    if (!votersByPoll[poll_id]) {
      votersByPoll = { ...votersByPoll, [poll_id]: [] };
    }
  }

  // rimuove un player da tutte le liste di un sondaggio
  function removeEverywhere(poll_id: number, player_id: string) {
    ensureTeams(poll_id);
    votersByPoll[poll_id] = (votersByPoll[poll_id] ?? []).filter(
      (v) => v.player_id !== player_id,
    );
    teamsByPoll[poll_id].A = (teamsByPoll[poll_id].A ?? []).filter(
      (v) => v.player_id !== player_id,
    );
    teamsByPoll[poll_id].B = (teamsByPoll[poll_id].B ?? []).filter(
      (v) => v.player_id !== player_id,
    );
    teamsByPoll[poll_id].P = (teamsByPoll[poll_id].P ?? []).filter(
      (v) => v.player_id !== player_id,
    );
  }

  function removeFromAllTeams(poll_id: number, player_id: string) {
    ensureTeams(poll_id);
    teamsByPoll[poll_id].A = teamsByPoll[poll_id].A.filter(
      (v) => v.player_id !== player_id,
    );
    teamsByPoll[poll_id].B = teamsByPoll[poll_id].B.filter(
      (v) => v.player_id !== player_id,
    );
    teamsByPoll[poll_id].P = teamsByPoll[poll_id].P.filter(
      (v) => v.player_id !== player_id,
    );
  }

  function removeToAvailable(poll_id: number, player: Voter) {
    ensureTeams(poll_id);
    removeFromAllTeams(poll_id, player.player_id);

    // Evita duplicati nei disponibili
    const current = votersByPoll[poll_id] ?? [];
    if (!current.find((v) => v.player_id === player.player_id)) {
      votersByPoll = {
        ...votersByPoll,
        [poll_id]: [...current, player],
      };
    }
  }

  // sposta un player nella destinazione scelta
  function moveTo(v: Voter, dest: "A" | "B" | "P", poll_id: number) {
    ensureTeams(poll_id);
    removeEverywhere(poll_id, v.player_id);
    teamsByPoll = {
      ...teamsByPoll,
      [poll_id]: {
        A:
          dest === "A"
            ? [...(teamsByPoll[poll_id].A ?? []), v]
            : (teamsByPoll[poll_id].A ?? []),
        B:
          dest === "B"
            ? [...(teamsByPoll[poll_id].B ?? []), v]
            : (teamsByPoll[poll_id].B ?? []),
        P:
          dest === "P"
            ? [...(teamsByPoll[poll_id].P ?? []), v]
            : (teamsByPoll[poll_id].P ?? []),
      },
    };
  }

  // rilascia su lista con DnD
  function handleDrop(e: DragEvent, dest: TeamKey, poll_id: number) {
    e.preventDefault();
    const text = e.dataTransfer?.getData("application/json");
    if (!text) return;
    const v: Voter & { is_goalkeeper?: boolean } = JSON.parse(text);
    if (dest === "available") {
      // torna tra i disponibili
      removeEverywhere(poll_id, v.player_id);
      votersByPoll = {
        ...votersByPoll,
        [poll_id]: [
          ...(votersByPoll[poll_id] ?? []),
          { player_id: v.player_id, name: v.name },
        ],
      };
    } else {
      moveTo(v, dest, poll_id);
    }
  }

  // prepara il payload DnD
  function handleDragStart(
    e: DragEvent,
    v: Voter & { is_goalkeeper?: boolean },
  ) {
    e.dataTransfer?.setData("application/json", JSON.stringify(v));
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
  }

  async function confirmFixture(poll_id: number) {
    const t = teamsByPoll[poll_id] ?? { A: [], B: [], P: [] };
    const players = [
      ...(t.A ?? []).map((v) => ({
        player_id: v.player_id,
        team: "A",
        is_goalkeeper: (v as any).is_goalkeeper ?? false,
      })),
      ...(t.B ?? []).map((v) => ({
        player_id: v.player_id,
        team: "B",
        is_goalkeeper: (v as any).is_goalkeeper ?? false,
      })),
      ...(t.P ?? []).map((v) => ({
        player_id: v.player_id,
        team: "P",
        is_goalkeeper: (v as any).is_goalkeeper ?? false,
      })),
    ];
    const res = await fetch(`/api/fixture/by-poll/${poll_id}/confirm`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ players }),
    });
    msg = res.ok ? "Convocati confermati" : "Errore conferma convocati";
    if (res.ok) {
      toast.success("Convocati confermati");
      goto(`/fixture/${(await res.json()).fixture_id}`);
    } else {
      toast.error("Errore conferma convocati");
    }
  }

  let votersByOption = $state<
    Record<number, { loading: boolean; list: Voter[] }>
  >({});

  async function loadVotersForOption(poll_id: number, option_id: number) {
    console.log("loadVotersForOption", poll_id, option_id);
    if (
      votersByOption[option_id]?.list?.length ||
      votersByOption[option_id]?.loading
    )
      return;
    votersByOption = {
      ...votersByOption,
      [option_id]: { loading: true, list: [] },
    };
    const res = await fetch(`/api/poll/${poll_id}/vote?option_id=${option_id}`);
    console.log(res);
    if (res.ok) {
      const list: Voter[] = await res.json();
      votersByOption = {
        ...votersByOption,
        [option_id]: { loading: false, list },
      };
    } else {
      votersByOption = {
        ...votersByOption,
        [option_id]: { loading: false, list: [] },
      };
    }
  }

  function generateTeams(poll_id: number) {
    ensureTeams(poll_id);
    // Raccogli tutti i giocatori (disponibili + A + B)
    const all = [
      ...(votersByPoll[poll_id] ?? []),
      ...(teamsByPoll[poll_id].A ?? []),
      ...(teamsByPoll[poll_id].B ?? []),
    ];

    // Shuffle
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }

    // Dividi
    const mid = Math.ceil(all.length / 2);
    const teamA = all.slice(0, mid);
    const teamB = all.slice(mid);

    // Aggiorna stato
    votersByPoll[poll_id] = [];
    teamsByPoll = {
      ...teamsByPoll,
      [poll_id]: {
        ...teamsByPoll[poll_id],
        A: teamA,
        B: teamB,
      },
    };
    toast.success("Squadre generate casualmente");
  }

  function generateWeek() {
    const today = new Date();
    // Calcola il prossimo Lunedì
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));

    const opts: NewOpt[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(nextMonday);
      d.setDate(nextMonday.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const day = d.getDay(); // 0=Dom, 6=Sab

      if (day === 0 || day === 6) {
        // Sabato o Domenica: Mattina, Pomeriggio, Sera
        opts.push({
          match_date: dateStr,
          luogo: "",
          time_of_day: "Mattina",
        });
        opts.push({
          match_date: dateStr,
          luogo: "",
          time_of_day: "Pomeriggio",
        });
        opts.push({
          match_date: dateStr,
          luogo: "",
          time_of_day: "Sera",
        });
      } else {
        // Feriale: solo Sera
        opts.push({
          match_date: dateStr,
          luogo: "",
          time_of_day: "Sera",
        });
      }
    }
    newOptions = opts;
    toast.success("Settimana generata!");
  }
</script>

<div class="mx-auto max-w-3xl pt-4 sm:pt-6 px-3 sm:px-6">
  <Button href="/" class="" disabled={false}>Torna alla home</Button>
</div>

<Toaster position="top-center" richColors />

{#if data.isLogged}
  <div class="mx-auto max-w-3xl px-4 sm:px-6 flex justify-end">
    <Dialog.Root>
      <Dialog.Trigger class={buttonVariants({ variant: "default" })}>
        <Plus class="mr-2 size-4" />
        Nuovo Sondaggio
      </Dialog.Trigger>
      <Dialog.Content
        class="max-w-2xl max-h-[90vh] overflow-y-auto"
        portalProps={undefined}
      >
        <Dialog.Header class="">
          <Dialog.Title class="">Crea nuovo sondaggio</Dialog.Title>
          <Dialog.Description class="">
            Configura le opzioni per il prossimo match.
          </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <label for="title" class="text-sm font-medium">Titolo</label>
            <input
              id="title"
              class="w-full border rounded-lg px-3 py-2"
              placeholder="Es. Partita di Venerdì"
              bind:value={title}
            />
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">Opzioni di voto</span>
              <div class="flex gap-2">
                <button
                  class="text-xs text-primary-600 hover:underline flex items-center gap-1"
                  type="button"
                  onclick={generateWeek}
                >
                  <CalendarIcon class="size-3" /> Genera Settimana
                </button>
                <button
                  class="text-xs text-primary-600 hover:underline flex items-center gap-1"
                  type="button"
                  onclick={addRow}
                >
                  <Plus class="size-3" /> Aggiungi
                </button>
              </div>
            </div>

            {#each newOptions as opt, i}
              <div
                class="border rounded-lg p-3 space-y-3 bg-muted/30 relative group"
              >
                {#if newOptions.length > 1}
                  <button
                    type="button"
                    class="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive transition-colors"
                    onclick={() => removeRow(i)}
                    title="Rimuovi opzione"
                  >
                    <Trash2 class="size-4" />
                  </button>
                {/if}

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div class="space-y-1">
                    <label
                      class="text-xs text-muted-foreground flex items-center gap-1"
                    >
                      <CalendarIcon class="size-3" /> Data
                    </label>
                    <input
                      class="w-full border rounded-md px-2 py-1.5 text-sm"
                      type="date"
                      bind:value={opt.match_date}
                    />
                  </div>
                  <div class="space-y-1">
                    <label
                      class="text-xs text-muted-foreground flex items-center gap-1"
                    >
                      <Clock class="size-3" /> Fascia Oraria
                    </label>
                    <select
                      class="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
                      bind:value={opt.time_of_day}
                    >
                      <option value="" disabled>Seleziona...</option>
                      <option value="Mattina">Mattina</option>
                      <option value="Pomeriggio">Pomeriggio</option>
                      <option value="Sera">Sera</option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div class="space-y-1">
                    <label
                      class="text-xs text-muted-foreground flex items-center gap-1"
                    >
                      <MapPin class="size-3" /> Luogo
                    </label>
                    <input
                      class="w-full border rounded-md px-2 py-1.5 text-sm"
                      placeholder="Es. Campo Sportivo"
                      bind:value={opt.luogo}
                    />
                  </div>
                  <div class="space-y-1">
                    <label class="text-xs text-muted-foreground">Note</label>
                    <input
                      class="w-full border rounded-md px-2 py-1.5 text-sm"
                      placeholder="Es. Sintetico"
                      bind:value={opt.note}
                    />
                  </div>
                </div>
              </div>
            {/each}
          </div>

          {#if msg}
            <div
              class="p-3 rounded-md bg-destructive/10 text-destructive text-sm"
            >
              {msg}
            </div>
          {/if}
        </div>

        <Dialog.Footer class="">
          <Button
            class=""
            onclick={createPoll}
            disabled={busy || !title || newOptions.length === 0}
          >
            {busy ? "Creazione..." : "Crea Sondaggio"}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  </div>
{/if}

{#if data.recentPolls && data.recentPolls.length > 0}
  {#each data.recentPolls as recent (recent.poll_id)}
    <div class="mx-auto max-w-3xl p-4 sm:p-6 space-y-4 sm:space-y-6">
      <header class="space-y-2">
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
        >
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
            {recent.title}
          </h1>

          {#if isLogged && recent.status === "open"}
            <div class="mt-1 sm:mt-2 flex gap-2">
              <AlertDialog.Root>
                <AlertDialog.Trigger
                  class={buttonVariants({
                    variant: "destructive",
                  })}
                  disabled={closing}
                >
                  {closing ? "Chiusura..." : "Chiudi sondaggio"}
                </AlertDialog.Trigger>

                <AlertDialog.Content class="max-w-md" portalProps={undefined}>
                  <AlertDialog.Header class="">
                    <AlertDialog.Title class="">
                      Chiudere definitivamente il sondaggio?
                    </AlertDialog.Title>
                    <AlertDialog.Description class="">
                      L’azione finalizza il sondaggio e imposta lo stato a
                      "closed". Operazione irreversibile.
                    </AlertDialog.Description>
                  </AlertDialog.Header>
                  <AlertDialog.Footer class="">
                    <AlertDialog.Cancel
                      class={buttonVariants({
                        variant: "outline",
                      })}
                    >
                      Annulla
                    </AlertDialog.Cancel>
                    <AlertDialog.Action
                      class={buttonVariants({
                        variant: "destructive",
                      })}
                      onclick={() => closePoll(recent.poll_id)}
                    >
                      Conferma chiusura
                    </AlertDialog.Action>
                  </AlertDialog.Footer>
                </AlertDialog.Content>
              </AlertDialog.Root>
            </div>
          {/if}
        </div>

        {#if recent.status === "closed"}
          <div class="flex items-center gap-2">
            <Badge class="bg-red-100 text-red-700" href={undefined}
              >Sondaggio chiuso</Badge
            >
            {#if isLogged}
              <button
                class={buttonVariants({ variant: "default" })}
                onclick={async () => {
                  setTab?.(recent.poll_id, "squadre");
                  await loadVoters?.(recent.poll_id);
                }}
              >
                Vai a Squadre
              </button>
            {/if}
          </div>
        {:else if recent.status === "open"}
          <p class="text-sm text-muted-foreground">
            Per votare seleziona uno o più giorni disponibili; un secondo clic
            sulla stessa data rimuove il voto.
          </p>
          <Badge class="bg-green-100 text-green-700" href={undefined}
            >Sondaggio aperto</Badge
          >
        {/if}
      </header>

      {#if data.isLogged}
        <div
          role="tablist"
          aria-label="Sezioni sondaggio"
          class="flex gap-2 border-b pb-2"
        >
          <button
            role="tab"
            aria-selected={getTab?.(recent.poll_id) === "voto"}
            aria-controls={`panel-voto-${recent.poll_id}`}
            id={`tab-voto-${recent.poll_id}`}
            class="px-3 py-1.5 rounded-md text-sm border data-[active=true]:bg-primary-600 data-[active=true]:text-white"
            data-active={getTab?.(recent.poll_id) === "voto"}
            onclick={() => setTab?.(recent.poll_id, "voto")}
          >
            Votazione
          </button>
          <button
            role="tab"
            aria-selected={getTab?.(recent.poll_id) === "squadre"}
            aria-controls={`panel-squadre-${recent.poll_id}`}
            id={`tab-squadre-${recent.poll_id}`}
            class="px-3 py-1.5 rounded-md text-sm border data-[active=true]:bg-primary-600 data-[active=true]:text-white"
            data-active={getTab?.(recent.poll_id) === "squadre"}
            onclick={async () => {
              setTab?.(recent.poll_id, "squadre");
              await loadVoters?.(recent.poll_id);
            }}
          >
            Squadre
          </button>
        </div>
      {/if}

      <!-- Pannello Votazione -->
      <div
        role="tabpanel"
        id={`panel-voto-${recent.poll_id}`}
        aria-labelledby={`tab-voto-${recent.poll_id}`}
        class="space-y-6"
        hidden={getTab?.(recent.poll_id) !== "voto"}
      >
        <!-- Sezione Selezione Giocatore -->
        <div
          class="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden"
          class:hidden={recent.status === "closed"}
        >
          <div class="p-4 sm:p-6 bg-muted/20 border-b">
            <h3 class="font-semibold flex items-center gap-2">
              <div
                class="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs"
              >
                1
              </div>
              Chi sei?
            </h3>
            <p class="text-sm text-muted-foreground mt-1 ml-8">
              Seleziona il tuo nome per registrare i voti.
            </p>
          </div>

          <div class="p-4 sm:p-6">
            {#if !chosenPlayerId}
              <div
                class="flex flex-col sm:flex-row gap-3 items-end sm:items-center"
              >
                <div class="w-full sm:flex-1 space-y-1.5">
                  <label for="player-select" class="text-sm font-medium"
                    >Giocatore</label
                  >
                  <select
                    id="player-select"
                    class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    bind:value={tempPlayerId}
                  >
                    <option value="" disabled>Seleziona dalla lista...</option>
                    {#each players as p}
                      <option value={p.player_id} class="text-black"
                        >{p.name}</option
                      >
                    {/each}
                  </select>
                </div>

                <AlertDialog.Root>
                  <AlertDialog.Trigger
                    class={buttonVariants({
                      variant: "default",
                    })}
                    disabled={!tempPlayerId || tempPlayerId.length === 0}
                  >
                    Conferma Identità
                  </AlertDialog.Trigger>

                  <AlertDialog.Content class="max-w-md" portalProps={undefined}>
                    <AlertDialog.Header class="">
                      <AlertDialog.Title class=""
                        >Confermi di essere {players.find(
                          (p) => p.player_id === tempPlayerId,
                        )?.name}?</AlertDialog.Title
                      >
                      <AlertDialog.Description class="">
                        Questa scelta è necessaria per votare e non potrà essere
                        modificata facilmente.
                      </AlertDialog.Description>
                    </AlertDialog.Header>
                    <AlertDialog.Footer class="">
                      <AlertDialog.Cancel
                        class={buttonVariants({
                          variant: "outline",
                        })}
                      >
                        Annulla
                      </AlertDialog.Cancel>
                      <AlertDialog.Action
                        class={buttonVariants({
                          variant: "default",
                        })}
                        onclick={confirmPlayerFinal}
                      >
                        Conferma
                      </AlertDialog.Action>
                    </AlertDialog.Footer>
                  </AlertDialog.Content>
                </AlertDialog.Root>
              </div>
            {:else}
              <div
                class="flex items-center gap-3 bg-green-50 text-green-700 px-4 py-3 rounded-lg border border-green-100"
              >
                <div
                  class="size-8 rounded-full bg-green-200 flex items-center justify-center text-green-800 font-bold"
                >
                  {players
                    .find((p) => p.player_id === chosenPlayerId)
                    ?.name.charAt(0)}
                </div>
                <div class="flex-1">
                  <p class="font-medium">
                    Stai votando come <span class="font-bold"
                      >{players.find((p) => p.player_id === chosenPlayerId)
                        ?.name}</span
                    >
                  </p>
                </div>
                <Badge
                  variant="outline"
                  class="bg-white text-green-700 border-green-200"
                  href={undefined}>Identificato</Badge
                >
              </div>
            {/if}
          </div>
        </div>

        <!-- Lista opzioni -->
        <section class:hidden={recent.status === "closed"} class="space-y-4">
          <div class="flex items-center gap-2 px-1">
            <div
              class="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-bold"
            >
              2
            </div>
            <h3 class="font-semibold">Esprimi le tue preferenze</h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each data.options as opt}
              {@const dt = opt.match_date ? new Date(opt.match_date) : null}
              {@const dayName = dt ? itWeekday.format(dt) : ""}
              {@const dayShort = dt
                ? itDate.format(dt)
                : (opt.match_date ?? "")}
              {@const isSelected = votedSet.has(opt.option_id)}

              {@const emoji =
                opt.time_of_day === "Mattina"
                  ? "☀️"
                  : opt.time_of_day === "Pomeriggio"
                    ? "🌤️"
                    : opt.time_of_day === "Sera"
                      ? "🌙"
                      : "🕓"}

              <label
                class="relative flex flex-col gap-3 border rounded-xl p-5 shadow-sm transition-all cursor-pointer hover:border-primary/50 {isSelected
                  ? 'bg-primary/5 border-primary ring-1 ring-primary'
                  : 'bg-card hover:bg-muted/50'}"
              >
                <div class="flex items-start justify-between">
                  <div class="flex flex-col">
                    <div class="font-bold text-lg capitalize">
                      {dayName}
                      <span class="font-normal text-muted-foreground text-base"
                        >| {dayShort}</span
                      >
                    </div>
                    <div
                      class="flex items-center gap-1.5 text-base font-medium mt-1"
                    >
                      <span>{emoji}</span>
                      <span>{opt.time_of_day ?? "Orario non definito"}</span>
                    </div>

                    {#if opt.luogo}
                      <div
                        class="flex items-center gap-1.5 text-xs text-muted-foreground mt-2"
                      >
                        <MapPin class="size-3.5" />
                        {opt.luogo}
                      </div>
                    {/if}

                    {#if opt.note}
                      <div
                        class="text-xs text-muted-foreground mt-1 bg-muted px-2 py-1 rounded inline-block self-start"
                      >
                        {opt.note}
                      </div>
                    {/if}
                  </div>

                  <div class="relative">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={recent.status !== "open" ||
                        busyId === opt.option_id ||
                        !chosenPlayerId}
                      onchange={(e) =>
                        toggleVote(
                          recent.poll_id,
                          opt.option_id,
                          (e.currentTarget as HTMLInputElement).checked,
                        )}
                      class="peer sr-only"
                    />
                    <div
                      class="size-6 rounded-full border-2 border-muted-foreground peer-checked:border-primary peer-checked:bg-primary transition-all flex items-center justify-center"
                    >
                      {#if isSelected}
                        <svg
                          class="size-3.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          stroke-width="3"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      {/if}
                    </div>
                  </div>
                </div>

                <div
                  class="pt-3 mt-auto border-t flex items-center justify-between"
                >
                  <div class="text-xs font-medium text-muted-foreground">
                    {#if (data.counts[opt.option_id] ?? 0) === 0}
                      Nessun voto
                    {:else}
                      <span class="text-primary font-bold"
                        >{data.counts[opt.option_id]}</span
                      > voti
                    {/if}
                  </div>

                  <!-- Dettagli votanti (collapsible) -->
                  {#if (data.counts[opt.option_id] ?? 0) > 0}
                    <Collapsible.Root class="">
                      <Collapsible.Trigger
                        class="text-xs text-primary hover:underline flex items-center gap-1"
                        onclick={() => {
                          loadVotersForOption(recent.poll_id, opt.option_id);
                        }}
                      >
                        Vedi chi
                        <ChevronsUpDown class="size-3" />
                      </Collapsible.Trigger>
                      <Collapsible.Content
                        class="absolute left-0 right-0 top-full z-10 mt-1 p-2 bg-popover border rounded-lg shadow-lg mx-2"
                      >
                        <div class="flex flex-wrap gap-1">
                          {#if votersByOption[opt.option_id]?.loading}
                            <div class="text-xs text-muted-foreground p-1">
                              Caricamento…
                            </div>
                          {:else if votersByOption[opt.option_id]?.list?.length}
                            {#each votersByOption[opt.option_id].list as v (v.player_id)}
                              <span
                                class="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px] font-medium"
                                >{v.name}</span
                              >
                            {/each}
                          {:else}
                            <div class="text-xs text-muted-foreground p-1">
                              Nessun votante
                            </div>
                          {/if}
                        </div>
                      </Collapsible.Content>
                    </Collapsible.Root>
                  {/if}
                </div>
              </label>
            {/each}
          </div>
        </section>

        <!-- Grafico riepilogo -->
        <Card.Root class="flex flex-col">
          <Card.Header class="items-center text-center">
            <Card.Title>Preferenze per data</Card.Title>
            <Card.Description
              >Distribuzione dei voti tra le opzioni proposte</Card.Description
            >
          </Card.Header>
          <Card.Content class="flex-1">
            {#if chartDataBars.length > 0}
              <Chart.Container config={chartConfig} class="mx-auto w-full">
                <BarChart
                  labels={{ offset: 12 }}
                  data={chartDataBars}
                  orientation="horizontal"
                  yScale={scaleBand().padding(0.25)}
                  y="label"
                  axis="y"
                  rule={false}
                  series={[
                    {
                      key: "value",
                      label: chartConfig.value.label,
                      color: chartConfig.value.color,
                    },
                  ]}
                  padding={{ right: 16 }}
                  props={{
                    bars: {
                      stroke: "none",
                      radius: 5,
                      rounded: "all",
                      motion: {
                        width: { type: "spring", stiffness: 80, damping: 20 },
                      },
                    },
                    highlight: { area: { fill: "none" } },
                    yAxis: {
                      tickLabelProps: {
                        textAnchor: "start",
                        dx: 6,
                        class: "stroke-none fill-background!",
                      },
                      tickLength: 0,
                    },
                  }}
                >
                  {#snippet tooltip()}
                    <Chart.Tooltip
                      labelKey="label"
                      hideLabel={false}
                      class=""
                      label=""
                      labelClassName=""
                      formatter={undefined}
                      nameKey=""
                      color=""
                    />
                  {/snippet}
                </BarChart>
              </Chart.Container>
            {:else}
              <div class="text-sm text-muted-foreground text-center py-6">
                Nessun voto ancora registrato
              </div>
            {/if}
          </Card.Content>
          <Card.Footer class="flex-col gap-2 text-sm">
            <div class="flex items-center gap-2 font-medium leading-none">
              Trend aggiornato in tempo reale <TrendingUpIcon class="size-4" />
            </div>
            <div class="text-muted-foreground leading-none">
              Mostra il totale voti per ogni data proposta
            </div>
          </Card.Footer>
        </Card.Root>
      </div>

      <!-- Pannello Squadre (solo admin) -->
      {#if isLogged}
        <div
          role="tabpanel"
          id={`panel-squadre-${recent.poll_id}`}
          aria-labelledby={`tab-squadre-${recent.poll_id}`}
          hidden={getTab?.(recent.poll_id) !== "squadre"}
          class="rounded-2xl border p-3 sm:p-4 space-y-3"
        >
          <div class="flex flex-wrap items-center gap-2">
            <button
              class={buttonVariants({ variant: "outline" })}
              onclick={() => loadVoters(recent.poll_id)}
            >
              Carica votanti
            </button>
            <button
              class={buttonVariants({ variant: "secondary" })}
              onclick={() => generateTeams(recent.poll_id)}
            >
              Genera Squadre
            </button>
            <button
              class={buttonVariants({ variant: "default" })}
              onclick={() => confirmFixture(recent.poll_id)}
            >
              Conferma convocati
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Disponibili -->
            <Card.Root class="border-dashed">
              <Card.Header class="pb-3">
                <Card.Title class="text-base font-medium"
                  >Disponibili</Card.Title
                >
              </Card.Header>
              <Card.Content class="">
                <ul
                  class="space-y-2 min-h-[200px]"
                  ondrop={(e) => handleDrop?.(e, "available", recent.poll_id)}
                  ondragover={(e) => e.preventDefault()}
                >
                  {#each votersByPoll[recent.poll_id] ?? [] as v (v.player_id)}
                    <li
                      draggable="true"
                      ondragstart={(e) => handleDragStart?.(e, v)}
                      class="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 border hover:bg-muted cursor-grab active:cursor-grabbing"
                    >
                      <span class="font-medium text-sm text-foreground"
                        >{v.name}</span
                      >
                      <div class="flex gap-1">
                        <button
                          class="size-6 flex items-center justify-center rounded bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold"
                          onclick={() => moveTo?.(v, "A", recent.poll_id)}
                          title="Sposta in A"
                        >
                          A
                        </button>
                        <button
                          class="size-6 flex items-center justify-center rounded bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold"
                          onclick={() => moveTo?.(v, "B", recent.poll_id)}
                          title="Sposta in B"
                        >
                          B
                        </button>
                      </div>
                    </li>
                  {/each}
                  {#if !(votersByPoll[recent.poll_id] ?? []).length}
                    <li
                      class="flex flex-col items-center justify-center h-full text-sm text-muted-foreground italic"
                    >
                      Trascina qui i giocatori
                    </li>
                  {/if}
                </ul>
              </Card.Content>
            </Card.Root>

            <!-- Squadra A -->
            <Card.Root class="bg-blue-50/50 border-blue-100">
              <Card.Header class="pb-3">
                <Card.Title class="text-base font-medium text-blue-700"
                  >Squadra A</Card.Title
                >
              </Card.Header>
              <Card.Content class="">
                <ul
                  class="space-y-2 min-h-[200px]"
                  ondrop={(e) => handleDrop?.(e, "A", recent.poll_id)}
                  ondragover={(e) => e.preventDefault()}
                >
                  {#each teamsByPoll?.[recent.poll_id]?.A ?? [] as v (v.player_id)}
                    <li
                      draggable="true"
                      ondragstart={(e) => handleDragStart?.(e, v)}
                      class="flex items-center justify-between gap-2 p-2 rounded-md bg-white border shadow-sm cursor-grab active:cursor-grabbing"
                    >
                      <span class="font-medium text-sm text-black"
                        >{v.name}</span
                      >
                      <button
                        class="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onclick={() => removeToAvailable(recent.poll_id, v)}
                        title="Rimuovi"
                      >
                        <Trash2 class="size-3.5" />
                      </button>
                    </li>
                  {/each}
                  {#if !(teamsByPoll?.[recent.poll_id]?.A ?? []).length}
                    <li
                      class="flex flex-col items-center justify-center h-full text-sm text-muted-foreground italic"
                    >
                      Trascina qui i giocatori
                    </li>
                  {/if}
                </ul>
              </Card.Content>
            </Card.Root>

            <!-- Squadra B -->
            <Card.Root class="bg-orange-50/50 border-orange-100">
              <Card.Header class="pb-3">
                <Card.Title class="text-base font-medium text-orange-700"
                  >Squadra B</Card.Title
                >
              </Card.Header>
              <Card.Content class="">
                <ul
                  class="space-y-2 min-h-[200px]"
                  ondrop={(e) => handleDrop?.(e, "B", recent.poll_id)}
                  ondragover={(e) => e.preventDefault()}
                >
                  {#each teamsByPoll?.[recent.poll_id]?.B ?? [] as v (v.player_id)}
                    <li
                      draggable="true"
                      ondragstart={(e) => handleDragStart?.(e, v)}
                      class="flex items-center justify-between gap-2 p-2 rounded-md bg-white border shadow-sm cursor-grab active:cursor-grabbing"
                    >
                      <span class="font-medium text-sm text-black"
                        >{v.name}</span
                      >
                      <button
                        class="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onclick={() => removeToAvailable(recent.poll_id, v)}
                        title="Rimuovi"
                      >
                        <Trash2 class="size-3.5" />
                      </button>
                    </li>
                  {/each}
                  {#if !(teamsByPoll?.[recent.poll_id]?.B ?? []).length}
                    <li
                      class="flex flex-col items-center justify-center h-full text-sm text-muted-foreground italic"
                    >
                      Trascina qui i giocatori
                    </li>
                  {/if}
                </ul>
              </Card.Content>
            </Card.Root>
          </div>
        </div>
      {/if}
    </div>
  {/each}
{:else if !data.isLogged && !data.poll}
  <div
    class="mx-auto max-w-3xl p-6 flex flex-col items-center justify-center gap-4"
  >
    <p class="text-center text-muted-foreground">Nessun sondaggio attivo</p>
    {#if showSpinner}
      <svg class="animate-spin h-8 w-8 text-primary-500" viewBox="0 0 24 24">
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
          fill="none"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
    {/if}
  </div>
{/if}
