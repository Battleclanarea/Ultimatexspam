// Headless verification of the location / teleport fixes.
// Extracts the REAL initHQ login re-route + T.returnToAreaMenu code from index.html and runs it
// against a mocked game scope. Verifies:
//   1) login routes the player back INTO their last real area (not the barracks),
//   2) BACK / ABORT (returnToAreaMenu) stay in the CURRENT area (town/arena) and never
//      teleport to Barracks D,
//   3) the old home-sync snap that corrupted T.loc on nav('nav') is GONE.
import fs from 'fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

// The removed home-sync must NOT exist anymore.
if (html.includes('_homeSync3e')) {
  console.error('FAIL: legacy home-sync snap (_homeSync3e) is still present.');
  process.exit(1);
}

const start = html.indexOf('var orig = BCA_SYS.rzg.initHQ;');
const end = html.indexOf('// NOTE: the old "return-home location sync"', start);
if (start < 0 || end < 0) { console.error('FAIL: could not locate fix code in index.html.'); process.exit(1); }
const snippet = html.slice(start, end);
if (!/T\.returnToAreaMenu = function/.test(snippet)) { console.error('FAIL: returnToAreaMenu not found.'); process.exit(1); }

// ---- fake timers ----
let NOW = 0; const timers = [];
function setTimeoutMock(fn, ms) { timers.push({ at: NOW + (ms || 0), fn }); }
function tick(ms) { const end = NOW + ms; timers.sort((a, b) => a.at - b.at); while (timers.length && timers[0].at <= end) { const t = timers.shift(); NOW = t.at; try { t.fn(); } catch (e) {} } NOW = end; }
const DateMock = { now: () => NOW };

// ---- mock world ----
const ROOMS = [
  { id: 'Barracks D', group: 'barracks' },
  { id: 'Royal Town', group: 'town' },
  { id: 'Royal Armory', group: 'shop' },
  { id: 'Royal Arena', group: 'arena' },
  { id: 'Royal Walls', group: 'walls' }
];
const room = (id) => ROOMS.find(r => r.id === id);
const validLoc = (id) => !!room(id);

let enterCalls = [], navTargets = [], arenaOpens = [];
const T = {
  loc: null,
  homeBarracks: () => 'Barracks D',
  saveLocal: function () {},
  enterCurrent: function () { enterCalls.push(T.loc); },
  openRoyalArena: function () { arenaOpens.push(T.loc); }
};
function addAdmin() {}
const BCA_SYS = {
  state: { currentActivity: 'hq' },
  rzg: {
    _navStack: [],
    initHQ: function () { BCA_SYS.rzg.nav('nav'); },
    nav: function (target) { navTargets.push(target); }
  }
};

const runner = new Function('BCA_SYS', 'T', 'room', 'validLoc', 'addAdmin', 'Date', 'setTimeout', snippet);
runner(BCA_SYS, T, room, validLoc, addAdmin, DateMock, setTimeoutMock);

let all = true;
function check(name, cond, extra) { console.log((cond ? 'PASS' : 'FAIL') + ' :: ' + name + (extra ? ' -> ' + extra : '')); all = cond && all; }

// ---- 1) LOGIN re-route: last area is preserved (not snapped to barracks) ----
function loginScenario(startLoc, expectLoc, expectRouted) {
  enterCalls = []; navTargets = [];
  T.loc = startLoc; BCA_SYS.state.currentActivity = 'hq';
  BCA_SYS.rzg.initHQ();
  tick(2000);
  const okLoc = T.loc === expectLoc;
  const okRoute = expectRouted ? enterCalls.includes(expectLoc) : enterCalls.length === 0;
  check('login while last in ' + startLoc, okLoc && okRoute, 'T.loc=' + T.loc + ', routed=' + JSON.stringify(enterCalls));
}
loginScenario('Royal Town', 'Royal Town', true);
loginScenario('Royal Armory', 'Royal Armory', true);
loginScenario('Royal Walls', 'Royal Walls', true);
loginScenario('Barracks D', 'Barracks D', false);

// ---- 2) BACK / ABORT (returnToAreaMenu): stay in current area, never teleport to barracks ----
function areaMenuScenario(loc, expectEnter, expectArena, expectNav) {
  enterCalls = []; navTargets = []; arenaOpens = [];
  T.loc = loc;
  T.returnToAreaMenu();
  const okEnter = expectEnter ? enterCalls.includes(loc) : true;
  const okArena = expectArena ? arenaOpens.includes(loc) : arenaOpens.length === 0;
  const okNav = expectNav ? navTargets.includes('nav') : !navTargets.includes('nav');
  const okNoBarracks = T.loc === loc; // returnToAreaMenu must NOT change T.loc
  check('BACK/ABORT in ' + loc, okEnter && okArena && okNav && okNoBarracks,
    'enter=' + JSON.stringify(enterCalls) + ', arena=' + JSON.stringify(arenaOpens) + ', nav=' + JSON.stringify(navTargets) + ', T.loc=' + T.loc);
}
areaMenuScenario('Royal Town', true, false, false);    // -> town hub via enterCurrent
areaMenuScenario('Royal Armory', true, false, false);  // -> armory hub via enterCurrent
areaMenuScenario('Royal Arena', false, true, false);   // -> arena lobby
areaMenuScenario('Barracks D', false, false, true);    // -> HQ hub (correct for a barracks)

console.log('\n' + (all ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
