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
- ONLINE BACKEND IS NOW SUPABASE (not Firebase): the boot block in `index.html` imports
 `./supabase/web/bca-supabase-boot.js`, which builds the Firestore-compat shim over Supabase
 Postgres + Realtime and assigns it to `window.__BCA_FS` / `window.__BCA_DB`. Firebase is only
 kept for its `firebaseConfig`/legacy references; the live data layer (presence, scores, sync)
 flows through `supabase/web/firestore-shim.js`. The app is still "offline-proof": the boot
 loads dynamically with an ~8s timeout and falls back to OFFLINE MODE (localStorage) if it is
 unavailable, so the game is fully playable in the cloud VM even without outbound network access.
- ⚠️ LIVE PRODUCTION DATABASE WARNING: outbound network to the real Firebase HAS been
 observed to WORK from the cloud VM (the game connected to the live backend and pulled real
 player accounts, e.g. real gold/scores for Crystal, Baga, Pain, etc.). This is NOT a
 sandbox. Any admin action performed while testing — score lock/unlock, resource grants,
 deploying arena/wall bots, hosting matches, saving team-score records — WRITES TO THE REAL
 PRODUCTION DATABASE and affects real players. When testing online-dependent features,
 prefer the headless Node harnesses (`node test-*.mjs`, which extract and run the real code
 against mocks) over touching the live DB. If you must exercise the live path, use a throwaway
 name, record the pre-test values, and RESTORE them afterward. Do NOT deploy arena bots or
 create matches against production just to "see it work" — that hands real rewards to real
 accounts and pollutes leaderboards.

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
- The game (`index.html`) now runs on Supabase (the boot block imports `bca-supabase-boot.js`;
 see "ONLINE BACKEND IS NOW SUPABASE" above). It does so via a Firestore-compatibility shim over
 Supabase. `supabase/web/firestore-shim.js` reproduces the
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
 `bca_users` / 20s `bca_presence`) WITH A LEADING EDGE (a doc that just became active — login,
 return-from-idle, first score change — flushes to the DB within ~2.5s via `_LEADING_MS`, then
 coalesces on the debounce). FRESHNESS GOTCHA (do NOT stretch these `persistMs` values to cut
 cost): `persistMs` is also how STALE the Postgres row can be, and a player who OPENS the app
 mid-session reads that DB row (not the live broadcast) for their first paint. If it is too long,
 an actively-spamming player reads as OFFLINE (their persisted `time` is still from a prior
 session, > the 2-min `SLEEP_AFTER_MS` threshold) and their score reads LOWER than reality on the
 leaderboard until the debounce finally flushes. A previous cost tweak that raised these to 60s/45s
 caused exactly that regression — keep them short (25s/20s) and rely on the leading-edge + the
 delta/skip-unchanged architecture (below) for the real savings, not on long persist windows.
 Broadcasts are DELTA-ONLY (just changed fields) and
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
- CROSS-CLIENT INCREMENT / RESOURCE-GRANT GOTCHA (why bag grants "weren't received"): admin
 resource grants are atomic increments on the TARGET's cloud doc (`pendingGold` / `pendingBagGold` /
 `pendingScore` / `pendingSoul`), which the target claims and clears with `increment(-amt)`. Two
 shim behaviors used to break this on the live-sync `bca_users` collection: (1) `liveEcho` fabricated
 a value for an increment whose base it did NOT have cached (base assumed 0), so a CLEAR wrote e.g.
 `pendingBagGold = -amt` into the local cache; and (2) the cache-overlaid `getDoc` then let that
 bogus cached value MASK the true DB value, and `onSnapshot` re-delivered it, SUBTRACTING the grant
 back out. Fixes: `liveEcho` now skips echoing an increment when its base is unknown (DB stays
 authoritative), and `getDocRaw()` reads the durable DB row with NO cache overlay. The grant claimer
 (`_selfGrantWatch` in index.html) reads pending via `getDocRaw` and polls every ~2s so bag/vault/
 score/soul grants land near-instantly. Regression: `node test-resource-grants.mjs`. Rule of thumb:
 any field written by a DIFFERENT client as an increment must be read with `getDocRaw`, not `getDoc`.
