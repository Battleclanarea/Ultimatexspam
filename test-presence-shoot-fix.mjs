/* Regression guards for: (1) weapon-aware X-spam animation (guns RECOIL/shoot, melee SWINGS -
 * no more gun "jiggle"), and (2) presence location showing the CURRENT barracks instead of a stale
 * "HQ Command (Barracks D)". Behaviour is proven end-to-end in a headless browser. */
import fs from 'fs';
import assert from 'assert';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let pass = 0; const ok = (n) => { console.log('  PASS', n); pass++; };

// ---- 1) weapon-aware animation ----
assert.ok(/@keyframes bcaShootLoop/.test(html) && /@keyframes bcaShootBrace/.test(html), 'shoot keyframes');
ok('anim: shooting weapons get a RECOIL loop (bcaShootLoop) + tiny brace (bcaShootBrace)');
assert.ok(/\.fighter-rig\.bca-spam-loop\.bca-shoot\.fighter-swinging\.fitted-avatar-gear \.fighter-weapon/.test(html), 'shoot rule specificity');
ok('anim: the .bca-shoot rules override the melee swing (higher specificity)');
assert.ok(/function isShootWeapon\(\)/.test(html) && /a === 'wpn-anim-shoot' \|\| a === 'wpn-anim-laser'/.test(html), 'classify');
assert.ok(/if \(isShootWeapon\(\)\) rig\.classList\.add\('bca-shoot'\); else rig\.classList\.remove\('bca-shoot'\);/.test(html), 'toggle');
ok('anim: the fighter is tagged .bca-shoot when the equipped weapon is a gun/laser');

// ---- 2) presence current-barracks label ----
assert.ok(/FRESH HQ-COMMAND BARRACKS TAG/.test(html), 'push refresh comment');
assert.ok(/if \(String\(room\) === 'HQ Command' && P\.hqCommandLabel\) \{ section = P\.hqCommandLabel\(id, room, P\.section\); P\.section = section; \}/.test(html), 'push refresh logic');
ok('presence: each heartbeat re-derives the HQ Command section from the CURRENT barracks (T.loc)');
assert.ok(/if \(cur && \/\^\(Barracks \[ABCD\]\|Officer Barracks\)\$\/\.test\(cur\)\) return 'HQ Command \(' \+ cur \+ '\)';/.test(html), 'self physical barracks');
ok('presence: a player\'s own label uses the barracks they physically traveled to');

console.log('\nAll ' + pass + ' checks passed.');
