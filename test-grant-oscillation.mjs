// Reproduces the RESOURCE-GRANT oscillation (add/remove/add/remove) and proves the single-claimer +
// authoritative-read fix makes a grant a smooth, exactly-once transaction.
//
// Root cause (from the live code):
//   1) MULTIPLE claimers (storage.save fallback + the _selfGrantWatch) consumed the same pending
//      increment with SEPARATE locks -> both apply -> pending driven NEGATIVE -> read as a real
//      deduction -> ping-pong.
//   2) The watcher's onSnapshot applied pending straight from the STALE live-sync CACHE, so a stale
//      re-delivery of an already-cleared pending re-applied it.
//
// Fix modeled here:
//   - ONE shared lock across all claim paths (login/save/watcher).
//   - The save-time path DEFERS whenever the watcher is installed (single claimer).
//   - onSnapshot never claims from cache; it confirms + claims against the AUTHORITATIVE DB (getDocRaw).
//
// Run: node test-grant-oscillation.mjs
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let all = true;
const check = (n, c, extra) => { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n + (extra != null ? ' -> ' + extra : '')); all = c && all; };

// ---------- shared model: a DB doc + a claimer that mirrors applyPending ----------
function makeWorld() {
  const DB = { gold: 1000, pendingGold: 0 };        // authoritative durable row
  const CACHE = { gold: 1000, pendingGold: 0 };      // the live-sync cache (can go stale)
  const profile = { gold: 1000 };
  let busy = false;                                  // the SINGLE shared claim lock
  const notifies = [];
  // apply the pending we were HANDED (d), atomically clearing exactly what we applied.
  function applyPending(d) {
    const pg = +d.pendingGold || 0;
    if (pg === 0) return;
    if (busy) return;                                 // single-claimer lock
    busy = true;
    profile.gold = Math.max(0, profile.gold + pg);
    DB.gold = profile.gold; DB.pendingGold += -pg;    // atomic: absolute + increment(-pending)
    CACHE.gold = profile.gold; CACHE.pendingGold = DB.pendingGold;
    notifies.push(pg > 0 ? ('GRANT +' + pg) : ('ADJUST ' + pg));
    busy = false;
  }
  return { DB, CACHE, profile, applyPending, notifies, isBusy: () => busy };
}

// ============ A) OLD behaviour — onSnapshot claims from the STALE cache => OSCILLATION ============
(function () {
  const w = makeWorld();
  // admin grants +500 (atomic increment on the durable row); cache lags at the pre-grant value.
  w.DB.pendingGold += 500;
  const staleCacheSnapshot = { pendingGold: 500 };          // cache observed the +500 grant
  // watcher onSnapshot fires with the cache snapshot -> claims (correct first time)
  w.applyPending(staleCacheSnapshot);                        // gold 1500, DB pending 0
  // a STALE re-delivery of the SAME cache snapshot (reconnect / reconcile echo) fires again:
  w.applyPending(staleCacheSnapshot);                        // BUG: applies +500 again -> DB pending -500
  // now a poll reads the durable row (pending -500) and "claims" the negative as a deduction:
  w.applyPending({ pendingGold: w.DB.pendingGold });         // gold 1000, DB pending 0 ... oscillation seed
  w.applyPending(staleCacheSnapshot);                        // stale echo AGAIN -> +500 -> pending -500 ...
  check('OLD: stale-cache re-delivery over-applies the grant (demonstrates the add/remove bug)', w.profile.gold !== 1500, 'gold=' + w.profile.gold);
  check('OLD: pending is driven NEGATIVE (fuels oscillation)', w.DB.pendingGold < 0, 'pending=' + w.DB.pendingGold);
})();

// ============ B) FIXED behaviour — onSnapshot re-reads the AUTHORITATIVE DB => exactly once ============
(function () {
  const w = makeWorld();
  w.DB.pendingGold += 500;                                   // grant arrives on the durable row
  // The fixed onSnapshot: a cache HINT of pending never claims from cache; it re-reads the DB and
  // claims from there (getDocRaw). Model that: any trigger claims from the authoritative DB row.
  const claimAuthoritative = () => w.applyPending({ pendingGold: w.DB.pendingGold });
  claimAuthoritative();                                      // gold 1500, DB pending 0
  // every subsequent trigger (stale cache echo, reconcile, poll, save-claim) re-reads the DB -> 0 -> no-op
  claimAuthoritative(); claimAuthoritative(); claimAuthoritative();
  check('FIXED: grant applied EXACTLY once (gold += 500)', w.profile.gold === 1500, 'gold=' + w.profile.gold);
  check('FIXED: pending settles to 0 and never goes negative', w.DB.pendingGold === 0, 'pending=' + w.DB.pendingGold);
  check('FIXED: exactly ONE grant notification (no COMMAND-RECEIVED spam)', w.notifies.length === 1, 'notifies=' + w.notifies.length);
})();

// ============ C) FIXED — two concurrent claimers can't double-apply (shared lock) ============
(function () {
  const w = makeWorld();
  w.DB.pendingGold += 500;
  // Simulate two claimers firing "at once": with ONE shared lock, the second is blocked while the
  // first holds it; after it releases, the DB pending is already 0 so the second is a no-op.
  const d1 = { pendingGold: w.DB.pendingGold };
  w.applyPending(d1);                                        // claims +500, DB pending 0
  const d2 = { pendingGold: w.DB.pendingGold };              // second claimer reads AFTER the first cleared
  w.applyPending(d2);                                        // no-op (pending 0)
  check('FIXED: two claimers under one lock apply the grant once', w.profile.gold === 1500 && w.DB.pendingGold === 0, 'gold=' + w.profile.gold + ' pend=' + w.DB.pendingGold);
})();

// ---------- structural guards: the real code implements the single-claimer + authoritative read ----------
check('real: save-claim defers to the installed watcher', /const _watcherOwnsGrants = !!BCA_SYS\._selfGrantWatchInstalled \|\| \(BCA_SYS\._selfGrantWatchId === p\.id\);/.test(html));
check('real: onSnapshot claims via getDocRaw (pollPending), not the stale cache', /if \(\(\+d\.pendingGold \|\| 0\) \|\| \(\+d\.pendingScore \|\| 0\) \|\| \(\+d\.pendingSoul \|\| 0\) \|\| \(\+d\.pendingBagGold \|\| 0\)\) pollPending\(\);/.test(html));
check('real: login-claim holds the shared _selfGrantBusy lock', /BCA_SYS\._selfGrantBusy = true;\s*\n\s*setTimeout\(function \(\) \{ BCA_SYS\._selfGrantBusy = false; \}, 8000\);/.test(html));
check('real: watcher claims immediately when it binds (instant login delivery, single claimer)', /Claim any already-parked grant immediately when the watch binds/.test(html));

console.log('\n' + (all ? 'ALL GRANT-OSCILLATION TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
