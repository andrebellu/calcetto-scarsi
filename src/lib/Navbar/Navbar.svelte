<script>
    import { page } from "$app/stores";

    const links = [
        { href: "/matches", label: "Partite", icon: "sports_soccer" },
        { href: "/players", label: "Giocatori", icon: "group" },
        { href: "/stats", label: "Statistiche", icon: "bar_chart" },
        { href: "/poll", label: "Sondaggi", icon: "poll" },
    ];

    $: activeLink = $page.url.pathname;
</script>

<nav
    class="sticky top-0 z-20 flex w-full items-center gap-1 overflow-x-auto whitespace-nowrap rounded-2xl border border-white/5 bg-card/80 backdrop-blur-md shadow-sm p-1.5 mb-6 sm:mb-8"
    aria-label="Principale"
>
    <a
        href="/"
        class="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
        aria-label="Home"
    >
        <span class="material-symbols-outlined text-[18px]! leading-none"
            >home</span
        >
    </a>
    <span class="w-px h-6 bg-white/10 shrink-0 mx-0.5" aria-hidden="true"
    ></span>
    {#each links as { href, label, icon }}
        {@const active = activeLink === href}
        <a
            {href}
            class="relative shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all
        {active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}"
            aria-current={active ? "page" : undefined}
        >
            <span class="material-symbols-outlined text-[18px]! leading-none"
                >{icon}</span
            >
            {label}
        </a>
    {/each}
</nav>
