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
