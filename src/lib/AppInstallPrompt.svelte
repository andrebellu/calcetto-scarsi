<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { toast } from "svelte-sonner";

  let deferredPrompt;
  let showInstall = false;

  $: showInstall = $page.url.pathname === "/" && deferredPrompt;

  onMount(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if ($page.url.pathname === "/") {
        showInstall = true;
        toast.info('Installa Calcetto Scarsi ⚽', {
          description: 'Aggiungila alla home per un accesso rapido!',
          action: {
            label: "Installa",
            onClick: installApp,
          },
        });
      }
    });
  });

  async function installApp() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log("Install outcome:", outcome);
      deferredPrompt = null;
      showInstall = false;
    }
  }


  $: if ($page.url.pathname !== "/" && showInstall) {
    toast.dismiss();
    showInstall = false;
  }
</script>
