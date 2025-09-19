<script>
  import { invalidate } from "$app/navigation";
  import Navbar from "$lib/Navbar/Navbar.svelte";
  import { ModeWatcher } from "mode-watcher";
  import { onMount } from "svelte";
  import "../app.css";
  import { page } from "$app/stores";
  import { asset } from "$app/paths";

  let { data, children } = $props();
  let { session, supabase } = $derived(data);

  onMount(() => {
    const { data } = supabase.auth.onAuthStateChange((_, newSession) => {
      if (newSession?.expires_at !== session?.expires_at) {
        invalidate("supabase:auth");
      }
    });

    return () => data.subscription.unsubscribe();
  });
</script>

{#if $page.url.pathname == "/"}
  <div class="fixed inset-0 -z-10 w-screen h-screen">
    <img
      src={asset("/imgs/fieldAI.png")}
      alt="Wallpaper"
      class="top-0 left-0 w-screen h-screen opacity-70 aspect-square object-cover"
      draggable="false"
    />
  </div>
{/if}

<ModeWatcher />

{@render children()}
