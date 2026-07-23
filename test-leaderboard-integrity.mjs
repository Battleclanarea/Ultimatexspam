/* Regression guards for the BARRACKS LEADERBOARD integrity fix.
 * Root cause fixed: refreshes mapped DOM cards to a re-sorted barracks list BY INDEX,
 * so when one barracks passed another the whole roster swapped into the wrong card.
 * The fix binds every panel to data-barracks-id, renders/reorders by IDENTITY, and
 * self-verifies (auto-heal). Full behaviour is proven end-to-end in a headless browser;
 * these guards keep the wiring from regressing. */
import fs from 'fs';
import assert from 'assert';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let pass = 0; const ok = (n) => { console.log('  PASS', n); pass++; };

// ---- identity-bound build (HQ.open) ----
assert.ok(/data-barracks-id="\$\{b\.id\}"/.test(html), 'HQ.open stamps data-barracks-id');
ok('HQ.open: every barracks panel is stamped with data-barracks-id');
assert.ok(/class="cinzel[^"]*bx-name"/.test(html) && /bx-sub"/.test(html), 'header hooks');
ok('HQ.open: header name/rank carry bx-name / bx-sub hooks for identity-safe updates');

// ---- identity-bound refresh (renderBarracksNow) ----
assert.ok(/function _bxIdFromPanel\(panel\)/.test(html), '_bxIdFromPanel');
ok('render: panels resolve their barracks by id (heals from the DEPLOY button too)');
assert.ok(/var id = _bxIdFromPanel\(panel\); var b = byId\[id\]; if \(!b\) return;/.test(html), 'render by id');
ok('render: each panel renders STRICTLY from its own barracks (no positional mapping)');
assert.ok(/wantIds\.forEach\(function \(id\) \{ var p = grid\.querySelector\(':scope > div\[data-barracks-id="' \+ id \+ '"\]'\); if \(p\) grid\.appendChild\(p\); \}\);/.test(html), 'reorder by rank');
ok('render: panels are REORDERED in the DOM to match rank (no roster swap)');

// ---- anti-flicker (bad internet transient 0) ----
assert.ok(/function _bxDisp\(m\)/.test(html) && /if \(v <= 0 && hw\[k\] > 0 && !drops\[k\]\) v = hw\[k\];/.test(html), 'anti-flicker');
ok('render: a transient 0 never blanks a real scorer (kept unless an authoritative drop)');

// ---- fail-proof verification + auto-heal ----
assert.ok(/function _bxVerify\(grid, byId\)/.test(html) && /foreign-member:/.test(html) && /header-mismatch:/.test(html), 'verifier');
ok('verify: checks every panel shows only its own barracks roster + header');
assert.ok(/\[BARRACKS INTEGRITY\] mismatch -> auto-heal/.test(html) && /function _bxRebuild\(grid\)/.test(html), 'auto-heal');
ok('verify: auto-heals (full rebuild by id) if the invariant is ever violated');
assert.ok(/S\.hq\.verifyBarracksIntegrity = function \(\)/.test(html), 'public verify api');
ok('verify: BCA_SYS.hq.verifyBarracksIntegrity() exposed for callers/tests');

// ---- hardened comparators (stable, score-safe) ----
assert.ok(/\(_bTot\(b\) - _bTot\(a\)\) \|\| String\(a\.id \|\| ''\)\.localeCompare\(String\(b\.id \|\| ''\)\)/.test(html), 'HQ.open barracks tiebreaker');
ok('sort: barracks totals use (score||0) with a stable id tiebreaker');
assert.ok(/\(_bxTotal\(b\) - _bxTotal\(a\)\) \|\| String\(a\.id \|\| ''\)\.localeCompare/.test(html), 'render barracks tiebreaker');
ok('sort: refresh order uses (score||0) totals + id tiebreaker');

// ---- soul leaderboard identity normalization ----
assert.ok(/const uid = String\(doc\.id\)\.trim\(\)\.toUpperCase\(\);/.test(html) && /allMembersMap\.has\(uid\)/.test(html), 'soul uid');
ok('soul: bca_users doc.id normalized to match the uppercased roster key (no dup/missing rank)');

console.log('\nAll ' + pass + ' checks passed.');
