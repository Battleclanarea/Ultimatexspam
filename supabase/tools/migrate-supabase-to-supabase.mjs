#!/usr/bin/env node
// One-time ETL: copy the game's live data from the OLD Supabase project (unpaid, being
// retired) into the NEW Supabase project, `fs_documents` -> `fs_documents`.
//
// Both sides use only PUBLISHABLE (anon) keys via PostgREST — the firestore-compat
// migration's permissive RLS + grants make that sufficient. No secrets required.
//
// PREREQUISITE: the target project must already have the firestore-compat schema
// (run supabase/migrations/20260629000000_firestore_compat.sql in its SQL Editor first).
// The tool checks and tells you if it is missing.
//
// Safe to re-run: upserts on (collection, doc_id) conflict (idempotent). Rows keep their
// original created_at/updated_at timestamps.
//
// Usage:
//   node supabase/tools/migrate-supabase-to-supabase.mjs --dry-run   # counts only
//   node supabase/tools/migrate-supabase-to-supabase.mjs             # copy everything
//   node supabase/tools/migrate-supabase-to-supabase.mjs --only=bca_users,bca_system
//   LOG_LIMIT=0 node supabase/tools/migrate-supabase-to-supabase.mjs # FULL log history

const OLD_URL = process.env.OLD_SUPABASE_URL || "https://sbvnjguruzmexmamorlv.supabase.co";
const OLD_KEY = process.env.OLD_SUPABASE_KEY || "sb_publishable_zNJWXu6dlChngw72NHARNA_XUh1kpX7";
const NEW_URL = process.env.NEW_SUPABASE_URL || "https://gxixfhmcladslsjdffdy.supabase.co";
const NEW_KEY = process.env.NEW_SUPABASE_KEY || "sb_publishable_EcdFOh9ZvBPwwq89LTonrA_3jIXFbC4";

// bca_global_logs is an unbounded append-only feed; the game only renders the recent tail,
// so by default only the most recent LOG_LIMIT entries are copied (0 = copy ALL).
const LOG_LIMIT = process.env.LOG_LIMIT != null ? Number(process.env.LOG_LIMIT) : 20000;

const PAGE = 1000; // PostgREST default max-rows page size

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const onlyArg = args.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? onlyArg.split("=")[1].split(",") : null;

function headers(key, extra) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function rest(base, key, path, init = {}) {
  const res = await fetch(`${base}/rest/v1/${path}`, {
    ...init, headers: headers(key, { "Content-Type": "application/json", ...(init.headers || {}) }),
  });
  return res;
}

async function exactCount(base, key, filter) {
  const res = await rest(base, key, `fs_documents?select=doc_id${filter ? `&${filter}` : ""}`, {
    method: "HEAD", headers: { Prefer: "count=exact", Range: "0-0" },
  });
  if (!res.ok && res.status !== 206) throw new Error(`count: HTTP ${res.status} ${await res.text()}`);
  const range = res.headers.get("content-range") || "";
  return Number(range.split("/")[1] || 0);
}

