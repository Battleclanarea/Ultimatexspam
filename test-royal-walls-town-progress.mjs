// Royal Town "RZG WALL PROGRESS" board: amounts must be TRUTHFUL (the real Royal Walls contribution
// from the ONE master ledger) and must never bounce up/down. Before the fix the board read a separate
// divergent counter (civilianWallProgress/progress) that disagreed with the walls and could tick both
// ways as two cloud fields disagreed.
//
// Run: node test-royal-walls-town-progress.mjs
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let all = true;
const check = (n, c, extra) => { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n + (extra != null ? ' -> ' + extra : '')); all = c && all; };

// ---- behavioural: the board's amount logic (reimplemented exactly) ----
function boardAmount(ledger, user) {
  var real = Math.floor((ledger || {})['CIVBOB'] || 0);           // authoritative master-ledger truth
  return real || Math.floor(user.civilianWallProgress || user.progress || 0); // legacy fallback only if none
}
check('board shows the TRUE ledger contribution, not the divergent legacy counter',
  boardAmount({ CIVBOB: 5000000 }, { civilianWallProgress: 12345 }) === 5000000,
  boardAmount({ CIVBOB: 5000000 }, { civilianWallProgress: 12345 }));
check('falls back to the legacy counter only when the ledger has nothing',
  boardAmount({}, { civilianWallProgress: 777 }) === 777);
// monotonic: the master ledger is max-deduped/merged, so a value can only rise -> no up/down bounce.
(function () {
  var ledger = { CIVBOB: 100 };
  var seen = [];
  [100, 90, 5000000, 4000000].forEach(function (cloud) { ledger.CIVBOB = Math.max(ledger.CIVBOB, cloud); seen.push(boardAmount(ledger, {})); });
  var monotonic = seen.every(function (v, i) { return i === 0 || v >= seen[i - 1]; });
  check('displayed amount is monotonic non-decreasing (no add/remove bounce)', monotonic, seen.join(','));
})();

// ---- structural: the real board reads the master ledger ----
check('renderCivilianBoard reads the authoritative T.wallContrib.members ledger', /var ledger = \(T\.wallContrib && T\.wallContrib\.members\) \|\| \{\};\s*\n\s*var real = Math\.floor\(ledger\[idOf\(id\)\] \|\| 0\);/.test(html));
check('legacy civilianWallProgress/progress is only a fallback', /var prog = real \|\| Math\.floor\(u\.civilianWallProgress \|\| u\.progress \|\| 0\);/.test(html));
// the board keeps its no-flicker guard + stable sort (unchanged)
check('board keeps the no-flicker signature guard', /el\.getAttribute\('data-civ-sig'\) === sig/.test(html));
check('board keeps a STABLE sort (name tiebreak so equal totals never swap)', /\(b\.progress - a\.progress\) \|\| String\(a\.id\)\.localeCompare\(String\(b\.id\)\)/.test(html));
// the walls board and this board now share the SAME ledger source
check('the Royal Walls contribution board uses the same T.wallContrib.members source', /var members = T\.wallContrib\.members \|\| \{\}/.test(html));

console.log('\n' + (all ? 'ALL ROYAL-WALLS-TOWN-PROGRESS TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
