// Headless verification of the art-change self-heal (fixes "avatar glitches for the first few
// seconds of an X-spam match then fixes itself"). Extracts the REAL refreshLiveFighters method
// from index.html and runs it against mocks to prove that on an art change it (a) clears the
// downstream equipment caches and (b) force-repaints the LIVE battle fighter from current art.
import fs from 'fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

// --- extract the refreshLiveFighters arrow-method body via brace matching ---
const marker = 'refreshLiveFighters: () => {';
const start = html.indexOf(marker);
if (start < 0) { console.error('FAIL: refreshLiveFighters not found'); process.exit(1); }
let i = start + marker.length, depth = 1;
while (i < html.length && depth > 0) { const c = html[i]; if (c === '{') depth++; else if (c === '}') depth--; i++; }
const body = html.slice(start + marker.length, i - 1); // between the outer { }

// wiring: both timers + purgeStaleArt must call refreshLiveFighters
const wiredCount = (html.match(/refreshLiveFighters\(\)/g) || []).length;
if (wiredCount < 3) { console.error('FAIL: refreshLiveFighters not wired into all 3 art-purge sites (found ' + wiredCount + ')'); process.exit(1); }

// --- mocks ---
let cleared = 0, built = [], strikePrimed = 0, audited = 0;
const fakeEl = { dataset: {} };
const document = {
  getElementById: () => fakeEl,
  querySelector: () => null,
  querySelectorAll: () => []
};
const BCA_SYS = {
  state: { currentActivity: 'hq_run', profile: { id: 'HERO', activeWeapon: { id: 'w1' } } },
  arena: { gearSnapshot: () => ({ wId: 'w1' }) },
  combat: {
    buildFighter: (fid) => { built.push(fid); },
    triggerWeaponActionAnimation: () => { strikePrimed++; }
  },
  shop: { renderGrid: () => {}, _ca1aLast: null },
  exactVisuals: {
    clearEquipmentCaches: () => { cleared++; },
    auditRenderedEquipment: () => { audited++; },
    refreshLiveFighters: null
  }
};
// build the real function and bind it
BCA_SYS.exactVisuals.refreshLiveFighters = new Function('BCA_SYS', 'document', body + '\n');
const run = () => BCA_SYS.exactVisuals.refreshLiveFighters(BCA_SYS, document);

let ok = true; function check(n, c, extra) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n + (extra ? ' -> ' + extra : '')); ok = c && ok; }

// scenario 1: during an HQ run, art change repaints the live hq-fighter
run();
check('clears equipment caches on art change', cleared >= 1);
check('rebuilds the live hq-fighter', built.includes('hq-fighter'), JSON.stringify(built));
check('forces a fresh rebuild (build-key reset)', fakeEl.dataset.fighterBuildKey === '');
check('re-primes the strike weapon', strikePrimed >= 1);

// scenario 2: during an arena run it targets the arena-fighter
built = []; BCA_SYS.state.currentActivity = 'arena_run';
run();
check('rebuilds the live arena-fighter', built.includes('arena-fighter'), JSON.stringify(built));

// scenario 3: NOT in a run -> no fighter rebuild, but caches still cleared
built = []; cleared = 0; BCA_SYS.state.currentActivity = 'hq';
run();
check('no fighter rebuild outside a run', built.length === 0);
check('still clears caches outside a run', cleared >= 1);

console.log('\nwired into ' + wiredCount + ' art-purge call sites');
console.log(ok ? 'ALL FIGHTER-REFRESH TESTS PASSED' : 'SOME TESTS FAILED');
process.exit(ok ? 0 : 1);
