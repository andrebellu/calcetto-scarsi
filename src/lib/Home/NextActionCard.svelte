<script lang="ts">
  import {
    PLAYERS_NEEDED,
    TEAM_LABELS,
    formatTimeOfDay,
    parseLocalDate,
    type HomeStatus,
  } from "$lib/domain/home";

  let { status, isAdmin = false }: { status: HomeStatus; isAdmin?: boolean } =
    $props();

  const longDate = new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const shortDate = new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  function fmt(d: string | null, f: Intl.DateTimeFormat) {
    const date = parseLocalDate(d);
    if (!date) return "Data da definire";
    const out = f.format(date);
    return out.charAt(0).toUpperCase() + out.slice(1);
  }

  const progress = $derived(
    status.kind === "poll" && status.best
      ? Math.min(100, Math.round((status.best.yes / PLAYERS_NEEDED) * 100))
      : 0,
  );
</script>

{#if status.kind === "poll"}
  {@const best = status.best}
  <section
    class="w-full rounded-2xl border border-secondary-600/50 bg-surface-800/40 p-5 mb-6"
    aria-labelledby="next-action-title"
  >
    <div class="flex items-center gap-2 mb-3">
      <span
        class="inline-flex items-center gap-1.5 rounded-full bg-secondary-500/15 px-2.5 py-1 text-xs font-semibold text-secondary-300"
      >
        <span class="material-symbols-outlined text-[14px]! leading-none"
          >how_to_vote</span
        >
        Sondaggio aperto
      </span>
      {#if status.hasVoted}
        <span
          class="inline-flex items-center gap-1 rounded-full bg-primary-500/15 px-2.5 py-1 text-xs font-semibold text-primary-300"
        >
          <span class="material-symbols-outlined text-[14px]! leading-none"
            >check</span
          >
          Hai votato
        </span>
      {/if}
    </div>

    <h2
      id="next-action-title"
      class="text-xl sm:text-2xl font-bold text-surface-50 leading-tight"
    >
      {status.hasVoted ? "Voto registrato" : "Vota le tue disponibilità"}
    </h2>
    {#if status.title}
      <p class="mt-1 text-sm text-surface-400">{status.title}</p>
    {/if}

    {#if best}
      <div class="mt-4 rounded-xl bg-surface-900/50 border border-surface-700/60 p-4">
        <div class="flex items-baseline justify-between gap-3">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-surface-100">
              <span class="font-normal text-surface-400">In testa:</span>
              {fmt(best.match_date, shortDate)}{#if formatTimeOfDay(best.time_of_day)}
                {" · "}{formatTimeOfDay(best.time_of_day)}{/if}
            </p>
            {#if best.luogo}
              <p class="text-xs text-surface-400 truncate">{best.luogo}</p>
            {/if}
          </div>
          <p class="shrink-0 text-sm font-bold tabular-nums text-surface-100">
            {best.yes}<span class="text-surface-500 font-medium">/{PLAYERS_NEEDED}</span>
          </p>
        </div>
        <div
          class="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-surface-700/70"
          role="progressbar"
          aria-label="Giocatori disponibili per la data in testa"
          aria-valuemin={0}
          aria-valuemax={PLAYERS_NEEDED}
          aria-valuenow={best.yes}
        >
          <div
            class="h-full rounded-full transition-[width] duration-500 {best.missing ===
            0
              ? 'bg-primary-500'
              : 'bg-secondary-500'}"
            style="width: {progress}%"
          ></div>
        </div>
        <p class="mt-2 text-xs text-surface-400">
          {#if best.missing === 0}
            <span class="font-semibold text-primary-400">Quota raggiunta, si gioca.</span>
          {:else if best.missing === 1}
            Manca <span class="font-semibold text-surface-200">1 giocatore</span>.
          {:else}
            Mancano <span class="font-semibold text-surface-200"
              >{best.missing} giocatori</span
            >.
          {/if}
          {#if isAdmin}
            · {status.respondents} su {status.regularPlayers} hanno risposto
          {/if}
        </p>
      </div>
    {/if}

    <div class="mt-4 flex flex-wrap gap-2">
      <a
        href="/poll"
        class="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-5 text-sm font-semibold transition
          {status.hasVoted
          ? 'border border-surface-600 text-surface-200 hover:border-surface-400'
          : 'bg-secondary-500 text-surface-950 hover:bg-secondary-400'}"
      >
        {status.hasVoted ? "Modifica voto" : "Vota ora"}
        <span class="material-symbols-outlined text-[18px]! leading-none"
          >arrow_forward</span
        >
      </a>
      {#if isAdmin && best && best.missing === 0}
        <a
          href="/poll"
          class="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-500 transition"
        >
          Componi le squadre
        </a>
      {/if}
    </div>
  </section>
{:else if status.kind === "match"}
  {@const ora = formatTimeOfDay(status.time_of_day)}
  {@const me = status.me}
  <section
    class="w-full rounded-2xl border border-primary-600/60 bg-surface-800/40 p-5 mb-6"
    aria-labelledby="next-action-title"
  >
    <span
      class="inline-flex items-center gap-1.5 rounded-full bg-primary-500/15 px-2.5 py-1 text-xs font-semibold text-primary-300 mb-3"
    >
      <span class="material-symbols-outlined text-[14px]! leading-none"
        >stadium</span
      >
      Prossima partita
    </span>

    <h2
      id="next-action-title"
      class="text-xl sm:text-2xl font-bold text-surface-50 leading-tight"
    >
      {fmt(status.match_date, longDate)}
    </h2>
    <p class="mt-1 text-sm text-surface-400">
      {[ora ? `Ore ${ora}` : "Orario da concordare su WhatsApp", status.luogo]
        .filter(Boolean)
        .join(" · ")}
    </p>

    {#if me.known}
      {#if me.team === "A" || me.team === "B"}
        <p
          class="mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold
            {me.team === 'A'
            ? 'bg-team-blue/15 text-team-blue'
            : 'bg-team-red/15 text-team-red'}"
        >
          <span class="material-symbols-outlined text-[18px]! leading-none"
            >apparel</span
          >
          {me.name ? `${me.name}, giochi` : "Giochi"} con i {TEAM_LABELS[me.team]}
        </p>
      {:else if me.team === "P"}
        <p
          class="mt-4 inline-flex items-center gap-2 rounded-xl bg-surface-700/50 px-3 py-2 text-sm font-medium text-surface-200"
        >
          <span class="material-symbols-outlined text-[18px]! leading-none"
            >check_circle</span
          >
          Sei convocato · squadre in arrivo
        </p>
      {/if}
    {/if}

    <div class="mt-4 flex flex-wrap gap-2">
      <a
        href="/planned"
        class="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-500 transition"
      >
        {isAdmin ? "Gestisci squadre" : "Vedi squadre"}
        <span class="material-symbols-outlined text-[18px]! leading-none"
          >arrow_forward</span
        >
      </a>
      {#if isAdmin}
        <a
          href="/poll"
          class="inline-flex min-h-11 items-center justify-center rounded-xl border border-surface-600 px-5 text-sm font-medium text-surface-300 hover:border-surface-400 hover:text-surface-100 transition"
        >
          Nuovo sondaggio
        </a>
      {/if}
    </div>
  </section>
{:else}
  <section
    class="w-full rounded-2xl border border-surface-700/70 bg-surface-800/40 p-5 mb-6"
    aria-labelledby="next-action-title"
  >
    <h2 id="next-action-title" class="text-lg font-bold text-surface-100">
      Nessuna partita in programma
    </h2>
    <p class="mt-1 text-sm text-surface-400">
      {isAdmin
        ? "Apri un sondaggio per scegliere la prossima data."
        : "Appena si apre un sondaggio lo trovi qui."}
    </p>
    <a
      href="/poll"
      class="mt-4 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-5 text-sm font-semibold transition
        {isAdmin
        ? 'bg-primary-600 text-white hover:bg-primary-500'
        : 'border border-surface-600 text-surface-200 hover:border-surface-400'}"
    >
      {isAdmin ? "Crea sondaggio" : "Vai ai sondaggi"}
    </a>
  </section>
{/if}
