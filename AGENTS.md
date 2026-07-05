# Ultimatexspam (BATTLECLANAREA962551 X SPAM WORLD)

A single-file browser game. The playable application is the static `index.html` (~2.9MB):
no build step is needed to run it. The repo also carries an OPTIONAL Supabase backend
scaffold (`package.json` + `supabase/`) that is a work-in-progress migration target, not
required to play the game.

## Cursor Cloud specific instructions

### What this is
- The product is a static, client-side web game contained entirely in `index.html`. This is
 the thing to run and test by default.
- `index.html`'s own third-party deps are loaded from CDNs at runtime: Tailwind
 (`cdn.tailwindcss.com`), Google Fonts, and Firebase (`gstatic.com`). The static game has
 nothing to `npm install`.
- Firebase powers optional online sync/multiplayer. The app is "offline-proof": Firebase
 loads dynamically with an ~8s timeout and the game falls back to OFFLINE MODE (localStorage)
 if it is unavailable. So the game is fully playable in the cloud VM even without outbound
 network access to Firebase.

### Optional Supabase backend (`package.json` + `supabase/`)
- This is a server-side migration scaffold (one example Edge Function `supabase/functions/game-api`
 using `@supabase/server`). It is NOT wired into `index.html` yet and is NOT required to play
 or test the game.
- `npm install` (run by the update script) just fetches the `@supabase/server` dependency so the
 function source typechecks/imports. It does not start anything.
- Actually running it (`npm run supabase:start` / `npm run functions:serve`) needs the Supabase
 CLI (reachable via `npx supabase`) AND Docker AND real credentials in a local `.env` (see
 `.env.example`). Docker is NOT installed in the cloud VM, so this backend cannot be run here
 without first installing Docker and supplying Supabase project secrets — treat it as blocked
 unless the task specifically targets it.

