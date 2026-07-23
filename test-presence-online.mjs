/* Regression test for the FALSE-ONLINE presence fix.
 * Bug: opening the app showed every player ONLINE, worst during score boosting, because boost
 * machinery (admin/bot score boosts, the boost-presence beater, and a score-climb fabricator)
 * was treated as genuine presence.
 * Fix: only a GENUINE (non-boost) observed heartbeat marks a player online; boost-driven records
 * are forced offline; the score-climb fabricator and the batch boost presence writer are removed.
 *
 * Part 1 replicates the core online decision; Part 2 asserts the real index.html wiring. The
 * end-to-end behaviour (boost record -> offline, genuine beat -> online) is verified separately
 * against the live client-side presence engine in a headless harness. */
import fs from 'fs';
import assert from 'assert';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let pass = 0; const ok = (n) => { console.log('  PASS', n); pass++; };

// ---- Part 1: decision semantics ----
const WINDOW = 120000;
const isBoostRec = (u) => !!(u && (u._synthActive || u.boostPresence || u.currentAction === 'X Spam Boost'));
// mirrors the recomputeOffline boost-offline rule
function offlineDecision(u, beatSeen, now) {
  if (u.forcedOffline || u.scheduledOnline || u.adminPlaced) return u._offline;
  if (beatSeen && now - beatSeen <= WINDOW) return false;             // genuine live -> online
  if (isBoostRec(u)) return true;                                     // boost-only -> offline
  return u._offline;                                                  // else unchanged
}
const now = 1000000;
// boost record, NO genuine beat -> offline
assert.strictEqual(offlineDecision({ currentAction:'X Spam Boost', _offline:false }, 0, now), true, 'boost w/o beat -> offline');
ok('A boost-driven record with no genuine beat is forced OFFLINE');
// boost record BUT a genuine beat observed (player online AND being boosted) -> online
assert.strictEqual(offlineDecision({ currentAction:'X Spam Boost', _offline:false }, now-1000, now), false, 'boost + genuine beat -> online');
ok('A player who is genuinely online AND boosted still reads ONLINE (genuine beat wins)');
// genuine record with a beat -> online
assert.strictEqual(offlineDecision({ section:'Barracks A', _offline:false }, now-2000, now), false, 'genuine beat -> online');
ok('A genuine heartbeat reads ONLINE');
// scheduled-online admin control is never overridden
assert.strictEqual(offlineDecision({ currentAction:'X Spam Boost', scheduledOnline:true, _offline:false }, 0, now), false, 'scheduled online preserved');
ok('D explicit admin scheduled-online is preserved');

// trackBeats must NOT record a beat for a boost record
function trackOne(prev, u, now) { if (isBoostRec(u)) return { beat:false, prev }; const t=u.time||0; if (prev===undefined) return { beat:false, prev:t }; if (t!==prev) return { beat:true, prev:t }; return { beat:false, prev }; }
assert.strictEqual(trackOne(500, { currentAction:'X Spam Boost', time:900 }, now).beat, false, 'boost time change not a beat');
ok('E a boost record time change is NOT counted as an observed heartbeat');
assert.strictEqual(trackOne(500, { section:'Barracks A', time:900 }, now).beat, true, 'genuine time change is a beat');
ok('E a genuine record time change IS counted as an observed heartbeat');

// ---- Part 2: real index.html wiring ----
assert.ok(/function isBoostRec\(u\) \{\s*return !!\(u && \(u\._synthActive \|\| u\.boostPresence \|\| u\.currentAction === 'X Spam Boost'\)\)/.test(html), 'isBoostRec present');
ok('index.html: isBoostRec detects every boost writer marker');
assert.ok(/if \(isBoostRec\(u\)\) return;[\s\S]{0,200}First time we ever see this account/.test(html), 'trackBeats skips boost records');
ok('index.html: trackBeats skips boost-driven records (genuine-only _beatSeen)');
assert.ok(/if \(isBoostRec\(u\) && !\(P\._beatSeen\[k\] && now - P\._beatSeen\[k\] <= WINDOW\)\) u\._offline = true;/.test(html), 'recomputeOffline forces boost records offline');
ok('index.html: recomputeOffline forces boost records OFFLINE unless a genuine beat was observed');
assert.ok(/NEUTRALISED \(false-online fix\)/.test(html) && /score-climb fabrication is removed for good\.\s*\n\s*return;/.test(html), 'boost-visibility-final neutralised');
ok('index.html: boost-visibility-final (score-climb -> online fabricator) is neutralised');
assert.ok(/if \(!AB\.beatBatch \|\| !AB\.beatBatch\._presenceTruth\) \{\s*AB\.beatBatch = function \(\) \{\}; AB\.beatBatch\._presenceTruth = true;/.test(html), 'beatBatch neutralised');
ok('index.html: PRESENCE TRUTH also neutralises the batch boost presence writer (beatBatch)');

console.log('\nAll ' + pass + ' checks passed.');
