<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/stores";
  import { toast } from "svelte-sonner";

  let deferredPrompt: any = null;
  let showInstall = false;
  let unsubscribe: () => void;

  async function installApp() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log("Install outcome:", outcome);
      if (outcome === "accepted") {
        toast.success("App installata ✅");
      }
      deferredPrompt = null;
      showInstall = false;
    }
  }

  function isAppInstalled() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );
  }

  onMount(() => {
    console.log("AppInstallPrompt montato ✅");

    if (isAppInstalled()) {
      console.log("PWA già installata, niente prompt");
      return;
    }

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;

      if ($page.url.pathname === "/") {
        showInstall = true;

        toast.info("Vuoi installare Calcetto Scarsi?", {
          action: {
            label: "Installa",
            onClick: installApp,
          },
          duration: 8000,
        });
      }
    });

    window.addEventListener("appinstalled", () => {
      toast.success("App installata con successo 🎉");
      deferredPrompt = null;
      showInstall = false;
    });

    unsubscribe = page.subscribe(($p) => {
      if ($p.url.pathname !== "/") {
        toast.dismiss();
        showInstall = false;
      }
    });
  });

  onDestroy(() => {
    unsubscribe?.();
  });
</script>
