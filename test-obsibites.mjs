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
assert.ok(/CODEX FRAGMENT/.test(mod) && /eat again for the next fragment/.test(mod), 'fragment modal above food info');
ok('module: fragment modal shows the codex info ABOVE the food info pool');

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
function splitFacts() {
  const text = CODEX.replace(/\s+/g, ' ').trim();
  const raw = text.split(/(?<=[.!?])\s+/);
  const seen = {}, sents = [];
  raw.forEach(s => { s = s.trim(); if (s.length < 6) return; const k = s.toLowerCase().replace(/[^a-z0-9]+/g, ''); if (!k || seen[k]) return; seen[k] = 1; sents.push(s); });
  function chunkAt(w) { const out = [], f = {}; sents.forEach(s => { const words = s.split(' '); for (let i = 0; i < words.length; i += w) { let c = words.slice(i, i + w).join(' ').trim(); const fk = c.toLowerCase().replace(/[^a-z0-9]+/g, ''); if (!fk || f[fk]) continue; f[fk] = 1; out.push(c); } }); return out; }
  let w = 13, facts = chunkAt(w);
  while (facts.length < 1000 && w > 3) { w--; facts = chunkAt(w); }
  return facts;
}
const facts = splitFacts();
assert.ok(facts.length >= 1000, 'codex splits into >= 1000 fragments, got ' + facts.length);
ok('codex splits into ' + facts.length + ' fragments (>= 1000 meals to read it all)');
const uniq = new Set(facts.map(f => f.toLowerCase().replace(/[^a-z0-9]+/g, '')));
assert.strictEqual(uniq.size, facts.length, 'all fragments unique');
ok('every fragment is unique (a player never sees the same info twice)');

console.log('\nAll ' + pass + ' checks passed.');
