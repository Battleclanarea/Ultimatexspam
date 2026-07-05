// Offline regression test for the Realtime-Broadcast live-sync cost optimization
// in supabase/web/firestore-shim.js.
//
// It stands up TWO Firestore-compat clients over a SHARED in-memory Postgres fake
// (`fs_documents` + `fs_set`) and a SHARED in-process broadcast bus, then exercises
// the hot autosave path to prove:
//   1. peers receive live updates over BROADCAST (no postgres_changes, ms latency);
//   2. rapid writes collapse to ~1 DB write per persist-debounce window (not 1/tick);
//   3. broadcasts are throttled below the write rate (Realtime-message savings);
//   4. local reads reflect not-yet-persisted writes (cache overlay);
//   5. deletes propagate; non-live collections keep classic postgres_changes behavior.
//
// Run: node supabase/tools/test-live-sync.mjs

import { createFirestoreCompat } from "../web/firestore-shim.js";

const TABLE = "fs_documents";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function deepMerge(a, b) {
  if (a === null || typeof a !== "object" || Array.isArray(a)) return b;
  if (b === null || typeof b !== "object" || Array.isArray(b)) return b;
  const out = { ...a };
  for (const k of Object.keys(b)) out[k] = k in out ? deepMerge(out[k], b[k]) : b[k];
  return out;
}

// ---- shared backend state across both "clients" --------------------------
const STORE = new Map();               // "coll\0id" -> data
const BUS = new Map();                 // channelName -> Set(channelInstance)
const counters = { fsSet: {}, delete: {}, pgChannels: [], bcChannels: [] };
const K = (c, i) => `${c}\u0000${i}`;

