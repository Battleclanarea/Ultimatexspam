// Headless verification of the "OUTSIDE OF HQ" status fix. Extracts the REAL awayLabel from
// index.html and checks that standard kingdom areas (arena/town/walls/etc.) are treated as
// WITHIN HQ, and only vehicle-only outer sections / aboard-a-vehicle read OUTSIDE OF HQ.
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

function extractBlock(startMarker, opener) {
  const s = html.indexOf(startMarker);
  if (s < 0) throw new Error('marker not found: ' + startMarker);
  let i = html.indexOf(opener, s) + 1, depth = 1;
  while (i < html.length && depth > 0) { const c = html[i]; if (c === '{') depth++; else if (c === '}') depth--; i++; }
  return html.slice(html.indexOf(opener, s) + 1, i - 1);
}
const body = extractBlock('function awayLabel(nm, room, section, isSelf) {', '{');

// standard travel-map rooms are "real"; outer/vehicle sections are not.
const REAL = { 'ROYAL ARENA':1,'STANDARD ARENA':1,'ROYAL TOWN':1,'ROYAL WALLS':1,'ROYAL ARMORY':1,'ROYAL GARAGE':1,'ROYAL KITCHEN':1,'ROYAL COURT':1,'ROYAL FUNERAL':1,'ROYAL MOVIE THEATER':1,'ROYAL CHECKPOINT':1,'ROYAL EXIT':1,'BARRACKS A':1,'BARRACKS B':1,'BARRACKS C':1,'BARRACKS D':1,'OFFICER BARRACKS':1 };
const idOf = (s) => String(s == null ? '' : s).trim().toUpperCase();
const logicalRoom = (r) => (/^hq command/i.test(r || '')) ? 'HQ Command' : r;
const homeBarracks = () => 'Barracks D';
const S = { state: { profile: { id: 'P' }, currentActivity: 'hq' }, travel: { isRealRoom: (id) => !!REAL[idOf(logicalRoom(id))], dest: null } };
const awayLabel = new Function('idOf', 'logicalRoom', 'homeBarracks', 'S', 'nm', 'room', 'section', 'isSelf', body)
  .bind(null, idOf, logicalRoom, homeBarracks, S);

let all = true;
function check(n, got, want) { const ok = got === want; console.log((ok ? 'PASS' : 'FAIL') + ' :: ' + n + ' -> ' + JSON.stringify(got) + (ok ? '' : ' (want ' + JSON.stringify(want) + ')')); all = ok && all; }

// WITHIN HQ (must NOT say OUTSIDE OF HQ) -> null so the area name shows
check('Royal Arena is within HQ', awayLabel('P', 'Royal Arena', '', false), null);
check('Royal Town is within HQ', awayLabel('P', 'Royal Town', '', false), null);
check('Royal Walls is within HQ', awayLabel('P', 'Royal Walls', '', false), null);
check('Royal Kitchen is within HQ', awayLabel('P', 'Royal Kitchen', '', false), null);
check('Standard Arena is within HQ', awayLabel('P', 'Standard Arena', '', false), null);
// barracks logic preserved
check('own barracks = null', awayLabel('P', 'Barracks D', '', false), null);
check('other barracks = Outside of Barracks', awayLabel('P', 'Barracks A', '', false), 'Outside of Barracks');
check('Royal Garage = Outside of Barracks', awayLabel('P', 'Royal Garage', '', false), 'Outside of Barracks');
// TRULY OUTSIDE (vehicle-only outer sections / aboard) -> OUTSIDE OF HQ
check('fuel depot = OUTSIDE OF HQ', awayLabel('P', 'Ironside Fuel Depot', '', false), 'OUTSIDE OF HQ');
check('gas castle = OUTSIDE OF HQ', awayLabel('P', 'Ashfall Gas Castle', '', false), 'OUTSIDE OF HQ');
check('aboard vehicle = OUTSIDE OF HQ', awayLabel('P', 'Aboard KABOOM', '', false), 'OUTSIDE OF HQ');
check('on the road = OUTSIDE OF HQ', awayLabel('P', 'On the road', '', false), 'OUTSIDE OF HQ');
check('outpost = OUTSIDE OF HQ', awayLabel('P', 'Outpost: Wraithmoor', '', false), 'OUTSIDE OF HQ');
// TRAVEL: within-HQ destination is NOT outside; outer destination is
check('traveling to Royal Arena = within HQ', awayLabel('P', 'Traveling \u2192 Royal Arena', '', false), null);
check('traveling to a fuel depot = OUTSIDE OF HQ', awayLabel('P', 'Traveling \u2192 Ironside Fuel Depot', '', false), 'OUTSIDE OF HQ');

console.log('\n' + (all ? 'ALL HQ-STATUS TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
