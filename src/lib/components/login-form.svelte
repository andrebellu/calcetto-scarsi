<script>
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";

    const id = $props.id();
    let isLogin = $state(true);
</script>

<Card.Root class="mx-auto w-full max-w-sm border-white/5 shadow-xl">
    <Card.Header>
        <Card.Title class="text-2xl"
            >{isLogin ? "Accedi" : "Registrati"}</Card.Title
        >
        <Card.Description>
            {isLogin
                ? "Inserisci le tue credenziali per accedere"
                : "Crea un nuovo account amministratore"}
        </Card.Description>
    </Card.Header>
    <Card.Content>
        <form
            method="POST"
            action={isLogin ? "?/login" : "?/register"}
            class="grid gap-4"
        >
            <div class="grid gap-2">
                <Label for="email-{id}">Email</Label>
                <Input
                    id="email-{id}"
                    name="email"
                    type="email"
                    placeholder="mario@esempio.it"
                    required
                />
            </div>
            <div class="grid gap-2">
                <div class="flex items-center">
                    <Label for="password-{id}">Password</Label>
                </div>
                <Input
                    id="password-{id}"
                    name="password"
                    type="password"
                    required
                />
            </div>
            <Button type="submit" class="w-full">
                {isLogin ? "Accedi" : "Registrati"}
            </Button>
            <div class="mt-4 text-center text-sm">
                {#if isLogin}
                    Non hai un account?
                    <button
                        type="button"
                        class="underline text-primary hover:text-primary/80"
                        onclick={() => (isLogin = false)}
                    >
                        Registrati
                    </button>
                {:else}
                    Hai già un account?
                    <button
                        type="button"
                        class="underline text-primary hover:text-primary/80"
                        onclick={() => (isLogin = true)}
                    >
                        Accedi
                    </button>
                {/if}
            </div>
        </form>
    </Card.Content>
</Card.Root>
