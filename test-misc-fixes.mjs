// Verifies the deterministic fixes: title text, the removed literal "FIST" text (now a fist
// glyph), the tuned bot-rhythm engines (tighter, human, not "nerfed"), and the gear anti-flicker
// memo. Also statistically checks the new bot-delay formula is more CONSISTENT than the old one
// while keeping its average near the set speed.
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

let all = true;
function check(n, c, extra) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n + (extra ? ' -> ' + extra : '')); all = c && all; }

// ---- title ----
check('title shows "THE NEW ERA IS HERE"', html.indexOf('THE NEW ERA IS HERE') > -1);
check('old "NEW ERA ARRIVING" title removed', html.indexOf('NEW ERA ARRIVING') < 0);

// ---- FIST text removed (fist glyph instead) ----
check('avatar rig no longer renders literal ">FIST<"', html.indexOf('>FIST<') < 0);
check('avatar rig uses a fist glyph for empty hands', /data-displayed-hand-item-id="FISTS"[^>]*>\s*<div[^>]*>\\uD83D\\uDC4A<\/div>|\uD83D\uDC4A/.test(html));

// ---- bot rhythm tuned in all 3 engines ----
check('drift tightened to +/-8% in all 3 engines', (html.match(/Math\.sin\((?:self|b)\.hPhase\) \* 0\.08/g) || []).length >= 3);
check('jitter tightened to +/-18% in all 3 engines', (html.match(/base \* 0\.18/g) || []).length >= 3);
check('hesitation made rarer (roll < 0.012) in all 3 engines', (html.match(/roll < 0\.012/g) || []).length >= 3);
check('old +/-38% jitter fully removed', html.indexOf('base * 0.38') < 0);

// ---- gear anti-flicker memo ----
check('gear anti-flicker memo added (_gearMemo)', /S\._gearMemo/.test(html) && /hadGearField/.test(html));

// ---- statistical: new delay formula is more consistent & average stays near base ----
function sampleDelay(jitter, hesChance, hesAdd, dblChance, dblLo, dblHiRange) {
  const base = 100; // 10 tps
  const g = ((Math.random() + Math.random() + Math.random()) / 3) * 2 - 1;
  let delay = base + g * base * jitter;
  const roll = Math.random();
  if (roll < hesChance) delay += hesAdd[0] + Math.random() * hesAdd[1];
  else if (roll < dblChance) delay *= dblLo + Math.random() * dblHiRange;
  return Math.max(30, delay);
}
function stats(fn) {
  const N = 40000; let sum = 0; const arr = [];
  for (let i = 0; i < N; i++) { const d = fn(); sum += d; arr.push(d); }
  const mean = sum / N; let v = 0; for (const d of arr) v += (d - mean) * (d - mean);
  return { mean, sd: Math.sqrt(v / N) };
}
const oldS = stats(() => sampleDelay(0.38, 0.025, [140, 260], 0.07, 0.55, 0.15));
const newS = stats(() => sampleDelay(0.18, 0.012, [60, 120], 0.05, 0.70, 0.15));
check('new rhythm is MORE consistent (lower stddev)', newS.sd < oldS.sd, 'old sd=' + oldS.sd.toFixed(1) + ', new sd=' + newS.sd.toFixed(1));
check('new rhythm average stays near the set speed (~100ms base)', Math.abs(newS.mean - 100) < 8, 'new mean=' + newS.mean.toFixed(1));
check('new rhythm is faster on average than the old "nerfed" feel', newS.mean <= oldS.mean, 'old mean=' + oldS.mean.toFixed(1) + ', new mean=' + newS.mean.toFixed(1));

console.log('\n' + (all ? 'ALL MISC-FIX TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
