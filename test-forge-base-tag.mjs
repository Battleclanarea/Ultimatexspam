// Guards that the ugly "BASE" label is gone from the Forge Studio weapon base styles.
// wbWrap() wraps every base's art AND becomes the saved item's foundation (origin) art, so the
// tag used to appear on the base-library cards, in the editor, and even on finished items.
import fs from 'fs';
const code = fs.readFileSync(new URL('./forge-studio.js', import.meta.url), 'utf8');
let all = true;
function check(n, c, extra) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n + (extra != null ? ' -> ' + extra : '')); all = c && all; }

// 1) wbWrap no longer emits a BASE rarity tag.
const wb = code.slice(code.indexOf('function wbWrap('), code.indexOf('function gunBase('));
check('wbWrap no longer renders a BASE tag', !/>BASE<\/span>/.test(wb));
check('wbWrap still wraps the base art in an svg stage', /art-stage/.test(wb) && /<svg viewBox="0 0 100 100"/.test(wb));

// 2) A defensive strip cleans the tag out of already-saved items' origin art.
check('stripBaseTag helper exists', /function stripBaseTag\(html\)/.test(code));
check('originLayerHTML runs origin through stripBaseTag', /stripBaseTag\(doc\.origin\)/.test(code));

// 3) stripBaseTag actually removes the legacy baked span but keeps the real art.
const body = code.slice(code.indexOf('function stripBaseTag(html)'));
const m = body.match(/return String\(html \|\| ''\)\.replace\((\/[\s\S]*?\/g), ''\);/);
check('stripBaseTag body extracted', !!m);
if (m) {
  const re = new RegExp(m[1].slice(1, m[1].lastIndexOf('/')), 'g');
  const strip = (h) => String(h || '').replace(re, '');
  const legacy = '<div class="art-stage"><span class="rarity-tag" style="color:#cbd5e1;border-color:#3a4150">BASE</span><svg>ART</svg></div>';
  const out = strip(legacy);
  check('legacy BASE tag removed', out.indexOf('>BASE<') < 0, out);
  check('the real art is preserved', out.indexOf('<svg>ART</svg>') >= 0);
}

// 4) the weapon base library itself is intact (bases still defined).
check('weapon base library still populated', /var WEAPON_BASES = \[/.test(code) && /M16 Assault Rifle/.test(code));

console.log('\n' + (all ? 'ALL FORGE BASE-TAG TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
