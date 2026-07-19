// Guards the SOUL SCORE = HQ SCORE (1:1) rule in the core X-spam loop of index.html.
// The bug: triggerStrike added `soulScore += ptsGain` ONCE universally (for hq_run + arena_run)
// AND a SECOND time inside the hq_run block, so an HQ run granted soul at DOUBLE the HQ-score rate
// (7,500 HQ score -> 15,000 soul). This asserts the duplicate is gone and soul still accrues once.
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

let all = true;
function check(n, c, extra) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n + (extra != null ? ' -> ' + extra : '')); all = c && all; }

// 1) The universal per-strike soul add is still present exactly once (source of soul for BOTH
//    hq_run and arena_run).
const universal = html.match(/ptsGain \+= Math\.floor\(weaponBonus\) \+ deathfirePrecisionBonus; st\.profile\.soulScore \+= ptsGain;/g) || [];
check('universal per-strike soul add present exactly once', universal.length === 1, universal.length);

// 2) The hq_run scoring block must add HQ score + gold but NOT touch soulScore anymore.
const hqBlock = html.match(/if \(st\.currentActivity === 'hq_run'\) \{ st\.profile\.score \+= ptsGain;[^}]*\}/);
check('hq_run scoring block found', !!hqBlock, hqBlock ? 'ok' : 'MISSING');
if (hqBlock) {
  const blk = hqBlock[0];
  check('hq_run block still awards HQ score', /st\.profile\.score \+= ptsGain;/.test(blk));
  check('hq_run block still awards gold', /st\.profile\.gold \+= 5;/.test(blk));
  check('hq_run block NO LONGER double-adds soulScore', !/soulScore/.test(blk), blk);
}

// 3) Sanity: exactly one soulScore mutation remains in the immediate strike-scoring window (the
//    universal one). We scan the triggerStrike scoring region between the ptsGain finalize line and
//    the hq/arena dispatch to ensure no stray soul add sneaks back in.
const start = html.indexOf('ptsGain += Math.floor(weaponBonus) + deathfirePrecisionBonus;');
const end = html.indexOf("if (st.currentActivity === 'arena_run') { BCA_SYS.arena.onStrike(ptsGain); }", start);
// strip // line-comments so explanatory prose mentioning soulScore is not counted as code
const region = html.slice(start, end).split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');
const soulHits = (region.match(/\.soulScore\s*(\+=|=)/g) || []).length;
check('exactly ONE soul mutation across the per-strike scoring region', soulHits === 1, soulHits);

console.log('\n' + (all ? 'ALL SOUL-PARITY TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
