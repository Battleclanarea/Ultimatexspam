// Regression test for admin RESOURCE GRANTS (bag / vault / score / soul) delivering to the
// target reliably and repeatedly, over the REAL firestore-shim + an in-memory backend.
//
// The bug: bag (and other) grants could fail to reach the player. Root cause found via runtime
// repro: a grant is an atomic increment on the target's cloud doc (pendingBagGold, etc.). The
// target's CLEAR of that pending (increment(-amt)) hit a field its live-sync cache did not know,
// so liveEcho fabricated a bogus value (e.g. pendingBagGold = -amt) into the cache. That poisoned
// value then (a) masked the true DB value in the cache-overlaid getDoc and (b) was re-delivered via
// onSnapshot and SUBTRACTED the grant right back out -> the player "never received the gold".
//
// Fixes (both verified here):
//   1. liveEcho skips echoing an increment whose base is unknown in the cache (DB stays authoritative).
//   2. getDocRaw() reads the durable DB row with NO cache overlay, used by the grant claimer.
//
// Run: node test-resource-grants.mjs

import { createFirestoreCompat } from "./supabase/web/firestore-shim.js";
import fs from "fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function deepMerge(a, b) { if (a === null || typeof a !== "object" || Array.isArray(a)) return b; if (b === null || typeof b !== "object" || Array.isArray(b)) return b; const o = { ...a }; for (const k of Object.keys(b)) o[k] = k in o ? deepMerge(o[k], b[k]) : b[k]; return o; }
const STORE = new Map(), BUS = new Map(); const K = (c, i) => c + "\u0000" + i;
function makeClient() {
  function rpc(fn, p) {
    if (fn === "fs_set") { const k = K(p.p_collection, p.p_id); const prev = STORE.get(k); STORE.set(k, JSON.parse(JSON.stringify(p.p_merge && prev ? deepMerge(prev, p.p_data) : p.p_data))); return Promise.resolve({ data: null, error: null }); }
    if (fn === "fs_update") { const k = K(p.p_collection, p.p_id); const cur = JSON.parse(JSON.stringify(STORE.get(k) || {})); const setP = (o, path, v) => { const ks = path.split("."); let n = o; for (let i = 0; i < ks.length - 1; i++) { if (typeof n[ks[i]] !== "object" || n[ks[i]] == null) n[ks[i]] = {}; n = n[ks[i]]; } n[ks[ks.length - 1]] = v; }; const getP = (o, path) => path.split(".").reduce((x, kk) => (x == null ? undefined : x[kk]), o); Object.entries(p.p_sets || {}).forEach(([pp, v]) => setP(cur, pp, v)); Object.entries(p.p_incrs || {}).forEach(([pp, n]) => setP(cur, pp, (Number(getP(cur, pp)) || 0) + n)); STORE.set(k, cur); return Promise.resolve({ data: null, error: null }); }
    return Promise.resolve({ data: null, error: null });
  }
  function from() { const q = { _coll: null, _id: null }; const api = { select() { return api; }, eq(c, v) { if (c === "collection") q._coll = v; else if (c === "doc_id") q._id = v; return api; }, maybeSingle() { const row = STORE.get(K(q._coll, q._id)); return Promise.resolve({ data: row ? { doc_id: q._id, data: row } : null, error: null }); }, then(res) { const rows = [...STORE.entries()].filter(([k]) => k.startsWith(q._coll + "\u0000")).map(([k, d]) => ({ doc_id: k.split("\u0000")[1], data: d })); return Promise.resolve({ data: rows, error: null }).then(res); } }; return api; }
  function channel(name, opts) { const self = !!(opts && opts.config && opts.config.broadcast && opts.config.broadcast.self); const inst = { name, self, _bc: null }; inst.on = (t, a, b) => { if (t === "broadcast") inst._bc = b; return inst; }; inst.subscribe = (cb) => { if (!BUS.has(name)) BUS.set(name, new Set()); BUS.get(name).add(inst); cb && cb("SUBSCRIBED"); return inst; }; inst.send = (msg) => { const subs = BUS.get(name); if (!subs) return Promise.resolve("ok"); for (const s of subs) { if (s === inst && !inst.self) continue; if (s._bc) { try { s._bc(msg); } catch (e) {} } } return Promise.resolve("ok"); }; return inst; }
  function removeChannel(ch) { const s = BUS.get(ch.name); if (s) s.delete(ch); }
  return createFirestoreCompat({ rpc, from, channel, removeChannel, auth: {} });
}

