<script lang="ts">
    import { BarChart } from "layerchart";
    import { scaleBand } from "d3-scale";
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
    import Users from "@lucide/svelte/icons/users";
    import Check from "@lucide/svelte/icons/check";
    import ChevronLeft from "@lucide/svelte/icons/chevron-left";
    import Shuffle from "@lucide/svelte/icons/shuffle";
    import { Toaster, toast } from "svelte-sonner";
    import Skeleton from "$lib/components/ui/skeleton/skeleton.svelte";

    onMount(() => {
        if (!data.isLogged && !data.poll) {
            showSpinner = true;
            const t = setTimeout(() => goto("/"), 3000);
            return () => clearTimeout(t);
        }
    });

    const { data } = $props<{
        data: {
            poll: { poll_id: number; title: string; status: string } | null;
            recentPolls: any[];
            streamed: {
                pollData: Promise<{
                    options: Array<{
                        option_id: number;
                        match_date: string | null;
                        luogo: string | null;
                        time_of_day: string | null;
                        note: string | null;
                    }>;
                    counts: Record<number, number>;
                    myVotes: Array<{ option_id: number; choice: string }>;
                    chosenPlayerId: string | null;
                    players: Array<{ player_id: string; name: string }>;
                    absentPlayers: Array<{ player_id: string; name: string }>;
                    isAbsent: boolean;
                }>;
            };
            session: any;
            isLogged: boolean;
            canVote: boolean;
        };
    }>();

    let showSpinner = $state(false);
    let busy = $state(false);
    let msg = $state<string | null>(null);
    let busyId = $state<number | null>(null);
    let options = $state<any[]>([]);
    let counts = $state<Record<number, number>>({});
    let myVotes = $state<any[]>([]);
    let players = $state<Array<{ player_id: string; name: string }>>([]);
    let absentPlayers = $state<Array<{ player_id: string; name: string }>>([]);
    let isAbsent = $state(false);
    let chosenPlayerId = $state<string | null>(null);
    let loaded = $state(false);

    $effect(() => {
        data.streamed.pollData.then((res: any) => {
            options = res.options;
            counts = res.counts;
            myVotes = res.myVotes;
            players = res.players;
            absentPlayers = res.absentPlayers;
            isAbsent = res.isAbsent;
            chosenPlayerId = res.chosenPlayerId;
            loaded = true;
        });
    });

    const votedSet = $derived(new Set((myVotes ?? []).map((v) => v.option_id)));

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
    let defaultLocation = $state("");
    let generationMode = $state<"full" | "weekend">("full");
    let startDate = $state("");

    function addRow() {
        newOptions = [
            ...newOptions,
            { match_date: "", luogo: defaultLocation, time_of_day: "" },
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
                : await fetch(`${base}?option_id=${option_id}`, {
                      method: "DELETE",
                  });
            if (!res.ok) {
                toast.error("Errore nel voto");
                return;
            }
            if (checked) {
                votedSet.add(option_id);
                counts = {
                    ...counts,
                    [option_id]: (counts[option_id] ?? 0) + 1,
                };
                toast.success("Voto aggiunto!");
            } else {
                votedSet.delete(option_id);
                counts = {
                    ...counts,
                    [option_id]: Math.max(0, (counts[option_id] ?? 1) - 1),
                };
                toast.success("Voto rimosso");
            }
        } catch (err) {
            toast.error("Errore di connessione");
        } finally {
            busyId = null;
        }
    }

    const itWeekday = new Intl.DateTimeFormat("it-IT", { weekday: "long" });
    const itDate = new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
        month: "2-digit",
    });

    const chartDataBars = $derived(
        (options ?? [])
            .map((opt) => {
                const dt = opt.match_date ? new Date(opt.match_date) : null;
                const dayName = dt ? itWeekday.format(dt) : "";
                const timeLabel = opt.time_of_day ?? "";
                const dayShort = dt
                    ? itDate.format(dt)
                    : (opt.match_date ?? "");
                return {
                    label:
                        [dayName, dayShort, timeLabel]
                            .filter(Boolean)
                            .join(" • ") ||
                        opt.luogo ||
                        `Opzione ${opt.option_id}`,
                    labelShort:
                        [dayShort, timeLabel].filter(Boolean).join(" ") ||
                        opt.luogo ||
                        `Opzione ${opt.option_id}`,
                    value: counts[opt.option_id] ?? 0,
                };
            })
            .filter((d) => d.value > 0),
    );

    const chartConfig = {
        value: { label: "Voti", color: "var(--chart-1)" },
        label: { color: "var(--background)" },
    };

    let tempPlayerId = $state<string>("");

    async function confirmPlayerFinal() {
        chosenPlayerId = tempPlayerId;
        if (data.poll) {
            document.cookie = `poll_identity_${data.poll.poll_id}=${chosenPlayerId}; path=/; max-age=31536000`;
        }
    }

    let closing = $state(false);
    const isLogged = $derived(!!data.isLogged);
    let tabByPoll = $state<Record<number, "voto" | "squadre">>({});
    const getTab = (id: number) => tabByPoll[id] ?? "voto";
    const setTab = (id: number, t: "voto" | "squadre") =>
        (tabByPoll = { ...tabByPoll, [id]: t });

    type Voter = { player_id: string; name: string };
    let votersByPoll = $state<Record<number, Voter[]>>({});
    let teamsByPoll = $state<
        Record<number, { A: Voter[]; B: Voter[]; P?: Voter[] }>
    >({});

    async function loadVoters(poll_id: number) {
        const res = await fetch(`/api/poll/${poll_id}/vote`);
        if (!res.ok) return;
        const voters: Voter[] = await res.json();
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
        setTab(id, "squadre");
        await loadVoters(id);
        location.reload();
    }

    type TeamKey = "A" | "B" | "P" | "available";

    function ensureTeams(poll_id: number) {
        if (!teamsByPoll[poll_id])
            teamsByPoll = {
                ...teamsByPoll,
                [poll_id]: { A: [], B: [], P: [] },
            };
        if (!votersByPoll[poll_id])
            votersByPoll = { ...votersByPoll, [poll_id]: [] };
    }

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
        const t = teamsByPoll[poll_id];
        if (!t) return;
        t.A = t.A.filter((v) => v.player_id !== player_id);
        t.B = t.B.filter((v) => v.player_id !== player_id);
        t.P = t.P?.filter((v) => v.player_id !== player_id);
    }

    function removeToAvailable(poll_id: number, player: Voter) {
        ensureTeams(poll_id);
        removeFromAllTeams(poll_id, player.player_id);
        const current = votersByPoll[poll_id] ?? [];
        if (!current.find((v) => v.player_id === player.player_id)) {
            votersByPoll = { ...votersByPoll, [poll_id]: [...current, player] };
        }
    }

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

    function handleDrop(e: DragEvent, dest: TeamKey, poll_id: number) {
        e.preventDefault();
        const text = e.dataTransfer?.getData("application/json");
        if (!text) return;
        const v: Voter & { is_goalkeeper?: boolean } = JSON.parse(text);
        if (dest === "available") {
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

    function handleDragStart(
        e: DragEvent,
        v: Voter & { is_goalkeeper?: boolean },
    ) {
        e.dataTransfer?.setData("application/json", JSON.stringify(v));
        if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
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
        if (res.ok) {
            toast.success("Convocati confermati");
            goto(`/planned`);
        } else toast.error("Errore conferma convocati");
    }

    let votersByOption = $state<
        Record<number, { loading: boolean; list: Voter[] }>
    >({});

    async function loadVotersForOption(poll_id: number, option_id: number) {
        if (
            votersByOption[option_id]?.list?.length ||
            votersByOption[option_id]?.loading
        )
            return;
        votersByOption = {
            ...votersByOption,
            [option_id]: { loading: true, list: [] },
        };
        const res = await fetch(
            `/api/poll/${poll_id}/vote?option_id=${option_id}`,
        );
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
        const all = [
            ...(votersByPoll[poll_id] ?? []),
            ...(teamsByPoll[poll_id].A ?? []),
            ...(teamsByPoll[poll_id].B ?? []),
        ];
        for (let i = all.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [all[i], all[j]] = [all[j], all[i]];
        }
        const mid = Math.ceil(all.length / 2);
        votersByPoll[poll_id] = [];
        teamsByPoll = {
            ...teamsByPoll,
            [poll_id]: {
                ...teamsByPoll[poll_id],
                A: all.slice(0, mid),
                B: all.slice(mid),
            },
        };
        toast.success("Squadre generate casualmente");
    }

    function generateWeek() {
        let start: Date;
        if (startDate) {
            start = new Date(startDate);
        } else {
            const today = new Date();
            const day = today.getDay() || 7;
            start = new Date(today);
            start.setDate(today.getDate() - day + 1);
        }
        const opts: NewOpt[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const dateStr = d.toISOString().split("T")[0];
            const day = d.getDay();
            if (generationMode === "weekend" && day >= 1 && day <= 4) continue;
            if (day === 0 || day === 6) {
                opts.push({
                    match_date: dateStr,
                    luogo: defaultLocation,
                    time_of_day: "Mattina",
                });
                opts.push({
                    match_date: dateStr,
                    luogo: defaultLocation,
                    time_of_day: "Pomeriggio",
                });
                opts.push({
                    match_date: dateStr,
                    luogo: defaultLocation,
                    time_of_day: "Sera",
                });
            } else {
                opts.push({
                    match_date: dateStr,
                    luogo: defaultLocation,
                    time_of_day: "Sera",
                });
            }
        }
        newOptions = opts;
        toast.success("Settimana generata!");
    }

    async function toggleAbsence() {
        if (!data.poll) return;
        const newStatus = !isAbsent;
        isAbsent = newStatus;
        try {
            const res = await fetch(`/api/poll/${data.poll.poll_id}/absence`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    absent: newStatus,
                    player_id: chosenPlayerId,
                }),
            });
            if (!res.ok) throw new Error("Failed");
            toast.success(
                newStatus ? "Segnato come assente" : "Rimosso da assenti",
            );
            location.reload();
        } catch {
            isAbsent = !newStatus;
            toast.error("Errore aggiornamento assenza");
        }
    }

    // Emoji for time of day
    const timeEmoji = (t: string | null) =>
        t === "Mattina"
            ? "☀️"
            : t === "Pomeriggio"
              ? "🌤️"
              : t === "Sera"
                ? "🌙"
                : "🕓";
