<script>
    import { onMount } from "svelte";
    let activeLink = "";

    onMount(() => {
        activeLink = window.location.pathname;
    });
</script>

<nav
    class="mx-auto w-full max-w-7xl flex gap-2 sm:gap-4 mb-4 sm:mb-6 overflow-x-auto no-scrollbar py-2"
    aria-label="Principale"
>
    <a
        href="/"
        class="px-3 sm:px-4 py-2 rounded-2xl font-semibold border transition-all duration-300 hover:bg-primary hover:scale-105 hover:text-white flex items-center justify-center"
        class:bg-primary={activeLink === "/"}
        class:text-white={activeLink === "/"}
        aria-current={activeLink === "/" ? "page" : undefined}
    >
        <span class="material-symbols-outlined !text-lg mr-1">arrow_back</span>
        Home
    </a>

    <a
        href="/matches"
        class="px-3 sm:px-4 py-2 rounded-2xl font-semibold border transition-all duration-300 hover:bg-primary hover:scale-105 hover:text-white flex items-center justify-center"
        class:bg-primary={activeLink === "/matches"}
        class:text-white={activeLink === "/matches"}
        aria-current={activeLink === "/matches" ? "page" : undefined}
    >
        Matches
    </a>

    <a
        href="/players"
        class="px-3 sm:px-4 py-2 rounded-2xl font-semibold border transition-all duration-300 hover:bg-primary hover:scale-105 hover:text-white flex items-center justify-center"
        class:bg-primary={activeLink === "/players"}
        class:text-white={activeLink === "/players"}
        aria-current={activeLink === "/players" ? "page" : undefined}
    >
        Players
    </a>

    <a
        href="/stats"
        class="px-3 sm:px-4 py-2 rounded-2xl font-semibold border transition-all duration-300 hover:bg-primary hover:scale-105 hover:text-white flex items-center justify-center"
        class:bg-primary={activeLink === "/stats"}
        class:text-white={activeLink === "/stats"}
        aria-current={activeLink === "/stats" ? "page" : undefined}
    >
        Stats
    </a>
</nav>
