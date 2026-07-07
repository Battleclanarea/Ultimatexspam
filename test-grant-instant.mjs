// Headless verification of the live resource-grant self-watch: a pending grant (gold/score/soul)
// on the player's own doc is applied to the local profile INSTANTLY, and the cloud write keeps
// the classified treasury (gold + pendingGold) exactly consistent (absolute gold + atomic
// increment(-pending)). Extracts the REAL applyPending from index.html.
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

function extractBlock(startMarker, opener) {
  const s = html.indexOf(startMarker);
  if (s < 0) throw new Error('marker not found: ' + startMarker);
  let i = html.indexOf(opener, s) + 1, depth = 1;
  while (i < html.length && depth > 0) { const c = html[i]; if (c === '{') depth++; else if (c === '}') depth--; i++; }
  return html.slice(html.indexOf(opener, s) + 1, i - 1);
}

const body = extractBlock('function applyPending(d, ref, fs) {', '{');

let all = true;
function check(n, c, extra) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n + (extra ? ' -> ' + extra : '')); all = c && all; }

// mock world
globalThis.localStorage = { _d: {}, setItem(k, v) { this._d[k] = v; }, getItem(k) { return this._d[k] || null; } };
const writes = [];
function makeFs() {
  return {
    increment: (n) => ({ __inc: n }),
    setDoc: (ref, upd) => { writes.push(JSON.parse(JSON.stringify(upd))); return Promise.resolve(); }
  };
}
function makeS(profile) {
  return {
    _selfGrantBusy: false,
    state: { profile, scoreDropPending: false },
    hq: { barracksData: [], recomputeMember() {} },
    ui: { updateHeader() {}, notify() {} },
    storage: { lastSavedDataStr: 'x', save() {} }
  };
}

// scenario 1: gold grant applies locally + cloud stays consistent (absolute gold + clear pending)
(function () {
  writes.length = 0;
  const S = makeS({ id: 'P', gold: 5000, score: 100, soulScore: 200 });
  const applyPending = new Function('S', 'localStorage', 'setTimeout', 'return ' + '(function applyPending(d, ref, fs) {' + body + '})')(S, globalThis.localStorage, (fn) => {});
  applyPending({ pendingGold: 1000 }, {}, makeFs());
  check('gold grant applied to local profile instantly', S.state.profile.gold === 6000, 'gold=' + S.state.profile.gold);
  const w = writes[0] || {};
  check('cloud write sets absolute gold = new total', w.gold === 6000, 'w.gold=' + w.gold);
  check('cloud write clears pendingGold via increment(-amt)', w.pendingGold && w.pendingGold.__inc === -1000, JSON.stringify(w.pendingGold));
  // classified treasury formula gold + pendingGold stays exact: 6000 + (cleared) === 6000
  check('treasury (gold + pendingGold) stays exact', (w.gold) === 6000);
})();

// scenario 2: score + soul grant applied; negative sets scoreDropPending
(function () {
  writes.length = 0;
  const S = makeS({ id: 'P', gold: 0, score: 100, soulScore: 200 });
  const applyPending = new Function('S', 'localStorage', 'setTimeout', 'return ' + '(function applyPending(d, ref, fs) {' + body + '})')(S, globalThis.localStorage, (fn) => {});
  applyPending({ pendingScore: 500, pendingSoul: 700 }, {}, makeFs());
  check('score grant applied', S.state.profile.score === 600, 'score=' + S.state.profile.score);
  check('soul grant applied', S.state.profile.soulScore === 900, 'soul=' + S.state.profile.soulScore);
})();

// scenario 3: busy flag prevents double-apply while a claim is in flight
(function () {
  writes.length = 0;
  const S = makeS({ id: 'P', gold: 100, score: 0, soulScore: 0 });
  const applyPending = new Function('S', 'localStorage', 'setTimeout', 'return ' + '(function applyPending(d, ref, fs) {' + body + '})')(S, globalThis.localStorage, (fn) => {});
  S._selfGrantBusy = true; // simulate an in-flight claim
  applyPending({ pendingGold: 999 }, {}, makeFs());
  check('busy flag blocks re-entrant application', S.state.profile.gold === 100 && writes.length === 0, 'gold=' + S.state.profile.gold);
})();

// scenario 4: zero pending is a no-op
(function () {
  writes.length = 0;
  const S = makeS({ id: 'P', gold: 100, score: 0, soulScore: 0 });
  const applyPending = new Function('S', 'localStorage', 'setTimeout', 'return ' + '(function applyPending(d, ref, fs) {' + body + '})')(S, globalThis.localStorage, (fn) => {});
  applyPending({ pendingGold: 0, pendingScore: 0, pendingSoul: 0 }, {}, makeFs());
  check('no pending = no write, no change', writes.length === 0 && S.state.profile.gold === 100);
})();

// regression: classified treasury still reads gold + pendingGold
check('treasury audit reads gold + pendingGold', /g:\s*\(u\.gold \|\| 0\) \+ \(u\.pendingGold \|\| 0\)/.test(html));
// the live self-watch is wired into initHQ
check('self-watch started from initHQ', /setTimeout\(startWatch, 3000\)/.test(html) && /S\._selfGrantWatchInstalled/.test(html));

console.log('\n' + (all ? 'ALL GRANT TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
