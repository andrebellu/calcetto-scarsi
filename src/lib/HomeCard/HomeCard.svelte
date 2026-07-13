<script lang="ts">
  export let title: string;
  export let description: string = "";
  export let icon: string;
  export let link: string;
  export let color: "primary" | "secondary" = "primary";
  export let highlight: boolean = false;
  export let hideDescription: boolean = false;
  export let size: "lg" | "sm" = "sm";

  const colorClasses = {
    primary: {
      border: "border-primary-800/50 hover:border-primary-500/70",
      icon: "text-primary-400",
      iconBg: "bg-primary-500/15",
      cta: "text-primary-400",
    },
    secondary: {
      border: "border-secondary-800/50 hover:border-secondary-500/70",
      icon: "text-secondary-400",
      iconBg: "bg-secondary-500/15",
      cta: "text-secondary-400",
    },
  } as const;

  $: c = colorClasses[color];
</script>

{#if size === "lg"}
  <a
    href={link}
    class={`group col-span-2 flex items-center gap-4 rounded-2xl bg-card/80 shadow-lg hover:shadow-xl border ${c.border} transition-all p-4 sm:p-5 overflow-hidden backdrop-blur-md active:scale-[0.99] ${
      highlight ? "glow-border" : ""
    }`}
    aria-current={highlight ? "true" : "false"}
  >
    <span
      class={`shrink-0 w-14 h-14 rounded-2xl ${c.iconBg} flex items-center justify-center transition-transform group-hover:scale-110`}
    >
      <span class={`material-symbols-outlined text-3xl ${c.icon}`}>
        {icon}
      </span>
    </span>
    <div class="min-w-0 flex-1">
      <h2 class="text-lg font-bold text-foreground capitalize">{title}</h2>
      {#if !hideDescription}
        <p class="text-sm text-muted-foreground truncate">{description}</p>
      {/if}
    </div>
    <span
      class={`material-symbols-outlined shrink-0 ${c.cta} transition-transform group-hover:translate-x-1`}
    >
      arrow_forward
    </span>
  </a>
{:else}
  <a
    href={link}
    class={`group flex flex-col items-center justify-center text-center gap-1.5 rounded-2xl bg-card/80 shadow-lg hover:shadow-xl border ${c.border} transition-all p-4 sm:p-5 overflow-hidden backdrop-blur-md active:scale-[0.99] min-h-32 ${
      highlight ? "glow-border" : ""
    }`}
    aria-current={highlight ? "true" : "false"}
  >
    <span
      class={`material-symbols-outlined text-4xl sm:text-5xl ${c.icon} transition-transform group-hover:scale-110`}
    >
      {icon}
    </span>
    <h2 class="text-sm sm:text-base font-bold text-foreground capitalize">
      {title}
    </h2>
    {#if !hideDescription && description}
      <p class="text-xs text-muted-foreground line-clamp-1">{description}</p>
    {/if}
  </a>
{/if}
