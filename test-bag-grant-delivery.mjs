// Faithful repro of admin BAG-GOLD grants over the REAL firestore-shim, modelling the two
// real-world flows: (A) target ONLINE with a live cache + a full-profile absolute autosave +
// both claim paths; (B) target OFFLINE at grant time, then logs in (login-load claim + poll).
// Goal: find where the 55M bag grant is lost.
import { createFirestoreCompat } from "./supabase/web/firestore-shim.js";
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
let failures = 0; const ok = (c, m) => { if (c) console.log("  \u2713 " + m); else { console.error("  \u2717 " + m); failures++; } };

// Faithful copy of the NEW index.html _selfGrantWatch applyPending (atomic dotted claim).
function makeApplyPending(fs, refFor, profile, flags) {
  return async function applyPending(d, id) {
    if (!d) return;
    const pg = +d.pendingGold || 0, ps = +d.pendingScore || 0, pl = +d.pendingSoul || 0, pb = +d.pendingBagGold || 0;
    if (pg === 0 && ps === 0 && pl === 0 && pb === 0) return;
    if (flags.busy) return; flags.busy = true;
    const p = profile, ref = refFor(id);
    if (pg !== 0) p.gold = Math.max(0, (p.gold || 0) + pg);
    if (pb !== 0) { if (!p.bag || typeof p.bag !== "object") p.bag = { gold: 0 }; p.bag.gold = Math.max(0, (p.bag.gold || 0) + pb); }
    const upd = {};
    if (pg !== 0) { upd.gold = p.gold; upd.pendingGold = fs.increment(-pg); }
    if (pb !== 0) { upd["bag.gold"] = p.bag.gold; upd.pendingBagGold = fs.increment(-pb); } // dotted set + atomic clear
    try { await fs.updateDoc(ref, upd); } finally { flags.busy = false; }
  };
}
// The admin grant write (to another player), exactly as giveResource does it.
function grant(adminFs, id, type, amt) { return adminFs.setDoc(adminFs.doc(null, "bca_users", id), { id, lastUpdate: Date.now(), [type]: adminFs.increment(amt) }, { merge: true }); }

async function scenarioOnline() {
  console.log("\n[A] ONLINE: target playing (full-profile autosave) + live cache + poll claim");
  const adminFs = makeClient().fs, tgtC = makeClient(), fs = tgtC.fs;
  const profile = { id: "CRYSTAL", gold: 1000, score: 5000, soulScore: 5000, bag: { gold: 2000, weapons: ["sword"], tools: { pickaxes: [] } } };
  STORE.set(K("bca_users", "CRYSTAL"), JSON.parse(JSON.stringify(profile)));
  const refFor = (id) => fs.doc(null, "bca_users", id);
  const flags = { busy: false };
  const applyPending = makeApplyPending(fs, refFor, profile, flags);
  const ref = refFor("CRYSTAL");
  // live subscription (updates the shim cache); onSnapshot claim DEFERS to the watcher (as in prod)
  fs.onSnapshot(ref, () => {});
  await sleep(30);
  // full-profile ABSOLUTE autosave every 250ms (like the game's ~1s save writing absolute bag.gold)
  let saving = true;
  (async () => { while (saving) { profile.score += 10; await fs.setDoc(ref, JSON.parse(JSON.stringify(profile)), { merge: true }); await sleep(250); } })();
  // watcher poll every 300ms via getDocRaw
  (async () => { while (saving) { try { const s = await fs.getDocRaw(ref); if (s.exists()) await applyPending(s.data(), "CRYSTAL"); } catch (e) {} await sleep(300); } })();
  await sleep(500);
  await grant(adminFs, "CRYSTAL", "pendingBagGold", 55000000);
  await sleep(3000); // let poll claim + several autosaves race
  saving = false; await sleep(400);
  const dbRow = STORE.get(K("bca_users", "CRYSTAL")) || {};
  ok(profile.bag.gold === 55002000, `local bag = 55,002,000 (was 2,000 + 55M) -> got ${profile.bag.gold.toLocaleString()}`);
  ok((dbRow.bag && dbRow.bag.gold) === 55002000, `DB bag = 55,002,000 -> got ${((dbRow.bag && dbRow.bag.gold) || 0).toLocaleString()}`);
  ok((dbRow.pendingBagGold || 0) === 0, `pendingBagGold cleared -> ${dbRow.pendingBagGold}`);
  ok(dbRow.bag && dbRow.bag.weapons && dbRow.bag.weapons.length === 1, "other bag contents (weapons) preserved");
}