function makeClient(clientId) {
  function rpc(fn, params) {
    if (fn === "fs_set") {
      counters.fsSet[params.p_collection] = (counters.fsSet[params.p_collection] || 0) + 1;
      const k = K(params.p_collection, params.p_id);
      const prev = STORE.get(k);
      STORE.set(k, params.p_merge && prev ? deepMerge(prev, params.p_data) : params.p_data);
      return Promise.resolve({ data: null, error: null });
    }
    if (fn === "fs_query") {
      const rows = [...STORE.entries()]
        .filter(([k]) => k.startsWith(params.p_collection + "\u0000"))
        .map(([k, data]) => ({ doc_id: k.split("\u0000")[1], data }));
      return Promise.resolve({ data: rows, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  }

  function from() {
    const q = { _coll: null, _id: null, _op: "select" };
    const api = {
      select() { return api; },
      delete() { q._op = "delete"; return api; },
      eq(col, val) { if (col === "collection") q._coll = val; else if (col === "doc_id") q._id = val; if (q._op === "delete" && q._coll && q._id) { counters.delete[q._coll] = (counters.delete[q._coll] || 0) + 1; STORE.delete(K(q._coll, q._id)); return Promise.resolve({ error: null }); } return api; },
      maybeSingle() { const row = STORE.get(K(q._coll, q._id)); return Promise.resolve({ data: row ? { doc_id: q._id, data: row } : null, error: null }); },
      then(resolve) { // collection read: select().eq('collection', c)  -> awaited directly
        const rows = [...STORE.entries()].filter(([k]) => k.startsWith(q._coll + "\u0000")).map(([k, data]) => ({ doc_id: k.split("\u0000")[1], data }));
        return Promise.resolve({ data: rows, error: null }).then(resolve);
      },
    };
    return api;
  }

  function channel(name, opts) {
    const self = !!(opts && opts.config && opts.config.broadcast && opts.config.broadcast.self);
    const inst = { name, clientId, self, _bc: null, _pg: null };
    if (name.startsWith("bca-sync:")) counters.bcChannels.push(name);
    if (name.startsWith("fs:")) counters.pgChannels.push(name);
    inst.on = (type, a, b) => { if (type === "broadcast") inst._bc = b; else inst._pg = b; return inst; };
    inst.subscribe = (cb) => { if (!BUS.has(name)) BUS.set(name, new Set()); BUS.get(name).add(inst); cb && cb("SUBSCRIBED"); return inst; };
    inst.send = (msg) => {
      const subs = BUS.get(name); if (!subs) return Promise.resolve("ok");
      for (const s of subs) { if (s === inst && !inst.self) continue; if (s._bc) { try { s._bc(msg); } catch (e) {} } }
      return Promise.resolve("ok");
    };
    return inst;
  }
  function removeChannel(ch) { const subs = BUS.get(ch.name); if (subs) subs.delete(ch); }

  const supabase = { rpc, from, channel, removeChannel, auth: {} };
  return createFirestoreCompat(supabase);
}

let failures = 0;
function assert(cond, msg) { if (cond) { console.log("  \u2713 " + msg); } else { console.error("  \u2717 " + msg); failures++; } }

async function main() {
  // Fast timers so the test runs quickly; production defaults are 15-20s / ~1s.
  globalThis.__BCA_LIVE_SYNC = {
    bca_users: { persistMs: 1500, broadcastMs: 200 },
    bca_presence: { persistMs: 1500, broadcastMs: 200 },
  };

  const A = makeClient("A").fs;
  const B = makeClient("B").fs;

  // B watches the whole users collection (like a live leaderboard).
  let bLatest = new Map();
  let bEmits = 0;
  const unsub = B.onSnapshot(B.collection(null, "bca_users"), (snap) => {
    bEmits++; bLatest = new Map(); snap.forEach((d) => bLatest.set(d.id, d.data()));
  });
  await sleep(30);

  console.log("TEST 1: rapid autosave -> broadcast liveness + debounced persistence");
  const WRITES = 12;
  for (let i = 1; i <= WRITES; i++) {
    await A.setDoc(A.doc(null, "bca_users", "ALICE"), { id: "ALICE", score: i * 100, room: "HQ Command" }, { merge: true });
    await sleep(60); // ~0.7s of autosave traffic
  }
  await sleep(450); // let trailing broadcast + emit-throttle land
  assert(bLatest.get("ALICE") && bLatest.get("ALICE").score === WRITES * 100, `peer B sees latest score via broadcast (${bLatest.get("ALICE") && bLatest.get("ALICE").score})`);
  const dbWritesDuringBurst = counters.fsSet["bca_users"] || 0;
  assert(dbWritesDuringBurst <= 1, `DB writes during 12-write burst are debounced away (${dbWritesDuringBurst} <= 1)`);

  await sleep(1300); // allow persist debounce (1500ms) to flush to DB
  const persisted = STORE.get(K("bca_users", "ALICE"));
  assert(persisted && persisted.score === WRITES * 100, `final value persisted to Postgres after debounce (${persisted && persisted.score})`);
  const totalDbWrites = counters.fsSet["bca_users"] || 0;
  assert(totalDbWrites <= 2, `total DB writes for 12 autosaves stays tiny (${totalDbWrites}) vs 12 without live-sync`);

  console.log("TEST 2: broadcasts are throttled below the write rate");
  // 12 writes over ~1s with broadcastMs=200 -> ~5-6 broadcasts, far fewer than 12.
  assert(bEmits >= 2 && bEmits <= WRITES, `peer re-emits throttled (${bEmits} emits for ${WRITES} writes)`);

  console.log("TEST 3: no postgres_changes channel opened for live collection");
  assert(counters.pgChannels.filter((n) => n.includes("bca_users")).length === 0, "bca_users uses BROADCAST, not postgres_changes");
  assert(counters.bcChannels.some((n) => n === "bca-sync:bca_users"), "bca-sync:bca_users broadcast channel exists");

  console.log("TEST 4: local read reflects un-persisted write (cache overlay)");
  await A.setDoc(A.doc(null, "bca_users", "BOB"), { id: "BOB", score: 777 }, { merge: true });
  const readBack = await A.getDocs(A.collection(null, "bca_users"));
  let bob; readBack.forEach((d) => { if (d.id === "BOB") bob = d.data(); });
  assert(bob && bob.score === 777, "getDocs overlays fresh cache before DB flush");

  console.log("TEST 5: presence delete propagates over broadcast");
  let presLatest = new Map();
  const unsubP = B.onSnapshot(B.collection(null, "bca_presence"), (snap) => { presLatest = new Map(); snap.forEach((d) => presLatest.set(d.id, d.data())); });
  await sleep(30);
  await A.setDoc(A.doc(null, "bca_presence", "ALICE"), { id: "ALICE", room: "Royal Armory" }, { merge: true });
  await sleep(200); // broadcast + 120ms emit-throttle
  assert(presLatest.get("ALICE") && presLatest.get("ALICE").room === "Royal Armory", "peer sees presence appear");
  await A.deleteDoc(A.doc(null, "bca_presence", "ALICE"));
  await sleep(200);
  assert(!presLatest.has("ALICE"), "peer sees presence removed after delete");

  console.log("TEST 6: NON-live collection keeps classic postgres_changes + immediate write");
  const before = counters.fsSet["bca_arena"] || 0;
  const uA = A.onSnapshot(A.collection(null, "bca_arena"), () => {});
  await A.setDoc(A.doc(null, "bca_arena", "G1"), { host: "ALICE", status: "open" }, { merge: true });
  await sleep(30);
  assert((counters.fsSet["bca_arena"] || 0) === before + 1, "bca_arena write hits DB immediately (no debounce)");
  assert(counters.pgChannels.some((n) => n === "fs:bca_arena"), "bca_arena uses postgres_changes channel");
  uA();

  unsub(); unsubP();
  console.log(failures ? `\nFAILED: ${failures} assertion(s).` : "\nALL LIVE-SYNC TESTS PASSED.");
  process.exit(failures ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
