<script>
    import { onMount } from "svelte";
    let activeLink = "";

    onMount(() => {
        activeLink = window.location.pathname;
    });
</script>

<nav class="flex gap-4 mb-6">
    <a
        href="/"
        class="px-4 py-2 rounded-2xl font-semibold border transition-all duration-300 hover:bg-primary hover:scale-105 hover:text-white scale-105 flex items-center justify-center"
        class:bg-primary={activeLink === "/"}
        ><span class="material-symbols-outlined !text-lg"> arrow_back </span> Home</a
    >
    <a
        href="/matches"
        class="px-4 py-2 rounded-2xl font-semibold border transition-all duration-300 hover:bg-primary hover:scale-105 hover:text-white scale-105 flex items-center justify-center"
        class:bg-primary={activeLink === "/matches"}
        class:text-white={activeLink === "/matches"}>Matches</a
    >
    <a
        href="/players"
        class="px-4 py-2 rounded-2xl font-semibold border transition-all duration-300 hover:bg-primary hover:scale-105 hover:text-white scale-105 flex items-center justify-center"
        class:bg-primary={activeLink === "/players"}
        class:text-white={activeLink === "/players"}>Players</a
    >
    <a
        href="/stats"
        class="px-4 py-2 rounded-2xl font-semibold border transition-all duration-300 hover:bg-primary hover:scale-105 hover:text-white scale-105 flex items-center justify-center"
        class:bg-primary={activeLink === "/stats"}
        class:text-white={activeLink === "/stats"}>Stats</a
    >
</nav>
