// Guards the extra "WHO'S HERE" barracks panel: it lists players by their ACTUAL physical presence
// in the current barracks (fixing "shown in Barracks C when really in Barracks D"), shows last-on
// for offline members, and does NOT disturb the existing HQ Command PLAYER STATUS system.
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let all = true;
function check(n, c) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n); all = c && all; }

const s = html.indexOf('id="barracks-whos-here"');
check('WHO\u2019S HERE barracks panel script present', s > 0);
const blk = s > 0 ? html.slice(s, html.indexOf('</script>', s)) : '';

check('only active on the barracks menu (rzg-view-nav) while standing in a barracks', /getElementById\('rzg-view-nav'\)/.test(blk) && /function curBarracks\(\) \{ var l = T\.loc; return \(l && BARR_RE\.test\(l\)\) \? l : null; \}/.test(blk));
check('membership is by ACTUAL presence location, not roster home', /function inThisBarracks\(u, bar\)/.test(blk) && /idOf\(room\) === idOf\(bar\)/.test(blk) && !/homeBarracks/.test(blk));
check('filters the live presence cache to this barracks', /\(\(P && P\.cache\) \|\| \[\]\)\.forEach/.test(blk) && /if \(!inThisBarracks\(u, bar\)\) return;/.test(blk));
check('offline members show a LAST ON time', /OFFLINE \\u00b7 LAST ON ' \+ \(ago\(t\) \|\| 'UNKNOWN'\)/.test(blk));
check('online detection is beat-aware (clock-skew immune) + asleep-aware', /_beatSeen\[idOf\(u\.id\)\]/.test(blk) && /if \(!u \|\| u\.asleep\) return false;/.test(blk));
check('uses its OWN panel id/list (does not reuse .bca-presence-list)', /bca-whoshere-panel/.test(blk) && /bca-whoshere-list/.test(blk) && !/\.bca-presence-list'\)\.innerHTML/.test(blk));
check('the canonical HQ Command status system is still present and untouched', /id="hq-command-status-freeze-final"/.test(html) && /function rowsForPresence\(room\)/.test(html));
check('each barracks gets its own list (title from the current barracks)', /bca-whoshere-title'\)\.innerText = '\\u2694 ' \+ bar\.toUpperCase\(\)/.test(blk));

console.log('\n' + (all ? 'ALL BARRACKS-WHOS-HERE TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
