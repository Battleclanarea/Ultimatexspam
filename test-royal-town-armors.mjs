// Guards that the 30 ultra-mythic Royal Town armors are wired into the WARLORD BAZAAR and injected
// robustly. The Royal Town has several stacked render overhauls that rebuild the shop grid, so a
// single render-wrap is unreliable; a self-healing watchdog re-asserts the cards.
import fs from 'fs';
const code = fs.readFileSync(new URL('./royal-town-armors.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let all = true;
function check(n, c, extra) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n + (extra != null ? ' -> ' + extra : '')); all = c && all; }

// The pack is actually loaded by index.html.
check('royal-town-armors.js is loaded by index.html', /royal-town-armors\.js\?v=/.test(html));

// Target shop is the Warlord Bazaar (not the old Dread Plate Hall).
check('armors target the WARLORD BAZAAR', /var TARGET_SHOP = 'warlord';/.test(code) && !/var TARGET_SHOP = 'dread';/.test(code));

// The full set of armors is defined and registered into shop.db.
const armorCount = (code.match(/id: 'tn_myth_/g) || []).length;
check('at least 30 ultra-mythic armors are defined', armorCount >= 30, armorCount);
check('armors are registered into shop.db.armor', /S\.db\.armor\.push\(\{ id: a\.id/.test(code));
check('each armor registers its unique legendaryArt', /S\.legendaryArt\[a\.id\] = /.test(code));

// The DOM injector is guarded to the target shop, idempotent, and routes buys through the shop.
check('injector only fills the target shop', /if \(T\.currentShop !== TARGET_SHOP\) return;/.test(code));
check('injector is idempotent (skips ids already in the grid)', /grid\.querySelector\('\[data-myth-id="' \+ a\.id \+ '"\]'\)/.test(code));
check('purchase routes through the town buyMixed', /buyMixed\(\\'armor\\','' + "?" + "?" /.test(code) || /buyMixed\(\\'armor\\'/.test(code));

// Robust self-healing watchdog: re-wraps the (repeatedly-replaced) renderers AND re-injects.
check('renderers are wrapped for an immediate paint', /function wrapRenderers\(\)/.test(code) && /T\.render\._mythArmors = true;/.test(code) && /T\.openShop\._mythArmors = true;/.test(code));
check('a self-healing watchdog re-wraps + re-injects on an interval', /setInterval\(function \(\) \{ try \{ wrapRenderers\(\); domInjectTownArmors\(\); \} catch \(e\) \{\} \}, 700\);/.test(code));
check('shop.db records are re-added after a generateDB rebuild', /S\.generateDB\._mythArmors = true;/.test(code));

console.log('\n' + (all ? 'ALL ROYAL-TOWN-ARMORS TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
