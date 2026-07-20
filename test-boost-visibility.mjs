// Guards that score-boosted (or any actively-scoring) accounts read ONLINE and appear in HQ Command
// for EVERY client. The admin-driven presence beat is unreliable on other clients (broadcast/skew),
// but the SCORE always propagates - so every client marks a score-climbing account live and surfaces
// it in HQ Command. This must NOT change the HQ Command render/status system (only feed it liveness).
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let all = true;
function check(n, c) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n); all = c && all; }

const s = html.indexOf('id="boost-visibility-final"');
check('boost-visibility script present', s > 0);
const blk = s > 0 ? html.slice(s, html.indexOf('</script>', s)) : '';

check('detects a climbing score as "active"', /if \(LAST\[id\] !== undefined && sc > LAST\[id\]\) ACTIVE\[id\] = now \+ ACTIVE_MS;/.test(blk));
check('reads score from the (reliably-propagating) roster member scores', /S\.hq\.barracksData/.test(blk) && /Math\.floor\(m\.score \|\| 0\)/.test(blk));
check('marks active accounts provably-live (clock-skew-immune ONLINE)', /P\._beatSeen\[id\] = now;/.test(blk));
check('surfaces accounts with NO fresh presence in HQ Command as X Spam Boost', /room: 'HQ Command'[\s\S]*?currentAction: 'X Spam Boost'/.test(blk) && /P\.cache\.push\(/.test(blk));
check('leaves a genuinely-present player\'s real location alone', /if \(u && !u\.asleep && \(u\.time \|\| 0\) > now - FRESH_MS\) return;/.test(blk));
check('liveness auto-expires ~2 min after the score stops climbing', /var ACTIVE_MS = 120000/.test(blk) && /if \(ACTIVE\[id\] <= now\) \{ delete ACTIVE\[id\]; return; \}/.test(blk));
check('does not touch the local player (admin sees their own real presence)', /if \(!id \|\| id === me\) return;/.test(blk));
check('feeds the existing status system (renderAll), does not replace it', /P\.renderAll && P\.renderAll\(\)/.test(blk) && /function rowsForPresence\(room\)/.test(html) && /id="hq-command-status-freeze-final"/.test(html));

console.log('\n' + (all ? 'ALL BOOST-VISIBILITY TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
