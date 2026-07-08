// Headless verification of the SCORE AUTHORITY block (lock / unlock / baked-in baseline).
// Runs the REAL block extracted from index.html against a faithful mock of BCA_SYS.hq,
// including a page-refresh simulation (persisted localStorage, fresh in-memory roster)
// to prove the reported bug is fixed: lock -> unlock -> refresh must NOT re-raise the
// score back to the hardcoded roster floor. Also proves an online locked player's own
// save can no longer push their score back up over the lock.
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

// ---- extract the SCORE AUTHORITY <script> body ----
const mi = html.indexOf('_scoreAuthority2ff8');
if (mi < 0) throw new Error('SCORE AUTHORITY marker not found');
const scriptOpen = html.lastIndexOf('<script>', mi);
const scriptClose = html.indexOf('</script>', mi);
const blockJs = html.slice(scriptOpen + '<script>'.length, scriptClose);

let all = true;
function check(n, c, extra) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n + (extra ? ' -> ' + extra : '')); all = c && all; }

// ---- shared persistent localStorage across "refreshes" ----
const store = {};
const localStorage = { setItem(k, v) { store[k] = String(v); }, getItem(k) { return store[k] != null ? store[k] : null; }, removeItem(k) { delete store[k]; } };

// faithful copy of the real recomputeMember formula (index.html ~4107)
function realRecompute(m) {
  const floor = Math.max(m.base !== undefined ? m.base : 0, m.userScore !== undefined ? m.userScore : 0, m.engineScore !== undefined ? m.engineScore : 0);
  const v = Math.max(0, floor + (m.pendingBoost !== undefined ? m.pendingBoost : 0));
  if (v !== m.score) { m.score = v; return true; }
  return false;
}

// Build a fresh mock world + boot the real block. `roster` = [{name, score}] with base
// pre-set to the hardcoded value (as initSim does at HQ load / after a refresh).
function bootWorld(profileId, roster) {
  const barracksData = [{ id: 'b_d', name: 'Barracks D', members: roster.map(r => ({ name: r.name, score: r.score, base: r.score })) }];
  const savedCloud = {}; // not used offline
  const S = {
    state: { profile: { id: profileId, score: 0, soulScore: 0 } },
    hq: {
      barracksData,
      recomputeMember: realRecompute,
      sortAndRender() {}, renderBarracks() {},
      getHardcodedScore(id) { const k = String(id).toUpperCase(); for (const b of barracksData) for (const m of b.members) if (m.name.toUpperCase() === k) return m.score; return 0; },
    },
    ui: { notify() {}, updateHeader() {} },
    utils: { logEvent() {} },
    adminBoost: { toggleMenu() {} },
    storage: {
      lastSavedDataStr: '',
      _saved: null,
      save() { this._saved = { score: S.state.profile.score, soulScore: S.state.profile.soulScore }; return Promise.resolve(); },
      load() { return Promise.resolve(); }
    },
    admin: {}
  };
  const window = { BCA_SYS: S, __BCA: { hidden: () => true } };
  const document = { getElementById() { return null; } };
  const noopTimer = () => 0;
  const fn = new Function('window', 'document', 'localStorage', 'setTimeout', 'setInterval', 'console',
    blockJs + '\n;return window.BCA_SYS;');
  fn(window, document, localStorage, noopTimer, noopTimer, console);
  return S;
}

const HARDCODED = 2145122;

// ===== Scenario A: lock -> member pinned to exact value =====
(function () {
  const S = bootWorld('ADMIN', [{ name: 'Crystal', score: HARDCODED }]);
  const crystal = () => S.hq.barracksData[0].members.find(m => m.name === 'Crystal');
  S.admin.lockScore('CRYSTAL', 500000);
  check('lock sets member to exact locked value', crystal().score === 500000, 'score=' + crystal().score);
  // a later render/sync recompute must keep it locked (not drift to hardcoded)
  S.hq.recomputeMember(crystal());
  check('locked value survives a later recompute', crystal().score === 500000, 'score=' + crystal().score);
})();