// Distinct collections present in the source (paged scan of the collection column would be
// heavy; instead query each page ordered by collection and jump with gt filters).
async function listCollections() {
  const out = [];
  let last = "";
  for (;;) {
    const filter = last ? `&collection=gt.${encodeURIComponent(last)}` : "";
    const res = await rest(OLD_URL, OLD_KEY, `fs_documents?select=collection&order=collection.asc&limit=1${filter}`);
    if (!res.ok) throw new Error(`list collections: HTTP ${res.status} ${await res.text()}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(rows[0].collection);
    last = rows[0].collection;
  }
  return out;
}

// Keyset-paginated full read of one collection (stable even if rows change mid-copy).
async function* readCollection(coll) {
  let lastId = null;
  for (;;) {
    const idFilter = lastId != null ? `&doc_id=gt.${encodeURIComponent(lastId)}` : "";
    const res = await rest(
      OLD_URL, OLD_KEY,
      `fs_documents?select=collection,doc_id,data,created_at,updated_at` +
      `&collection=eq.${encodeURIComponent(coll)}${idFilter}&order=doc_id.asc&limit=${PAGE}`,
    );
    if (!res.ok) throw new Error(`read ${coll}: HTTP ${res.status} ${await res.text()}`);
    const rows = await res.json();
    for (const r of rows) yield r;
    if (rows.length < PAGE) break;
    lastId = rows[rows.length - 1].doc_id;
  }
}

// Most-recent-N read of the huge log feed. Plain PostgREST ordering on `data->>time`
// (text) cannot use the numeric expression index and TIMES OUT on the real feed, so this
// goes through the fs_query RPC, whose `(data->>'time')::numeric` order matches
// fs_documents_time_idx. PostgREST caps each response at ~1000 rows, so page with
// limit/offset over the RPC result.
async function* readRecentLogs(coll, max) {
  let got = 0;
  while (got < max) {
    const limit = Math.min(PAGE, max - got);
    const res = await rest(OLD_URL, OLD_KEY, `rpc/fs_query?limit=${limit}&offset=${got}`, {
      method: "POST",
      body: JSON.stringify({ p_collection: coll, p_order_field: "time", p_desc: true, p_limit: max }),
    });
    if (!res.ok) throw new Error(`read ${coll}: HTTP ${res.status} ${await res.text()}`);
    const rows = await res.json();
    for (const { collection, doc_id, data, created_at, updated_at } of rows) {
      yield { collection, doc_id, data, created_at, updated_at };
    }
    got += rows.length;
    if (rows.length < limit) break;
  }
}

async function upsertBatch(rows) {
  if (DRY_RUN || rows.length === 0) return;
  const res = await rest(NEW_URL, NEW_KEY, "fs_documents", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`target upsert: HTTP ${res.status} ${await res.text()}`);
}

(async () => {
  console.log(`ETL ${OLD_URL} -> ${NEW_URL} (fs_documents)${DRY_RUN ? " [DRY RUN]" : ""}`);

  // Preflight: target must have the firestore-compat schema.
  const probe = await rest(NEW_URL, NEW_KEY, "fs_documents?select=doc_id&limit=1");
  if (probe.status === 404 || probe.status === 401) {
    const msg =
      `TARGET NOT READY (HTTP ${probe.status}): the new project has no accessible fs_documents table.\n` +
      `Apply supabase/migrations/20260629000000_firestore_compat.sql to ${NEW_URL}\n` +
      `(dashboard SQL Editor, or \`supabase link --project-ref <ref> && supabase db push\`), then re-run.`;
    if (!DRY_RUN) { console.error(`\n${msg}`); process.exit(2); }
    console.warn(`\nWARNING (dry run continues): ${msg}\n`);
  } else if (!probe.ok) {
    throw new Error(`target probe: HTTP ${probe.status} ${await probe.text()}`);
  }

  const collections = (await listCollections()).filter((c) => !ONLY || ONLY.includes(c));
  console.log(`Source collections: ${collections.join(", ") || "(none)"}`);

  let grand = 0;
  for (const coll of collections) {
    const capped = coll === "bca_global_logs" && LOG_LIMIT > 0;
    const source = capped ? readRecentLogs(coll, LOG_LIMIT) : readCollection(coll);
    let batch = [], count = 0;
    try {
      for await (const row of source) {
        batch.push(row);
        count++;
        if (batch.length >= 200) { await upsertBatch(batch); batch = []; }
      }
      await upsertBatch(batch);
      const targetCount = DRY_RUN ? null : await exactCount(NEW_URL, NEW_KEY, `collection=eq.${encodeURIComponent(coll)}`);
      console.log(
        `  ${coll}: ${count} docs${capped ? ` (capped to most recent ${LOG_LIMIT})` : ""}` +
        (DRY_RUN ? " (not written)" : ` copied — target now has ${targetCount}`),
      );
      grand += count;
    } catch (e) {
      console.error(`  ${coll}: ERROR ${e.message}`);
      process.exitCode = 1;
    }
  }
  console.log(`Done. ${grand} documents${DRY_RUN ? " seen" : " upserted"}.`);
})().catch((e) => { console.error(e); process.exit(1); });
