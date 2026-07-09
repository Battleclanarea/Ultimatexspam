// Verifies: (1) admin BAG GOLD grant/deduct pipeline (functional test of the real applyPending),
// (2) GIVE list includes civilians by delegating to the presence room logic, (3) armor exact-art
// fix (wornArmorArtFor used so avatars never show a generic basic armor), (4) item-editor keeps
// existing abilities on art-only edits and supports a custom description.
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const forge = fs.readFileSync(new URL('./forge-studio.js', import.meta.url), 'utf8');

let all = true;
function check(n, c, extra) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n + (extra ? ' -> ' + extra : '')); all = c && all; }

function extractBlock(hay, startMarker) {
  const s = hay.indexOf(startMarker);
  if (s < 0) throw new Error('marker not found: ' + startMarker);
  const opener = hay.indexOf('{', s);
  let i = opener + 1, depth = 1;
  while (i < hay.length && depth > 0) { const c = hay[i]; if (c === '{') depth++; else if (c === '}') depth--; i++; }
  return hay.slice(opener + 1, i - 1);
}

// ===== 1) BAG GOLD — functional test of the real applyPending =====
const body = extractBlock(html, 'function applyPending(d, ref, fs) {');
globalThis.localStorage = { _d: {}, setItem(k, v) { this._d[k] = v; }, getItem(k) { return this._d[k] || null; } };
function makeFs() { const writes = []; return { writes, increment: (n) => ({ __inc: n }), setDoc: (ref, upd) => { writes.push(JSON.parse(JSON.stringify(upd))); return Promise.resolve(); } }; }
function makeS(profile) { return { _selfGrantBusy: false, state: { profile, scoreDropPending: false }, hq: { barracksData: [], recomputeMember() {} }, ui: { updateHeader() {}, notify() {} }, storage: { lastSavedDataStr: 'x', save() {} } }; }
function buildApply(S) { return new Function('S', 'localStorage', 'setTimeout', 'return (function applyPending(d, ref, fs) {' + body + '})')(S, globalThis.localStorage, () => {}); }

// (a) positive bag grant lands in profile.bag.gold and clears the cloud field atomically
(function () {
  const S = makeS({ id: 'P', gold: 100, score: 0, soulScore: 0, bag: { gold: 5000, weapons: ['w1'] } });
  const fsm = makeFs();
  buildApply(S)({ pendingBagGold: 2500 }, {}, fsm);
  check('bag grant applied to profile.bag.gold', S.state.profile.bag.gold === 7500, 'bag=' + S.state.profile.bag.gold);
  const w = fsm.writes[0] || {};
  check('cloud write sets absolute bag.gold', w.bag && w.bag.gold === 7500, JSON.stringify(w.bag));
  check('cloud write clears pendingBagGold via increment(-amt)', w.pendingBagGold && w.pendingBagGold.__inc === -2500, JSON.stringify(w.pendingBagGold));
  check('bag grant leaves vault gold untouched', S.state.profile.gold === 100, 'gold=' + S.state.profile.gold);
})();

// (b) negative bag deduction (take gold from a bag), never below 0
(function () {
  const S = makeS({ id: 'P', gold: 0, score: 0, soulScore: 0, bag: { gold: 1000 } });
  buildApply(S)({ pendingBagGold: -400 }, {}, makeFs());
  check('bag deduction applied', S.state.profile.bag.gold === 600, 'bag=' + S.state.profile.bag.gold);
})();

// (c) bag grant works even if the profile had no bag yet
(function () {
  const S = makeS({ id: 'P', gold: 0, score: 0, soulScore: 0 });
  buildApply(S)({ pendingBagGold: 999 }, {}, makeFs());
  check('bag created on the fly for a bag grant', S.state.profile.bag && S.state.profile.bag.gold === 999, JSON.stringify(S.state.profile.bag));
})();

// (d) mixed vault + bag grant both apply
(function () {
  const S = makeS({ id: 'P', gold: 10, score: 0, soulScore: 0, bag: { gold: 10 } });
  buildApply(S)({ pendingGold: 5, pendingBagGold: 7 }, {}, makeFs());
  check('vault + bag grants both apply', S.state.profile.gold === 15 && S.state.profile.bag.gold === 17, 'gold=' + S.state.profile.gold + ' bag=' + S.state.profile.bag.gold);
})();

