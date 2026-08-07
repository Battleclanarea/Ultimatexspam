# Supabase backend for Ultimatexspam

This folder holds the **server-side** Supabase setup (Edge Functions using
[`@supabase/server`](https://supabase.com/blog/introducing-supabase-server)).
The game itself is still the static `index.html`; Supabase is the new data layer
that replaces Firebase.

## ⚠️ Client vs. server (read this first)

`@supabase/server` (`withSupabase`, `ctx.supabaseAdmin`) is a **server-only** SDK.
`ctx.supabaseAdmin` uses the **secret key** and bypasses Row Level Security, so it
must run **only** inside Edge Functions — **never** in `index.html` or any browser
code. If the secret key ships to the browser, every player can read/write the whole
database.

- **Browser (`index.html`)** → use `@supabase/supabase-js` with the **publishable
  (anon) key** + Supabase Auth. All access is constrained by **RLS**.
- **Edge Functions (`supabase/functions/*`)** → use `@supabase/server`. `ctx.supabase`
  is RLS-scoped to the caller; `ctx.supabaseAdmin` is for privileged/admin actions.

## Setup

1. Install deps (from repo root): `npm install`
2. Install the Supabase CLI: <https://supabase.com/docs/guides/cli>
3. From your Supabase dashboard's **Connect** dialog (or Project Settings → API),
   copy the values into a local `.env` (see `.env.example`; never commit it):
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` (server only)
   - `SUPABASE_JWKS_URL` (e.g. `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`)
   On deployed Edge Functions these four are injected automatically.
4. Link + run locally:
   - `supabase link --project-ref <your-ref>`
   - `supabase functions serve game-api --env-file .env`
5. Deploy: `supabase functions deploy game-api`

Auth modes for `withSupabase({ auth: ... })`: `"user"` (valid JWT), `"publishable"`
(publishable key), `"secret"` (secret key), `"none"`. For any mode other than
`"user"`, set `verify_jwt = false` for that function in `config.toml` so the
gateway lets the request through and the SDK does the key-based auth itself.

## Calling it from the game

```js
// in index.html, after the player signs in with Supabase Auth:
const { data: { session } } = await supabase.auth.getSession();
const res = await fetch(`${SUPABASE_URL}/functions/v1/game-api`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${session.access_token}`, // user JWT -> auth: "user"
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ score: profile.score, gold: profile.gold }),
});
```

## Firebase → Supabase migration map

| Firebase (today) | Supabase (target) |
| --- | --- |
| Firestore collections (`bca_users`, `bca_presence`, `bca_arena`, `bca_global_logs`) | Postgres tables (`profiles`, `presence`, `arena_games`, `logs`) |
| Per-document client writes / `increment()` | Row upserts / SQL (`update ... set score = score + n`) or an RPC, behind an Edge Function |
| Firebase Auth | Supabase Auth (email/OTP/anon) — JWT verified by `@supabase/server` |
| Firestore `onSnapshot` live updates | Supabase **Realtime** (`supabase.channel(...).on('postgres_changes', ...)`) — replaces presence/leaderboard listeners |
| Security: client-trusted writes + ad‑hoc guards | **Row Level Security** policies (`id = auth.uid()`), admin work via `ctx.supabaseAdmin` |
| Write-stream exhaustion from many client writes | Server-side batched SQL / RPC; Realtime broadcast instead of per-entity polling |

### Suggested migration order
1. Create the tables above + RLS policies; enable Supabase Auth.
2. Add `@supabase/supabase-js` (CDN) to `index.html` and sign players in.
3. Move **reads** (leaderboards/presence) to Realtime subscriptions.
4. Move **writes** behind `game-api` Edge Function endpoints (score, gold, arena, logs).
5. Move admin tools (grants/boosts/roster) to admin-guarded endpoints using `ctx.supabaseAdmin`.
6. Remove the Firebase CDN imports once every path is on Supabase.

This is a large migration; it can be done incrementally with Firebase and Supabase
running side by side until each subsystem is switched over.

---

## Firestore-compatibility layer (drop-in Firebase replacement)

The game touches Firestore only through a fixed bundle of helpers it stores on
`window.__BCA_FS` / `window.__BCA_DB` (`doc`, `setDoc`, `getDoc`, `updateDoc`, `onSnapshot`,
`collection`, `getDocs`, `deleteDoc`, `addDoc`, `query`, `where`, `orderBy`, `limit`,
`startAfter`, `increment`, `writeBatch`) keyed by **callsign** (not an auth UID). Rather than
re-architect ~12 collections, this repo ships a shim that reproduces that exact surface on
Supabase, so the game logic is unchanged — only the boot block that builds those globals
swaps from Firebase to Supabase.

Pieces:

- **`supabase/migrations/20260629000000_firestore_compat.sql`** — one `public.fs_documents`
  table keyed by `(collection, doc_id)` with a `jsonb data` blob, plus SQL helpers that
  reproduce Firestore write semantics:
  - `fs_set(collection, id, data, merge)` — `setDoc`/`addDoc` with deep JSONB merge.
  - `fs_update(collection, id, sets, incrs, unions)` — `updateDoc` with dotted-path sets,
    atomic numeric `increment()`, and `arrayUnion()` (creates missing intermediate objects).
  - `fs_query(collection, order_field, desc, limit)` — `orderBy(numericField).limit(n)` feeds.
  - permissive **RLS** for `anon`/`authenticated` (this matches the game's current
    client-trusted Firestore model — it is parity, NOT hardening; a stricter, server-only
    model via the `game-api` Edge Function is the recommended follow-up), plus Realtime
    publication + `replica identity full` so `onSnapshot` works.
- **`supabase/web/firestore-shim.js`** — `createFirestoreCompat(supabaseClient)` returns the
  Firestore-shaped `fs` bundle (and re-exports `increment`/`arrayUnion`/`serverTimestamp`).
  `onSnapshot` is backed by Supabase Realtime `postgres_changes` on `fs_documents`.
- **`supabase/web/bca-supabase-boot.js`** — `bootSupabase({url,key})` creates the CDN client
  and returns `{ db, auth, fs, signInAnonymously }` using the same names the game expects.

### Flipping the game to Supabase

1. **Apply the migration** to your project (no Docker needed):
   - Easiest: paste `supabase/migrations/20260629000000_firestore_compat.sql` into the
     Supabase dashboard SQL Editor and run it; **or**
   - `supabase link --project-ref gxixfhmcladslsjdffdy && supabase db push` (needs the DB
     password). NOTE: from this cloud VM use the **IPv4 pooler** host — the direct
     `db.<ref>.supabase.co` host is IPv6-only and unreachable here.
2. **(Optional)** In the dashboard, enable **Anonymous sign-ins** (Authentication → Providers)
   if you want `signInAnonymously` to mint real anon JWTs; the shim falls back to a synthetic
   local user otherwise (RLS already permits the publishable key).
3. **Swap the boot block** in `index.html`. Replace the dynamic Firebase import + init with:

   ```js
   import { bootSupabase, BCA_SUPABASE } from "./supabase/web/bca-supabase-boot.js";
   const boot = await bootSupabase(BCA_SUPABASE);            // { db, auth, fs, signInAnonymously }
   app = boot.app; db = boot.db; auth = boot.auth; signInAnonymously = boot.signInAnonymously;
   ({ doc, setDoc, getDoc, updateDoc, collection, query, where, onSnapshot, deleteDoc, addDoc,
      getDocs, limit, orderBy, startAfter, increment, writeBatch } = boot.fs);
   window.__BCA_DB = db;
   window.__BCA_FS = boot.fs;
   ```

   The existing ~8s timeout / OFFLINE-MODE `try/catch` still applies unchanged: if Supabase
   fails to load, the game falls back to localStorage exactly as it does for Firebase today.

### Cost control: Realtime **Broadcast** live-sync for hot collections

The original shim streamed every collection's live updates via Realtime
`postgres_changes`. For the two hot, high-churn collections — `bca_users` (every
player's ~1s autosave) and `bca_presence` (presence beats) — that meant each write
(a) hit Postgres, (b) generated WAL, and (c) was fanned out to **every** subscriber as
a Realtime message carrying the full row. Cost therefore scaled as *(writes ×
subscribers)* in Realtime messages **and** egress, plus a DB write per tick. This is the
usual Supabase bill-blowup and is what pushes usage toward the quota.

`firestore-shim.js` now routes those two collections over a shared Realtime **Broadcast**
channel instead:

- **Live updates → Broadcast** (`supabase.channel('bca-sync:<collection>', {config:{broadcast:{self:false}}})`).
  Broadcast messages are ephemeral: **no DB write, no WAL, no egress from row storage**.
  Each doc's outbound broadcast is **throttled** (leading + trailing, `broadcastMs`), so a
  player that autosaves many times per second still emits ~1 small delta/sec.
- **Delta-only + skip-unchanged (the main cost cut).** We broadcast/persist only the fields
  that actually CHANGED versus the cache — a ~20KB profile whose only change is `score`
  becomes a `{score}` message — and an identical re-save (idle players + the many bot/NPC
  presence heartbeats that re-write the same row every second) produces an EMPTY delta, so it
  sends **zero** Realtime messages and does **zero** DB writes. This is what brings both the
  Realtime-message count and egress down, not just the postgres_changes removal.
- **Durability → debounced persist.** Plain merge writes are coalesced and flushed to
  `fs_documents` at most once per `persistMs` per doc (default 25s for `bca_users`, 20s for
  `bca_presence`) instead of once per tick — a ~15-25× cut in DB writes/WAL/egress. Pending
  writes are force-flushed on `beforeunload` / `pagehide` / tab-hide so nothing is lost.
- **Reads stay correct.** `getDoc`/`getDocs`/`onSnapshot` overlay the in-memory live cache
  on top of the (debounced) DB rows, so local reads never lag un-persisted writes, and the
  hot collections no longer open a `postgres_changes` subscription at all.
- **Everything else is unchanged.** Low-volume collections (`bca_arena`, `bca_system`,
  `bca_global_logs`, `bca_travel_events`) keep the classic `postgres_changes` path. Writes
  with `increment()`/`arrayUnion()` sentinels still go straight to the DB (correctness).

Tuning / kill-switch (set **before** the boot import in `index.html`):

```js
// tune windows:
window.__BCA_LIVE_SYNC = { bca_users:{persistMs:25000, broadcastMs:1500},
                           bca_presence:{persistMs:20000, broadcastMs:2000} };
// or fully disable (revert to postgres_changes everywhere):
window.__BCA_LIVE_SYNC = {};
```

Requires Realtime enabled on the project (it is — verified). Regression test (no network):
`node supabase/tools/test-live-sync.mjs` proves broadcast delivery, the DB-write collapse,
cache overlay, deletes, and that non-live collections are untouched.

#### Bot-run cost control: the 15-second injector cadence

Score-injector bot runs used to dominate the bill. Peer-facing **score** updates now step
every ~15 seconds by design (owner-approved), while everything a player *does* stays instant:

- **`bca_users` broadcast throttle is 15s** (was 1.5s). Leading edge intact — the first
  change after a quiet period broadcasts immediately; follow-ups coalesce into one delta per
  15s that MERGES every field changed in the window (`_bcPending` merge — a long window must
  never drop a queued score delta under a later delta). `bca_presence` keeps its 2s broadcast
  and the persist/reconcile freshness values are untouched.
- **HQ score injector** (`adminBoost`): the batched increment push runs on a flat 15s
  (`BCA_SYS.adminBoost.pushMs`), replacing the adaptive 2.5–15s cadence. Increment writes
  bypass the live-sync debounce (they hit the DB immediately), so this cadence is exactly the
  bot write bill. The per-second local drip is unchanged — each batch carries gain-rate × 15s.
  Bot presence beats floor at 15s (they only need to stay inside the 2-minute sleep window).
- **Events score injector**: running boosters accumulate locally (`EV._pendingEvt`) and ONE
  combined increment write to `bca_system/bca_events_v1` ships ALL boosters' gains every 15s
  (`EV._flushMs`). One-shot injects/deducts/wipes stay immediate; stopping a booster,
  `pagehide`, and `beforeunload` flush pending gains; a wipe drops that key's pending so a
  queued gain can never resurrect a wiped score.
- **Not affected**: live arena/duel scores (`bca_arena`, classic `postgres_changes`), grant
  delivery, room movement, and online/offline flips.

Regression (no network): `node test-injector-cadence.mjs`.

### What's verified vs. what's pending

- **Verified** (see PR): the migration applies on Postgres 16, and the shim's deep-merge,
  `increment` (+/−/nested/accumulating), `arrayUnion` dedup, `setDoc`+sentinel, ordered
  `query`, `writeBatch`, `deleteDoc`, and `onSnapshot` initial read all pass against the real
  SQL functions.
- **Done live** (applied to the project): migration applied via the IPv4 pooler; publishable-key
  round-trip (`fs_set`/`fs_update`/read); Realtime event delivery confirmed; the game boots on
  Supabase; a new player registered + persisted; and **existing player data was migrated** (see
  below) with an existing account (LEAFY) logging in and loading restored progress.
- **Still recommended before heavy traffic**: a multi-client **load test** of the hot write
  paths (profile autosave ~1s, arena/duel score ~700ms, presence ~6s) and Realtime fan-out for
  the collection-wide `bca_users`/`bca_presence` listeners; verifying deep log-history
  pagination; and tightening RLS / moving privileged writes server-side.

## Data migration (Firestore → `fs_documents`)

`supabase/tools/migrate-firestore-to-supabase.mjs` is a one-time ETL that copies existing game
data out of the old Firebase project (`bca-world96`) into Supabase. It signs in anonymously with
the **public** web API key (the same one the browser uses), reads each collection via the
Firestore REST API, converts the typed documents to plain JSON, and bulk-upserts into
`fs_documents` via PostgREST. It is **idempotent** (upsert on `(collection, doc_id)`).

```bash
node supabase/tools/migrate-firestore-to-supabase.mjs --dry-run     # counts only, writes nothing
node supabase/tools/migrate-firestore-to-supabase.mjs               # migrate
node supabase/tools/migrate-firestore-to-supabase.mjs --only=bca_users,bca_system
LOG_LIMIT=0 node supabase/tools/migrate-firestore-to-supabase.mjs   # include the FULL log history
```

Note: `bca_global_logs` is an unbounded append-only feed (hundreds of thousands of rows). By
default only the most recent `LOG_LIMIT` (20000) log entries are imported, since the game only
renders the recent tail; older rows stay in Firebase. All other collections are copied in full.

## Project move (old Supabase → new Supabase)

The game moved from the original project `sbvnjguruzmexmamorlv` (unpaid, being retired) to
`gxixfhmcladslsjdffdy` (ca-central-1). The client config lives in ONE place —
`BCA_SUPABASE` in `supabase/web/bca-supabase-boot.js` — and is already pointed at the new
project.

**STATUS (2026-08-07): steps 1–2 below are DONE on the live new project** — the
firestore-compat schema was applied via the IPv4 pooler, all 20 collections
(24,114 documents, logs capped at the most recent 20,000) were copied, per-collection
counts + doc hashes verified, RPC round-trip (`fs_set`/`fs_update`/`fs_query`) confirmed
with the publishable key, `fs_documents` is in the `supabase_realtime` publication, and the
game booted headless against the new project reading a real migrated account. The copy tool
is idempotent — re-run it right after the deploy to pick up any writes that landed on the
old project in between. The steps below are kept for reference / re-runs:

1. **Apply the schema** to the new project: paste
   `supabase/migrations/20260629000000_firestore_compat.sql` into its dashboard SQL Editor and
   run it (or `supabase link --project-ref gxixfhmcladslsjdffdy && supabase db push` with the DB
   password — from the cloud VM use the IPv4 pooler `aws-0-ca-central-1.pooler.supabase.com`).
2. **Copy the data** from the old project while it is still up (idempotent, publishable keys
   only, no secrets):

   ```bash
   node supabase/tools/migrate-supabase-to-supabase.mjs --dry-run   # counts only
   node supabase/tools/migrate-supabase-to-supabase.mjs             # copy everything
   LOG_LIMIT=0 node supabase/tools/migrate-supabase-to-supabase.mjs # include FULL log history
   ```

3. **(Optional)** Enable **Anonymous sign-ins** (Authentication → Providers) on the new project
   so `signInAnonymously` mints real anon JWTs; the shim falls back to a synthetic local user
   otherwise. Realtime must be available (the migration adds `fs_documents` to the
   `supabase_realtime` publication itself).
4. Deploy the updated `index.html` + `supabase/web/bca-supabase-boot.js`. Do steps 1–2 BEFORE
   deploying, otherwise live players boot against an empty project and fall back to
   OFFLINE MODE / fresh accounts.
