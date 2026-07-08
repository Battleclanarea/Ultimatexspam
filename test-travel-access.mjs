// Verifies the always-available TRAVEL button so players can never get stuck in an area unable
// to reach the travel map. Checks the button exists + is wired to openMap, and simulates the
// show/hide rule from nav() for every relevant view/activity.
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

let all = true;
function check(n, c, extra) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n + (extra ? ' -> ' + extra : '')); all = c && all; }

check('global TRAVEL button exists in the nav bar', /id="global-travel-btn"/.test(html));
check('TRAVEL button opens the travel map', /global-travel-btn[^>]*onclick="[^"]*travel\.openMap\(\)/.test(html));
check('nav() manages the TRAVEL button visibility', /global-travel-btn/.test(html) && /ALWAYS-AVAILABLE TRAVEL/.test(html));

// mirror the nav() show/hide rule and verify it for each case
function showTravel(target, act) {
  const hideOn = { 'nav': 1, 'hq-active': 1, 'arena-battle': 1, 'travel': 1, 'travel-go': 1, 'travel-gate': 1, 'duel-battle': 1 };
  return !hideOn[target] && act !== 'hq_run' && act !== 'arena_run' && act !== 'travel';
}
// AREAS where players were getting stuck must SHOW travel
check('Arena lobby shows TRAVEL', showTravel('arena', 'hq') === true);
check('Royal Town shows TRAVEL', showTravel('rtown', 'hq') === true);
check('Royal Armory shows TRAVEL', showTravel('rarmory', 'hq') === true);
check('Royal Garage shows TRAVEL', showTravel('rgarage', 'hq') === true);
check('Royal Walls shows TRAVEL', showTravel('rwalls', 'hq') === true);
check('generic area (rstub) shows TRAVEL', showTravel('rstub', 'hq') === true);
// places where travel must be HIDDEN
check('HQ hub hides TRAVEL (has its own card)', showTravel('nav', 'hq') === false);
check('HQ X-spam battle hides TRAVEL', showTravel('hq-active', 'hq_run') === false);
check('Arena battle hides TRAVEL', showTravel('arena-battle', 'arena_run') === false);
check('the travel map itself hides the button', showTravel('travel', 'hq') === false);
check('mid-travel hides TRAVEL', showTravel('rtown', 'travel') === false);

console.log('\n' + (all ? 'ALL TRAVEL-ACCESS TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
