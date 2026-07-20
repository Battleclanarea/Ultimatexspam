// Offline regression test for the RECONCILIATION BACKSTOP added to
// supabase/web/firestore-shim.js.
//
// The live-sync collections (bca_users / bca_presence) ride an EPHEMERAL Realtime
// BROADCAST channel with NO postgres_changes fallback. Broadcast is best-effort, so a
// delta can be dropped (poor connection, a reconnect gap, or Supabase coalescing under
// load). Before the fix, a dropped delta left a viewer STUCK on a stale value forever
// unless they manually RELOADED the page — the exact "Zekkerok reads 345K but is really
// 31M" / "Arzeila reads 17M but is 79M after a boost" bug.
//
// This test stands up two clients over a SHARED in-memory Postgres fake + broadcast bus
// where a peer's channel can be MUTED (to simulate a dropped/missed broadcast) and
// RECONNECTED (to simulate a websocket re-subscribe), then proves:
//   1. a missed broadcast self-heals from the DB via the PERIODIC reconcile (no reload);
//   2. a reconnect (re-SUBSCRIBED) triggers an immediate resync from the DB;
//   3. reconcile NEVER downgrades the local player's own un-persisted (fresher) writes.
//
// Run: node supabase/tools/test-reconcile-heal.mjs

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

const STORE = new Map();   // "coll\0id" -> data  (the durable Postgres row)
const BUS = new Map();     // channelName -> Set(channelInstance)
const K = (c, i) => `${c}\u0000${i}`;