- STALE-SCORE / "had to reload to see who's online" GOTCHA + RECONCILIATION BACKSTOP: because
 the hot collections ride an EPHEMERAL Realtime Broadcast with NO `postgres_changes` fallback,
 a dropped delta (poor connection, a websocket reconnect gap where in-flight messages are gone
 forever, or Supabase coalescing/rate-limiting under load) used to leave a viewer STUCK on a
 stale value until they manually reloaded — e.g. reading Zekkerok II as 345K while he is really
 31M, or an account boosted ONCE (a single absolute write that then goes idle, e.g. Arzeila to
 79M) still reading its pre-boost 17M. `firestore-shim.js` now self-heals from the DURABLE
 Postgres row (source of truth): a `_reconcileLive(collection)` re-reads `fs_documents` and
 adopts DB field values for PEER docs (a) on a PERIODIC timer (`reconcileMs`, default 12s,
 gated to visible tabs), (b) on every Realtime RE-subscribe (reconnect), and (c) on
 `focus`/`online`/`visibilitychange→visible`. It NEVER downgrades the local player's own
 un-persisted (fresher) writes — it skips any doc that still has a pending persist
 (`_persistPending`/`_persistTimers`). So every client converges to truth within `reconcileMs`
 even if a broadcast never arrived, WITHOUT a page reload. Cost is bounded (visible-only,
 no stacked reads) and tunable via `__BCA_LIVE_SYNC` (`reconcileMs:0` disables it, reverting to
 broadcast-only). Offline regression test: `node supabase/tools/test-reconcile-heal.mjs`
 (simulates a muted/dropped broadcast + a reconnect and proves the heal).
- PRESENCE "asleep while active on mobile" GOTCHA: a player reads as asleep/offline when their
 `bca_presence.time` is >2 min stale (`SLEEP_AFTER_MS`) OR the record has `asleep:true`. The
 heartbeat (`P.push`) beats every ~4-6s while active (plus a per-strike beat during X-spam), so an
 active desktop client stays online. But phone browsers fire `pagehide`/`visibilitychange` on EVERY
 app-switch, screen-lock, notification and bfcache suspension — NOT only a real close — so the exit
 handler must NOT stamp `asleep:true` when the page is entering the bfcache (`pagehide`
 `event.persisted === true`) or when the player is actively playing / was active in the last minute,
 and it must re-assert ONLINE on `pageshow`/`focus`/visible. Otherwise actively-spamming phone
 players show asleep to everyone (most visibly in HQ Command). A genuine close just stops the
 heartbeat and reads offline via the 2-min staleness.

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

### Forge Studio (pro admin item editor — `forge-studio.js`)
- `forge-studio.js` is a sibling module (loaded via `<script src="./forge-studio.js" defer>` from
 `index.html`, same pattern as `supabase/web/*`). It adds `BCA_SYS.forgeStudio` and two admin
 buttons ("FORGE STUDIO", "STUDIO UPGRADE / EDIT ITEM") in `#admin-mini-menu`.
- It is a LAYER-BASED vector editor: an item is a `doc` of `layers` (kind `part`/`deco`/`fx`),
 each independently transformable/recolorable/textured/glowed/hidden/locked/reorderable, with a
 procedural parts+decoration library, a variation engine, clip-to-body decoration blending,
 one-click quality ops, a quality analyzer, undo/redo, import/export, and Create + Upgrade modes.
 Saved items register real `legendaryArt` + inject into `shop.db` + persist to localStorage
 (`bca_forge_studio_v1`) and Firestore (`bca_system/forge_studio_v1`) — so they show in shops AND
 when equipped, exactly like other gear. Edited/created items are stamped `req: 'BLACKSMITH FORGED'`.