</script>

<Toaster position="top-center" richColors />

<!-- ───────────────────────── TOP NAV ───────────────────────── -->
<div
    class="sticky top-0 z-20 backdrop-blur-md bg-background/80 border-b border-border/50"
>
    <div
        class="mx-auto max-w-4xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4"
    >
        <a
            href="/"
            class="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
            <ChevronLeft class="size-4" />
            Home
        </a>

        {#if data.isLogged}
            <Dialog.Root>
                <Dialog.Trigger
                    class="{buttonVariants({
                        variant: 'default',
                        size: 'sm',
                    })} gap-1.5"
                >
                    <Plus class="size-3.5" />
                    Nuovo sondaggio
                </Dialog.Trigger>
                <Dialog.Content
                    class="max-w-2xl max-h-[90vh] overflow-y-auto"
                    portalProps={undefined}
                >
                    <Dialog.Header class="">
                        <Dialog.Title class=""
                            >Crea nuovo sondaggio</Dialog.Title
                        >
                        <Dialog.Description class=""
                            >Configura le opzioni per il prossimo match.</Dialog.Description
                        >
                    </Dialog.Header>

                    <div class="space-y-5 py-4">
                        <!-- Titolo -->
                        <div class="space-y-1.5">
                            <label for="title" class="text-sm font-medium"
                                >Titolo</label
                            >
                            <input
                                id="title"
                                class="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                                placeholder="Es. Partita di Venerdì"
                                bind:value={title}
                            />
                        </div>

                        <!-- Config generazione -->
                        <div
                            class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-xl border"
                        >
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-muted-foreground flex items-center gap-1"
                                    ><MapPin class="size-3" /> Luogo default</label
                                >
                                <input
                                    class="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
                                    placeholder="Es. Campo Sportivo"
                                    bind:value={defaultLocation}
                                />
                            </div>
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-muted-foreground flex items-center gap-1"
                                    ><CalendarIcon class="size-3" /> Modalità</label
                                >
                                <select
                                    class="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
                                    bind:value={generationMode}
                                >
                                    <option value="full"
                                        >Settimana intera</option
                                    >
                                    <option value="weekend"
                                        >Solo festivi (Ven–Dom)</option
                                    >
                                </select>
                            </div>
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-muted-foreground flex items-center gap-1"
                                    ><CalendarIcon class="size-3" /> Data inizio</label
                                >
                                <input
                                    type="date"
                                    class="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
                                    bind:value={startDate}
                                />
                            </div>
                        </div>

                        <!-- Opzioni -->
                        <div class="space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-sm font-medium"
                                    >Opzioni di voto</span
                                >
                                <div class="flex gap-3">
                                    <button
                                        type="button"
                                        class="text-xs text-primary hover:underline flex items-center gap-1"
                                        onclick={generateWeek}
                                    >
                                        <CalendarIcon class="size-3" /> Genera settimana
                                    </button>
                                    <button
                                        type="button"
                                        class="text-xs text-primary hover:underline flex items-center gap-1"
                                        onclick={addRow}
                                    >
                                        <Plus class="size-3" /> Aggiungi
                                    </button>
                                </div>
                            </div>

                            {#each newOptions as opt, i}
                                <div
                                    class="border rounded-xl p-3 space-y-3 bg-muted/20 relative"
                                >
                                    {#if newOptions.length > 1}
                                        <button
                                            type="button"
                                            class="absolute top-2.5 right-2.5 text-muted-foreground hover:text-destructive transition-colors"
                                            onclick={() => removeRow(i)}
                                        >
                                            <Trash2 class="size-4" />
                                        </button>
                                    {/if}
                                    <div class="grid grid-cols-2 gap-3">
                                        <div class="space-y-1">
                                            <label
                                                class="text-xs text-muted-foreground flex items-center gap-1"
                                                ><CalendarIcon class="size-3" />
                                                Data</label
                                            >
                                            <input
                                                class="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
                                                type="date"
                                                bind:value={opt.match_date}
                                            />
                                        </div>
                                        <div class="space-y-1">
                                            <label
                                                class="text-xs text-muted-foreground flex items-center gap-1"
                                                ><Clock class="size-3" /> Fascia
                                                oraria</label
                                            >
                                            <select
                                                class="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
                                                bind:value={opt.time_of_day}
                                            >
                                                <option value="" disabled
                                                    >Seleziona...</option
                                                >
                                                <option value="Mattina"
                                                    >Mattina</option
                                                >
                                                <option value="Pomeriggio"
                                                    >Pomeriggio</option
                                                >
                                                <option value="Sera"
                                                    >Sera</option
                                                >
                                            </select>
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-2 gap-3">
                                        <div class="space-y-1">
                                            <label
                                                class="text-xs text-muted-foreground flex items-center gap-1"
                                                ><MapPin class="size-3" /> Luogo</label
                                            >
                                            <input
                                                class="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
                                                placeholder="Es. Campo Sportivo"
                                                bind:value={opt.luogo}
                                            />
                                        </div>
                                        <div class="space-y-1">
                                            <label
                                                class="text-xs text-muted-foreground text-sm"
                                                >Note</label
                                            >
                                            <input
                                                class="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
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
                            {busy ? "Creazione..." : "Crea sondaggio"}
                        </Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Root>
        {/if}
    </div>
</div>

<!-- ───────────────────────── MAIN ───────────────────────── -->
<main class="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-10 space-y-10">
    {#if data.recentPolls && data.recentPolls.length > 0}
        {#each data.recentPolls as recent (recent.poll_id)}
            <section class="space-y-6">
                <!-- Poll header -->
                <div class="space-y-3">
                    <div
                        class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
                    >
                        <div class="space-y-1.5">
                            <h1
                                class="text-2xl sm:text-3xl font-bold tracking-tight"
                            >
                                {recent.title}
                            </h1>
                            <div class="flex items-center gap-2 flex-wrap">
                                {#if recent.status === "open"}
                                    <span
                                        class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    >
                                        <span
                                            class="size-1.5 rounded-full bg-emerald-500 animate-pulse"
                                        ></span>
                                        Sondaggio aperto
                                    </span>
                                    <span class="text-xs text-muted-foreground"
                                        >Seleziona uno o più giorni disponibili</span
                                    >
                                {:else}
                                    <span
                                        class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground"
                                    >
                                        Sondaggio chiuso
                                    </span>
                                {/if}
                            </div>
                        </div>

                        {#if isLogged && recent.status === "open"}
                            <AlertDialog.Root>
                                <AlertDialog.Trigger
                                    class="{buttonVariants({
                                        variant: 'outline',
                                        size: 'sm',
                                    })} text-destructive border-destructive/30 hover:bg-destructive/5 flex-shrink-0"
                                    disabled={closing}
                                >
                                    {closing
                                        ? "Chiusura..."
                                        : "Chiudi sondaggio"}
                                </AlertDialog.Trigger>
                                <AlertDialog.Content
                                    class="max-w-md"
                                    portalProps={undefined}
                                >
                                    <AlertDialog.Header class="">
                                        <AlertDialog.Title class=""
                                            >Chiudere definitivamente il
                                            sondaggio?</AlertDialog.Title
                                        >
                                        <AlertDialog.Description class=""
                                            >L'azione finalizza il sondaggio.
                                            Operazione irreversibile.</AlertDialog.Description
                                        >
                                    </AlertDialog.Header>
                                    <AlertDialog.Footer class="">
                                        <AlertDialog.Cancel
                                            class={buttonVariants({
                                                variant: "outline",
                                            })}>Annulla</AlertDialog.Cancel
                                        >
                                        <AlertDialog.Action
                                            class={buttonVariants({
                                                variant: "destructive",
                                            })}
                                            onclick={() =>
                                                closePoll(recent.poll_id)}
                                            >Conferma chiusura</AlertDialog.Action
                                        >
                                    </AlertDialog.Footer>
                                </AlertDialog.Content>
                            </AlertDialog.Root>
                        {/if}
                    </div>

                    <!-- Assenti pill -->
                    {#if absentPlayers.length > 0}
                        <div
                            class="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg w-fit"
                        >
                            <Users class="size-3.5 flex-shrink-0" />
                            <span
                                ><strong class="text-foreground"
                                    >Assenti:</strong
                                >
                                {absentPlayers
                                    .map((p) => p.name)
                                    .join(", ")}</span
                            >
                        </div>
                    {/if}
                </div>

                {#if !loaded}
                    <div class="space-y-3">
                        <Skeleton class="h-24 w-full rounded-xl" />
                        <Skeleton class="h-64 w-full rounded-xl" />
                    </div>
                {:else}
                    <!-- TABS (solo admin) -->
                    {#if isLogged}
                        <div
                            class="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit"
                        >
                            <button
                                class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all {getTab(
                                    recent.poll_id,
                                ) === 'voto'
                                    ? 'bg-background shadow-sm text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'}"
                                onclick={() => setTab(recent.poll_id, "voto")}
                            >
                                Votazione
                            </button>
                            <button
                                class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all {getTab(
                                    recent.poll_id,
                                ) === 'squadre'
                                    ? 'bg-background shadow-sm text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'}"
                                onclick={async () => {
                                    setTab(recent.poll_id, "squadre");
                                    await loadVoters(recent.poll_id);
                                }}
                            >
                                Squadre
                            </button>
                        </div>
                    {/if}

                    <!-- ══════════ TAB: VOTAZIONE ══════════ -->
                    <div
                        hidden={getTab(recent.poll_id) !== "voto"}
                        class="space-y-6"
                    >
                        <!-- Chi sei? — solo se il sondaggio è aperto -->
                        {#if recent.status === "open"}
                            <div
                                class="rounded-xl border bg-card overflow-hidden"
                            >
                                <div
                                    class="px-5 py-4 border-b bg-muted/20 flex items-center gap-3"
                                >
                                    <div
                                        class="size-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center"
                                    >
                                        1
                                    </div>
                                    <h3 class="font-semibold text-sm">
                                        Chi sei?
                                    </h3>
                                    {#if chosenPlayerId}
                                        <span
                                            class="ml-auto text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1"
                                        >
                                            <Check class="size-3" />
                                            {players.find(
                                                (p) =>
                                                    p.player_id ===
                                                    chosenPlayerId,
                                            )?.name}
                                        </span>
                                    {/if}
                                </div>

                                <div class="px-5 py-4 space-y-3">
                                    {#if !chosenPlayerId}
                                        <div class="flex gap-2 items-end">
                                            <div class="flex-1 space-y-1">
                                                <label
                                                    for="player-select"
                                                    class="text-xs text-muted-foreground"
                                                    >Seleziona il tuo nome</label
                                                >
                                                <select
                                                    id="player-select"
                                                    class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                                    bind:value={tempPlayerId}
                                                >
                                                    <option value="" disabled
                                                        >Seleziona dalla
                                                        lista...</option
                                                    >
                                                    {#each players as p}
                                                        <option
                                                            value={p.player_id}
                                                            >{p.name}</option
                                                        >
                                                    {/each}
                                                </select>
                                            </div>
                                            <AlertDialog.Root>
                                                <AlertDialog.Trigger
                                                    class="{buttonVariants({
                                                        variant: 'default',
                                                        size: 'sm',
                                                    })} h-9"
                                                    disabled={!tempPlayerId}
                                                >
                                                    Conferma
                                                </AlertDialog.Trigger>
                                                <AlertDialog.Content
                                                    class="max-w-sm"
                                                    portalProps={undefined}
                                                >
                                                    <AlertDialog.Header
                                                        class=""
                                                    >
                                                        <AlertDialog.Title
                                                            class=""
                                                            >Sei {players.find(
                                                                (p) =>
                                                                    p.player_id ===
                                                                    tempPlayerId,
                                                            )
                                                                ?.name}?</AlertDialog.Title
                                                        >
                                                        <AlertDialog.Description
                                                            class=""
                                                            >Questa scelta è
                                                            necessaria per
                                                            votare.</AlertDialog.Description
                                                        >
                                                    </AlertDialog.Header>
                                                    <AlertDialog.Footer
                                                        class=""
                                                    >
                                                        <AlertDialog.Cancel
                                                            class={buttonVariants(
                                                                {
                                                                    variant:
                                                                        "outline",
                                                                },
                                                            )}
                                                            >Annulla</AlertDialog.Cancel
                                                        >
                                                        <AlertDialog.Action
                                                            class={buttonVariants(
                                                                {
                                                                    variant:
                                                                        "default",
                                                                },
                                                            )}
                                                            onclick={confirmPlayerFinal}
                                                            >Conferma</AlertDialog.Action
                                                        >
                                                    </AlertDialog.Footer>
                                                </AlertDialog.Content>
                                            </AlertDialog.Root>
                                        </div>
                                    {:else}
                                        <!-- Già identificato -->
                                        <div class="flex items-center gap-3">
                                            <div
                                                class="size-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-sm flex-shrink-0"
                                            >
                                                {players
                                                    .find(
                                                        (p) =>
                                                            p.player_id ===
                                                            chosenPlayerId,
                                                    )
                                                    ?.name.charAt(0)}
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <p
                                                    class="text-sm font-medium truncate"
                                                >
                                                    {players.find(
                                                        (p) =>
                                                            p.player_id ===
                                                            chosenPlayerId,
                                                    )?.name}
                                                </p>
                                                <p
                                                    class="text-xs text-muted-foreground"
                                                >
                                                    Identificato
                                                </p>
                                            </div>
                                            <Button
                                                variant={isAbsent
                                                    ? "default"
                                                    : "outline"}
                                                size="sm"
                                                class="flex-shrink-0 text-xs {isAbsent
                                                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-transparent'
                                                    : 'border-muted-foreground/30 text-muted-foreground'}"
                                                onclick={toggleAbsence}
                                            >
                                                {isAbsent
                                                    ? "✓ Assente"
                                                    : "Segna assente"}
                                            </Button>
                                        </div>
                                    {/if}
                                </div>
                            </div>

                            <!-- Lista opzioni -->
                            <div class="space-y-3">
                                <div class="flex items-center gap-2 px-1">
                                    <div
                                        class="size-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center"
                                    >
                                        2
                                    </div>
                                    <h3 class="font-semibold text-sm">
                                        Esprimi le tue preferenze
                                    </h3>
                                    {#if votedSet.size > 0}
                                        <span
                                            class="ml-auto text-xs text-muted-foreground"
                                            >{votedSet.size} selezionati</span
                                        >
                                    {/if}
                                </div>

                                <div
                                    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                                >
                                    {#each options as opt}
                                        {@const dt = opt.match_date
                                            ? new Date(opt.match_date)
                                            : null}
                                        {@const dayName = dt
                                            ? itWeekday.format(dt)
                                            : ""}
                                        {@const dayShort = dt
                                            ? itDate.format(dt)
                                            : (opt.match_date ?? "")}
                                        {@const isSelected = votedSet.has(
                                            opt.option_id,
                                        )}
                                        {@const voteCount =
                                            counts[opt.option_id] ?? 0}

                                        <label
                                            class="relative flex flex-col gap-3 rounded-xl border p-4 cursor-pointer transition-all select-none
                      {isSelected
                                                ? 'bg-primary/5 border-primary ring-1 ring-primary shadow-sm'
                                                : 'bg-card hover:border-border/80 hover:bg-muted/30'}
                      {isAbsent || !chosenPlayerId
                                                ? 'opacity-50 pointer-events-none'
                                                : ''}"
                                        >
                                            <!-- Checkbox nascosto -->
                                            <input
                                                type="checkbox"
                                                class="sr-only"
                                                checked={isSelected}
                                                disabled={recent.status !==
                                                    "open" ||
                                                    busyId === opt.option_id ||
                                                    !chosenPlayerId ||
                                                    isAbsent}
                                                onchange={(e) =>
                                                    toggleVote(
                                                        recent.poll_id,
                                                        opt.option_id,
                                                        (
                                                            e.currentTarget as HTMLInputElement
                                                        ).checked,
                                                    )}
                                            />

                                            <!-- Check indicator -->
                                            <div
                                                class="absolute top-3 right-3 size-5 rounded-full border-2 flex items-center justify-center transition-all
                        {isSelected
                                                    ? 'border-primary bg-primary'
                                                    : 'border-muted-foreground/30'}"
                                            >
                                                {#if isSelected}
                                                    <Check
                                                        class="size-2.5 text-white"
                                                    />
                                                {/if}
                                            </div>

                                            <!-- Data e ora -->
                                            <div class="pr-6">
                                                <p
                                                    class="font-semibold text-sm capitalize"
                                                >
                                                    {dayName}
                                                </p>
                                                <p
                                                    class="text-xs text-muted-foreground"
                                                >
                                                    {dayShort}
                                                </p>
                                                <div
                                                    class="flex items-center gap-1 mt-2 text-sm"
                                                >
                                                    <span
                                                        >{timeEmoji(
                                                            opt.time_of_day,
                                                        )}</span
                                                    >
                                                    <span class="font-medium"
                                                        >{opt.time_of_day ??
                                                            "Orario non definito"}</span
                                                    >
                                                </div>
                                            </div>

                                            <!-- Luogo e note -->
                                            {#if opt.luogo || opt.note}
                                                <div class="space-y-1">
                                                    {#if opt.luogo}
                                                        <div
                                                            class="flex items-center gap-1 text-xs text-muted-foreground"
                                                        >
                                                            <MapPin
                                                                class="size-3 flex-shrink-0"
                                                            />
                                                            <span
                                                                class="truncate"
                                                                >{opt.luogo}</span
                                                            >
                                                        </div>
                                                    {/if}
                                                    {#if opt.note}
                                                        <span
                                                            class="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
                                                            >{opt.note}</span
                                                        >
                                                    {/if}
                                                </div>
                                            {/if}

                                            <!-- Footer: voti + chi ha votato -->
                                            <div
                                                class="mt-auto pt-3 border-t flex items-center justify-between"
                                            >
                                                <span
                                                    class="text-xs {voteCount >
                                                    0
                                                        ? 'text-primary font-semibold'
                                                        : 'text-muted-foreground'}"
                                                >
                                                    {voteCount === 0
                                                        ? "Nessun voto"
                                                        : voteCount === 1
                                                          ? "1 voto"
                                                          : `${voteCount} voti`}
                                                </span>

                                                {#if voteCount > 0}
                                                    <Collapsible.Root
                                                        class="relative"
                                                    >
                                                        <Collapsible.Trigger
                                                            class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                                                            onclick={() =>
                                                                loadVotersForOption(
                                                                    recent.poll_id,
                                                                    opt.option_id,
                                                                )}
                                                        >
                                                            Chi? <ChevronsUpDown
                                                                class="size-3"
                                                            />
                                                        </Collapsible.Trigger>
                                                        <Collapsible.Content
                                                            class="absolute right-0 bottom-full mb-1 z-10 p-2 bg-popover border rounded-lg shadow-lg min-w-[120px]"
                                                        >
                                                            <div
                                                                class="flex flex-wrap gap-1"
                                                            >
                                                                {#if votersByOption[opt.option_id]?.loading}
                                                                    <span
                                                                        class="text-xs text-muted-foreground"
                                                                        >Caricamento…</span
                                                                    >
                                                                {:else if votersByOption[opt.option_id]?.list?.length}
                                                                    {#each votersByOption[opt.option_id].list as v (v.player_id)}
                                                                        <span
                                                                            class="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px] font-medium"
                                                                            >{v.name}</span
                                                                        >
                                                                    {/each}
                                                                {:else}
                                                                    <span
                                                                        class="text-xs text-muted-foreground"
                                                                        >Nessun
                                                                        votante</span
                                                                    >
                                                                {/if}
                                                            </div>
                                                        </Collapsible.Content>
                                                    </Collapsible.Root>
                                                {/if}
                                            </div>
                                        </label>
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        <!-- Grafico -->
                        {#if chartDataBars.length > 0}
                            <Card.Root>
                                <Card.Header class="">
                                    <Card.Title class="text-base"
                                        >Preferenze per data</Card.Title
                                    >
                                    <Card.Description class=""
                                        >Distribuzione dei voti tra le opzioni
                                        proposte</Card.Description
                                    >
                                </Card.Header>
                                <Card.Content class="">
                                    <Chart.Container
                                        config={chartConfig}
                                        class="mx-auto w-full"
                                    >
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
                                                    label: chartConfig.value
                                                        .label,
                                                    color: chartConfig.value
                                                        .color,
                                                },
                                            ]}
                                            padding={{ right: 16 }}
                                            props={{
                                                bars: {
                                                    stroke: "none",
                                                    radius: 5,
                                                    rounded: "all",
                                                    motion: {
                                                        width: {
                                                            type: "spring",
                                                            stiffness: 80,
                                                            damping: 20,
                                                        },
                                                    },
                                                },
                                                highlight: {
                                                    area: { fill: "none" },
                                                },
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
                                </Card.Content>
                            </Card.Root>
                        {:else if recent.status === "open"}
                            <div
                                class="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground"
                            >
                                Nessun voto ancora. Sii il primo!
                            </div>
                        {/if}
                    </div>

                    <!-- ══════════ TAB: SQUADRE (solo admin) ══════════ -->
                    {#if isLogged}
                        <div
                            hidden={getTab(recent.poll_id) !== "squadre"}
                            class="space-y-4"
                        >
                            <!-- Azioni -->
                            <div class="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onclick={() => loadVoters(recent.poll_id)}
                                >
                                    <Users class="size-3.5 mr-1.5" /> Carica votanti
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onclick={() =>
                                        generateTeams(recent.poll_id)}
                                >
                                    <Shuffle class="size-3.5 mr-1.5" /> Genera squadre
                                </Button>
                                <Button
                                    variant="default"
                                    size="sm"
                                    onclick={() =>
                                        confirmFixture(recent.poll_id)}
                                >
                                    <Check class="size-3.5 mr-1.5" /> Conferma convocati
                                </Button>
                            </div>

                            <!-- Board drag-and-drop -->
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <!-- Disponibili -->
                                <div
                                    class="rounded-xl border border-dashed p-3 space-y-2"
                                    ondrop={(e) =>
                                        handleDrop(
                                            e,
                                            "available",
                                            recent.poll_id,
                                        )}
                                    ondragover={(e) => e.preventDefault()}
                                >
                                    <p
                                        class="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1"
                                    >
                                        Disponibili
                                    </p>
                                    <ul class="space-y-1.5 min-h-[180px]">
                                        {#each votersByPoll[recent.poll_id] ?? [] as v (v.player_id)}
                                            <li
                                                draggable="true"
                                                ondragstart={(e) =>
                                                    handleDragStart(e, v)}
                                                class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted cursor-grab active:cursor-grabbing border border-transparent hover:border-border transition-all"
                                            >
                                                <span
                                                    class="text-sm font-medium"
                                                    >{v.name}</span
                                                >
                                                <div class="flex gap-1">
                                                    <button
                                                        class="size-5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                                                        onclick={() =>
                                                            moveTo(
                                                                v,
                                                                "A",
                                                                recent.poll_id,
                                                            )}>A</button
                                                    >
                                                    <button
                                                        class="size-5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
                                                        onclick={() =>
                                                            moveTo(
                                                                v,
                                                                "B",
                                                                recent.poll_id,
                                                            )}>B</button
                                                    >
                                                </div>
                                            </li>
                                        {/each}
                                        {#if !(votersByPoll[recent.poll_id] ?? []).length}
                                            <li
                                                class="flex items-center justify-center h-32 text-xs text-muted-foreground italic"
                                            >
                                                Trascina qui
                                            </li>
                                        {/if}
                                    </ul>
                                </div>

                                <!-- Squadra A -->
                                <div
                                    class="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-3 space-y-2"
                                    ondrop={(e) =>
                                        handleDrop(e, "A", recent.poll_id)}
                                    ondragover={(e) => e.preventDefault()}
                                >
                                    <div
                                        class="flex items-center justify-between px-1"
                                    >
                                        <p
                                            class="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider"
                                        >
                                            Squadra A
                                        </p>
                                        <span class="text-xs text-blue-500"
                                            >{(
                                                teamsByPoll?.[recent.poll_id]
                                                    ?.A ?? []
                                            ).length}</span
                                        >
                                    </div>
                                    <ul class="space-y-1.5 min-h-[180px]">
                                        {#each teamsByPoll?.[recent.poll_id]?.A ?? [] as v (v.player_id)}
                                            <li
                                                draggable="true"
                                                ondragstart={(e) =>
                                                    handleDragStart(e, v)}
                                                class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800 shadow-sm cursor-grab active:cursor-grabbing"
                                            >
                                                <span
                                                    class="text-sm font-medium"
                                                    >{v.name}</span
                                                >
                                                <button
                                                    class="text-muted-foreground hover:text-destructive transition-colors"
                                                    onclick={() =>
                                                        removeToAvailable(
                                                            recent.poll_id,
                                                            v,
                                                        )}
                                                >
                                                    <Trash2 class="size-3.5" />
                                                </button>
                                            </li>
                                        {/each}
                                        {#if !(teamsByPoll?.[recent.poll_id]?.A ?? []).length}
                                            <li
                                                class="flex items-center justify-center h-32 text-xs text-blue-400 italic"
                                            >
                                                Trascina qui
                                            </li>
                                        {/if}
                                    </ul>
                                </div>

                                <!-- Squadra B -->
                                <div
                                    class="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 p-3 space-y-2"
                                    ondrop={(e) =>
                                        handleDrop(e, "B", recent.poll_id)}
                                    ondragover={(e) => e.preventDefault()}
                                >
                                    <div
                                        class="flex items-center justify-between px-1"
                                    >
                                        <p
                                            class="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wider"
                                        >
                                            Squadra B
                                        </p>
                                        <span class="text-xs text-orange-500"
                                            >{(
                                                teamsByPoll?.[recent.poll_id]
                                                    ?.B ?? []
                                            ).length}</span
                                        >
                                    </div>
                                    <ul class="space-y-1.5 min-h-[180px]">
                                        {#each teamsByPoll?.[recent.poll_id]?.B ?? [] as v (v.player_id)}
                                            <li
                                                draggable="true"
                                                ondragstart={(e) =>
                                                    handleDragStart(e, v)}
                                                class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white dark:bg-orange-950/40 border border-orange-100 dark:border-orange-800 shadow-sm cursor-grab active:cursor-grabbing"
                                            >
                                                <span
                                                    class="text-sm font-medium"
                                                    >{v.name}</span
                                                >
                                                <button
                                                    class="text-muted-foreground hover:text-destructive transition-colors"
                                                    onclick={() =>
                                                        removeToAvailable(
                                                            recent.poll_id,
                                                            v,
                                                        )}
                                                >
                                                    <Trash2 class="size-3.5" />
                                                </button>
                                            </li>
                                        {/each}
                                        {#if !(teamsByPoll?.[recent.poll_id]?.B ?? []).length}
                                            <li
                                                class="flex items-center justify-center h-32 text-xs text-orange-400 italic"
                                            >
                                                Trascina qui
                                            </li>
                                        {/if}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    {/if}
                {/if}
            </section>
        {/each}
    {:else if !data.isLogged && !data.poll}
        <div
            class="flex flex-col items-center justify-center gap-4 py-24 text-center"
        >
            <div
                class="size-16 rounded-2xl bg-muted flex items-center justify-center"
            >
                <CalendarIcon class="size-7 text-muted-foreground" />
            </div>
            <div class="space-y-1">
                <p class="font-semibold">Nessun sondaggio attivo</p>
                <p class="text-sm text-muted-foreground">
                    Torna alla home per vedere le ultime notizie
                </p>
            </div>
            {#if showSpinner}
                <svg
                    class="animate-spin size-6 text-primary"
                    viewBox="0 0 24 24"
                >
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
</main>
