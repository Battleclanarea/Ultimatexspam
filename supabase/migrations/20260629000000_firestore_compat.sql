-- Firestore-compatibility layer for the Ultimatexspam game (Firebase -> Supabase).
--
-- The game (index.html) uses Firestore purely as a document store accessed through a
-- small set of operations (doc/collection/getDoc/setDoc(merge)/updateDoc(increment,
-- arrayUnion, dotted paths)/addDoc/deleteDoc/getDocs/onSnapshot/query+orderBy+limit).
-- Instead of normalizing ~12 collections, we mirror that document model with ONE table
-- keyed by (collection, doc_id) holding a JSONB `data` blob. The browser shim
-- (supabase/web/firestore-shim.js) translates the Firestore calls into the helpers below
-- + PostgREST + Realtime, so the game code is unchanged except for which module populates
-- window.__BCA_FS / window.__BCA_DB at boot.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.fs_documents (
  collection text        not null,
  doc_id     text        not null,
  data       jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (collection, doc_id)
);

-- Realtime change feeds (onSnapshot) filter by collection, often by doc_id too.
create index if not exists fs_documents_collection_idx on public.fs_documents (collection);
-- Append-only feeds (e.g. bca_global_logs) are read ordered by the numeric data->>'time'.
create index if not exists fs_documents_time_idx
  on public.fs_documents (collection, ((data ->> 'time')::numeric));

