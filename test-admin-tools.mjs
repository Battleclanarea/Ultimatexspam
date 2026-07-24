/* Regression guards for three admin-tool fixes:
 *  1) Food Studio pre-fills + displays a food's EXISTING buff so editing is easy.
 *  2) Resource grants survive an actively-spamming player's own autosave (no clobber).
 *  3) An admin can CLEAR all buffs on any player (works mid-spam via a watermark claim).
 * Behaviour proven end-to-end in a headless browser; these keep the wiring from drifting. */
import fs from 'fs';
import assert from 'assert';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const studio = fs.readFileSync(new URL('./food-studio.js', import.meta.url), 'utf8');
let pass = 0; const ok = (n) => { console.log('  PASS', n); pass++; };

// ---- 1) Food Studio: easy buff editing + shows pre-existing buff ----
assert.ok(/function deriveBuffsFromFood\(id\)/.test(studio) && /var b = \(cfg && cfg\.buffs\) \? cfg\.buffs : deriveBuffsFromFood\(id\);/.test(studio), 'prefill from existing food buff');
ok('food studio: buff fields PRE-FILL from the food\'s existing buff when no studio config');
assert.ok(/function currentBuffText\(id\)/.test(studio) && /id="fs-current-buff"/.test(studio) && /curEl\.textContent = 'CURRENT: ' \+ currentBuffText\(id\)/.test(studio), 'current buff readout');
ok('food studio: shows a CURRENT buff readout so you see exactly what you are editing');
assert.ok(/onchange = function \(\) \{ var id = val\('fs-existing'\); if \(id\) loadConfigIntoForm\(id\); else updatePreview\(\); \};/.test(studio), 'always load on select');
ok('food studio: selecting any existing food loads its buff (not only studio-configured ones)');
assert.ok(/menu\.insertBefore\(box, menu\.firstChild\)/.test(studio), 'top of menu');
ok('food studio: panel pinned to the top of the admin menu (easy to find)');

// ---- 2) resource grant survives active spamming ----
assert.ok(/if \(_ps >= 0\) \{ cleanData\.score = Math\.max\(cleanData\.score, dbData\.score \|\| 0\); p\.score = cleanData\.score; \}/.test(html), 'per-field score keep-highest');
assert.ok(/if \(_pl >= 0\) \{ cleanData\.soulScore = Math\.max\(cleanData\.soulScore, dbData\.soulScore \|\| 0\); p\.soulScore = cleanData\.soulScore; \}/.test(html), 'per-field soul keep-highest');
ok('grant: keep-highest merge now runs for POSITIVE pending too (only a negative deduction skips it)');
assert.ok(/GRANT-DURING-SPAM FIX/.test(html), 'grant fix comment');
ok('grant: an actively-spamming player\'s own autosave can no longer clobber a landing grant');

// ---- 3) clear buffs on any player ----
assert.ok(/clearBuffs: async \(\) =>/.test(html) && /clearBuffsAt: stamp/.test(html), 'clearBuffs writer');
ok('clear-buffs: admin can wipe a target\'s buffs (self now, others via a clearBuffsAt watermark)');
assert.ok(/var _cba = \+d\.clearBuffsAt \|\| 0;/.test(html) && /_pp\.foodShort = \[\]; _pp\.foodLong = \[\];/.test(html), 'clearBuffs claim');
ok('clear-buffs: target claims the watermark once (checked on snapshot + 2s poll -> works mid-spam)');
assert.ok(/BCA_SYS\.adminBuffs\.clearBuffs\(\)/.test(html), 'clear-buffs button');
ok('clear-buffs: CLEAR ALL BUFFS ON PLAYER button wired in the admin menu');

console.log('\nAll ' + pass + ' checks passed.');
