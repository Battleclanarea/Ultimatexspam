// Verifies the presence-accuracy fixes in index.html WITHOUT a browser: the "LAST ON X AGO"
// relative-time formatter, the clock-skew-immune observed-heartbeat tracker (_beatSeen), and that
// statusFor was wired to use them. Extracts the REAL code from index.html and runs it against mocks.
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

let all = true;
function check(n, c, extra) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n + (extra != null ? ' -> ' + extra : '')); all = c && all; }

function extractFn(sig) {
  const s = html.indexOf(sig);
  if (s < 0) throw new Error('not found: ' + sig);
  const open = html.indexOf('{', s);
  let i = open + 1, depth = 1;
  while (i < html.length && depth > 0) { const c = html[i]; if (c === '{') depth++; else if (c === '}') depth--; i++; }
  return html.slice(open, i); // "{...}" body incl. braces
}

// --- 1) Relative time formatter (window.__BCA_AGO) ---
const agoBody = extractFn('window.__BCA_AGO = function (t)');
const AGO = new Function('t', agoBody.replace(/^\{/, '').replace(/\}$/, ''));
const N = Date.now();
check('formatter: 5s -> JUST NOW', AGO(N - 5000) === 'JUST NOW', AGO(N - 5000));
check('formatter: 1 min -> 1 MINUTE AGO', AGO(N - 60000) === '1 MINUTE AGO', AGO(N - 60000));
check('formatter: 5 min -> 5 MINUTES AGO', AGO(N - 5 * 60000) === '5 MINUTES AGO', AGO(N - 5 * 60000));
check('formatter: 3 hours -> 3 HOURS AGO', AGO(N - 3 * 3600000) === '3 HOURS AGO', AGO(N - 3 * 3600000));
check('formatter: 1 day -> 1 DAY AGO', AGO(N - 86400000) === '1 DAY AGO', AGO(N - 86400000));
check('formatter: 20 days -> 20 DAYS AGO', AGO(N - 20 * 86400000) === '20 DAYS AGO', AGO(N - 20 * 86400000));
check('formatter: 400 days -> 1 YEAR AGO', AGO(N - 400 * 86400000) === '1 YEAR AGO', AGO(N - 400 * 86400000));
check('formatter: 0 -> empty (no timestamp)', AGO(0) === '', JSON.stringify(AGO(0)));

// --- 2) Observed-heartbeat tracker (trackBeats) is clock-skew immune ---
const trackBody = extractFn('function trackBeats(P)');
const idOf = (v) => String(v == null ? '' : v).trim().toUpperCase();
const trackBeats = new Function('P', 'idOf', trackBody.replace(/^\{/, '').replace(/\}$/, ''));

const P = { _beatSeen: {}, _beatPrev: {}, cache: [
  // A device whose clock is 10 minutes behind, but that is genuinely beating.
  { id: 'SKEWED', time: Date.now() - 600000 },
  // A truly offline account with an ancient timestamp (must NEVER be counted as a live beat).
  { id: 'OLDGHOST', time: Date.now() - 20 * 86400000 },
] };
trackBeats(P, idOf);
check('first sighting records prev but marks NO live beat', !P._beatSeen['SKEWED'] && !P._beatSeen['OLDGHOST']);
// A fresh heartbeat arrives for SKEWED (its absolute time is STILL skewed/old), OLDGHOST unchanged.
P.cache.find(u => u.id === 'SKEWED').time = P.cache.find(u => u.id === 'SKEWED').time + 1;
trackBeats(P, idOf);
check('observing a heartbeat CHANGE marks a live beat (clock-skew immune)', !!P._beatSeen['SKEWED']);
check('an unchanged (offline) account is NEVER marked live', !P._beatSeen['OLDGHOST']);
const beatFresh = P._beatSeen['SKEWED'] && (Date.now() - P._beatSeen['SKEWED'] <= 120000);
check('the live beat timestamp is on OUR clock (recent), not the skewed record time', !!beatFresh);

// --- 3) statusFor is wired to the observed beat + LAST ON labels ---
check('statusFor: uses observed _beatSeen to report ONLINE (skew immune)', /_beatSeen\);\s*\n\s*var _bt = _bm \? _bm\[nm\] : 0;/.test(html) || /S\.travel\.presence && S\.travel\.presence\._beatSeen\);/.test(html));
check('statusFor: OFFLINE rows show LAST ON', /label: 'OFFLINE \u00b7 ' \+ _lastOn\(t\)/.test(html));
check('statusFor: SLEEPING rows show LAST ON', /label: 'SLEEPING \u00b7 ' \+ _lastOn\(t\)/.test(html));
check('recomputeOffline wrapper clears _offline for provably-live accounts', /if \(b && now - b <= WINDOW\) u\._offline = false;/.test(html));

console.log('\n' + (all ? 'ALL PRESENCE-STATUS TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
