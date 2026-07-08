// Verifies the arena changes: 10s countdown across all modes, team-score host START flow,
// team-score bot countdown gating, extended bot speeds (>16 tps), and the live halt/edit
// controls for both 1v1 and team bots. Extracts the REAL team-bot loop from index.html.
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

let all = true;
function check(n, c, extra) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n + (extra ? ' -> ' + extra : '')); all = c && all; }

function extractBody(startMarker) {
  const s = html.indexOf(startMarker);
  if (s < 0) throw new Error('marker not found: ' + startMarker);
  const opener = html.indexOf('{', s);
  let i = opener + 1, depth = 1;
  while (i < html.length && depth > 0) { const c = html[i]; if (c === '{') depth++; else if (c === '}') depth--; i++; }
  return html.slice(opener + 1, i - 1);
}

// ---- 1) 10s countdown constants for every mode ----
check('1v1 arena join uses a 10s countdown', /joiner: BCA_SYS\.state\.profile\.id[\s\S]*?startAt: Date\.now\(\) \+ 10000/.test(html));
check('1v1 arena BOT join uses a 10s countdown', /joiner: b\.name[\s\S]*?startAt: Date\.now\(\) \+ 10000/.test(html));
check('death duel BEGIN uses a 10s countdown', /'bca_duels'[\s\S]*?status: 'active', startAt: Date\.now\(\) \+ 10000/.test(html));
check('team score host START (begin) uses a 10s countdown', /status:'active', startAt:Date\.now\(\)\+10000/.test(html));
check('team score HOST BOT auto-begins with a 10s countdown', /startAt = Date\.now\(\) \+ 10000;/.test(html));

// ---- 2) team score host START button + gating ----
check('team START button element exists', /id="arena-team-start-btn"[\s\S]*?BCA_SYS\.teamScores\.begin\(\)/.test(html));
check('teamScores.begin sets startAt and hides START button', /begin:function \(\)[\s\S]*?arena-team-start-btn/.test(html));
check('team enter starts NOT-begun (startAt:0, started:false)', /this\.cur = \{ gameId:gameId, map:map, myScore:0, startAt:0, ended:false, started:false, begun:false/.test(html));
check('team onStrike is gated until the run begins (!c.startAt)', /onStrike:function \(pts\) \{\s*var c = this\.cur; if \(!c \|\| c\.ended \|\| !c\.startAt \|\| Date\.now\(\) < c\.startAt\) return;/.test(html));

// ---- 3) extended bot speeds beyond 16 tps ----
['16', '18', '20', '24', '30'].forEach(v => check('arena bot speed option ' + v + '/s present', new RegExp('<option value="' + v + '">').test(html)));

// ---- 4) live halt + edit controls in the admin UI ----
check('edit-speed input present', /id="admin-arena-edit-tps"/.test(html));
check('SET SPEED button wired to setSpeed', /BCA_SYS\.adminArena\.setSpeed\(\)/.test(html));
check('adminArena.setSpeed defined', /setSpeed: \(\) => \{/.test(html));
check('stopOne routes team:: bots to teamScores.stopBot', /v\.indexOf\('team::'\) === 0[\s\S]*?BCA_SYS\.teamScores\.stopBot/.test(html));
check('teamScores.stopBot defined', /BCA_SYS\.teamScores\.stopBot = function/.test(html));
check('teamScores.setSpeed defined', /BCA_SYS\.teamScores\.setSpeed = function/.test(html));
check('renderStatus lists team bots', /teamBots = \(BCA_SYS\.teamScores && BCA_SYS\.teamScores\.botList\)/.test(html));

// ---- 5) team-score BOT loop respects the countdown (functional test of real code) ----
const loopBody = extractBody('function botScoreLoop(bot) {');
const finishes = [];
const timers = [];
const mkLoop = () => new Function('bot', 'hasCloud', 'FS', 'cloudDoc', 'TEAM_COLL', 'finishTeamBot', 'setTimeout',
  loopBody)
  ;
function runLoop(bot) {
  const fn = mkLoop();
  fn(bot, false, {}, () => ({}), 'bca_team_score_games', (b) => { finishes.push(b.name); }, (cb, ms) => { timers.push(ms); return 0; });
}

// (a) no startAt yet (joined a game whose host has not pressed START): must NOT score
(function () {
  timers.length = 0; finishes.length = 0;
  const bot = { name: 'A', tps: 10, score: 0, active: true, startAt: 0, endAt: 0, map: { time: 60 } };
  runLoop(bot);
  check('team bot with no startAt does not score (waits for host)', bot.score === 0 && timers.length === 1, 'score=' + bot.score);
})();

// (b) startAt in the future (countdown running): must NOT score yet
(function () {
  timers.length = 0; finishes.length = 0;
  const now = Date.now();
  const bot = { name: 'B', tps: 10, score: 0, active: true, startAt: now + 5000, endAt: now + 65000, map: { time: 60 } };
  runLoop(bot);
  check('team bot during countdown does not score yet', bot.score === 0 && timers.length === 1, 'score=' + bot.score);
})();

// (c) within the live window: must score
(function () {
  timers.length = 0; finishes.length = 0;
  const now = Date.now();
  const bot = { name: 'C', tps: 10, score: 0, active: true, startAt: now - 1000, endAt: now + 60000, map: { time: 60 } };
  runLoop(bot);
  check('team bot in live window scores', bot.score > 0, 'score=' + bot.score);
})();

// (d) past endAt: must finish (not score forever)
(function () {
  timers.length = 0; finishes.length = 0;
  const now = Date.now();
  const bot = { name: 'D', tps: 10, score: 123, active: true, startAt: now - 61000, endAt: now - 1000, map: { time: 60 } };
  runLoop(bot);
  check('team bot past endAt finishes', finishes.length === 1 && finishes[0] === 'D');
})();

// (e) halted bot: no-op
(function () {
  timers.length = 0; finishes.length = 0;
  const bot = { name: 'E', tps: 10, score: 0, active: false, startAt: Date.now() - 1000, endAt: Date.now() + 60000, map: { time: 60 } };
  runLoop(bot);
  check('halted team bot does nothing', bot.score === 0 && timers.length === 0 && finishes.length === 0);
})();

console.log('\n' + (all ? 'ALL ARENA-CHANGE TESTS PASSED' : 'SOME ARENA-CHANGE TESTS FAILED'));
process.exit(all ? 0 : 1);
