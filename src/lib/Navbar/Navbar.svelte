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
    class="flex w-full items-center gap-1 overflow-x-auto whitespace-nowrap border-b pb-0 mb-6 sm:mb-8"
    aria-label="Principale"
>
    {#each links as { href, label, icon }}
        {@const active = activeLink === href}
        <a
            {href}
            class="relative shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors
        {active
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'}"
            aria-current={active ? "page" : undefined}
        >
            <span class="material-symbols-outlined text-[18px]! leading-none"
                >{icon}</span
            >
            {label}
            {#if active}
                <span
                    class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                ></span>
            {/if}
        </a>
    {/each}
</nav>
