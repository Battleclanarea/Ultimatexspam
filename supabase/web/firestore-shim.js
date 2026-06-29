// Firestore-compatible shim backed by Supabase (Postgres + Realtime).
//
// The Ultimatexspam game (index.html) uses Firestore only through a fixed bundle of
// helpers exposed as window.__BCA_FS plus window.__BCA_DB / auth. This module reproduces
// that exact surface on top of a Supabase client and the `fs_documents` table + RPCs
// defined in supabase/migrations/20260629000000_firestore_compat.sql, so the game code
// does not have to change — only the boot block that builds those globals.
//
// It is DRIVER-AGNOSTIC: pass any object shaped like a supabase-js client (rpc/from/
// channel/removeChannel/auth). In the browser that's the CDN client (see
// bca-supabase-boot.js); in tests it's a Postgres-backed fake (see tests/).
//
// Mapping summary:
//   doc/collection            -> lightweight references {collection, id}
//   getDoc/getDocs            -> select from fs_documents (getDocs uses fs_query when ordered)
//   setDoc({merge})/addDoc    -> rpc fs_set  (+ rpc fs_update for any increment/arrayUnion sentinels)
//   updateDoc                 -> rpc fs_update (dotted sets / increments / arrayUnion)
//   deleteDoc                 -> delete from fs_documents
//   onSnapshot                -> initial read + Realtime postgres_changes on fs_documents
//   query/where/orderBy/limit/startAfter -> query descriptor applied client-side (orderBy+limit
//                                           pushed down to fs_query)
//   increment/arrayUnion/serverTimestamp -> write sentinels resolved by the helpers above

const TABLE = "fs_documents";

// ---- Field-value sentinels (Firestore parity) -----------------------------
export function increment(n) { return { __fsSentinel: "increment", n: Number(n) || 0 }; }
export function arrayUnion(...items) { return { __fsSentinel: "arrayUnion", items }; }
export function arrayRemove(...items) { return { __fsSentinel: "arrayRemove", items }; }
export function serverTimestamp() { return { __fsSentinel: "serverTimestamp" }; }
export function deleteField() { return { __fsSentinel: "deleteField" }; }
function isSentinel(v) { return v && typeof v === "object" && typeof v.__fsSentinel === "string"; }

// 20-char base62 id, mimicking Firestore auto-ids for addDoc().
const ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function genId() {
  let s = "";
  for (let i = 0; i < 20; i++) s += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  return s;
}

// Recursively strip sentinels out of a (nested) object meant for setDoc/addDoc.
// Returns plain data; records increments/unions keyed by dotted path for a follow-up fs_update.
function extractSentinels(node, base, incrs, unions) {
  if (node === null || typeof node !== "object" || Array.isArray(node)) return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    const path = base ? `${base}.${k}` : k;
    if (isSentinel(v)) {
      if (v.__fsSentinel === "increment") incrs[path] = v.n;
      else if (v.__fsSentinel === "arrayUnion") v.items.forEach((it) => { unions[path] = it; });
      else if (v.__fsSentinel === "serverTimestamp") out[k] = Date.now();
      // deleteField / arrayRemove inside setDoc are not used by the game; ignored.
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = extractSentinels(v, path, incrs, unions);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function docRef(db, collection, id) { return { __fsType: "doc", db, collection, id: String(id) }; }
function collRef(db, collection) { return { __fsType: "collection", db, collection }; }

function makeDocSnap(id, data) {
  const exists = data !== undefined && data !== null;
  return {
    id,
    exists: () => exists,
    data: () => (exists ? data : undefined),
    get: (field) => (exists ? data?.[field] : undefined),
  };
}

function makeQuerySnap(rows) {
  const docs = rows.map((r) => ({ id: r.doc_id, data: () => r.data, exists: () => true, get: (f) => r.data?.[f] }));
  return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn) => docs.forEach(fn) };
}