- EQUIPPED-SNAPSHOT GOTCHA (root cause of "my edit didn't save / the weapon isn't changing" even
 after a refresh): a player's equipped gear (`profile.activeWeapon/activeArmor/activeShield/
 activeHqWeapon`) is a FROZEN SNAPSHOT serialized into the profile at equip time, NOT a live
 reference to `shop.db`. So editing an item someone already wears (e.g. Craymore for CRYSTAL)
 updates `shop.db` (the shop card is correct) but the wearer keeps the stale buff/description/art
 until they re-equip. `injectAll()` therefore calls `refreshEquipped(def)` for every custom def on
 every inject (load, shop rebuild, the 6s tick, cloud sync) to re-sync the equipped snapshot in
 place. When debugging "edits don't show", check the WEARER'S `activeWeapon`, not just `shop.db`.
- CACHE-BUST LOADING: `index.html` loads `forge-studio.js` via a tiny inline loader that appends
 `?v=<Date.now()>`, so admin item-editor fixes are ALWAYS fetched fresh (a sibling `.js` can be
 cached even when `index.html` is fresh, which made editor fixes look like they "never took effect").
 When verifying an editor change actually shipped, confirm the `forge-studio.js?v=...` request is the
 new file.
- VERIFIED persistence: `saveLocal()` and `pushCloud()` now notify the admin on failure instead of
 silently swallowing it (cloud write also retries transient errors), so a genuinely failing save is
 visible/diagnosable rather than looking like "the edit just didn't save". The local save is
 synchronous, so a same-device refresh keeps the edit unless the browser clears storage; cross-device
 relies on the `bca_system/forge_studio_v1` cloud write succeeding.
- CRAYMORE (and special hardcoded weapons) power is EDITABLE: the combat used to add a hardcoded
 `+8` for `buffData.t === 'craymore'` (index.html ~2310 and ~6940), so editing Craymore in the studio
 changed its picture/description but "had literally no upgrade at all" (and re-opening showed default
 sliders, so it looked unsaved). Combat now reads `buffData.perStrike` / `tpsBonus` / `tpsThreshold`
 (defaults 8 / 2 / 8 → un-edited Craymore is unchanged), the studio's DAMAGE slider sets
 `perStrike` while KEEPING the `craymore` type (special animation/sound/tps behavior), the
 description auto-writes the true numbers, and `hydrateFromBuff` shows `perStrike` in the damage
 slider on re-open. ALL OTHER hardcoded specials (deagle/sg12/mg42/khazzenowei/moonwraith/agrezokul/
 blubareth/sunfang/goldwarlord/…) are now editable too via a uniform `buffData.perStrikeAdd`: combat
 adds `+= (+buffData.perStrikeAdd || 0)` at the END of the weapon, armor AND shield buff blocks in
 BOTH combat sites (the bot/preview path ~2317/2343/2345 and the main strike path ~6988/7071/7075),
 default 0 so un-edited items are byte-identical. The studio keeps the item's special buff intact and
 the DAMAGE/DEFENSE slider sets `perStrikeAdd` (with a truthful "+N bonus points per strike" line);
 `hydrateFromBuff` shows it on re-open. So editing ANY hardcoded item now produces a real, persisted,
 truthful upgrade without losing its unique behavior.
- GOTCHA (Node testing): `package.json` has `"type":"module"`, so `require('./forge-studio.js')`
 loads it as ESM and the CommonJS `module.exports` is skipped. The engine test
 (`node forge-studio.test.mjs`) instead reads the file and evals it in a CommonJS wrapper with
 `window`/`document` undefined (so only the pure engine runs). In the browser it's a classic
 `<script>` and the DOM/UI half boots normally.
- Visual/UI verification here was done via headless Chrome (`google-chrome --headless=new
 --no-sandbox --disable-dbus --user-data-dir=/tmp/... --screenshot=...`) rendering a standalone
 preview page, because interactive computerUse browser sessions in this env have been flaky
 (they sometimes execute a stale build even after cache-busting/hard reload).

### Food buffs & X-SPAM classified logs (non-obvious)
- TWO deterministic-food handlers exist and are nearly identical: `applyDetFood` (assigned to
 `BCA_SYS._applyAdminFoodBuff`, the inner `consume` path) AND `applyAdminFood` (called by the
 shop-editor's `consume` WRAPPER, which is the OUTERMOST `consume` at runtime). A `foodBuff` item
 (spirit-shop / admin-created food) is routed through the WRAPPER first, so `applyAdminFood` is the
 one that actually runs — but both must be kept in sync (e.g. the long-buff duration fix was applied
 to BOTH). When changing food-buff behavior, edit both handlers.
- LONG buffs last ~99 HOURS. The spirit-shop "long" foods previously used `mins*60000` (so a food
 labeled "long" only lasted its minute value, e.g. 60 min); long foods now always use a ~99-hour
 window regardless of the item's `mins`. Short admin foods still use `mins`.
- SHORT buffs wear by SPAM COUNT, not score. `BCA_SYS.food.strikeBonus` drains `wearLeft` by a
 FIXED `BCA_SYS.food._wearPerSpam` (default 6) per strike, independent of points/weapon power/spam
 rate. `wearLeft` is effectively a "spams remaining" budget. `BCA_SYS.food.scoreBurn` is now a NO-OP
 (score no longer shaves buff time) — that score→time coupling is what made buffs "go too fast".
- SPAM COUNT is tracked: `BCA_SYS.state.sessionSpams` counts every scoring strike this session, and
 each HQ run's `[X-SPAM PROTOCOL]` log line now includes the run's spam count (from `runStrikes`).
- CLASSIFIED X-SPAM grouping: the Command Logs viewer groups a player's X-SPAM runs within a 45-min
 gap into ONE session summary (total clan score + total spams + run count + time range), color-coded
 per player (`_playerColor`). Helpers: `BCA_SYS.hq.parseSpamLog` / `groupSpamLogs` / `renderSpamGroup`,
 wired into `renderLogList` via `renderSpamCategory` (used in both the ALL overview and the X-SPAM tab).
 Offline/browser regression: `node test-buff-spamlog.mjs` (structural guards).

### Performance / long-session lag (non-obvious)
- The lag that builds up after long play (frozen countdown clock, dropped spams, worse on Bluetooth)
 is MAIN-THREAD SATURATION + a few STACKING leaks, not a single unbounded array (the strike-path
 arrays `strikeTimestamps`/`gapHistory` are already bounded). Known fixed causes / patterns to respect:
 - PER-STRIKE ANIMATION THROTTLE: `combat.swingFighter` and `combat.triggerWeaponActionAnimation`
   restart CSS animations via `getAnimations()` — these are now throttled to ~45ms
   (`combat._swingAt` / `combat._wpnAnimAt`) because re-scanning every strike starved the 100ms
   timers during fast/controller spam. The strike SOUND (`audio.playWeaponSound`) still fires every
   strike (kept OUTSIDE the throttle) and art changes bypass the throttle. Do NOT move the sound
   inside the throttle.
 - AKISUMA JOYSTICK LEAK: `bindJoystick()` is called from `renderHQ()` every time the Akisuma HQ tab
   is shown. It must bind exactly once (`bindJoystick._bound`) — it previously spawned a NEW 60fps
   `requestAnimationFrame` gamepad loop + re-added window listeners on every call, stacking permanent
   loops. It now uses event delegation (`onStick`) + live DOM lookups so it survives the DOM rebuild,
   and its single gamepad poll no-ops unless the joystick screen is active.
 - ROYAL WALLS DOUBLE HANDLERS: there are two `#rw-strike` handler blocks (the early travel-module
   one and the canonical `T._wallStrikeEventsF2dc` one). The early one now defers with
   `!T._wallStrikeEventsF2dc` so a wall tap runs `addWallHP(1)` exactly once (was double HP + double
   work).
 - ARENA opponent figure: the arena `onSnapshot` rebuilt the full opponent SVG (`figureHtml`) on
   EVERY snapshot (~700ms score sync). It now only rebuilds when the opponent gear/name signature
   (`cur._oppFigSig`) changes.
