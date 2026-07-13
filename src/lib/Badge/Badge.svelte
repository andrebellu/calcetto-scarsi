<script>
  import BadgeRed from "./BadgeRed.svelte";
  export let content;
  export let redContent;
</script>

<div
  class="rounded-3xl bg-card/70 p-2 backdrop-blur-md border border-white/10 shadow-lg flex flex-row items-center gap-2 h-16 min-w-24 justify-center"
>
  {content}
  {#if redContent}
    <BadgeRed content={redContent} />
  {/if}
</div>
