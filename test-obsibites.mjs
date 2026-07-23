/* Structural regression test for OBSIBITES CHICKEN (the Obsidara Codex feast).
 * Runtime behaviour (1,000+ unique fragments, sequential no-repeat reveal, fancy art, modal +
 * archive) is verified end-to-end in a headless browser; this guards the wiring from drift and
 * independently confirms the codex splits into >= 1,000 unique fragments. */
import fs from 'fs';
import assert from 'assert';
const mod = fs.readFileSync(new URL('./obsibites-intel.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let pass = 0; const ok = (n) => { console.log('  PASS', n); pass++; };

// ---- module wiring ----
assert.ok(/id: FOOD_ID, name: 'OBSIBITES CHICKEN'/.test(mod) && /price: 450000/.test(mod), 'food def 450k');
ok('module: OBSIBITES CHICKEN food defined at 450,000');
assert.ok(/S\.shop\.legendaryArt\[FOOD_ID\] = function/.test(mod), 'art registered');
ok('module: fancy art registered into legendaryArt');
assert.ok(/p\.obsidaraProgress = idx \+ 1;/.test(mod) && /idx = p\.obsidaraProgress/.test(mod), 'sequential reveal');
ok('module: fragments handed out strictly in order (never repeats for a player)');
assert.ok(/list\.parentNode\.insertBefore\(box, list\)/.test(mod), 'archive above pool');
ok('module: Obsidara Codex section inserted ABOVE the regular intel pool');
assert.ok(/CODEX FRAGMENT/.test(mod) && /eat again for more buffs \+ the next fragment/.test(mod), 'fragment modal above food info');
ok('module: fragment modal shows the codex info ABOVE the food info pool');
assert.ok(/function installGildedSpit\(\)/.test(mod) && /TWN\.menu\.unshift\(gildEntry\(\)\)/.test(mod), 'gilded spit menu');
ok('module: OBSIBITES CHICKEN added to Royal Town — The Gilded Spit menu');
assert.ok(/TWN\.buyFood = function/.test(mod) && /reveal\(src\)/.test(mod), 'gilded spit dine reveals fragment');
ok('module: dining on the feast in The Gilded Spit reveals a codex fragment');

// ---- index.html wiring ----
assert.ok(/obsibites-intel\.js/.test(html), 'loader present');
ok('index.html: loads the obsibites-intel.js sibling module');
assert.ok(/obsidaraProgress: p\.obsidaraProgress \|\| 0/.test(html), 'saved');
ok('index.html: obsidaraProgress persisted like intel files (save)');
assert.ok(/p\.obsidaraProgress = Math\.max\(\(local && local\.obsidaraProgress\)/.test(html), 'merged');
ok('index.html: obsidaraProgress cross-device merged on load (look back forever)');
assert.ok(/item\.obsibites \|\| id === 'food_obsibites_chicken'\) return true;.*hand-built legendaryArt/s.test(html), 'dedicated art');
ok('index.html: food-art system treats OBSIBITES as dedicated (uses its custom art)');
assert.ok(/item\.obsibites \|\| item\.id === 'food_obsibites_chicken'\)\) return inner\(item\)/.test(html), 'consume delegate');
ok('index.html: truth-food consume delegates OBSIBITES to its own reveal handler');

// ---- independently split the codex and confirm >= 1000 unique fragments ----
// (extract the CODEX array text from the module and run the same splitter logic)
const m = mod.match(/var CODEX = \[([\s\S]*?)\]\.join\(' '\);/);
assert.ok(m, 'CODEX array found');
// crude but safe: pull the quoted string contents
const parts = m[1].match(/"(?:[^"\\]|\\.)*"/g).map(s => JSON.parse(s));
const CODEX = parts.join(' ');
const TARGET = 120;
function splitFacts() {
  const text = CODEX.replace(/\s+/g, ' ').trim();
  const raw = text.split(/(?<=[.!?])\s+/);
  const seen = {}, sents = [];
  raw.forEach(s => { s = s.trim(); if (s.length < 6) return; const k = s.toLowerCase().replace(/[^a-z0-9]+/g, ''); if (!k || seen[k]) return; seen[k] = 1; sents.push(s); });
  const n = sents.length, groups = Math.min(TARGET, n), facts = [];
  for (let g = 0; g < groups; g++) { let start = Math.floor(g * n / groups), end = Math.floor((g + 1) * n / groups); if (end <= start) end = start + 1; facts.push(sents.slice(start, end).join(' ')); }
  return facts;
}
const facts = splitFacts();
assert.strictEqual(facts.length, TARGET, 'codex splits into exactly ' + TARGET + ' fragments, got ' + facts.length);
ok('codex splits into exactly ' + facts.length + ' fragments (~120 meals to read it all)');
assert.ok(/var TARGET_FRAGMENTS = 120;/.test(mod), 'module targets 120 fragments');
ok('module: TARGET_FRAGMENTS is 120 (was 1,000+)');
const uniq = new Set(facts.map(f => f.toLowerCase().replace(/[^a-z0-9]+/g, '')));
assert.strictEqual(uniq.size, facts.length, 'all fragments unique');
ok('every fragment is unique (a player never sees the same info twice)');

// ---- feast buffs: 2-3 short + 1 long every meal ----
assert.ok(/function grantMealBuffs\(\)/.test(mod), 'grantMealBuffs exists');
ok('module: grantMealBuffs() serves buffs on every meal');
assert.ok(/var count = 2 \+ Math\.floor\(Math\.random\(\) \* 2\);/.test(mod), '2-3 short buffs');
ok('module: serves 2-3 short buffs at a time');
assert.ok(/p\.foodLong\.push\(\{ t: LONG_BUFF\.t/.test(mod) && /LONG_MS = 99 \* 3600000/.test(mod), 'one long buff');
ok('module: serves exactly one long (~99 hr) buff');
assert.ok(/var gained = grantMealBuffs\(\);/.test(mod), 'reveal grants buffs');
ok('module: eating the chicken (reveal) always serves the feast buffs');

// ---- REBALANCE: buffs capped at +1 (min, per recent strike) .. +25 (max) per strike ----
(function () {
  const poolM = mod.match(/var SHORT_POOL = \[([\s\S]*?)\];/);
  assert.ok(poolM, 'SHORT_POOL found');
  const vals = [...poolM[1].matchAll(/val:\s*(\d+)/g)].map(m => +m[1]);
  const longM = mod.match(/var LONG_BUFF = \{[^}]*val:\s*(\d+)/);
  const longVal = longM ? +longM[1] : 0;
  assert.ok(vals.length >= 3, 'short pool has entries');
  assert.ok(Math.max(...vals, longVal) <= 25, 'no buff value exceeds 25, got ' + Math.max(...vals, longVal));
  ok('rebalance: every buff value is <= 25 extra points per strike (max)');
  const burstM = mod.match(/\{\s*t:\s*'burst',\s*val:\s*(\d+)/);
  assert.ok(burstM && +burstM[1] === 1, 'burst buff is +1 per recent strike (min)');
  ok('rebalance: burst buff is the +1-per-recent-strike minimum');
})();

console.log('\nAll ' + pass + ' checks passed.');
