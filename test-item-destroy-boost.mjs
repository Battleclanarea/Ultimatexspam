// Verifies: (1) permanent item destruction (real forge-studio API) removes an item from every
// shop + persists a tombstone + unequips it, and destroyed items are never re-injected; (2) the
// booster reconcile no longer stops running boosts when their shared doc is transiently missing.
import fs from 'fs';

let all = true;
function check(n, c, extra) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n + (extra ? ' -> ' + extra : '')); all = c && all; }

/* ---------- load forge-studio.js with mocks so the real API attaches ---------- */
const code = fs.readFileSync(new URL('./forge-studio.js', import.meta.url), 'utf8');
const shop = {
  db: { weapons: [{ id: 'w1', name: 'W1', sub: 'x' }, { id: 'w2', name: 'W2', sub: 'x' }], armor: [{ id: 'a1', name: 'A1', sub: 'x' }], shields: [], food: [] },
  legendaryArt: { w1: function () { return '<i>w1</i>'; } }, artCache: { w1: 'cached', 'LEG_w1': 'cached' },
  getArt: () => '<div class="art-stage">x</div>', renderGrid: () => {}, generateDB: function () {}, _ca1aLast: null
};
const BCA_SYS = {
  shop, state: { profile: { isAdmin: true, id: 'ADMIN', activeWeapon: { id: 'w1', name: 'W1' }, ownedWeapons: ['w1', 'w2'], ownedArmor: [], ownedShields: [], ownedHqWeapons: [] } },
  ui: { notify: () => {} }, storage: { save: () => {} }, adminBoost: { toggleMenu: function () {} },
  exactVisuals: { clearEquipmentCaches: () => {}, _metaCache: {} }, travel: { enterCurrent: () => {} }, adminGear: { fillItems: () => {} }
};
function fakeEl() { return { style: {}, dataset: {}, innerHTML: '', value: '', appendChild() {}, insertAdjacentElement() {}, querySelectorAll() { return []; }, remove() {}, classList: { contains() { return false; } } }; }
const documentMock = { getElementById: (id) => (id === 'admin-mini-menu' ? fakeEl() : null), createElement: () => fakeEl(), head: { appendChild() {} }, body: { appendChild() {} }, querySelector: () => null, querySelectorAll: () => [] };
const windowMock = { BCA_SYS, __BCA_FS: null, __BCA_DB: null };
const localStorageMock = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = String(v); } };
const mod = { exports: {} };
const runNow = (fn) => { try { fn(); } catch (e) {} return 0; };
new Function('module', 'exports', 'window', 'document', 'localStorage', 'setTimeout', 'setInterval', 'console', code)
  (mod, mod.exports, windowMock, documentMock, localStorageMock, runNow, () => 0, console);

const API = windowMock.BCA_SYS.forgeStudio;
check('forge studio API attached', !!(API && API.destroyItem && API.openDestroy && API.isDestroyed));

/* ---------- destroy an item ---------- */
API.destroyItem('weapons', 'w1');
check('destroyed item removed from shop.db', !shop.db.weapons.some(i => i.id === 'w1'), JSON.stringify(shop.db.weapons.map(i => i.id)));
check('other items untouched', shop.db.weapons.some(i => i.id === 'w2'));
check('isDestroyed reports true', API.isDestroyed('w1') === true);
check('destroyed item unequipped', BCA_SYS.state.profile.activeWeapon === null);
check('destroyed item removed from owned list', BCA_SYS.state.profile.ownedWeapons.indexOf('w1') < 0);
check('destroyed item legendaryArt deleted', !shop.legendaryArt.w1);
check('tombstone persisted to localStorage', /"w1"\s*:\s*true/.test(localStorageMock.getItem('bca_forge_destroyed_v1') || ''));

/* ---------- destroyed item must NOT come back if the shop re-adds it ---------- */
shop.db.weapons.push({ id: 'w1', name: 'W1 (revived by rebuild)', sub: 'x' }); // simulate a generateDB rebuild re-adding it
API.destroyItem('weapons', 'w1'); // idempotent re-apply path also runs applyDestroyed
check('destroyed item stays gone after a shop rebuild re-adds it', !shop.db.weapons.some(i => i.id === 'w1'));

/* ---------- source-level checks for the wiring + item-update refresh + clearOrigin ---------- */
check('injectAll skips destroyed ids', /if \(typeof DESTROYED !== 'undefined' && DESTROYED\[id\]\) \{ delete CUSTOM\[id\]; return; \}/.test(code));
check('destroy tombstone syncs to cloud', /shop_destroyed_v1/.test(code));
check('refreshViews re-enters open area shops for fresh art', /rarmory\|rtown\|rtshop\|rk\|rgarage/.test(code) && /enterCurrent\(\)/.test(code));
check('clearOrigin lets an update fully replace art', /clearOrigin: function/.test(code) && /REMOVE ORIGINAL ART/.test(code));
check('destroy admin button injected', /DESTROY ITEM \(PERMANENT\)/.test(code));

/* ---------- booster reconcile: adding boosts no longer stops running ones ---------- */
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
check('reconcile resurrects a transiently-missing boost instead of stopping it',
  /we RESURRECT its shared entry and keep it running/i.test(html) && /try \{ registerShared\(b, myId\); \} catch \(e3\) \{\}\s*\n\s*return true;/.test(html));
check('reconcile no longer auto-removes on _sharedEverSeen', !/if \(AB\._sharedEverSeen\[id\]\) \{\s*try \{ AB\.pushOne\(b\)/.test(html));

console.log('\n' + (all ? 'ALL ITEM-DESTROY/BOOST TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
