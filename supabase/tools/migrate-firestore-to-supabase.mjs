#!/usr/bin/env node
// One-time ETL: copy the game's existing Firestore data (Firebase project bca-world96)
// into the Supabase `fs_documents` table created by the Firestore-compat migration.
//
// It authenticates to Firebase with the SAME public web API key the browser uses
// (anonymous sign-in), reads every collection via the Firestore REST API, converts the
// typed-value documents to plain JSON, and bulk-upserts them into Supabase via PostgREST.
//
// Safe to re-run: upserts on (collection, doc_id) conflict (idempotent). No secrets are
// required or embedded beyond the already-public web API key / publishable key.
//
// Usage:  node supabase/tools/migrate-firestore-to-supabase.mjs [--dry-run] [--only=bca_users,bca_system]

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyCZE4GgVty1nly6EJbKhMjmtC468th1xvw";
const FIREBASE_PROJECT = process.env.FIREBASE_PROJECT || "bca-world96";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://sbvnjguruzmexmamorlv.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_zNJWXu6dlChngw72NHARNA_XUh1kpX7";

// Every collection the game uses (see supabase/README.md migration map).
const COLLECTIONS = [
  "bca_users", "bca_system", "bca_global_logs", "bca_presence", "bca_arena", "bca_duels",
  "bca_admin_boosts", "bca_travel_events", "bca_travel_orders", "bca_gifts", "bca_carry", "bca_tool_grants",
];

// bca_global_logs is an unbounded append-only feed (hundreds of thousands of rows). The game
// only renders the recent tail (orderBy time desc), so we import just the most recent LOG_LIMIT
// entries instead of the entire legacy history. Raise LOG_LIMIT (or set it to 0 for ALL) if you
// truly need the full audit history; older rows remain in Firebase regardless.
const LOG_LIMIT = process.env.LOG_LIMIT != null ? Number(process.env.LOG_LIMIT) : 20000;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const onlyArg = args.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? onlyArg.split("=")[1].split(",") : null;

const FS_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

function convertValue(v) {
  if (v == null) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return Date.parse(v.timestampValue);
  if ("mapValue" in v) return convertFields(v.mapValue.fields || {});
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(convertValue);
  if ("referenceValue" in v) return v.referenceValue;
  if ("geoPointValue" in v) return v.geoPointValue;
  if ("bytesValue" in v) return v.bytesValue;
  return null;
}
function convertFields(fields) {
  const out = {};
  for (const [k, val] of Object.entries(fields)) out[k] = convertValue(val);
  return out;
}

async function getIdToken() {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ returnSecureToken: true }),
  });
  const j = await res.json();
  if (!j.idToken) throw new Error("Firebase anonymous sign-in failed: " + JSON.stringify(j));
  return j.idToken;
}

async function* listDocs(collection, token) {
  let pageToken = "";
  do {
    const url = `${FS_BASE}/${collection}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Firestore list ${collection}: HTTP ${res.status} ${await res.text()}`);
    const j = await res.json();
    for (const d of j.documents || []) {
      yield { doc_id: d.name.split("/").pop(), data: convertFields(d.fields || {}) };
    }
    pageToken = j.nextPageToken || "";
  } while (pageToken);
}

// Recent-N read for the huge log feed via a Firestore structured query (orderBy time desc).
async function* listRecentLogs(collection, token, max) {
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        orderBy: [{ field: { fieldPath: "time" }, direction: "DESCENDING" }],
        limit: max,
      },
    }),
  });
  if (!res.ok) throw new Error(`Firestore runQuery ${collection}: HTTP ${res.status} ${await res.text()}`);
  const arr = await res.json();
  for (const entry of arr) {
    if (!entry.document) continue;
    yield { doc_id: entry.document.name.split("/").pop(), data: convertFields(entry.document.fields || {}) };
  }
}

async function upsertBatch(rows) {
  if (DRY_RUN || rows.length === 0) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/fs_documents`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Supabase upsert: HTTP ${res.status} ${await res.text()}`);
}

(async () => {
  console.log(`ETL ${FIREBASE_PROJECT} (Firestore) -> ${SUPABASE_URL} (fs_documents)${DRY_RUN ? " [DRY RUN]" : ""}`);
  const token = await getIdToken();
  let grand = 0;
  for (const coll of COLLECTIONS) {
    if (ONLY && !ONLY.includes(coll)) continue;
    let batch = [], count = 0;
    const capped = coll === "bca_global_logs" && LOG_LIMIT > 0;
    const source = capped ? listRecentLogs(coll, token, LOG_LIMIT) : listDocs(coll, token);
    try {
      for await (const { doc_id, data } of source) {
        batch.push({ collection: coll, doc_id, data });
        count++;
        if (batch.length >= 200) { await upsertBatch(batch); batch = []; }
      }
      await upsertBatch(batch);
      console.log(`  ${coll}: ${count} docs${capped ? ` (capped to most recent ${LOG_LIMIT})` : ""}${DRY_RUN ? " (not written)" : " migrated"}`);
      grand += count;
    } catch (e) {
      console.error(`  ${coll}: ERROR ${e.message}`);
    }
  }
  console.log(`Done. ${grand} documents${DRY_RUN ? " seen" : " upserted"}.`);
})().catch((e) => { console.error(e); process.exit(1); });
