<script>
  export let name;
  export let goals;
  export let wins;
  export let matchesPlayed;
  export let winRate;
  export let golPerMatch;

  $: initials = (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((/** @type {string} */ w) => w[0]?.toUpperCase())
    .join("");
</script>

<div
  class="rounded-2xl border border-white/5 bg-card shadow-md hover:shadow-lg hover:border-primary-800/60 transition-all flex flex-col items-center text-center gap-1.5 p-3 sm:p-4"
>
  <div
    class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary/15 text-primary-400 flex items-center justify-center font-extrabold text-sm shrink-0"
  >
    {initials}
  </div>

  <p class="font-bold text-sm sm:text-base truncate w-full">{name}</p>

  <div
    class="flex flex-row flex-wrap gap-x-2 gap-y-1 justify-center items-center text-[11px]"
  >
    <span class="flex items-center gap-0.5 text-primary-400">
      <span class="material-symbols-outlined text-sm">sports_soccer</span>
      {goals}
    </span>
    <span class="flex items-center gap-0.5 text-team-blue">
      <span class="material-symbols-outlined text-sm">stadium</span>
      {matchesPlayed}
    </span>
    <span class="flex items-center gap-0.5 text-secondary-400">
      <span class="material-symbols-outlined text-sm">bar_chart</span>
      {golPerMatch}
    </span>
    <span class="flex items-center gap-0.5 text-secondary-500">
      <span class="material-symbols-outlined text-sm">emoji_events</span>
      {wins}
    </span>
    <span class="flex items-center gap-0.5 text-muted-foreground">
      <span class="material-symbols-outlined text-sm">percent</span>
      {winRate}%
    </span>
  </div>
</div>
