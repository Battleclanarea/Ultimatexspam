/* Regression guards for the END-OF-SPAM-RUN fixes:
 *  - armor no longer freezes mid-transform when a run finishes (fighter settle)
 *  - the player's barracks score no longer "shows up late" (a stale live-sync recompute
 *    can't revert it) while score boosters (pendingBoost) stay untouched.
 * Behaviour is proven end-to-end in a headless browser; these keep the wiring from drifting. */
import fs from 'fs';
import assert from 'assert';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let pass = 0; const ok = (n) => { console.log('  PASS', n); pass++; };

// ---- fighter settle at run end ----
assert.ok(/SETTLE THE FIGHTER AT RUN END/.test(html), 'settle comment');
assert.ok(/_rig\.classList\.remove\('fighter-swinging'\);/.test(html) && /a\.animationName \|\| ''; if \(nm === 'fighterSwing' \|\| nm === 'fighterLunge' \|\| nm\.lastIndexOf\('fitted', 0\) === 0\) a\.cancel\(\)/.test(html), 'settle logic');
ok('endRun: removes fighter-swinging + cancels lingering swing/gear animations (no frozen armor)');

// ---- late-score fix in BOTH commit paths ----
const saveRunFix = /m\.userScore = Math\.max\(m\.userScore \|\| 0, fresh\);\s*\n\s*m\.base = Math\.max\(m\.base \|\| 0, fresh\);\s*\n\s*if \(BCA_SYS\.hq\.recomputeMember\)/;
const matches = html.match(new RegExp(saveRunFix.source, 'g')) || [];
assert.ok(matches.length >= 2, 'floor-sync present in saveRun AND logRunEnd, found ' + matches.length);
ok('saveRun + logRunEnd: raise the player\'s own userScore/base floor so recompute cannot revert the fresh score');
assert.ok(/try \{ BCA_SYS\.hq\.renderBarracks\(\); \} catch \(e\) \{\}/.test(html), 'immediate render');
ok('saveRun: refreshes the barracks board immediately (score not late)');

// ---- boosters preserved: the fix must NOT write pendingBoost ----
assert.ok(!/m\.pendingBoost = (?!.*recompute)/.test(saveRunFixContext(html)), 'no pendingBoost write in the fix');
ok('fix does NOT touch pendingBoost (score boosters preserved by recomputeMember)');

function saveRunFixContext(h) {
  // isolate the saveRun body region for the pendingBoost check
  const i = h.indexOf('LATE-SCORE FIX'); return i >= 0 ? h.slice(i, i + 1200) : '';
}

console.log('\nAll ' + pass + ' checks passed.');
