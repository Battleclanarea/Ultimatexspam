/* Regression test for the FALSE-ONLINE presence fix (corrected).
 *
 * Desired behaviour:
 *   - A genuinely online player (own live heartbeat)            -> ONLINE
 *   - An account that is being ACTIVELY BOOSTED (even if the person is offline) -> ONLINE
 *   - An account that is offline and NOT being boosted          -> OFFLINE   <-- the actual bug
 *
 * Root cause of the bug: `boost-visibility-final` inferred "online" from a raw score-VALUE
 * increase in barracksData. That lit up non-boosted accounts too, because on app open every
 * player's real score hydrates in from the cloud (stale -> real), which reads as a "climb".
 * Fix: neutralise ONLY that score-climb inference. Boosted accounts still read online via the
 * boost writers' real bca_presence heartbeats (kept intact); non-boosted offline accounts stay
 * offline because nothing keeps their presence fresh.
 *
 * Part 1 models the online decision; Part 2 asserts the real index.html wiring. */
import fs from 'fs';
import assert from 'assert';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let pass = 0; const ok = (n) => { console.log('  PASS', n); pass++; };

// ---- Part 1: online decision (fresh heartbeat OR observed beat = online) ----
const WINDOW = 120000;
function isOnline(u, beatSeen, now) {
  if (u.forcedOffline) return false;
  if (u.scheduledOnline) return true;
  if (u.asleep) return false;
  if (beatSeen && now - beatSeen <= WINDOW) return true;       // observed live heartbeat
  const age = now - (u.lastSeen || u.time || 0);
  return age <= WINDOW;                                        // any fresh heartbeat (incl. a boost write)
}
const now = 1000000;
// boosted account: its presence is being stamped every few seconds -> fresh -> ONLINE (desired)
assert.strictEqual(isOnline({ currentAction:'X Spam Boost', time: now-3000 }, now-3000, now), true, 'boosted -> online');
ok('A a boosted account (fresh boost heartbeat) reads ONLINE');
// non-boosted offline account: stale timestamp, nothing keeping it fresh -> OFFLINE (the fix)
assert.strictEqual(isOnline({ section:'Barracks A', time: now-600000 }, 0, now), false, 'non-boosted offline -> offline');
ok('B a non-boosted offline account reads OFFLINE');
// genuine online player -> ONLINE
assert.strictEqual(isOnline({ section:'Barracks A', time: now-2000 }, now-2000, now), true, 'genuine online -> online');
ok('C a genuinely online player reads ONLINE');

// ---- Part 2: real index.html wiring ----
// (1) the score-climb fabricator is neutralised (this is THE fix)
assert.ok(/NEUTRALISED \(false-online fix\)/.test(html) && /keeps their presence fresh\.\s*\n\s*return;/.test(html), 'boost-visibility neutralised');
ok('index.html: boost-visibility-final (score-value-increase -> online) is neutralised');
// (2) boosted accounts are NOT forced offline: the isBoostRec force-offline logic from the wrong
//     first attempt must be GONE, and trackBeats must NOT skip boost records.
assert.ok(!/if \(isBoostRec\(u\) && !\(P\._beatSeen\[k\]/.test(html), 'no boost force-offline');
ok('index.html: boost-driven records are NOT forced offline (boosted accounts stay online)');
assert.ok(!/function isBoostRec\(u\)/.test(html), 'isBoostRec removed');
ok('index.html: the erroneous isBoostRec heartbeat filter was removed');
assert.ok(!/if \(isBoostRec\(u\)\) return;/.test(html), 'trackBeats no longer skips boost records');
ok('index.html: trackBeats counts a boost write as a heartbeat (boosted -> online)');
// (3) beatBatch (the batch boost presence writer) is NOT neutralised, so boosted accounts get
//     their real, propagating presence heartbeats.
assert.ok(!/AB\.beatBatch = function \(\) \{\}; AB\.beatBatch\._presenceTruth/.test(html), 'beatBatch not neutralised');
ok('index.html: the boost presence writer (beatBatch) is intact so boosted accounts read online');

console.log('\nAll ' + pass + ' checks passed.');
