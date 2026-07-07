// Headless verification for: (1) combat maps apply NO gear buffs (bot strike), (2) presence
// offline detection is clock-skew immune, (3) inventory unequip keeps ownership. Each test
// extracts the REAL code from index.html and runs it against mocks.
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

function extractBlock(startMarker, opener) {
  const s = html.indexOf(startMarker);
  if (s < 0) throw new Error('marker not found: ' + startMarker);
  let i = html.indexOf(opener, s) + 1, depth = 1;
  while (i < html.length && depth > 0) { const c = html[i]; if (c === '{') depth++; else if (c === '}') depth--; i++; }
  return html.slice(html.indexOf(opener, s) + 1, i - 1);
}

let all = true;
function check(n, c, extra) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n + (extra ? ' -> ' + extra : '')); all = c && all; }

/* ---------- TEST 1: bot strike — combat map = NO buffs, weapon map = buffs ---------- */
(function () {
  const body = extractBlock('strike: (b) => {', '{');
  const strike = new Function('BCA_SYS', 'b', body);
  const BCA_SYS = { combat: { wpnProfileCache: {}, getWeaponActionProfile: () => ({ anim: 'wpn-anim-slash' }) }, food: { buffMult: 0.5 } };
  const flatWpn = { id: 'w', buffData: { t: 'flat', val: 100 } };
  const flatArm = { id: 'a', buffData: { t: 'sunfang' } };
  const foodBuff = { short: [{ t: 'flat', val: 50, wearLeft: 1e9, expireAt: Date.now() + 1e9 }], long: [] };
  function mk(type) {
    return { strikes: 0, combo: 0, gearCombo: 0, score: 0, oppScore: 0, tps: 5, leadBonus: 0, startAt: Date.now(),
      map: { type: type, time: 60 }, gear: { wObj: flatWpn, aObj: flatArm, food: JSON.parse(JSON.stringify(foodBuff)) } };
  }
  // combat map: base 10 only, no weapon/armor/food bonus
  const bc = mk('combat'); strike(BCA_SYS, bc);
  check('bot combat map = base points only (no gear buffs)', bc.score === 10, 'score=' + bc.score);
  // weapon map: flat weapon +100 applies -> well above base
  const bw = mk('weapon'); strike(BCA_SYS, bw);
  check('bot weapon map = gear buffs apply', bw.score > 100, 'score=' + bw.score);
})();

/* ---------- TEST 2: real-player scoring gates (regression guard on the source) ---------- */
(function () {
  check('real player: applyBuffs defined from !arenaCombat', /const applyBuffs = !arenaCombat;/.test(html));
  check('real player: armor gated by applyBuffs', /const armr = applyBuffs \? st\.profile\.activeArmor : null;/.test(html));
  check('real player: shield gated by applyBuffs', /const shld = applyBuffs \? st\.profile\.activeShield : null;/.test(html));
  check('real player: deathfire gated by applyBuffs', /const deathfirePrecisionBonus = applyBuffs \? BCA_SYS\.combat\.deathfireStrikeBonus\(\) : 0;/.test(html));
  check('real player: food gated by applyBuffs', /if \(applyBuffs\) weaponBonus \+= BCA_SYS\.food\.strikeBonus/.test(html));
  check('arena loop: deathfire 5% gated to non-combat maps', /if \(c\.map\.type !== 'combat'\) BCA_SYS\.combat\.applyDeathfireFivePercent\('arena'\);/.test(html));
  check('bot: armor/shield/food nulled on combat map', /const armr = noWeapons \? null : b\.gear\.aObj;/.test(html) && /const shld = noWeapons \? null : b\.gear\.sObj;/.test(html) && /const fb = noWeapons \? null : b\.gear\.food;/.test(html));
})();

