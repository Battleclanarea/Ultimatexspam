// Guards the SUPABASE COST CONTROL cadences for bot runs (score injectors):
//  - HQ score injector (adminBoost): cloud push batched on a FLAT 15s cadence (gains still
//    drip locally per second, so each batch carries gain-rate x 15s), presence beats >= 15s.
//  - Events score injector: booster ticks accumulate locally and flush as ONE combined
//    increment write to bca_system/bca_events_v1 every 15s; one-shot injects stay immediate;
//    wipes drop queued gains; stopping/leaving flushes so nothing is stranded.
//  - firestore-shim: bca_users live-broadcast default is 15s (leading edge intact) and
//    deltas queued during a cooldown window MERGE (never overwrite/lose fields).
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const shim = fs.readFileSync(new URL('./supabase/web/firestore-shim.js', import.meta.url), 'utf8');
let all = true;
function check(n, c) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n); all = c && all; }

/* ---- HQ score injector (adminBoost.tick) ---- */
check('HQ boost cloud push is a flat 15s cadence (tunable via pushMs)',
  /const pushEvery = self\.pushMs \|\| 15000;/.test(html));
check('old adaptive 2.5-15s push cadence is gone',
  !/Math\.min\(15000, Math\.max\(2500, memberCount \* 350\)\)/.test(html));
check('presence beat cadence floors at 15s (caps at 20s)',
  /const presEvery = Math\.min\(20000, Math\.max\(15000, memberCount \* 500\)\);/.test(html));
check('per-second local drip is unchanged (gains accumulate between pushes)',
  /b\.nextAt \+= 1000;/.test(html) && /b\.pendingCloud = \(b\.pendingCloud \|\| 0\) \+ gain;/.test(html));
check('push is still ONE writeBatch of increment()s (stomp-proof pendingScore delivery)',
  /pendingScore: increment\(amt\), pendingSoul: increment\(amt\)/.test(html));

/* ---- Events score injector ---- */
const evStart = html.indexOf('ADMIN: INJECTOR + BOOSTERS + WIPE + SUMMON');
const ev = evStart > 0 ? html.slice(evStart, evStart + 12000) : '';
check('events booster gains accumulate in EV._pendingEvt', /EV\._pendingEvt\[k\] = \(EV\._pendingEvt\[k\] \|\| 0\) \+ Math\.floor\(amt\);/.test(ev));
check('combined flush cadence is 15s (EV._flushMs)', /EV\._flushMs = 15000;/.test(ev));
check('flush ships ALL pending keys in ONE setDoc of increments',
  /function flushEvtPending\(\)/.test(ev) && /keys\.forEach\(function \(k\) \{ var a = Math\.floor\(pend\[k\] \|\| 0\); if \(!a\) return; payload\[k\] = FS\.increment \? FS\.increment\(a\) : EV\.boost\[k\]; \}\);/.test(ev));
check('booster loop defers (writeBoost ..., true)', /writeBoost\(evt, kind, id, mn \+ Math\.floor\(Math\.random\(\) \* \(mx - mn \+ 1\)\), true\);/.test(html));
check('one-shot admin inject stays IMMEDIATE (no defer arg)', /writeBoost\(evt, kind, id, amt\);/.test(html));
check('failed flush routes every key into the durable boost ledger', /var ledger = function \(\) \{ keys\.forEach\(/.test(ev));
check('wipe drops queued gains so they cannot resurrect the score', /delete EV\._pendingEvt\[k\]; \/\/ a queued booster gain must not resurrect a wiped score/.test(html));
check('stopping boosters flushes queued gains immediately', /flushEvtPending\(\); \/\/ deliver any queued gains immediately on stop/.test(html));
check('pagehide/beforeunload flush so a close cannot strand gains',
  /window\.addEventListener\('pagehide', flushEvtPending\);/.test(ev) && /window\.addEventListener\('beforeunload', flushEvtPending\);/.test(ev));
check('local boost + floor + render still move immediately (admin sees live climb)',
  /EV\.boost\[k\] = Math\.floor\(\(EV\.boost\[k\] \|\| 0\) \+ amt\);[\s\S]{0,600}EV\._floor\[k\] = Math\.max\(EV\._floor\[k\] \|\| 0, EV\.boost\[k\]\);[\s\S]{0,900}scheduleRender\(\);/.test(ev));

/* ---- firestore-shim live-sync defaults ---- */
check('bca_users broadcast default is 15s', /bca_users:\s*\{ persistMs: 25000, broadcastMs: 15000, reconcileMs: 12000 \}/.test(shim));
check('bca_presence broadcast stays 2s (room moves / online flips stay snappy)',
  /bca_presence:\s*\{ persistMs: 20000, broadcastMs: 2000, reconcileMs: 12000 \}/.test(shim));
check('persistMs freshness values untouched (25s/20s per AGENTS gotcha)',
  /persistMs: 25000/.test(shim) && /persistMs: 20000/.test(shim));
check('queued broadcast deltas MERGE during the cooldown window (no lost fields)',
  /const mergeable = prev && prev\.data && payload && payload\.data && !prev\.del && !payload\.del;/.test(shim) &&
  /deepMergeJS\(prev\.data, payload\.data\)/.test(shim));
check('leading edge intact: first update in a quiet period sends immediately', /if \(!_bcCooldown\.has\(key\)\) \{\n      send\(payload\);/.test(shim));

console.log('\n' + (all ? 'ALL INJECTOR-CADENCE TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