- When touching the strike path or any per-render bind, watch for exactly these patterns (per-strike
 heavy work, per-render rAF/listener stacking, per-snapshot full innerHTML rebuilds).

### Gear visuals (non-obvious): the giant-shield clamp
- The avatar has SEVERAL competing shield/armor sizing pipelines (base CSS / `fittedGear` / UHF
 profile / `strictApplyShield` / stable-4501), layered by boot patches that fight each other. The
 "shield covers the whole body" bug came from the strict path pouring a full shop DISPLAY card
 (viewBox 0 0 100 100 in an `h-32` card) into a 100%x100% shield slot. A FINAL CSS block
 `#bca-shield-size-clamp` (just before `</body>`) is the AUTHORITATIVE shield placement+size block.
 It PINS every `.fighter-shield` to the OFF-HAND (left arm/hand, opposite the right-hand weapon) at
 forearm/hand height (`left:5%; top:33%`) and hard-caps its size (`max-width/max-height`, separate
 properties so they clamp the used size regardless of any `!important` width a pipeline set). CRUCIAL:
 its selectors deliberately MATCH/EXCEED the strict pipeline's per-type specificity
 (`.fighter-shield.strict-shield-worn[data-strict-shield-type] .strict-shield-exact-art`) and set
 `transform:none` on the inner art — otherwise the strict path's `translate(-34%,17%) scale(...)` wins
 and the shield rides onto the SHOULDER / floats off the body. If you add a new shield pipeline, this
 block still bounds+places it; do not remove it or lower its specificity. Regression guards:
 `node test-lag-visual-fixes.mjs` and `node test-status-shield-fixes.mjs`.
