<script lang="ts">
    import { cn } from "$lib/utils";

    let {
        class: className,
        ...restProps
    }: {
        class?: string;
    } & import("svelte/elements").HTMLAttributes<HTMLDivElement> = $props();
</script>

<div
    class={cn("bg-muted animate-pulse rounded-md", className)}
    {...restProps}
></div>
