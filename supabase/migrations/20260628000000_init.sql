-- Ultimatexspam — initial Supabase schema (starter; adjust to taste).
-- This is the Postgres replacement for the Firestore `bca_users` collection.
-- Apply with the Supabase CLI: `supabase db push` (uses SUPABASE_DB_URL), or paste
-- into the SQL editor in the dashboard.

-- One row per player, keyed to the Supabase Auth user id.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  callsign    text unique,
  clan        text not null default 'RZG',
  -- bigint because the game allows very large (uncapped) score/gold values.
  score       bigint not null default 0,
  soul_score  bigint not null default 0,
  gold        bigint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Keep updated_at fresh on every write.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Row Level Security: the database enforces who can read/write what, so the
-- browser can talk to Supabase directly with only the publishable (anon) key.
alter table public.profiles enable row level security;

-- Leaderboards need every player to see everyone's public stats (read-only).
drop policy if exists "profiles are readable by authenticated users" on public.profiles;
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- A player may create ONLY their own row.
drop policy if exists "players insert their own profile" on public.profiles;
create policy "players insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- A player may update ONLY their own row. (Admin grants/boosts run server-side via
-- ctx.supabaseAdmin in an Edge Function, which bypasses RLS.)
drop policy if exists "players update their own profile" on public.profiles;
create policy "players update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
