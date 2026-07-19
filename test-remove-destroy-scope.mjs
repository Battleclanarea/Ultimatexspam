// Structural guards (pure Node) for the customizable REMOVE / DESTROY ITEM admin feature in
// index.html: a scope choice between removing an item from ONE player vs destroying it globally
// (shop + every player). The global path routes to Forge Studio's tombstone (which now vanishes
// the item on every client - see test-item-destroy-boost.mjs).
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let all = true;
function check(n, c) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n); all = c && all; }

check('removeOrDestroy dispatcher exists', /S\.admin\.removeOrDestroy = function \(name, cat, idOrName, scope\)/.test(html));
check('global scope routes to Forge Studio permanent destroy', /if \(scope === 'global'\)[\s\S]*?S\.forgeStudio\.destroyItem\(cat, id\);/.test(html));
check('player scope routes to per-player removal', /\/\/ per-player removal[\s\S]*?return S\.admin\.destroyItem\(name, cat, idOrName\);/.test(html));
check('admin panel offers a scope selector', /id="adi-scope-2ff8"/.test(html) && /REMOVE FROM ONE PLAYER ONLY/.test(html) && /DESTROY GLOBALLY \(SHOP \+ ALL PLAYERS\)/.test(html));
check('panel button calls removeOrDestroy with the chosen scope', /removeOrDestroy\([\s\S]{0,400}adi-scope-2ff8[\s\S]{0,40}\)\.value/.test(html));
check('panel title reflects remove OR destroy', /REMOVE \/ DESTROY ITEM/.test(html));

console.log('\n' + (all ? 'ALL REMOVE/DESTROY-SCOPE TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