function makeClient(clientId) {
  function rpc(fn, params) {
    if (fn === "fs_set") {
      const k = K(params.p_collection, params.p_id);
      const prev = STORE.get(k);
      STORE.set(k, JSON.parse(JSON.stringify(params.p_merge && prev ? deepMerge(prev, params.p_data) : params.p_data)));
      return Promise.resolve({ data: null, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  }

  function from() {
    const q = { _coll: null, _id: null, _op: "select" };
    const api = {
      select() { return api; },
      delete() { q._op = "delete"; return api; },
      eq(col, val) {
        if (col === "collection") q._coll = val; else if (col === "doc_id") q._id = val;
        if (q._op === "delete" && q._coll && q._id) { STORE.delete(K(q._coll, q._id)); return Promise.resolve({ error: null }); }
        return api;
      },
      maybeSingle() { const row = STORE.get(K(q._coll, q._id)); return Promise.resolve({ data: row ? { doc_id: q._id, data: row } : null, error: null }); },
      then(resolve) {
        const rows = [...STORE.entries()].filter(([k]) => k.startsWith(q._coll + "\u0000")).map(([k, data]) => ({ doc_id: k.split("\u0000")[1], data }));
        return Promise.resolve({ data: rows, error: null }).then(resolve);
      },
    };
    return api;
  }

  function channel(name, opts) {
    const self = !!(opts && opts.config && opts.config.broadcast && opts.config.broadcast.self);
    const inst = { name, clientId, self, _bc: null, _muted: false, _subCb: null };
    inst.on = (type, a, b) => { if (type === "broadcast") inst._bc = b; return inst; };
    inst.subscribe = (cb) => { inst._subCb = cb; if (!BUS.has(name)) BUS.set(name, new Set()); BUS.get(name).add(inst); cb && cb("SUBSCRIBED"); return inst; };
    // Test hooks:
    inst._reconnect = () => { inst._subCb && inst._subCb("SUBSCRIBED"); };
    inst.send = (msg) => {
      const subs = BUS.get(name); if (!subs) return Promise.resolve("ok");
      for (const s of subs) { if (s === inst && !inst.self) continue; if (s._muted) continue; if (s._bc) { try { s._bc(msg); } catch (e) {} } }
      return Promise.resolve("ok");
    };
    CHANNELS.push(inst);
    return inst;
  }
  function removeChannel(ch) { const subs = BUS.get(ch.name); if (subs) subs.delete(ch); }

  const supabase = { rpc, from, channel, removeChannel, auth: {} };
  return createFirestoreCompat(supabase);
}
const CHANNELS = [];
function findChannel(clientId, name) { return CHANNELS.find((c) => c.clientId === clientId && c.name === name); }

let failures = 0;
function assert(cond, msg) { if (cond) console.log("  \u2713 " + msg); else { console.error("  \u2717 " + msg); failures++; } }

async function main() {
  // Fast timers so the test runs quickly; production defaults are 12-25s.
  globalThis.__BCA_LIVE_SYNC = {
    bca_users: { persistMs: 1500, broadcastMs: 150, reconcileMs: 400 },
    bca_presence: { persistMs: 1500, broadcastMs: 150, reconcileMs: 400 },
  };

  const A = makeClient("A").fs; // writer (an admin / the scoring player)
  const B = makeClient("B").fs; // viewer (poor internet — will miss a broadcast)

  let bLatest = new Map();
  const unsubB = B.onSnapshot(B.collection(null, "bca_users"), (snap) => { bLatest = new Map(); snap.forEach((d) => bLatest.set(d.id, d.data())); });
  await sleep(40);

  console.log("TEST 1: a MISSED broadcast self-heals from the DB via periodic reconcile (no page reload)");
  await A.setDoc(A.doc(null, "bca_users", "ZEKK"), { id: "ZEKK", score: 345000 }, { merge: true });
  await sleep(250);
  assert(bLatest.get("ZEKK") && bLatest.get("ZEKK").score === 345000, `viewer initially sees the stale-era score (${bLatest.get("ZEKK") && bLatest.get("ZEKK").score})`);

  // Viewer's socket "drops" — every broadcast from now on is lost to B.
  findChannel("B", "bca-sync:bca_users")._muted = true;

  await A.setDoc(A.doc(null, "bca_users", "ZEKK"), { id: "ZEKK", score: 31000000 }, { merge: true });
  await sleep(120); // broadcast already sent (and dropped for B), before any reconcile
  assert(bLatest.get("ZEKK").score === 345000, "right after the dropped broadcast the viewer is STILL stale (would need a reload pre-fix)");

  await sleep(1600); // let A's debounced persist flush 31M to the DB
  assert(STORE.get(K("bca_users", "ZEKK")).score === 31000000, "the true score is durable in Postgres");
  await sleep(500);  // a periodic reconcile tick (reconcileMs=400) on the viewer
  assert(bLatest.get("ZEKK").score === 31000000, `viewer SELF-HEALED to the true score via reconcile, no reload (${bLatest.get("ZEKK").score})`);

  console.log("TEST 2: reconnect (re-SUBSCRIBED) triggers an immediate DB resync");
  // Disable periodic reconcile for a fresh pair so the ONLY heal path is the reconnect.
  globalThis.__BCA_LIVE_SYNC = {
    bca_users: { persistMs: 1200, broadcastMs: 150, reconcileMs: 0 },
    bca_presence: { persistMs: 1200, broadcastMs: 150, reconcileMs: 0 },
  };
  const C = makeClient("C").fs; // writer
  const D = makeClient("D").fs; // viewer whose socket will drop + reconnect
  let dLatest = new Map();
  const unsubD = D.onSnapshot(D.collection(null, "bca_users"), (snap) => { dLatest = new Map(); snap.forEach((d) => dLatest.set(d.id, d.data())); });
  await sleep(40);

  await C.setDoc(C.doc(null, "bca_users", "ARZ"), { id: "ARZ", score: 17000000 }, { merge: true });
  await sleep(200);
  assert(dLatest.get("ARZ") && dLatest.get("ARZ").score === 17000000, "viewer sees the pre-boost score");

  const dCh = findChannel("D", "bca-sync:bca_users");
  dCh._muted = true; // socket dropped
  await C.setDoc(C.doc(null, "bca_users", "ARZ"), { id: "ARZ", score: 79000000 }, { merge: true }); // the ONE-TIME boost write, lost to D
  await sleep(1400); // boost persists to the DB; D misses the broadcast
  assert(dLatest.get("ARZ").score === 17000000, "with periodic reconcile OFF the viewer stays stuck on the pre-boost score");

  dCh._muted = false;
  dCh._reconnect(); // websocket re-SUBSCRIBED
  await sleep(200);  // reconcile read + emit-throttle
  assert(dLatest.get("ARZ").score === 79000000, `reconnect re-synced the viewer to the boosted score (${dLatest.get("ARZ").score})`);

  console.log("TEST 3: reconcile NEVER downgrades the local player's own un-persisted (fresher) writes");
  globalThis.__BCA_LIVE_SYNC = {
    bca_users: { persistMs: 4000, broadcastMs: 150, reconcileMs: 400 },
    bca_presence: { persistMs: 4000, broadcastMs: 150, reconcileMs: 400 },
  };
  const E = makeClient("E").fs; // a player writing their own live score
  const unsubE = E.onSnapshot(E.collection(null, "bca_users"), () => {});
  await sleep(40);
  await E.setDoc(E.doc(null, "bca_users", "SELFW"), { id: "SELFW", score: 5000000 }, { merge: true });
  await sleep(900); // several reconcile ticks fire while SELFW is still un-persisted (persistMs=4000)
  assert(STORE.get(K("bca_users", "SELFW")) === undefined, "own write is still debouncing (not yet in the DB) — the guard must apply here");
  const selfSnap = await E.getDoc(E.doc(null, "bca_users", "SELFW"));
  assert(selfSnap.exists() && selfSnap.data().score === 5000000, `reconcile left the local player's fresher score intact (${selfSnap.data().score})`);

  unsubB(); unsubD(); unsubE();
  console.log(failures ? `\nFAILED: ${failures} assertion(s).` : "\nALL RECONCILE-HEAL TESTS PASSED.");
  process.exit(failures ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
