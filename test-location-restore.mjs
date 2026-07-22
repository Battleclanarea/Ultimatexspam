/* Regression test for the teleport/travel LOGIN-LOCATION-RESTORE fix.
 *
 * Bug: a player who teleported/travelled to a new area (e.g. Town -> a barracks) and closed
 * the browser within a few seconds - before the async cloud `forcedLocation` write landed -
 * was thrown back to their previous area on next login, even though the correct area was
 * already saved synchronously in localStorage. Root cause: the login arbitration used
 * `travelLocStamp || lastUpdate` as the cloud location's recency mark, and `lastUpdate` is
 * bumped by many unrelated writes, so a STALE cloud location could out-rank the FRESH local one.
 *
 * This test replicates the arbitration decision and the T.load stamp-preservation, verifies the
 * key scenarios, and asserts the real index.html code still contains the fixed logic (guards
 * against drift). It runs fully offline - no cloud, no live DB.
 */
import fs from 'fs';
import assert from 'assert';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let pass = 0; const ok = (name) => { console.log('  PASS', name); pass++; };

// ---- 1. Decision function mirrors index.html arbitration ----
// _localOk: T.loc valid.  _cloudLocValid: forcedLocation valid.  Cloud wins only when local is
// missing/invalid, OR cloud holds a DIFFERENT valid location stamped strictly later.
function decide({ localLoc, localOk, cloudLoc, cloudLocValid, cloudStamp, localStamp }) {
  const _cloudWins = !localOk || (cloudLocValid && cloudLoc !== localLoc && cloudStamp > localStamp);
  return _cloudWins ? cloudLoc : localLoc;
}

// Scenario A — THE BUG: teleported to Barracks (fresh local), cloud still Town, its location
// write never landed so travelLocStamp is absent (0). Previously lastUpdate(fresh) made Town win.
assert.strictEqual(
  decide({ localLoc: 'Barracks D', localOk: true, cloudLoc: 'Royal Town', cloudLocValid: true, cloudStamp: 0, localStamp: 1000 }),
  'Barracks D', 'A: fresh local barracks must beat stale cloud town');
ok('A stale cloud (no travelLocStamp) does NOT override fresh local teleport');

// Scenario A2 — same but cloud has an OLDER travelLocStamp (town saved earlier). Local still wins.
assert.strictEqual(
  decide({ localLoc: 'Barracks D', localOk: true, cloudLoc: 'Royal Town', cloudLocValid: true, cloudStamp: 500, localStamp: 1000 }),
  'Barracks D', 'A2: newer local beats older cloud');
ok('A2 newer local beats older-stamped cloud location');

// Scenario B — GENUINE cross-device newer move: cloud Barracks stamped later than local Town.
assert.strictEqual(
  decide({ localLoc: 'Royal Town', localOk: true, cloudLoc: 'Barracks D', cloudLocValid: true, cloudStamp: 2000, localStamp: 1000 }),
  'Barracks D', 'B: genuinely newer cloud move wins');
ok('B genuinely newer cloud move (higher travelLocStamp) still wins');

// Scenario C — local missing/invalid: fall back to cloud.
assert.strictEqual(
  decide({ localLoc: 'HQ Command', localOk: false, cloudLoc: 'Royal Armory', cloudLocValid: true, cloudStamp: 0, localStamp: 0 }),
  'Royal Armory', 'C: invalid local uses cloud');
ok('C invalid/missing local falls back to cloud location');

// Scenario D — same location on both, cloud older: keep local (a push-up happens in real code).
assert.strictEqual(
  decide({ localLoc: 'Barracks D', localOk: true, cloudLoc: 'Barracks D', cloudLocValid: true, cloudStamp: 500, localStamp: 1000 }),
  'Barracks D', 'D: same location stays');
ok('D identical location keeps local');

// Scenario E — cloud location invalid even if newer: never adopt an invalid cloud loc.
assert.strictEqual(
  decide({ localLoc: 'Royal Walls', localOk: true, cloudLoc: 'HQ Command', cloudLocValid: false, cloudStamp: 9999, localStamp: 1 }),
  'Royal Walls', 'E: invalid cloud loc never wins');
ok('E invalid cloud location never overrides a valid local location');

// ---- 2. T.load must PRESERVE the stored stamp (not reset to now) ----
function loadStamp({ stored, storedStamp, valid = true }) {
  let _loadedStamp = 0, _hadStored = false, loc = null, localStamp;
  if (stored) { loc = stored; _loadedStamp = storedStamp || 0; _hadStored = true; }
  if (!loc || !valid) { loc = 'Barracks D'; _hadStored = false; }
  localStamp = Date.now(); // saveLocal() bumps it...
  if (_hadStored && _loadedStamp) { localStamp = _loadedStamp; } // ...then load restores the true one
  return localStamp;
}
assert.strictEqual(loadStamp({ stored: 'Barracks D', storedStamp: 777 }), 777, 'load preserves stored stamp');
ok('T.load preserves the genuine stored location stamp');
assert.notStrictEqual(loadStamp({ stored: null, storedStamp: 0 }), 0, 'fresh account gets a real (now) stamp');
ok('T.load gives a fresh account a real stamp (home barracks default)');

// ---- 3. The real index.html contains the fixed logic (drift guards) ----
assert.ok(/var _cloudStamp = u\.travelLocStamp \|\| 0;/.test(html), 'code: cloud stamp uses travelLocStamp only (no lastUpdate fallback)');
ok('index.html: cloud recency uses travelLocStamp only (no lastUpdate fallback)');
assert.ok(/_cloudWins = !_localOk \|\| \(_cloudLocValid && u\.forcedLocation !== T\.loc && _cloudStamp > _localStamp\)/.test(html), 'code: _cloudWins condition present');
ok('index.html: cloud only wins on a different, valid, strictly-newer location');
assert.ok(/PRESERVE the TRUE last-save time/.test(html) && /T\._localLocStamp = _loadedStamp;/.test(html), 'code: T.load preserves stamp');
ok('index.html: T.load preserves the true stored stamp');
assert.ok(!/u\.travelLocStamp \|\| u\.lastUpdate/.test(html), 'code: old lastUpdate fallback fully removed');
ok('index.html: old `travelLocStamp || lastUpdate` fallback removed');

console.log('\nAll ' + pass + ' checks passed.');
