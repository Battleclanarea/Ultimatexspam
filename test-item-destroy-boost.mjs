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

/* ---------- a destroyed item must VANISH for a DIFFERENT owner (not just the admin), ---------- */
/* ---------- including inventory space (owned + bag) and equipped points -------------------- */
// Simulate another player who owned w2 (equipped, in owned list, and in both bag zones). When the
// destroy machinery runs on THEIR client (applyDestroyed, fired by the shop_destroyed_v1 cloud
// sync / 6s tick), the item must be stripped from everywhere so they lose the slot and can no
// longer gain points from the equipped copy.
// (isAdmin only gates who can TRIGGER a destroy; the cross-client purge itself runs in
// applyDestroyed with no admin check - fired on every client by the shop_destroyed_v1 cloud sync.
// We keep isAdmin here just so this test can trigger the same applyDestroyed purge path.)
BCA_SYS.state.profile = {
  id: 'OTHERPLAYER', isAdmin: true, activeWeapon: { id: 'w2', name: 'W2', buffData: { t: 'flat', val: 50 } },
  ownedWeapons: ['w2'], ownedArmor: [], ownedShields: [], ownedHqWeapons: [],
  bag: { weapons: ['w2', { id: 'w2' }], armor: [], shields: [], __cw: { inv: { weapons: [{ id: 'w2' }] }, stash: { weapons: [{ id: 'w2' }] } } },
};
API.destroyItem('weapons', 'w2');
check('destroyed item unequipped for another owner (no more points)', BCA_SYS.state.profile.activeWeapon === null);
check('destroyed item removed from another owner\'s owned list (slot freed)', BCA_SYS.state.profile.ownedWeapons.indexOf('w2') < 0);
check('destroyed item purged from legacy bag arrays', !BCA_SYS.state.profile.bag.weapons.some(x => (typeof x === 'string' ? x : (x && x.id)) === 'w2'));
check('destroyed item purged from carry inv + stash', BCA_SYS.state.profile.bag.__cw.inv.weapons.length === 0 && BCA_SYS.state.profile.bag.__cw.stash.weapons.length === 0);
// applyDestroyed (which every client runs on cloud sync) is what strips other owners
check('applyDestroyed purges the local profile on every client', /try \{ if \(unequipEverywhereLocal\(id\)\) purged = true; \} catch \(e\) \{\}/.test(code));
check('unequipEverywhereLocal also strips the bag (legacy + carry)', /b\.__cw/.test(code) && /function unequipEverywhereLocal/.test(code));

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