// ---- Query builder ---------------------------------------------------------
export function query(ref, ...constraints) {
  const q = { __fsType: "query", db: ref.db, collection: ref.collection, _order: null, _limit: null, _where: [], _startAfter: null };
  for (const c of constraints) {
    if (!c) continue;
    if (c.__c === "orderBy") q._order = { field: c.field, dir: c.dir };
    else if (c.__c === "limit") q._limit = c.n;
    else if (c.__c === "where") q._where.push(c);
    else if (c.__c === "startAfter") q._startAfter = c.value;
  }
  return q;
}
export function orderBy(field, dir = "asc") { return { __c: "orderBy", field, dir }; }
export function limit(n) { return { __c: "limit", n }; }
export function where(field, op, value) { return { __c: "where", field, op, value }; }
export function startAfter(value) { return { __c: "startAfter", value }; }

function getAtPath(obj, field) {
  // Supports dotted fields; "__name__" sorts by doc id.
  if (field === "__name__") return obj.__doc_id;
  return String(field).split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function applyClientQuery(rows, q) {
  let out = rows.slice();
  for (const w of q._where || []) {
    out = out.filter((r) => {
      const val = getAtPath(r.data, w.field);
      switch (w.op) {
        case "==": return val === w.value;
        case "!=": return val !== w.value;
        case ">": return val > w.value;
        case ">=": return val >= w.value;
        case "<": return val < w.value;
        case "<=": return val <= w.value;
        default: return true;
      }
    });
  }
  if (q._order) {
    const { field, dir } = q._order;
    out.sort((a, b) => {
      const av = field === "__name__" ? a.doc_id : getAtPath(a.data, field);
      const bv = field === "__name__" ? b.doc_id : getAtPath(b.data, field);
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return dir === "desc" ? -cmp : cmp;
    });
    if (q._startAfter != null) {
      const idx = out.findIndex((r) => {
        const v = field === "__name__" ? r.doc_id : getAtPath(r.data, field);
        return v === q._startAfter;
      });
      if (idx >= 0) out = out.slice(idx + 1);
    }
  }
  if (q._limit != null) out = out.slice(0, q._limit);
  return out;
}

// ---- The factory: build the Firestore-compatible bundle over a supabase client ----
export function createFirestoreCompat(supabase) {
  const db = { __fsType: "db", supabase };

  async function rpc(fn, params) {
    const { data, error } = await supabase.rpc(fn, params);
    if (error) throw new Error(`${fn}: ${error.message || error}`);
    return data;
  }

  // ---- Write scheduler -----------------------------------------------------
  // Firebase multiplexed all writes over ONE persistent connection. This shim does one HTTP
  // request per write, and the game's hot loops (1s autosave, presence beats, bots, sim, admin
  // boost batches) fire far more writes than the browser can have in flight at once — which
  // produced a `net::ERR_INSUFFICIENT_RESOURCES` storm that froze the UI and broke live updates.
  // So we (1) cap concurrent in-flight write requests, and (2) COALESCE rapid merge-writes to the
  // same document into a single request (e.g. 10 autosaves of one profile in a second -> 1 write).
  const MAX_INFLIGHT = 6;
  let _inflight = 0;
  const _writeQueue = [];
  const _pendingMerge = new Map(); // "collection/id" -> { data, promise }

  function _pump() {
    while (_inflight < MAX_INFLIGHT && _writeQueue.length) {
      const job = _writeQueue.shift();
      _inflight++;
      Promise.resolve().then(job.run).then(job.resolve, job.reject).finally(() => { _inflight--; _pump(); });
    }
  }
  function _enqueueWrite(run) {
    return new Promise((resolve, reject) => { _writeQueue.push({ run, resolve, reject }); _pump(); });
  }

  // Deep merge matching fs_set/jsonb_deep_merge semantics (objects merge; arrays/scalars replace).
  function deepMergeJS(a, b) {
    if (a === null || typeof a !== "object" || Array.isArray(a)) return b;
    if (b === null || typeof b !== "object" || Array.isArray(b)) return b;
    const out = { ...a };
    for (const k of Object.keys(b)) out[k] = (k in out) ? deepMergeJS(out[k], b[k]) : b[k];
    return out;
  }

  // Coalesce plain setDoc({merge:true}) writes to the same doc while one is still queued.
  function _coalescedMerge(collection, id, plain) {
    const key = `${collection}/${id}`;
    const existing = _pendingMerge.get(key);
    if (existing) { existing.data = deepMergeJS(existing.data, plain); return existing.promise; }
    const entry = { data: plain };
    entry.promise = _enqueueWrite(async () => {
      _pendingMerge.delete(key); // further merges after send-start open a fresh entry
      await rpc("fs_set", { p_collection: collection, p_id: id, p_data: entry.data, p_merge: true });
    });
    _pendingMerge.set(key, entry);
    return entry.promise;
  }

  function doc(dbOrColl, a, b) {
    // doc(db, 'coll', 'id')  OR  doc(collectionRef, 'id')
    if (dbOrColl && dbOrColl.__fsType === "collection") return docRef(db, dbOrColl.collection, a);
    return docRef(db, a, b);
  }
  function collection(_db, name) { return collRef(db, name); }

  async function getDoc(ref) {
    const { data, error } = await supabase.from(TABLE).select("doc_id,data").eq("collection", ref.collection).eq("doc_id", ref.id).maybeSingle();
    if (error && error.code !== "PGRST116") throw new Error(error.message || String(error));
    return makeDocSnap(ref.id, data ? data.data : undefined);
  }

  async function readCollectionRows(q) {
    // Push ordered+limited reads down to fs_query (numeric order field); else select all.
    if (q && q.__fsType === "query" && q._order && q._order.field !== "__name__" && !q._where.length && q._startAfter == null) {
      const rows = await rpc("fs_query", { p_collection: q.collection, p_order_field: q._order.field, p_desc: q._order.dir === "desc", p_limit: q._limit || 200 });
      return rows.map((r) => ({ doc_id: r.doc_id, data: r.data }));
    }
    const coll = q.collection;
    const { data, error } = await supabase.from(TABLE).select("doc_id,data").eq("collection", coll);
    if (error) throw new Error(error.message || String(error));
    let rows = (data || []).map((r) => ({ doc_id: r.doc_id, data: r.data }));
    if (q && q.__fsType === "query") rows = applyClientQuery(rows, q);
    return rows;
  }

  async function getDocs(target) {
    const q = target.__fsType === "query" ? target : { __fsType: "query", collection: target.collection, _order: null, _limit: null, _where: [], _startAfter: null };
    const rows = await readCollectionRows(q);
    return makeQuerySnap(rows);
  }

  async function setDoc(ref, data, opts) {
    const merge = !!(opts && opts.merge);
    const incrs = {}, unions = {};
    const plain = extractSentinels(data, "", incrs, unions);
    const hasSentinels = Object.keys(incrs).length || Object.keys(unions).length;
    // Hot path: plain merge-write -> coalesce per doc + concurrency-limit.
    if (merge && !hasSentinels) return _coalescedMerge(ref.collection, ref.id, plain);
    return _enqueueWrite(async () => {
      await rpc("fs_set", { p_collection: ref.collection, p_id: ref.id, p_data: plain, p_merge: merge });
      if (hasSentinels) await rpc("fs_update", { p_collection: ref.collection, p_id: ref.id, p_sets: {}, p_incrs: incrs, p_unions: unions });
    });
  }

  async function updateDoc(ref, data) {
    const sets = {}, incrs = {}, unions = {};
    for (const [k, v] of Object.entries(data)) {
      if (isSentinel(v)) {
        if (v.__fsSentinel === "increment") incrs[k] = v.n;
        else if (v.__fsSentinel === "arrayUnion") v.items.forEach((it) => { unions[k] = it; });
        else if (v.__fsSentinel === "serverTimestamp") sets[k] = Date.now();
        // deleteField/arrayRemove not used by the game.
      } else {
        sets[k] = v;
      }
    }
    return _enqueueWrite(() => rpc("fs_update", { p_collection: ref.collection, p_id: ref.id, p_sets: sets, p_incrs: incrs, p_unions: unions }));
  }

  async function addDoc(collectionRef, data) {
    const id = genId();
    const incrs = {}, unions = {};
    const plain = extractSentinels(data, "", incrs, unions);
    const hasSentinels = Object.keys(incrs).length || Object.keys(unions).length;
    await _enqueueWrite(async () => {
      await rpc("fs_set", { p_collection: collectionRef.collection, p_id: id, p_data: plain, p_merge: false });
      if (hasSentinels) await rpc("fs_update", { p_collection: collectionRef.collection, p_id: id, p_sets: {}, p_incrs: incrs, p_unions: unions });
    });
    return docRef(db, collectionRef.collection, id);
  }

  async function deleteDoc(ref) {
    return _enqueueWrite(async () => {
      const { error } = await supabase.from(TABLE).delete().eq("collection", ref.collection).eq("doc_id", ref.id);
      if (error) throw new Error(error.message || String(error));
    });
  }

  // ---- Realtime hub: ONE shared channel per collection, fanned out to every listener ----
  // The game registers ~25 onSnapshot listeners (several on the whole bca_users collection).
  // Opening one Realtime channel per listener overruns Supabase's per-client postgres_changes
  // limits and silently drops events (e.g. admin grants never refreshing the roster). Instead we
  // keep a single channel per collection and dispatch each change to all registered listeners,
  // so every onSnapshot reacts instantly regardless of how many are active.
  const hub = new Map(); // collection -> { channel, collListeners:Set, docListeners:Map<id,Set> }

  // Realtime updates arrive as a high-frequency stream (every player's ~1s autosave + presence
  // beats stream to every client, since the game subscribes to whole collections). Firing each
  // listener's re-render synchronously per event saturates the main thread and makes audio,
  // timers (X-spam), and animations stutter. So we update caches immediately (cheap) but COALESCE
  // the expensive re-renders to at most one flush per EMIT_THROTTLE_MS, collapsing bursts.
  const EMIT_THROTTLE_MS = 120;
  const _dirtyColl = new Set();   // collection listeners needing re-emit
  const _dirtyDoc = new Map();    // doc callback -> latest snapshot
  let _flushScheduled = false;
  function _scheduleFlush() {
    if (_flushScheduled) return;
    _flushScheduled = true;
    setTimeout(_flush, EMIT_THROTTLE_MS);
  }
  function _flush() {
    _flushScheduled = false;
    const colls = Array.from(_dirtyColl); _dirtyColl.clear();
    for (const L of colls) { try { L.emit(); } catch { /* noop */ } }
    const docs = Array.from(_dirtyDoc.entries()); _dirtyDoc.clear();
    for (const [fn, snap] of docs) { try { fn(snap); } catch { /* noop */ } }
  }

  function ensureChannel(collection) {
    let h = hub.get(collection);
    if (h) return h;
    h = { channel: null, collListeners: new Set(), docListeners: new Map() };
    h.channel = supabase
      .channel(`fs:${collection}`)
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE, filter: `collection=eq.${collection}` }, (payload) => {
        if (globalThis.__FS_RT_DEBUG) console.log("[RT]", collection, payload.eventType, payload.new?.doc_id);
        const isDelete = payload.eventType === "DELETE";
        const row = isDelete ? payload.old : payload.new;
        if (!row || row.doc_id == null) return;
        const id = row.doc_id;
        // Update caches synchronously (cheap), but defer the expensive re-emits.
        const ds = h.docListeners.get(id);
        if (ds && ds.size) {
          const snap = makeDocSnap(id, isDelete ? undefined : row.data);
          ds.forEach((fn) => { _dirtyDoc.set(fn, snap); });
        }
        h.collListeners.forEach((L) => {
          if (isDelete) L.cache.delete(id); else L.cache.set(id, { doc_id: id, data: row.data });
          _dirtyColl.add(L);
        });
        _scheduleFlush();
      })
      .subscribe((status) => { if (globalThis.__FS_RT_DEBUG) console.log("[RT status]", collection, status); });
    hub.set(collection, h);
    return h;
  }

  function maybeTeardown(collection) {
    const h = hub.get(collection);
    if (h && h.collListeners.size === 0 && h.docListeners.size === 0) {
      try { supabase.removeChannel(h.channel); } catch { /* noop */ }
      hub.delete(collection);
    }
  }

  // onSnapshot(ref|query, onNext, onError?) -> unsubscribe()
  function onSnapshot(target, onNext, onError) {
    const isDoc = target.__fsType === "doc";
    const collection = target.collection;
    const h = ensureChannel(collection);
    let cancelled = false;

    if (isDoc) {
      const id = target.id;
      if (!h.docListeners.has(id)) h.docListeners.set(id, new Set());
      h.docListeners.get(id).add(onNext);
      getDoc(target).then((snap) => { if (!cancelled) onNext(snap); }).catch((e) => onError && onError(e));
      return function unsubscribe() {
        cancelled = true;
        const set = h.docListeners.get(id);
        if (set) { set.delete(onNext); if (!set.size) h.docListeners.delete(id); }
        maybeTeardown(collection);
      };
    }

    const q = target.__fsType === "query" ? target : { __fsType: "query", collection, _order: null, _limit: null, _where: [], _startAfter: null };
    const L = { cache: new Map(), emit() { onNext(makeQuerySnap(applyClientQuery(Array.from(this.cache.values()), q))); } };
    h.collListeners.add(L);
    readCollectionRows({ __fsType: "query", collection, _order: null, _limit: null, _where: [], _startAfter: null })
      .then((rows) => { if (cancelled) return; rows.forEach((r) => L.cache.set(r.doc_id, r)); L.emit(); })
      .catch((e) => onError && onError(e));
    return function unsubscribe() {
      cancelled = true;
      h.collListeners.delete(L);
      maybeTeardown(collection);
    };
  }

  function writeBatch() {
    const ops = [];
    return {
      set(ref, data, opts) { ops.push(() => setDoc(ref, data, opts)); return this; },
      update(ref, data) { ops.push(() => updateDoc(ref, data)); return this; },
      delete(ref) { ops.push(() => deleteDoc(ref)); return this; },
      // NOTE: Firestore batches are atomic; this applies ops sequentially (not atomic).
      async commit() { for (const op of ops) await op(); },
    };
  }

  const fs = {
    doc, collection, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, onSnapshot,
    query, where, orderBy, limit, startAfter, increment, arrayUnion, arrayRemove, serverTimestamp, deleteField, writeBatch,
  };
  return { db, fs };
}

// ---- Firebase-shaped boot helpers (so the index.html boot block barely changes) ----
export function initializeApp(config) { return { __fsType: "app", config }; }
export function getFirestore(app) { return app && app.__db ? app.__db : { __fsType: "db" }; }

export function getAuth(app) {
  const supabase = app && app.supabase;
  const auth = { __fsType: "auth", supabase, currentUser: null };
  return auth;
}

export async function signInAnonymously(auth) {
  // Mirrors Firebase's anonymous sign-in. Anonymous sign-ins must be enabled in the
  // Supabase dashboard; if not, we fall back to a synthetic local user so the game still
  // runs (RLS already permits the anon key for fs_documents).
  try {
    const { data, error } = await auth.supabase.auth.signInAnonymously();
    if (error) throw error;
    auth.currentUser = data.user || { uid: data.user?.id || "anon" };
    return { user: auth.currentUser };
  } catch (e) {
    auth.currentUser = { uid: `local_${genId()}`, isAnonymous: true, _synthetic: true };
    return { user: auth.currentUser };
  }
}