// ===== Scenario B: lock -> unlock (same session) keeps value, does not raise =====
(function () {
  const S = bootWorld('ADMIN', [{ name: 'Crystal', score: HARDCODED }]);
  const crystal = () => S.hq.barracksData[0].members.find(m => m.name === 'Crystal');
  S.admin.lockScore('CRYSTAL', 500000);
  S.admin.unlockScore('CRYSTAL');
  check('unlock (same session) holds the value', crystal().score === 500000, 'score=' + crystal().score);
  S.hq.recomputeMember(crystal());
  check('unlocked value not re-raised by recompute', crystal().score === 500000, 'score=' + crystal().score);
})();

// ===== Scenario C: THE BUG — lock -> unlock -> REFRESH must not re-raise =====
(function () {
  // refresh 1: lock low, then unlock
  let S = bootWorld('ADMIN', [{ name: 'Crystal', score: HARDCODED }]);
  S.admin.lockScore('CRYSTAL', 500000);
  S.admin.unlockScore('CRYSTAL');
  // refresh 2: brand-new in-memory roster at the ORIGINAL hardcoded value (as after reload),
  // but persisted localStorage baseline should hold it down.
  S = bootWorld('ADMIN', [{ name: 'Crystal', score: HARDCODED }]);
  const crystal = () => S.hq.barracksData[0].members.find(m => m.name === 'Crystal');
  // simulate the barracks re-render / live user sync recompute after boot
  S.hq.recomputeMember(crystal());
  check('AFTER REFRESH: score stays at unlocked value (NOT re-raised)', crystal().score === 500000, 'score=' + crystal().score);
  check('AFTER REFRESH: getHardcodedScore returns baseline, not hardcoded', S.hq.getHardcodedScore('CRYSTAL') === 500000, 'val=' + S.hq.getHardcodedScore('CRYSTAL'));
})();

// ===== Scenario D: raising via lock also persists across refresh =====
(function () {
  let S = bootWorld('ADMIN', [{ name: 'Pain', score: 100 }]);
  S.admin.lockScore('PAIN', 9000000);
  S.admin.unlockScore('PAIN');
  S = bootWorld('ADMIN', [{ name: 'Pain', score: 100 }]);
  const pain = () => S.hq.barracksData[0].members.find(m => m.name === 'Pain');
  S.hq.recomputeMember(pain());
  check('AFTER REFRESH: raised-then-unlocked value holds', pain().score === 9000000, 'score=' + pain().score);
})();

// ===== Scenario E: clearScoreBase restores the hardcoded default =====
(function () {
  let S = bootWorld('ADMIN', [{ name: 'Crystal', score: HARDCODED }]);
  S.admin.lockScore('CRYSTAL', 500000);
  S.admin.unlockScore('CRYSTAL');
  S.admin.clearScoreBase('CRYSTAL');
  S = bootWorld('ADMIN', [{ name: 'Crystal', score: HARDCODED }]);
  const crystal = () => S.hq.barracksData[0].members.find(m => m.name === 'Crystal');
  S.hq.recomputeMember(crystal());
  check('AFTER clearBaseline + refresh: hardcoded value restored', crystal().score === HARDCODED, 'score=' + crystal().score);
})();

// ===== Scenario F: online self-lock — the locked player's own save cannot push score up =====
(function () {
  const S = bootWorld('CRYSTAL', [{ name: 'Crystal', score: HARDCODED }]);
  S.state.profile.score = 9999999; // player's own client thinks it is huge
  S.state.profile.soulScore = 9999999;
  S.admin.lockScore('CRYSTAL', 500000); // admin locks (same device here for the test)
  S.state.profile.score = 9999999; // player keeps spamming, local score climbs again
  S.storage.save(); // autosave — the enforce wrapper must clamp to the lock first
  check('online: save clamps own score to the lock', S.storage._saved.score === 500000, 'saved=' + S.storage._saved.score);
})();

console.log('\n' + (all ? 'ALL SCORE-LOCK TESTS PASSED' : 'SOME SCORE-LOCK TESTS FAILED'));
process.exit(all ? 0 : 1);
