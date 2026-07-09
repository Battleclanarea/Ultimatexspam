// Regression test for the "COMMAND RECEIVED/ADJUSTMENT spam + scores jumping/dropping" bug.
// Cause: the live self-grant watcher (applyPending) AND the save-time claim both consumed the
// same pending increment() field, over-shooting it and flipping it +x/-x forever. The fix makes
// the save-time claim DEFER to the watcher when the watcher owns this account. This test runs the
// REAL applyPending against a mock cloud doc and shows: (a) the watcher alone settles pending to
// exactly the grant with ONE notification, and (b) a second concurrent claimer over-claims (the
// bug we prevent), and (c) the source no longer lets the save-time claim run when the watcher owns.
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

let all = true;
function check(n, c, extra) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n + (extra ? ' -> ' + extra : '')); all = c && all; }

function extractBlock(hay, startMarker) {
  const s = hay.indexOf(startMarker); if (s < 0) throw new Error('not found: ' + startMarker);
  const opener = hay.indexOf('{', s); let i = opener + 1, depth = 1;
  while (i < hay.length && depth > 0) { const c = hay[i]; if (c === '{') depth++; else if (c === '}') depth--; i++; }
  return hay.slice(opener + 1, i - 1);
}

globalThis.localStorage = { _d: {}, setItem(k, v) { this._d[k] = v; }, getItem(k) { return this._d[k] || null; } };
const body = extractBlock(html, 'function applyPending(d, ref, fs) {');

// mock cloud doc + a Firestore-like fs that applies increments and plain values
function makeWorld(profile) {
  const doc = { score: profile.score, soulScore: profile.soulScore, gold: profile.gold, bag: { gold: (profile.bag && profile.bag.gold) || 0 }, pendingScore: 0, pendingSoul: 0, pendingGold: 0, pendingBagGold: 0 };
  let notifies = 0;
  const S = {
    _selfGrantBusy: false,
    state: { profile, scoreDropPending: false },
    hq: { barracksData: [], recomputeMember() {} },
    ui: { updateHeader() {}, notify() { notifies++; } },
    storage: { lastSavedDataStr: 'x', save() {} }
  };
  const fsm = {
    increment: (n) => ({ __inc: n }),
    setDoc: (ref, upd) => { Object.keys(upd).forEach(k => { const v = upd[k]; if (v && typeof v === 'object' && '__inc' in v) doc[k] = (doc[k] || 0) + v.__inc; else if (v && typeof v === 'object' && k === 'bag') doc.bag = Object.assign({}, doc.bag, v); else doc[k] = v; }); return Promise.resolve(); }
  };
  const applyPending = new Function('S', 'localStorage', 'setTimeout', 'return (function applyPending(d, ref, fs){' + body + '})')(S, globalThis.localStorage, () => {});
  return { doc, S, fsm, applyPending, notifies: () => notifies };
}

// (1) WATCHER-ONLY (the fixed online path): a grant is claimed exactly once, settles to 0.
(function () {
  const w = makeWorld({ id: 'P', score: 1000, soulScore: 0, gold: 0 });
  w.doc.pendingScore = 100;
  // watcher fires on the doc change
  w.applyPending({ pendingScore: w.doc.pendingScore }, {}, w.fsm);
  w.S._selfGrantBusy = false; // clear busy (the real done() runs after the write settles)
  // watcher fires again from its own clearing write
  w.applyPending({ pendingScore: w.doc.pendingScore }, {}, w.fsm);
  check('watcher-only: score applied exactly once', w.S.state.profile.score === 1100, 'score=' + w.S.state.profile.score);
  check('watcher-only: pendingScore settles to 0', w.doc.pendingScore === 0, 'pend=' + w.doc.pendingScore);
  check('watcher-only: exactly one COMMAND notification', w.notifies() === 1, 'notifies=' + w.notifies());
})();

// (2) DOUBLE-CLAIM (the bug we prevent): a save-time claimer reads the SAME stale pending and also
//     applies it -> over-claim + a NEGATIVE pending left behind (which is what triggers the endless
//     "COMMAND ADJUSTMENT" and the score jumping).
(function () {
  const w = makeWorld({ id: 'P', score: 1000, soulScore: 0, gold: 0 });
  w.doc.pendingScore = 100;
  const stale = w.doc.pendingScore; // both claimers read this before either clears
  // save-time claim (mirrors the ungated code): claims independently
  w.doc.pendingScore += -stale; w.S.state.profile.score += stale;
  // watcher also fires on its stale snapshot
  w.applyPending({ pendingScore: stale }, {}, w.fsm);
  check('double-claim over-applies the score (demonstrates the bug)', w.S.state.profile.score === 1200, 'score=' + w.S.state.profile.score);
  check('double-claim leaves a NEGATIVE pending (fuels the oscillation)', w.doc.pendingScore === -100, 'pend=' + w.doc.pendingScore);
})();

// (3) The source now defers ALL save-time currency claims to the watcher when it owns the account.
check('save-time claim computes _watcherOwnsGrants', /const _watcherOwnsGrants = \(BCA_SYS\._selfGrantWatchId === p\.id\);/.test(html));
check('gold save-claim gated by watcher ownership', /if \(pend !== 0 && !_watcherOwnsGrants\)/.test(html));
check('bag-gold save-claim gated by watcher ownership', /if \(pendBag !== 0 && !BCA_SYS\.storage\.bagGoldClaimBusy && !_watcherOwnsGrants\)/.test(html));
check('score/soul save-claim gated by watcher ownership', /if \(\(pendSc !== 0 \|\| pendSl !== 0\) && !_watcherOwnsGrants\)/.test(html));

console.log('\n' + (all ? 'ALL GRANT-LOOP TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