async function scenarioOffline() {
  console.log("\n[B] OFFLINE at grant time, then target logs in (login-load claim + poll)");
  const adminFs = makeClient().fs;
  STORE.set(K("bca_users", "BAGA"), { id: "BAGA", gold: 500, bag: { gold: 3000 } });
  // grant while target has NO running client
  await grant(adminFs, "BAGA", "pendingBagGold", 55000000);
  await sleep(50);
  // target logs in: read doc, reproduce the login-load claim (index.html ~3079: pendingGold ONLY today)
  const tgtC = makeClient(), fs = tgtC.fs, ref = fs.doc(null, "bca_users", "BAGA");
  const net = (await fs.getDocRaw(ref)).data();
  const profile = { id: "BAGA", gold: net.gold || 0, bag: JSON.parse(JSON.stringify(net.bag || { gold: 0 })) };
  // ---- NEW login-load claim: vault AND bag (FIX A) ----
  if (net && net.pendingGold) { await fs.updateDoc(ref, { pendingGold: fs.increment(-net.pendingGold) }); profile.gold += net.pendingGold; }
  if (net && net.pendingBagGold) { const pb = net.pendingBagGold; profile.bag.gold = Math.max(0, (profile.bag.gold || 0) + pb); await fs.updateDoc(ref, { "bag.gold": profile.bag.gold, pendingBagGold: fs.increment(-pb) }); }
  // watcher poll also runs (should find nothing left to claim)
  const flags = { busy: false };
  const applyPending = makeApplyPending(fs, (id) => fs.doc(null, "bca_users", id), profile, flags);
  for (let i = 0; i < 4; i++) { const s = await fs.getDocRaw(ref); if (s.exists()) await applyPending(s.data(), "BAGA"); await sleep(120); }
  const dbRow = STORE.get(K("bca_users", "BAGA")) || {};
  ok(profile.bag.gold === 55003000, `local bag = 55,003,000 -> got ${profile.bag.gold.toLocaleString()}`);
  ok((dbRow.bag && dbRow.bag.gold) === 55003000, `DB bag = 55,003,000 -> got ${((dbRow.bag && dbRow.bag.gold) || 0).toLocaleString()}`);
  ok((dbRow.pendingBagGold || 0) === 0, `pendingBagGold cleared -> ${dbRow.pendingBagGold}`);
}

async function scenarioBagContents() {
  console.log("\n[C] BAG CONTENTS preserved: dotted 'bag.gold' credit must not wipe weapons/tools");
  const adminFs = makeClient().fs, fs = makeClient().fs;
  STORE.set(K("bca_users", "PAIN"), { id: "PAIN", bag: { gold: 100, weapons: ["deagle", "mg42"], tools: { pickaxes: ["p1"] }, closet: { cap: 30 } } });
  const profile = { id: "PAIN", bag: JSON.parse(JSON.stringify(STORE.get(K("bca_users", "PAIN")).bag)) };
  const flags = { busy: false };
  const applyPending = makeApplyPending(fs, (id) => fs.doc(null, "bca_users", id), profile, flags);
  await grant(adminFs, "PAIN", "pendingBagGold", 900000000);
  await sleep(60);
  const ref = fs.doc(null, "bca_users", "PAIN");
  const s = await fs.getDocRaw(ref); await applyPending(s.data(), "PAIN"); await sleep(60);
  const row = STORE.get(K("bca_users", "PAIN")) || {};
  ok((row.bag && row.bag.gold) === 900000100, `bag gold credited (+900M) -> ${((row.bag && row.bag.gold) || 0).toLocaleString()}`);
  ok(row.bag && Array.isArray(row.bag.weapons) && row.bag.weapons.length === 2, "bag WEAPONS preserved through the credit");
  ok(row.bag && row.bag.tools && row.bag.tools.pickaxes && row.bag.tools.pickaxes.length === 1, "bag TOOLS preserved through the credit");
  ok(row.bag && row.bag.closet && row.bag.closet.cap === 30, "bag CLOSET preserved through the credit");
}

async function main() {
  globalThis.__BCA_LIVE_SYNC = { bca_users: { persistMs: 500, broadcastMs: 80, reconcileMs: 100000 }, bca_presence: { persistMs: 500, broadcastMs: 80 } };
  await scenarioOnline();
  await scenarioOffline();
  await scenarioBagContents();
  console.log(failures ? `\nFAILED: ${failures}` : "\nALL BAG-GRANT DELIVERY TESTS PASSED.");
  process.exit(failures ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