- PRESENCE "everyone shows ONLINE right after login" GOTCHA: `P.recordHeartbeats()` must NOT stamp a
 player as observed-online on FIRST sight (when `_prevTime[k]` is undefined) - only a subsequent
 heartbeat CHANGE proves a live session. Seeding `_localSeen[k]=now` for every cached player on the
 first snapshot made all of them (and bots) read ONLINE for the whole `OFFLINE_ASLEEP_MS` (2 min)
 window even when nobody was online. This mirrors the `_beatSeen`/`trackBeats` first-sight rule that
 `statusFor` uses.
- STATUS AVATAR FLICKER GOTCHA: the presence roster (`renderPresenceNow`) rebuilds a row when its
 signature (which includes score + status label) changes. Rows carry `data-gear-sig`; on a row swap,
 if the gear is unchanged the EXISTING `.uhf-row-figure` avatar node is transplanted into the new row
 instead of re-parsing the SVG, so armor/shield/weapon no longer flash in/out on score/status ticks.
- BARRACKS MENU: `rzg-view-nav` is in `STATUS_BOARD_DENY`, so the barracks menu shows ONLY the
 per-barracks `#bca-whoshere-panel` ("BARRACKS X - WHO'S HERE"), not a second generic PLAYER STATUS
 board. The PLAYER STATUS board still renders in HQ Command and travel rooms.

### Run it
- Serve the repo root with any static file server, e.g. `python3 -m http.server 8000`,
  then open `http://localhost:8000/`. Do NOT open `index.html` via `file://`; the dynamic
  Firebase ES-module imports and some features expect an `http(s)` origin.

### Reproducing/verifying visual + state bugs OFFLINE (safe, no live DB)
- The fastest reliable way to verify UI/render/state fixes here (presence rosters, fighter/armor/
  weapon art, Forge Studio saves, etc.) WITHOUT risking the live production DB is a headless-Chrome
  harness: `npm install --no-save puppeteer-core` and drive the system `google-chrome-stable`.
- CRITICAL to stay offline (and off the real DB): enable request interception and ABORT every
  request whose URL is not `http://localhost:8000` (block Firebase/Supabase/CDNs). The game then
  falls back to OFFLINE MODE (localStorage) within ~8s and is fully playable/inspectable.