-- ---------------------------------------------------------------------------
-- Deep JSONB merge (Firestore setDoc({ merge: true }) semantics: nested objects
-- merge recursively, arrays/scalars are replaced wholesale).
-- ---------------------------------------------------------------------------
create or replace function public.jsonb_deep_merge(a jsonb, b jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when a is null then b
    when b is null then a
    when jsonb_typeof(a) <> 'object' or jsonb_typeof(b) <> 'object' then b
    else (
      select coalesce(jsonb_object_agg(key, val), '{}'::jsonb)
      from (
        select k.key as key,
          case
            when (a ? k.key) and (b ? k.key) then public.jsonb_deep_merge(a -> k.key, b -> k.key)
            when (b ? k.key) then b -> k.key
            else a -> k.key
          end as val
        from (
          select jsonb_object_keys(a) as key
          union
          select jsonb_object_keys(b) as key
        ) k
      ) m
    )
  end;
$$;

-- ---------------------------------------------------------------------------
-- jsonb_set at a (possibly deep) dotted path, CREATING missing intermediate
-- objects. Plain jsonb_set(create_missing => true) only creates the leaf when the
-- parent path already exists, so 3+ level Firestore paths like "players.MARK.score"
-- on a fresh doc would silently no-op. This walks ancestors and seeds them as {}.
-- ---------------------------------------------------------------------------
create or replace function public.jsonb_set_deep(target jsonb, path text[], val jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  i   int;
  sub text[];
begin
  if target is null then
    target := '{}'::jsonb;
  end if;
  if path is null or array_length(path, 1) is null then
    return target;
  end if;
  for i in 1 .. array_length(path, 1) - 1 loop
    sub := path[1:i];
    if (target #> sub) is null or jsonb_typeof(target #> sub) <> 'object' then
      target := jsonb_set(target, sub, '{}'::jsonb, true);
    end if;
  end loop;
  return jsonb_set(target, path, val, true);
end;
$$;

-- ---------------------------------------------------------------------------
-- setDoc / addDoc: upsert a document, optionally deep-merging into existing data.
-- ---------------------------------------------------------------------------
create or replace function public.fs_set(
  p_collection text,
  p_id         text,
  p_data       jsonb,
  p_merge      boolean default true
)
returns public.fs_documents
language plpgsql
as $$
declare
  r public.fs_documents;
begin
  insert into public.fs_documents as d (collection, doc_id, data, created_at, updated_at)
  values (p_collection, p_id, coalesce(p_data, '{}'::jsonb), now(), now())
  on conflict (collection, doc_id) do update
    set data = case
                 when p_merge then public.jsonb_deep_merge(d.data, excluded.data)
                 else excluded.data
               end,
        updated_at = now()
  returning * into r;
  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- updateDoc: apply dotted-path sets, atomic numeric increments, and arrayUnion.
--   p_sets   : { "players.MARK.done": true, "status": "active" }
--   p_incrs  : { "gold": 50, "pendingScore": -10 }
--   p_unions : { "tools": { ...payload } }
-- Creates the document (and intermediate objects) if missing, matching Firestore.
-- ---------------------------------------------------------------------------
create or replace function public.fs_update(
  p_collection text,
  p_id         text,
  p_sets       jsonb default '{}'::jsonb,
  p_incrs      jsonb default '{}'::jsonb,
  p_unions     jsonb default '{}'::jsonb
)
returns public.fs_documents
language plpgsql
as $$
declare
  d    jsonb;
  k    text;
  v    jsonb;
  path text[];
  cur  jsonb;
  r    public.fs_documents;
begin
  select data into d from public.fs_documents where collection = p_collection and doc_id = p_id;
  if d is null then
    d := '{}'::jsonb;
  end if;

  for k, v in select * from jsonb_each(coalesce(p_sets, '{}'::jsonb)) loop
    path := string_to_array(k, '.');
    d := public.jsonb_set_deep(d, path, v);
  end loop;

  for k, v in select * from jsonb_each(coalesce(p_incrs, '{}'::jsonb)) loop
    path := string_to_array(k, '.');
    cur := d #> path;
    d := public.jsonb_set_deep(
           d,
           path,
           to_jsonb(
             coalesce(nullif(cur #>> '{}', '')::numeric, 0)
             + coalesce(nullif(v #>> '{}', '')::numeric, 0)
           )
         );
  end loop;

  for k, v in select * from jsonb_each(coalesce(p_unions, '{}'::jsonb)) loop
    path := string_to_array(k, '.');
    cur := d #> path;
    if cur is null or jsonb_typeof(cur) <> 'array' then
      cur := '[]'::jsonb;
    end if;
    if not (cur @> jsonb_build_array(v)) then
      cur := cur || jsonb_build_array(v);
    end if;
    d := public.jsonb_set_deep(d, path, cur);
  end loop;

  insert into public.fs_documents as t (collection, doc_id, data, created_at, updated_at)
  values (p_collection, p_id, d, now(), now())
  on conflict (collection, doc_id) do update
    set data = excluded.data, updated_at = now()
  returning * into r;
  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- query: collection read with optional ordering by a (numeric) JSONB field + limit.
-- Mirrors orderBy("time","desc").limit(N) used by the log/leaderboard feeds.
-- For unordered reads the shim selects via PostgREST directly.
-- ---------------------------------------------------------------------------
create or replace function public.fs_query(
  p_collection   text,
  p_order_field  text    default null,
  p_desc         boolean default true,
  p_limit        int     default 200
)
returns setof public.fs_documents
language plpgsql
stable
as $$
begin
  if p_order_field is null then
    return query
      select * from public.fs_documents
      where collection = p_collection
      limit greatest(p_limit, 0);
  else
    return query execute format(
      'select * from public.fs_documents where collection = $1
         order by (data ->> %L)::numeric %s nulls last
         limit $2',
      p_order_field,
      case when p_desc then 'desc' else 'asc' end
    ) using p_collection, greatest(p_limit, 0);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security.
--
-- The game today is "client-trusted": every browser writes Firestore documents
-- directly (keyed by callsign, not by an auth UID), guarded only by anonymous
-- Firebase auth + ad-hoc client checks. To preserve EXISTING behavior 1:1, these
-- policies allow the anon/authenticated roles full access to fs_documents.
--
-- SECURITY NOTE: this is intentionally as permissive as Firestore is today and is
-- NOT a hardening step. Tightening (per-row ownership, server-only writes via the
-- game-api Edge Function with ctx.supabaseAdmin) should be done as a follow-up; see
-- the commented stricter template below and supabase/README.md.
-- ---------------------------------------------------------------------------
alter table public.fs_documents enable row level security;

-- Table-level privileges. RLS governs WHICH rows, but the API roles still need base
-- table privileges to touch it at all. Tables created via raw SQL (vs. the dashboard) do
-- NOT get these automatically, so grant them explicitly. (SECURITY INVOKER RPCs below also
-- rely on these, since they run with the caller's rights.)
grant select, insert, update, delete on public.fs_documents to anon, authenticated;

drop policy if exists "fs_documents anon read"   on public.fs_documents;
drop policy if exists "fs_documents anon write"   on public.fs_documents;
drop policy if exists "fs_documents anon modify"  on public.fs_documents;
drop policy if exists "fs_documents anon delete"  on public.fs_documents;

create policy "fs_documents anon read"
  on public.fs_documents for select
  to anon, authenticated
  using (true);

create policy "fs_documents anon write"
  on public.fs_documents for insert
  to anon, authenticated
  with check (true);

create policy "fs_documents anon modify"
  on public.fs_documents for update
  to anon, authenticated
  using (true) with check (true);

create policy "fs_documents anon delete"
  on public.fs_documents for delete
  to anon, authenticated
  using (true);

-- The RPC helpers run with the caller's rights (SECURITY INVOKER by default), so the
-- policies above also govern fs_set/fs_update/fs_query. Allow the API roles to call them.
grant execute on function public.jsonb_deep_merge(jsonb, jsonb) to anon, authenticated;
grant execute on function public.jsonb_set_deep(jsonb, text[], jsonb) to anon, authenticated;
grant execute on function public.fs_set(text, text, jsonb, boolean) to anon, authenticated;
grant execute on function public.fs_update(text, text, jsonb, jsonb, jsonb) to anon, authenticated;
grant execute on function public.fs_query(text, text, boolean, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: onSnapshot is backed by Postgres change events on this table.
-- REPLICA IDENTITY FULL ensures UPDATE/DELETE payloads include the row so the shim
-- can route changes to the right collection/doc listeners.
-- ---------------------------------------------------------------------------
alter table public.fs_documents replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.fs_documents;
    exception
      when duplicate_object then null;  -- already in the publication
    end;
  end if;
end;
$$;
