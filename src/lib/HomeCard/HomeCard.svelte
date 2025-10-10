<script lang="ts">
  export let title: string;
  export let description: string = "";
  export let icon: string;
  export let link: string;
  export let color: "primary" | "secondary" = "primary";
  export let highlight: boolean = false;
  export let hideDescription: boolean = false;
</script>

<a
  href={link}
  class={`group block rounded-2xl md:rounded-3xl bg-surface-200 shadow-xl hover:shadow-2xl border border-${color}-300 hover:border-${color}-400 transition-all p-4 md:p-8 text-center overflow-hidden backdrop-blur-md hover:scale-[1.01] min-h-28 ${
    highlight ? "glow-border" : ""
  }`}
  aria-current={highlight ? "true" : "false"}
>
  <span
    class={`material-symbols-outlined text-5xl md:text-8xl text-${color}-400 mb-1 md:mb-2 transition`}
  >
    {icon}
  </span>

  <h2
    class="text-lg md:text-2xl font-bold text-surface-900 mb-0.5 md:mb-1 capitalize"
  >
    {title}
  </h2>

  {#if !hideDescription}
    <p class="text-surface-600 mb-2 hidden sm:block">{description}</p>
  {/if}

  <div
    class={`mt-1 md:mt-2 text-${color}-500 font-semibold group-hover:underline text-sm md:text-base`}
  >
    <slot>Scopri di più →</slot>
  </div>
</a>
