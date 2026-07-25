// Regression: X-spamming on the TRIVIA WARS ('twob') Devotion Board must stay on the TRIVIA board,
// NOT get routed to the Call of Duty ('cod') board.
//
// Root cause: EV.openSpam did `EV._spamEvt = evtId === 'bm' ? 'bm' : 'cod'`, so every board that
// wasn't Blackmoor (including 'twob') fell through to 'cod'. flushSpam / reportEvtGains also only
// iterated ['cod','bm'], so even the pending trivia presses could never commit to the trivia key.
//
// Fix: resolve the board id against the EVENTS table (isEvtId) and iterate evtIds() everywhere.
//
// Run: node test-trivia-devotion-routing.mjs
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let all = true;
const check = (n, c, extra) => { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n + (extra != null ? ' -> ' + extra : '')); all = c && all; };

// ---- Behavioral: the exact routing decision, old vs new ----
const EVENTS = [{ id: 'cod' }, { id: 'bm' }, { id: 'twob' }];
const isEvtId = (e) => EVENTS.some((x) => x.id === e);
const routeOld = (evtId) => (evtId === 'bm' ? 'bm' : 'cod');           // the buggy logic
const routeNew = (evtId) => (isEvtId(evtId) ? evtId : 'cod');          // the fixed logic

check('REPRO: old routing sent trivia -> Call of Duty (the bug)', routeOld('twob') === 'cod', routeOld('twob'));
check('FIX: trivia X-spam now stays on the TRIVIA board', routeNew('twob') === 'twob', routeNew('twob'));
check('FIX: Call of Duty still routes to cod', routeNew('cod') === 'cod');
check('FIX: Blackmoor still routes to bm', routeNew('bm') === 'bm');
check('FIX: an unknown id still falls back to cod (safe default)', routeNew('zzz') === 'cod');

// pending presses accumulate on the correct board key, and a full-board flush drains them
const pend = {}; const spam = (spamEvt) => { pend[spamEvt] = (pend[spamEvt] | 0) + 1; };
const spamEvt = routeNew('twob'); for (let i = 0; i < 5; i++) spam(spamEvt);
check('trivia presses accumulate under the twob key (not cod)', (pend.twob | 0) === 5 && (pend.cod | 0) === 0, 'twob=' + (pend.twob | 0) + ' cod=' + (pend.cod | 0));
const committed = {}; EVENTS.forEach((e) => { const n = pend[e.id] | 0; if (n) committed[e.id] = (committed[e.id] || 0) + n; });
check('full-board flush commits trivia presses to the twob board', committed.twob === 5 && !committed.cod);

// ---- Structural: the real fix shipped in index.html ----
check('helpers evtIds/isEvtId/dutyName exist', /function evtIds\(\)/.test(html) && /function isEvtId\(e\)/.test(html) && /function dutyName\(e\)/.test(html));
check('EVENTS table still defines the TRIVIA WARS (twob) board', /id: 'twob', title: 'TRIVIA WARS OF BATTLECLANAREAS'/.test(html));
check('openSpam resolves the REAL board id (no cod/bm-only coercion)', /EV\._spamEvt = isEvtId\(evtId\) \? evtId : 'cod';/.test(html));
check('openSpam labels/log use dutyName (correct per-board name)', /t\.textContent = dutyName\(EV\._spamEvt\) \+ ' DEVOTION DUTY';/.test(html) && /reported for ' \+ dutyName\(EV\._spamEvt\) \+ ' Devotion Duty\.'/.test(html));
check('flushSpam iterates every board id (twob flushes to its own cloud key)', /function flushSpam\(force\) \{\s*evtIds\(\)\.forEach/.test(html));
check('reportEvtGains iterates every board id', /function reportEvtGains\(force\) \{\s*evtIds\(\)\.forEach/.test(html));
check('the buggy cod/bm-only routing is GONE', !/EV\._spamEvt = evtId === 'bm' \? 'bm' : 'cod';/.test(html));
check("no lingering ['cod', 'bm'] hardcoded spam loops", !/\['cod', 'bm'\]\.forEach/.test(html));
check('admin injector labels use dutyName (trivia not mislabeled Blackmoor)', !/var evtName = evt === 'cod' \? 'CALL OF DUTY' : 'BLACKMOOR';/.test(html) && /var evtName = dutyName\(evt\);/.test(html));

console.log('\n' + (all ? 'ALL TRIVIA-DEVOTION-ROUTING TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
