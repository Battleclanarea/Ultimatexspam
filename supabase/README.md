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

### Database migrations

SQL schema lives in `supabase/migrations/` (starter: `*_init.sql` creates the
`profiles` table + RLS — the Postgres replacement for the Firestore `bca_users`
collection). Apply it with either:

- `supabase db push` — uses the **direct Postgres connection string** (`SUPABASE_DB_URL`
  in your local `.env`, format `postgresql://postgres:[PASSWORD]@db.<ref>.supabase.co:5432/postgres`).
  That string contains the `postgres` superuser password, so it is a **secret** — keep
  it only in `.env` (git-ignored) or the Secrets panel, never committed or in the browser.
- or paste the SQL into the dashboard **SQL editor**.

### Agent skills

`npx skills add supabase/agent-skills` installed Supabase's agent guidance into
`.agents/skills/` (`supabase`, `supabase-postgres-best-practices`), tracked via
`skills-lock.json`. These are reference docs for AI coding tools (RLS/security and
Postgres performance best practices) — guidance only, no executable scripts.

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
