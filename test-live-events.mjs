// Guards LIVE EVENTS: admin-created event boards (name + uploaded image banner) that sync to
// every player via the cloud (music-module pattern: tiny watched META doc + per-event image
// BLOB docs cached in IndexedDB) and behave exactly like the built-in boards — own DEVOTION
// DUTY X-spam terminal, EVENTS SCORE INJECTOR/booster support (15s batched flush), ledgers.
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const mod = fs.readFileSync(new URL('./live-events.js', import.meta.url), 'utf8');
let all = true;
function check(n, c) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n); all = c && all; }

/* ---- index.html engine hooks ---- */
check('registration API exposed (EV.defs / registerBoard / unregisterBoard / rebuildBoards)',
  /EV\.defs = EVENTS;/.test(html) && /EV\.registerBoard = function \(def\)/.test(html)
  && /EV\.unregisterBoard = function \(id\)/.test(html) && /EV\.rebuildBoards = function \(\)/.test(html));
check('registerBoard validates the id and never overwrites a built-in board',
  /\/\^\[a-z0-9_\]\{2,40\}\$\//.test(html) && /if \(!EVENTS\[found\]\.live\) return false;/.test(html));
check('unregisterBoard protects built-ins (cod/bm/twob can never be removed)',
  /if \(x\.id === id && x\.live\) found = ix;/.test(html));
check('custom image renders as the full-section board background (vignette intact)',
  /var bg = evt\.img/.test(html) && /object-fit:cover/.test(html));
check('rebuildBoards forces the FULL rebuild path (bg layer repaints on image/name change)',
  /delete host\.dataset\.evtSig; host\.innerHTML = '';/.test(html));
check('injector event dropdown refreshes on register/unregister',
  /function refreshInjectorEventSelect\(\)/.test(html) && /if \(EV\.adminFillTargets\) EV\.adminFillTargets\(\);/.test(html));
check('active spam falls back to cod if the spammed board is removed',
  /if \(EV\._spamEvt === id\) EV\._spamEvt = 'cod';/.test(html));
check('live-events.js loaded cache-busted like the other sibling modules',
  /live-events\.js\?v=' \+ Date\.now\(\)/.test(html));

/* ---- the spam/injector plumbing a registered board rides is id-generic ---- */
check('devotion spam plumbing iterates evtIds() (never a hardcoded board pair)',
  /function evtIds\(\) \{ return EVENTS\.map\(function \(x\) \{ return x\.id; \}\); \}/.test(html)
  && /evtIds\(\)\.forEach\(function \(e\) \{\s*\n\s*var n = EV\._pend\[e\] \| 0;/.test(html));
check('booster gains for ANY board id ride the 15s batched flush (EV._pendingEvt)',
  /EV\._pendingEvt\[k\] = \(EV\._pendingEvt\[k\] \|\| 0\) \+ Math\.floor\(amt\);/.test(html));

/* ---- live-events.js module ---- */
check('admin-only gates on create/remove (players get no creator UI)',
  /if \(!isAdmin\(\)\) \{ notify\('ADMIN ONLY\.'\); return; \}/.test(mod) && /if \(!isAdmin\(\)\) \{ if \(existing\) existing\.remove\(\); return; \}/.test(mod));
check('meta/blob split: tiny watched meta doc + per-event image blob docs',
  /var META = 'live_events_meta', BLOB_PREFIX = 'live_event_img_';/.test(mod)
  && /c\.FS\.onSnapshot\(c\.FS\.doc\(c\.DB, 'bca_system', META\)/.test(mod));
check('image blob fetched once per version and cached in IndexedDB',
  /idbGetKey\(stamp, function \(rec\)/.test(mod) && /idbPutKey\(stamp, \{ blob: b \}\)/.test(mod));
check('banner downscaled + compressed under a byte cap before upload',
  /function downscaleBanner\(file, cb\)/.test(mod) && /MAX_IMG_BYTES/.test(mod) && /toDataURL\('image\/jpeg', q\)/.test(mod));
check('blob written BEFORE meta so a client that sees the meta finds the banner ready',
  /\/\/ blob first, then meta/.test(mod));
check('every client adopts current live events automatically on boot (wire + initial getDoc)',
  /wire\(\); \/\/ every client \(admins AND players\) adopts the current live events automatically/.test(mod)
  && /Promise\.resolve\(c\.FS\.getDoc\(c\.FS\.doc\(c\.DB, 'bca_system', META\)\)\)/.test(mod));
check('removed events are unregistered on every client (built-ins protected)',
  /if \(d\.live && !keep\[d\.id\]\) s\.events\.unregisterBoard\(d\.id\);/.test(mod));
check('stable id from the name (re-creating the same name replaces, not duplicates)',
  /function idFor\(name\)/.test(mod) && /'lv_' \+/.test(mod));
check('event cap so the meta doc / events view stays bounded', /var MAX_EVENTS = 12;/.test(mod));
check('admin UI wired into the admin mini menu (like the score injector box)',
  /document\.getElementById\('admin-mini-menu'\)/.test(mod) && /s\.adminBoost\.toggleMenu\._liveEvt = true;/.test(mod));
check('public API on BCA_SYS.liveEvents (create/remove/list)',
  /s\.liveEvents = \{/.test(mod) && /create: createEvent/.test(mod) && /remove: removeEvent/.test(mod));

console.log('\n' + (all ? 'ALL LIVE-EVENTS TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
