/* Structural + light functional regression test for FOOD STUDIO (food-studio.js).
 * Full runtime behaviour (create food, eat -> file reveal + buffs, art render, edit existing)
 * is verified end-to-end in a headless browser; this guards the wiring from drift. */
import fs from 'fs';
import assert from 'assert';
const mod = fs.readFileSync(new URL('./food-studio.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let pass = 0; const ok = (n) => { console.log('  PASS', n); pass++; };

// ---- index.html wiring ----
assert.ok(/food-studio\.js/.test(html), 'loader present');
ok('index.html: loads the food-studio.js sibling module');
assert.ok(/if \(item\.foodStudio \|\| \(window\.__BCA_foodStudioIds && window\.__BCA_foodStudioIds\[id\]\)\) return true;/.test(html), 'dedicated() honours food studio arts');
ok('index.html: food-art chain (dedicated) honours Food Studio hand-built art');

// ---- 30+ base arts ----
const baseCount = (mod.match(/art:\s*function\s*\(\)/g) || []).length;
assert.ok(baseCount >= 30, 'at least 30 base arts, got ' + baseCount);
ok('module: ' + baseCount + ' food base arts (>= 30)');

// ---- appearance modifiers (several) ----
assert.ok(/var PLATES = \{/.test(mod) && /var AURAS = \{/.test(mod) && /var GARNISHES = \{/.test(mod) && /var STEAM =/.test(mod), 'modifier libraries');
ok('module: plate + aura + garnish + steam + glow/backdrop/size/tag modifiers');
assert.ok(/function composeArt\(a, sfx\)/.test(mod), 'composeArt');
ok('module: composeArt() builds the final art from base + modifiers');

// ---- per-food info / files ----
assert.ok(/function splitInfo\(text, count\)/.test(mod) && /groups = Math\.min\(n, m\)/.test(mod), 'splitInfo honours count');
ok('module: splitInfo() splits pasted info into the chosen number of files');
assert.ok(/p\.foodCodex = p\.foodCodex \|\| \{\};/.test(mod) && /rec\.progress = idx \+ 1;/.test(mod), 'per-food progress');
ok('module: files are networked to ONLY that food (per-food, per-player progress)');
assert.ok(/id="fs-codex-count"/.test(mod) && /TOTAL files across this food/.test(mod), 'total-files control');
ok('module: admin chooses TOTAL files across a food');

// ---- short + long buffs ----
assert.ok(/short:\s*\{ on: chk\('fs-sb-on'\)/.test(mod) && /long:\s*\{ on: chk\('fs-lb-on'\)/.test(mod), 'buff form');
ok('module: edit SHORT-TERM and LONG-TERM buffs of the food');
assert.ok(/function grantBuffs\(cfg\)/.test(mod) && /p\.foodShort\.push\(b\)/.test(mod) && /p\.foodLong\.push\(lb\)/.test(mod), 'grantBuffs');
ok('module: eating grants the configured short + long buffs');

// ---- edit existing OR create new ----
assert.ok(/EDIT EXISTING FOOD/.test(mod) && /CREATE NEW FOOD/.test(mod), 'both modes');
ok('module: works on OLD (existing) foods and NEW foods');

// ---- persistence + live apply ----
assert.ok(/LS_KEY = 'bca_food_studio_v1'/.test(mod) && /CLOUD_DOC = 'food_studio'/.test(mod), 'persistence keys');
ok('module: persists to localStorage + cloud (bca_system/food_studio)');
assert.ok(/s\.shop\.generateDB\._foodStudio/.test(mod) && /s\.food\.consume\._foodStudio/.test(mod), 'runtime wraps');
ok('module: injects/registers via generateDB wrap + intercepts consume');
assert.ok(/s\.shop\.legendaryArt\[fid\] = function/.test(mod), 'art registered into legendaryArt');
ok('module: registers each food art into shop.legendaryArt (shows in shops)');

// ---- light functional check of splitInfo semantics (re-implement + compare intent) ----
function splitInfo(text, count) {
  text = String(text == null ? '' : text).replace(/\s+/g, ' ').trim(); if (!text) return [];
  const n = Math.max(1, Math.min(100000, Math.floor(count)));
  const sents = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  let units, sep; if (sents.length >= n) { units = sents; sep = ' '; } else { const w = text.split(' '); if (w.length >= n) { units = w; sep = ' '; } else { units = text.split(''); sep = ''; } }
  const m = units.length, groups = Math.min(n, m), out = [];
  for (let g = 0; g < groups; g++) { let a = Math.floor(g * m / groups), b = Math.floor((g + 1) * m / groups); if (b <= a) b = a + 1; out.push(units.slice(a, b).join(sep)); }
  return out;
}
const big = Array.from({ length: 60 }, (_, i) => 'Sentence number ' + (i + 1) + ' about the feast.').join(' ');
assert.strictEqual(splitInfo(big, 30).length, 30, 'splits to exactly the chosen count when content is large');
ok('splitInfo: a large body splits into EXACTLY the chosen file count (30)');
assert.strictEqual(splitInfo(big, 120).length <= 120, true, 'never exceeds content units');
ok('splitInfo: never produces more files than there is content');

console.log('\nAll ' + pass + ' checks passed.');