/* ---------- TEST 3: presence offline detection is CLOCK-SKEW IMMUNE ---------- */
(function () {
  const recordBody = extractBlock('recordHeartbeats: function () {', '{');
  const recomputeBody = extractBlock('P.recomputeOffline = function () {', '{'); // the override version
  const P = { cache: [], _localSeen: {}, _prevTime: {} };
  P.recordHeartbeats = new Function('P', recordBody).bind(null, P);
  P.recomputeOffline = new Function('P', 'Date', recomputeBody).bind(null, P, Date);
  // An ACTIVE player whose device clock runs 10 minutes BEHIND ours. Old logic (now - u.time)
  // would be ~600s > 120s => wrongly offline. With local-seen it must read ONLINE.
  const behind = Date.now() - 600000;
  P.cache = [{ id: 'ACTIVE', time: behind }];
  P.recordHeartbeats(); P.recomputeOffline();
  check('active player with a slow clock is NOT offline', P.cache[0]._offline === false, '_offline=' + P.cache[0]._offline);
  // Simulate a fresh beat (time changes) -> still online, localSeen refreshed
  P.cache = [{ id: 'ACTIVE', time: behind + 6000 }];
  P.recordHeartbeats(); P.recomputeOffline();
  check('active player stays online across beats', P.cache[0]._offline === false);
  // A player who STOPS beating: freeze localSeen in the past -> offline after threshold
  P._localSeen['GONE'] = Date.now() - 130000; P._prevTime['GONE'] = 111; P.cache = [{ id: 'GONE', time: 111 }];
  P.recomputeOffline();
  check('a genuinely stale player IS offline', P.cache[0]._offline === true);
})();

/* ---------- TEST 4: inventory unequip keeps ownership (equipped always visible) ---------- */
(function () {
  const body = extractBlock('INV.unequipGear = function (cat) {', '{');
  const BCA_SYS = { state: { profile: { activeArmor: { id: 'old_armor', name: 'Old Armor' }, ownedArmor: [] } },
    exactVisuals: { clearEquipmentCaches: () => {} }, ui: { notify: () => {}, updateHeader: () => {} },
    storage: { save: () => {}, lastSavedDataStr: 'x' } };
  const INV = { render: () => {} };
  BCA_SYS.inv = INV;
  INV.unequipGear = new Function('BCA_SYS', 'INV', 'cat', body).bind(null, BCA_SYS, INV);
  INV.unequipGear('armor');
  const pf = BCA_SYS.state.profile;
  check('unequip clears the active slot', pf.activeArmor === null);
  check('unequip keeps the item OWNED (so it stays visible)', pf.ownedArmor.indexOf('old_armor') > -1, JSON.stringify(pf.ownedArmor));
  // render block always includes the equipped id even if not owned / not in db (old inv view)
  check('render block prepends the equipped item id', /if \(act && act\.id && ids\.indexOf\(act\.id\) < 0\) ids\.unshift\(act\.id\);/.test(html));
  check('render block falls back to the equipped object when missing from shop.db', /INV\.item\(cat, id\) \|\| \(act && act\.id === id \? act : null\)/.test(html));
})();

/* ---------- TEST 5: ACTIVE inventory (carry) — CURRENTLY WORN always offers UNEQUIP ---------- */
(function () {
  // the real, current inventory UI must render an UNEQUIP button for each equipped slot in the
  // CURRENTLY WORN panel, so anything equipped can ALWAYS be unequipped regardless of whether it
  // is carried in the inventory or present in shop.db.
  const body = extractBlock('function loadoutLine() {', '{');
  check('CURRENTLY WORN builds a per-slot UNEQUIP button when equipped', body.indexOf('BCA_SYS.carry.unequip(') > -1 && /UNEQUIP<\/button>/.test(body));
  check('CURRENTLY WORN renders all three worn slots via slot()', /slot\('weapons'/.test(body) && /slot\('armor'/.test(body) && /slot\('shields'/.test(body));
  // simulate the slot() button logic: equipped -> has UNEQUIP; empty -> no button
  const esc = (s) => String(s);
  const slot = new Function('cat', 'label', 'colorCls', 'act', 'none', 'esc', extractBlock('function slot(cat, label, colorCls, act, none) {', '{'));
  const withArmor = slot('armor', 'Armor', 'x', { id: 'old_armor', name: 'Old Armor' }, 'None', esc);
  const noArmor = slot('armor', 'Armor', 'x', null, 'None', esc);
  check('equipped slot shows UNEQUIP', /UNEQUIP/.test(withArmor) && withArmor.indexOf("unequip('armor','old_armor')") > -1, withArmor.slice(0, 0));
  check('empty slot shows no UNEQUIP', !/UNEQUIP/.test(noArmor));
})();

console.log('\n' + (all ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
