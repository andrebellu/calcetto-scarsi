# calcetto-scarsi

PWA in SvelteKit + Supabase per organizzare il calcetto: sondaggio delle date → convocazione → squadre → partita → statistiche.

## Sviluppo

```sh
yarn install
yarn dev          # server di sviluppo
yarn check        # svelte-check
yarn test         # test Vitest (logica di dominio)
yarn build
```

Variabili d'ambiente richieste (`.env`):

```
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

## Struttura principale

- `src/hooks.server.ts` — crea `locals.supabase` (client legato alla richiesta) e `safeGetSession`.
- `src/lib/server/auth.ts` — `requireUser()`: unico punto per i controlli di accesso degli endpoint di scrittura.
- `src/lib/server/push.ts` — client amministrativo (service role) usato **solo** per le notifiche push.
- `src/lib/domain/` — logica pura e testata (scelta data vincente, validazione squadre, ordine portieri).
- `src/routes/api/` — endpoint JSON.

## Regole sull'accesso ai dati

- Loader ed endpoint server usano sempre `locals.supabase`, così sessione e policy RLS sono applicate in modo coerente.
- Il client con service role resta confinato in `src/lib/server/`.
- Le scritture “da organizzatore” (creare/chiudere sondaggi, confermare convocazioni, modificare squadre, inserire partite) richiedono `requireUser()`; le policy RLS sul database restano la protezione di base.