- Drive the entry gate directly via the API instead of clicking: `BCA_SYS.ui.switchScreen('clan-select')`
  → `BCA_SYS.clans.openChamber('RZG')` → set `#chamber-password`='1' + `await BCA_SYS.clans.validatePassword()`
  → `BCA_SYS.auth.setMode('register')` → set `#bca-auth-id`/`#bca-auth-pass` (use `WARRIORBCA58484`
  to log in as ADMIN offline, which unlocks Forge Studio) → `await BCA_SYS.auth.submit()`.
- Then inspect/seed live objects: `BCA_SYS.shop.getArt(item,cat)`, `BCA_SYS.combat.buildFighter(id,name,gear,useWpn)`,
  seed `BCA_SYS.travel.presence.cache` and call `BCA_SYS.hq.open(true)`, or drive Forge Studio via
  `BCA_SYS.forgeStudio.openUpgrade()/_fillPick()/_openPick()/stat()/save()`. NOTE: several reported
  "live" bugs (weapon showing basic art, studio edits not saving) actually WORK in a clean offline
  boot — they reproduce only against live cloud data/timing, so verify the offline path first before
  assuming a code bug.

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

### Accounts & passwords (non-obvious)
- Account login codes are stored ONE-WAY HASHED (`hashPass`, SHA-256) as `pass` on the account
  (profile + `bca_users/<ID>.pass` in the cloud), so an existing password can NEVER be read back /
  recovered — you can only overwrite it.
- Admins can set/reset any NORMAL account's code via the admin menu → PASSWORD CONTROL
  (`BCA_SYS.adminPass.setPassword()`), which writes a new hash to the cloud account + any local
  backup. Officer/reserved accounts (CRYSTAL, DIABETIC, LEAFY, GOOFY, TEEKO, ZEKKEROK II) log in
  with FIXED hardcoded command codes in `auth.submit` and are NOT governed by `bca_users.pass`; the
  master admin code (`WARRIORBCA58484`) always works for admin-eligible accounts.
- TWO-LAYER LOGIN GOTCHA (why "I changed the password but they still can't log in" kept recurring):
  login is validated in TWO places. The `ultimate-hard-fix-2026` script wraps `auth.submit` with a
  PRE-GATE `S.auth.cloudVerify()` that runs FIRST and `return`s on failure — so fixes made only
  inside the inner `auth.submit` never execute if `cloudVerify` rejects. Admin-set codes live in
  `bca_system/password_overrides` (a NON-hot doc that persists immediately), while `bca_users.pass`
  is a DEBOUNCED (~25s) write. BOTH layers must read the override FIRST and treat it as
  authoritative (ignoring the stale `bca_users.pass`). When touching login, update `cloudVerify`
  too, not just `auth.submit`.
- "SPECIAL ROSTER" GOTCHA: only the six named officers keep fixed command codes. Do NOT gate login
  on `barracksData` membership — live sync auto-adds every RZG `bca_users` account (e.g. IZIRATOR)
  into Barracks D, so keying "special" off the whole roster forces normal players onto
  `WARRIORBCA58484` and skips their password/override entirely. The `isSpecial` checks in both
  `auth.submit` and the UHF wrapper key off the officer map only.

### Presence / online status (non-obvious)
- CLOCK-SKEW FALSE-OFFLINE: `_offline`/online used to be decided purely from the writer's absolute
  `time` vs a 2-min threshold, so a phone with a wrong clock (or a debounced/first-paint DB row)
  read an actively-beating player as OFFLINE. The `presence-accuracy-lastseen-final` script tracks,
  per account, the LOCAL-clock instant this client last observed a heartbeat *change*
  (`P._beatSeen`); a recently-observed beat forces ONLINE regardless of the record's timestamp
  (`recomputeOffline` clears `_offline`; `statusFor`/`isSleeping` honor it). First sighting is NOT a
  beat (so long-offline accounts don't flash online on first paint). `window.__BCA_AGO(t)` renders
  the "LAST ON X AGO" labels. This is what keeps officer accounts (e.g. ZEKKEROK II) reliably shown
  in HQ Command while online.

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