// ===== structural assertions on the admin grant + claim wiring =====
check('admin UI has BAG GOLD option', /<option value="pendingBagGold">BAG GOLD/.test(html));
check('giveResource applies bag gold to self via INV', /type === 'pendingBagGold'[\s\S]*?BCA_SYS\.inv\.load\(\)/.test(html));
check('giveResource guards score-only deduction paths (isScoreType)', /const isScoreType = \(type === 'pendingScore' \|\| type === 'pendingSoul'\);/.test(html) && /if \(amt < 0 && isScoreType\)/.test(html));
check('login-time claim handles pendingBagGold', /const pendBag = snap\.data\(\)\.pendingBagGold \|\| 0;/.test(html) && /p\.bag\.gold = Math\.max\(0, \(p\.bag\.gold \|\| 0\) \+ pendBag\)/.test(html));

// ===== 2) GIVE — civilians included via presence room logic =====
check('GF.nearby delegates to the presence P.inRoom list (includes civilians)', /if \(P\.inRoom && P\.currentRoom\)[\s\S]*?P\.inRoom\(P\.currentRoom\(\)\)/.test(html));
check('GF.nearby only excludes self (no civilian filter)', /u\.id !== meId && !seen\[u\.id\]/.test(html));

// ===== 3) ARMOR — exact art everywhere =====
check('wornArmorArtFor helper defined', /function wornArmorArtFor\(arm\) \{/.test(html));
// functional: stripCardToHeld removes the display pedestal + card chrome, keeps the svg art
const stripBody = extractBlock(html, 'function stripCardToHeld(html, cls) {');
const stripFn = new Function('html', 'cls', stripBody);
(function () {
  const card = '<div class="art-stage"><span class="rarity-tag">MYTHIC</span><svg viewBox="0 0 120 170"><g class="forge-stand"><rect/></g><path d="M1 1"/></svg></div>';
  const held = stripFn(card, 'worn-armor-svg');
  check('stripCardToHeld keeps the svg art', /<svg[^>]*worn-armor-svg/.test(held) && /<path d="M1 1"\/>/.test(held));
  check('stripCardToHeld removes the display pedestal', held.indexOf('forge-stand') < 0);
})();
check('fittedGear uses wornArmorArtFor for non-registered armor (no grey substitute)', /var _worn = wornArmorArtFor\(arm\);\s*\n\s*if \(_worn\) \{ aSlot\.innerHTML = _worn; aSlot\.classList\.add\('fitted-special-armor'\); \}/.test(html));
check('fitRigNow uses wornArmorArtFor too', /var _wa = wornArmorArtFor\(arm\); if \(_wa\)/.test(html));

// ===== 4) ITEM EDITOR — abilities preserved + description =====
check('editor has a description textarea', /id="fs-desc"/.test(forge));
check('meta() reads the description field', /var de = document\.getElementById\('fs-desc'\); if \(de\) ED\.desc = de\.value;/.test(forge));
check('stat()/ability() mark statsDirty', /stat: function \(\) \{ ED\.statsDirty = true;/.test(forge) && /ability: function \(k\) \{ ED\.statsDirty = true;/.test(forge));
check('_openPick preserves the item\'s existing buffData/desc', /ED\.origBuffData = item\.buffData \? JSON\.parse/.test(forge) && /ED\.origBuffDesc = item\.buffDesc \|\| item\.desc \|\| '';/.test(forge));
check('save() keeps original abilities on art-only edits', /var keepOrig = \(ED\.mode === 'upgrade' && !ED\.statsDirty\);/.test(forge) && /def\.buffData = \(keepOrig && ED\.origBuffData\) \? ED\.origBuffData : bb\.buffData;/.test(forge));
check('save() honors a custom description', /var desc = \(ED\.desc && ED\.desc\.trim\(\)\)/.test(forge));

console.log('\n' + (all ? 'ALL GIVE/BAG/ARMOR/EDITOR TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
