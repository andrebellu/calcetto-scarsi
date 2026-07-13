<script>
    import LoginForm from "$lib/components/login-form.svelte";
</script>

<div
    class="relative flex min-h-dvh w-full flex-col items-center justify-center px-4 py-10 overflow-hidden"
>
    <div
        class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_20%,var(--color-primary-900),transparent_60%)] opacity-40"
    ></div>

    <a
        href="/"
        class="absolute top-6 left-4 sm:left-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
        <span class="material-symbols-outlined text-base">arrow_back</span>
        Home
    </a>

    <div class="mb-8 text-center">
        <h1 class="text-2xl font-extrabold tracking-tight leading-none">
            <span class="font-light text-surface-200">Calcetto per</span>
            <span class="text-primary-500">scarsi</span>
        </h1>
        <p class="text-sm text-muted-foreground mt-2">Area amministratore</p>
    </div>

    <LoginForm />
</div>
