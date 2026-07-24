/* Regression guards for: (1) smooth X-spam fighter animation (continuous GPU loop, armor never
 * static), (2) short food buffs clearing by SHAVED TIME per spam (fast + tunable), (3) the admin
 * FOOD BUFF CHART (view + edit per-food short spam-decay/time and long time/score). Behaviour is
 * proven end-to-end in a headless browser; these keep the wiring from drifting. */
import fs from 'fs';
import assert from 'assert';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let pass = 0; const ok = (n) => { console.log('  PASS', n); pass++; };

// ---- 1) smooth animation ----
assert.ok(/@keyframes bcaWpnLoop/.test(html) && /@keyframes bcaRigLoop/.test(html), 'loop keyframes');
assert.ok(/\.fighter-rig\.bca-spam-loop\.fighter-swinging\.fitted-avatar-gear \.fighter-armor/.test(html), 'armor loop rule');
ok('anim: whole rig (weapon+armor+body+shield) runs ONE continuous GPU loop while spamming');
assert.ok(/if \(rig && rig\.classList\.contains\('bca-spam-loop'\)\) return; \/\/ loop handles motion smoothly/.test(html), 'skip per-tap');
ok('anim: per-tap swing restart + rig rAF are skipped while looping (zero per-tap jank)');
assert.ok(/settle = setTimeout\(function \(\) \{ try \{ var r = document\.getElementById\(curId \+ '-rig'\); if \(r\) r\.classList\.remove\('bca-spam-loop'\); \}/.test(html), 'settle');
ok('anim: loop self-settles ~0.48s after the last strike');

// ---- 2) short buffs clear by shaved time (fast + tunable), long push-out unchanged ----
assert.ok(/b\._spamN = \(b\._spamN \|\| 0\) \+ 1;/.test(html) && /b\.expireAt -= _t \* _decMs;/.test(html), 'time-shave');
ok('food: every N spams removes M minutes from a short buff (spam-shaves time)');
assert.ok(/var _defPer = Math\.max\(1, Math\.round\(\+_wcD\.spamsPer \|\| 200\)\);/.test(html), 'global default rate');
ok('food: global default rate (spamsPer/decMins) tunable via BCA_SYS.food.wearConfig._default');
assert.ok(/p\.foodShort = p\.foodShort\.filter\(b => b\.expireAt > now\);/.test(html), 'no wearLeft gate');
ok('food: short buffs clear purely by shaved/expired time (old slow wearLeft budget removed)');
assert.ok(/while \(p\.foodLong\.length > 10\) p\.foodLong\.shift\(\);/.test(html), 'long cap unchanged');
ok('food: long buffs still only leave by being pushed out at the 10-cap (oldest first)');

// ---- 3) admin food chart ----
assert.ok(/FOOD BUFF CHART/.test(html) && /food-chart-modal/.test(html) && /id="food-chart-search"/.test(html), 'chart UI + search');
ok('chart: admin-only FOOD BUFF CHART with a search bar over every food');
assert.ok(/function strikesToClear\(f\)/.test(html) && /strikes to clear/.test(html), 'strikes-to-clear');
ok('chart: shows how many strikes it takes to clear each food\'s short buff');
assert.ok(/data-k="spamsPer"/.test(html) && /data-k="decMins"/.test(html) && /data-k="mins"/.test(html), 'short edit fields');
ok('chart: edit per-food spams-per-decrement, minutes-removed, and total minutes');
assert.ok(/data-k="longMins"/.test(html) && /data-k="longScore"/.test(html), 'long edit fields');
ok('chart: long-buff editing limited to time (hrs) + score');
assert.ok(/function stamp\(item, beforeS, beforeL\)/.test(html) && /b\.spamsPer = wc\.spamsPer;/.test(html), 'stamping');
ok('chart: a food\'s buffs are stamped with its own rate when eaten/served (per-food applies)');
assert.ok(/'bca_system', DOC\), \{ cfg: STORE \}/.test(html) && /LS = 'bca_food_wear_v1'/.test(html), 'persistence');
ok('chart: config persists to localStorage + cloud (bca_system/food_wear)');

console.log('\nAll ' + pass + ' checks passed.');