### Supabase JS client helpers (`utils/supabase/`, root `page.tsx`)
- `@supabase/supabase-js` + `@supabase/ssr` are installed, and `utils/supabase/{server,client,middleware}.ts`
 plus a root `page.tsx` hold the standard Supabase **Next.js App Router** helpers (the snippets
 from Supabase's "Connect → Next.js" wizard).
- INERT-BY-DEFAULT GOTCHA: this repo is NOT a Next.js app (no `next` dependency, no `app/`/`pages/`,
 no `tsconfig.json`, no `@/` path alias, no TS/JSX build). `server.ts`, `middleware.ts`, and
 `page.tsx` import `next/headers` / `next/server` and the `@/` alias, so they DO NOT compile or run
 here — they are reference scaffolding that activates only once a Next.js frontend is added. Do not
 expect to build/serve them in this repo.
- The package itself works in plain Node: `createBrowserClient(url, key)` / `createServerClient(...)`
 construct clients and `.from('todos').select()` builds a query (no network until awaited). The
 publishable (anon) key + URL live in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` /
 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (git-ignored; publishable key is safe to expose).
- For the ACTUAL static game (`index.html`), the appropriate path (see `supabase/README.md`) is to
 load `@supabase/supabase-js` via CDN with the publishable key — not these Next.js SSR helpers.

### Firebase → Supabase migration layer (`supabase/migrations/`, `supabase/web/`)
- The game (`index.html`) still runs on Firebase by default. A drop-in replacement path exists:
 a Firestore-compatibility shim over Supabase. `supabase/web/firestore-shim.js` reproduces the
 exact `window.__BCA_FS`/`__BCA_DB` surface the game uses; `supabase/migrations/2026...firestore_compat.sql`
 creates a single `public.fs_documents` table + RPCs (`fs_set` deep-merge, `fs_update` dotted/
 increment/arrayUnion, `fs_query`) + permissive RLS + Realtime. See `supabase/README.md`
 ("Firestore-compatibility layer") for the exact `index.html` boot-block swap.
- NON-OBVIOUS: the RLS is intentionally permissive (parity with the game's current client-trusted
 Firestore model), NOT a hardening step. The data model is keyed by callsign, not an auth UID.
- TESTING the SQL/shim locally without the live project: this VM can `apt-get install postgresql`
 and run the migration on a local cluster to validate the RPCs (deep merge / increment /
 arrayUnion / ordered query). The shim can be exercised against local Postgres via a small
 supabase-js-shaped fake (rpc -> `select * from fn(...)`). The live flip needs the migration
 applied to the project (DB password or a dashboard SQL run).
- DATA MIGRATION: `supabase/tools/migrate-firestore-to-supabase.mjs` is a one-time, idempotent ETL
 that copies the old Firebase project's data into `fs_documents` using only the public web API key
 (anonymous sign-in -> Firestore REST -> bulk upsert). `bca_global_logs` is capped to the most
 recent `LOG_LIMIT` (default 20000) since it has hundreds of thousands of rows; `LOG_LIMIT=0`
 imports all. Re-running is safe.
- GOTCHA (raw-SQL tables on Supabase): a table created via SQL does NOT auto-receive the
 `anon`/`authenticated` table GRANTs the dashboard adds, so PostgREST returns 401 "permission
 denied" until you `grant select,insert,update,delete ... to anon, authenticated` (the migration
 now does this). RLS policies alone are not sufficient.
- GOTCHA (anonymous auth): the project currently has anonymous sign-ins disabled, so the shim's
 `signInAnonymously` gets a 422 and falls back to a synthetic local user — harmless, the game
 works via the publishable key. Enable Authentication → Providers → Anonymous for real anon JWTs.
- COST CONTROL (Realtime Broadcast live-sync): the hot collections `bca_users` (~1s autosave)
 and `bca_presence` are NO LONGER streamed via `postgres_changes`. `firestore-shim.js` syncs
 their live state over a shared Realtime **Broadcast** channel (`bca-sync:<collection>`,
 ephemeral — no DB write/WAL/egress) and persists to `fs_documents` on a DEBOUNCE (default 25s
 `bca_users` / 20s `bca_presence`). Broadcasts are DELTA-ONLY (just changed fields) and
 SKIP-UNCHANGED (an identical re-save / repeated bot presence beat sends nothing + writes
 nothing), which is what cuts the Realtime-message count + egress (verified live: 322% messages
 / 131% egress overage on ~6 users was driven by full-row postgres_changes fan-out of ~20KB
 profile blobs). Reads overlay an in-memory cache so they never lag the debounced
 writes; writes with `increment()`/`arrayUnion()` sentinels and all other collections keep the
 classic immediate-DB + `postgres_changes` path. Tune/disable via `window.__BCA_LIVE_SYNC` set
 BEFORE the boot import (`{}` reverts to postgres_changes everywhere). Offline regression test:
 `node supabase/tools/test-live-sync.mjs`. Full write-up in `supabase/README.md`
 ("Cost control: Realtime Broadcast live-sync"). Broadcasts only send after the channel is
 `SUBSCRIBED` (pre-join sends would REST-fallback per message).

### Prisma ORM (`prisma/`, `prisma.config.ts`)
- Prisma 7 is wired to the Supabase Postgres. Connection strings live in `.env.local`
 (git-ignored; placeholders only by default — `[YOUR-PASSWORD]` must be filled with the real
 Supabase DB password to talk to a live DB). `DATABASE_URL` = transaction-mode pooler (runtime),
 `DIRECT_URL` = session-mode pooler (migrations).
- CONNECTIVITY GOTCHA (verified in the cloud VM): the DIRECT connection host
 `db.<project-ref>.supabase.co` is IPv6-ONLY and is UNREACHABLE from the cloud VM ("Network is
 unreachable"), because the VM has no IPv6 route. ALWAYS use the IPv4 pooler hosts
 (`aws-1-us-east-2.pooler.supabase.com`, ports 6543 + 5432) here — those are reachable. The
 Supabase "Connect → direct connection" string will NOT work from this VM.
- Prisma 7 GOTCHAS (differ from older guides): it does NOT auto-load `.env`; env is loaded by
 `prisma.config.ts` via `dotenv` from `.env.local`. Connection URLs are NOT allowed in the
 schema `datasource` block anymore — they live in `prisma.config.ts` (`datasource.url` =
 `DIRECT_URL` for migrate/introspect; the runtime client uses an adapter built with
 `DATABASE_URL`).
- `npx prisma generate` works offline (no DB needed) and the update script runs it. `npx prisma
 validate` is the quick config check. Live commands (`prisma migrate`, `db pull`) need the real
 password in `.env.local` and outbound network to Supabase, so they are blocked in the cloud VM
 by default.

### Run it
- Serve the repo root with any static file server, e.g. `python3 -m http.server 8000`,
  then open `http://localhost:8000/`. Do NOT open `index.html` via `file://`; the dynamic
  Firebase ES-module imports and some features expect an `http(s)` origin.

### Lint / test / build
- There is no lint config, no test suite, and no build pipeline in this repo. "Build" is a
  no-op — the served file IS the app.

### Playing through the entry gate (useful for testing)
- Start screen: click "RAISE THE GATES (ENTER)".
- Clan select: click any clan card. A "CLEARANCE CODE" modal appears.
- Clearance code: typing the digit `1` works for ANY clan (see `validatePassword` in
  `index.html`). RZG also accepts `RZ5K5ZKGKRZG333`.
- After "ACCESS GRANTED" you reach the "MILITARY DOSSIER" screen. Use the
  "ENLIST (REGISTER)" tab, enter any Callsign + Security Code, then AUTHENTICATE to create
  a local player and enter the game HQ. Player state persists in `localStorage`.

### Gotchas
- Expected/benign console noise: a Tailwind CDN production warning, a Firebase
  "unavailable - OFFLINE MODE" notice when network is blocked, and favicon/asset 404s.
  None of these block gameplay.
- Selecting a TRAVEL destination starts a timed travel animation (a black screen with a
 spinning cube during transit) — this is normal in-progress behavior, not a crash.
- Game objects are exposed on the global `BCA_SYS` (e.g. `BCA_SYS.travel`, not a bare
 `T`). When testing, you can jump straight into a room without the long X-spam travel
 mini-game, e.g. `BCA_SYS.travel.loc='Royal Armory'; BCA_SYS.travel.armory.open();`.
- TWO-CURRENCY ECONOMY (non-obvious, blocks shop testing): inside a barracks, shop
 purchases spend VAULT gold (`BCA_SYS.state.profile.gold`); OUTSIDE a barracks (Royal
 Armory, Town, etc.) purchases spend BAG cash (`BCA_SYS.state.profile.bag.gold`) and
 items land in the bag. To test buying out in the world, set `bag.gold`, not `gold`.
- SPIRIT SHOP: a password-gated sanctum inside the Royal Armory (purple "SPIRIT SHOP"
 button in the armory tabs). Passphrase: `LONGLIVETHEFOUR33` (admins bypass). It sells
 god-tier "Spirit Forge" weapons/armor/shields/pickaxes/feasts plus cosmetic
 decorations, all using the out-of-HQ bag-cash economy above.