let failures = 0;
const ok = (c, m) => { if (c) console.log("  \u2713 " + m); else { console.error("  \u2717 " + m); failures++; } };

async function main() {
  globalThis.__BCA_LIVE_SYNC = { bca_users: { persistMs: 800, broadcastMs: 100, reconcileMs: 100000 }, bca_presence: { persistMs: 800, broadcastMs: 100 } };
  const admin = makeClient().fs;   // grants to others
  const target = makeClient().fs;  // the receiving player

  ok(typeof target.getDocRaw === "function", "shim exposes getDocRaw (raw DB read, no cache overlay)");

  // structural guards on the source wiring
  const fsSrc = fs.readFileSync(new URL("./supabase/web/firestore-shim.js", import.meta.url), "utf8");
  ok(fsSrc.includes("if (rawB === undefined || rawB === null) continue;"), "liveEcho skips fabricating an increment when its base is unknown");
  ok(fsSrc.includes("getDocRaw,") && fsSrc.includes("async function getDocRaw"), "getDocRaw is defined and exported on the fs bundle");
  const idxSrc = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
  ok(idxSrc.includes("(fs.getDocRaw || fs.getDoc)(ref)"), "grant claimer reads pending via getDocRaw");
  ok(idxSrc.includes("setInterval(pollPending, 2000)"), "grant poll runs every ~2s (near-instant delivery)");

  const p = { id: "LEAFY", gold: 0, bag: { gold: 0 } };
  STORE.set(K("bca_users", "LEAFY"), { id: "LEAFY", gold: 0, bag: { gold: 0 } });

  // The game's grant-claim (watcher applyPending), faithfully reproduced.
  let busy = false;
  const ref = target.doc(null, "bca_users", "LEAFY");
  async function applyPending(d) {
    if (!d) return; const pg = +d.pendingGold || 0, pb = +d.pendingBagGold || 0;
    if (pg === 0 && pb === 0) return; if (busy) return; busy = true;
    try {
      if (pg !== 0) p.gold = Math.max(0, (p.gold || 0) + pg);
      if (pb !== 0) { if (!p.bag) p.bag = { gold: 0 }; p.bag.gold = Math.max(0, (p.bag.gold || 0) + pb); }
      const upd = {};
      if (pg !== 0) { upd.gold = p.gold; upd.pendingGold = target.increment(-pg); }
      if (pb !== 0) { upd.bag = { gold: p.bag.gold }; upd.pendingBagGold = target.increment(-pb); }
      await target.setDoc(ref, upd, { merge: true });
    } finally { busy = false; }
  }
  // watcher: live snapshot + raw poll (the two claim paths in index.html)
  target.onSnapshot(ref, (snap) => { try { applyPending(snap.exists() ? snap.data() : null); } catch (e) {} });
  const poll = async () => { const s = await target.getDocRaw(ref); if (s.exists()) await applyPending(s.data()); };
  await sleep(40);

  // The exact write giveResource() performs for a grant to ANOTHER player.
  const grant = (type, amt) => admin.setDoc(admin.doc(null, "bca_users", "LEAFY"), { id: "LEAFY", lastUpdate: Date.now(), [type]: admin.increment(amt) }, { merge: true });

  await grant("pendingBagGold", 1000); await sleep(120); await poll(); await sleep(120);
  ok(p.bag.gold === 1000, `first BAG grant delivered (+1000 -> ${p.bag.gold})`);

  await grant("pendingBagGold", 500); await sleep(120); await poll(); await sleep(120);
  ok(p.bag.gold === 1500, `REPEAT bag grant also delivered (+500 -> ${p.bag.gold}) - no cache masking / no cancel-out`);

  await grant("pendingGold", 700); await sleep(120); await poll(); await sleep(120);
  ok(p.gold === 700, `VAULT grant delivered (+700 -> ${p.gold})`);

  // a deduction (negative bag grant) must also apply
  await grant("pendingBagGold", -200); await sleep(120); await poll(); await sleep(120);
  ok(p.bag.gold === 1300, `bag DEDUCTION delivered (-200 -> ${p.bag.gold})`);

  ok((STORE.get(K("bca_users", "LEAFY")) || {}).pendingBagGold === 0, "pendingBagGold fully cleared in the DB after claims");

  console.log(failures ? `\nFAILED: ${failures}` : "\nALL RESOURCE-GRANT TESTS PASSED.");
  process.exit(failures ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
