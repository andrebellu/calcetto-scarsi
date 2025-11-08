<script>
  import { invalidate } from "$app/navigation";
  import Navbar from "$lib/Navbar/Navbar.svelte";
  import { ModeWatcher } from "mode-watcher";
  import { onMount } from "svelte";
  import "../app.css";
  import { page } from "$app/stores";
  import { asset } from "$app/paths";
  import { pwaInfo } from 'virtual:pwa-info';

  let { data, children } = $props();
  let { session, supabase } = $derived(data);

  onMount(() => {
    const { data } = supabase.auth.onAuthStateChange((_, newSession) => {
      if (newSession?.expires_at !== session?.expires_at) {
        invalidate("supabase:auth");
      }

      if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(reg => console.log('SW registrato', reg))
        .catch(err => console.error('Errore registrazione SW', err));
    }
    });

    return () => data.subscription.unsubscribe();
  });



  let webManifestLink = pwaInfo ? pwaInfo.webManifest.linkTag : '';
</script>


<svelte:head>
  {@html webManifestLink}
</svelte:head>


{#if $page.url.pathname == "/"}
  <div class="fixed inset-0 -z-10 w-screen h-screen">
    <img
      src={asset("/imgs/fieldAI.webp")}
      alt="Campo da calcetto illuminato di sera"
      class="top-0 left-0 w-screen h-screen opacity-70 aspect-square object-cover"
      width="1920"
      height="1080"
      decoding="async"
      fetchpriority="high"
      draggable="false"
    />
  </div>
{/if}

<ModeWatcher />

{@render children()}
