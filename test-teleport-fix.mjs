// Headless verification of the login location-restore fix.
// Extracts the REAL initHQ wrapper + return-home nav hook from index.html (lines 7714-7765)
// and runs it against a mocked game scope, simulating a genuine login sequence.
import fs from 'fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const start = html.indexOf('var orig = BCA_SYS.rzg.initHQ;');
const endMarker = 'BCA_SYS.rzg.nav._homeSync3e = true;';
const end = html.indexOf('}', html.indexOf(endMarker, start) + endMarker.length) + 1; // include closing brace of the `if` block
const snippet = html.slice(start, end);
if (start < 0 || !/T\._homeSyncReadyAt = Date\.now\(\) \+ 6000/.test(snippet)) {
  console.error('FAIL: extracted snippet missing the login-time guard re-arm (fix not present).');
  process.exit(1);
}

// ---- fake timer infra so we control "time since boot" precisely ----
let NOW = 0;                       // virtual clock (ms)
const timers = [];                 // {at, fn}
function setTimeoutMock(fn, ms) { timers.push({ at: NOW + (ms || 0), fn }); }
function tick(ms) {
  const end = NOW + ms;
  timers.sort((a, b) => a.at - b.at);
  while (timers.length && timers[0].at <= end) {
    const t = timers.shift(); NOW = t.at; try { t.fn(); } catch (e) {}
  }
  NOW = end;
}
const DateMock = { now: () => NOW };

// ---- mock world ----
const ROOMS = [
  { id: 'Barracks D', group: 'barracks' },
  { id: 'Royal Town', group: 'town' },
  { id: 'Royal Armory', group: 'shop' },
  { id: 'Royal Walls', group: 'walls' }
];
const room = (id) => ROOMS.find(r => r.id === id);
const validLoc = (id) => !!room(id);

let enterCalls = [];
const T = {
  loc: null,
  _homeSyncReadyAt: 0,
  homeBarracks: () => 'Barracks D',
  saveLocal: function () { /* persists T.loc */ },
  enterCurrent: function () { enterCalls.push(T.loc); }
};
function addAdmin() {}

const BCA_SYS = {
  state: { currentActivity: 'hq' },
  rzg: {
    // base initHQ: always drops the player at the HQ hub (this is the real behavior)
    initHQ: function () { BCA_SYS.rzg.nav('nav'); },
    // base nav: just records target (UI switch)
    nav: function (target) { BCA_SYS.rzg._lastNav = target; }
  }
};

// eval the extracted real code with our scope injected
const runner = new Function('BCA_SYS', 'T', 'room', 'validLoc', 'addAdmin', 'Date', 'setTimeout', snippet);
runner(BCA_SYS, T, room, validLoc, addAdmin, DateMock, setTimeoutMock);

function scenario(name, startLoc, expectLoc, expectRouted) {
  enterCalls = [];
  // fresh guard state as installed at boot (+5000 from boot time)
  // simulate LOGIN happening long after boot: advance the clock well past any boot guard.
  tick(60000); // 60s since boot -> a boot-anchored guard (+5s) would already be EXPIRED
  T.loc = startLoc;                 // restored location (from localStorage / cloud forcedLocation)
  BCA_SYS.state.currentActivity = 'hq';
  BCA_SYS.rzg.initHQ();             // login fires initHQ -> nav('nav')
  tick(2500);                       // let the deferred re-route + guard release run
  const okLoc = T.loc === expectLoc;
  const okRoute = expectRouted ? enterCalls.includes(expectLoc) : true;
  const pass = okLoc && okRoute;
  console.log((pass ? 'PASS' : 'FAIL') + ' :: ' + name +
    ' -> T.loc=' + JSON.stringify(T.loc) + ' (expect ' + JSON.stringify(expectLoc) + ')' +
    ', routedTo=' + JSON.stringify(enterCalls));
  return pass;
}

let all = true;
// The reported bug: last in Royal Town, relogin must return to Royal Town (NOT barracks).
all = scenario('login while last in Royal Town', 'Royal Town', 'Royal Town', true) && all;
// Also must preserve Royal Armory and Royal Walls (the earlier regressions).
all = scenario('login while last in Royal Armory', 'Royal Armory', 'Royal Armory', true) && all;
all = scenario('login while last in Royal Walls', 'Royal Walls', 'Royal Walls', true) && all;
// A barracks player should stay at the HQ hub (no spurious route).
all = scenario('login while last in Barracks D', 'Barracks D', 'Barracks D', false) && all;

// Genuine "Return to Headquarters" AFTER the login window must still snap to barracks.
(function () {
  T.loc = 'Royal Town';
  tick(3000); // past the guard-release window
  BCA_SYS.state.currentActivity = 'hq';
  BCA_SYS.rzg.nav('nav'); // user taps Return to Headquarters
  const pass = T.loc === 'Barracks D';
  console.log((pass ? 'PASS' : 'FAIL') + ' :: genuine Return-to-HQ after login snaps home -> T.loc=' + JSON.stringify(T.loc));
  all = pass && all;
})();

console.log('\n' + (all ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
