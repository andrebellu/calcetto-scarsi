<script>
    export let name;
    export let goals;
    export let wins;
    export let matchesPlayed;
    export let winRate;
    export let golPerMatch;

    let initials = "";
</script>

<div
    class="card shadow-xl rounded-xl bg-surface-100-900/60 backdrop-blur-md border border-white/30 grid grid-cols-[auto_1fr] items-center gap-8 p-8 text-lg"
>
    <div>
        <p class="font-bold mb-2">{name}</p>
        <div
            class="flex flex-row flex-wrap gap-x-3 gap-y-1 justify-start items-center text-xs mt-1"
        >
            <span class="flex items-center gap-1 text-green-600">
                <span class="material-symbols-outlined text-base"
                    >sports_soccer</span
                >
                {goals}
            </span>
            <span class="flex items-center gap-1 text-blue-600">
                <span class="material-symbols-outlined text-base">stadium</span>
                {matchesPlayed}
            </span>
            <span class="flex items-center gap-1 text-yellow-600">
                <span class="material-symbols-outlined text-base"
                    >bar_chart</span
                >
                {golPerMatch}
            </span>
            <span class="flex items-center gap-1 text-purple-500">
                <span class="material-symbols-outlined text-base"
                    >emoji_events</span
                >
                {wins}
            </span>
            <span class="flex items-center gap-1 text-pink-600">
                <span class="material-symbols-outlined text-base">percent</span>
                {winRate}%
            </span>
        </div>
    </div>
</div>
