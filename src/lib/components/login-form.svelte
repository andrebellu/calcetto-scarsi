<script>
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";

    const id = $props.id();
</script>

<Card.Root class="mx-auto w-full max-w-sm">
    <Card.Header>
        <Card.Title class="text-2xl">Login</Card.Title>
        <Card.Description
            >Enter your email below to login to your admin account</Card.Description
        >
    </Card.Header>
    <Card.Content>
        <form method="POST" action="?/login" class="grid gap-4">
            <div class="grid gap-2">
                <Label for="email-{id}">Email</Label>
                <Input
                    id="email-{id}"
                    name="email"
                    type="email"
                    placeholder="m@example.com"
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
            <Button type="submit" class="w-full">Login</Button>
        </form>
    </Card.Content>
</Card.Root>
