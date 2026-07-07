import fs from 'fs';
const code = fs.readFileSync('./forge-studio.js', 'utf8');
const mod = { exports: {} };
// Load as CommonJS with no DOM so only the pure engine initializes.
new Function('module', 'exports', 'window', 'document', code)(mod, mod.exports, undefined, undefined);
const E = mod.exports;

let fails = 0;
function ok(c, m) { console.log((c ? '  \u2713 ' : '  \u2717 ') + m); if (!c) fails++; }

console.log('TEST 1: template + render produces real SVG with materials & layers');
const d = E.template('sword');
ok(d.layers.length >= 4, 'sword template has multiple part layers (' + d.layers.length + ')');
const r = E.renderDoc(d, { light: 0 });
ok(/<svg[\s\S]*<\/svg>/.test(r.svg), 'renders an <svg>');
ok(r.svg.indexOf('linearGradient') > -1, 'uses gradients (material/volume)');
ok(r.svg.indexOf('radialGradient') > -1, 'uses radial gradients (gems/orbs)');
ok(r.svg.indexOf('<g transform="translate(') > -1, 'each layer is a transformed group');

console.log('\nTEST 2: layer ops (add/dup/mirror/reorder/remove) are independent');
const g1 = E.addLayer(d, 'deco', 'gem'); const n0 = d.layers.length;
const dup = E.duplicateLayer(d, g1.id);
ok(d.layers.length === n0 + 1 && dup && dup.id !== g1.id, 'duplicate adds an independent copy');
E.mirrorLayer(d, g1.id, 'x'); ok(d.layers.filter(l => l.id === g1.id)[0].mirrorX === true, 'mirror toggles only that layer');
const before = E.indexOfLayer(d, g1.id); E.moveLayer(d, g1.id, -1); ok(E.indexOfLayer(d, g1.id) === Math.max(0, before - 1), 'reorder moves layer down');
E.removeLayer(d, dup.id); ok(E.indexOfLayer(d, dup.id) === -1, 'remove deletes only that layer');

console.log('\nTEST 3: variation engine keeps reused decorations unique');
const a = E.addLayer(d, 'deco', 'filigree'); const b = E.addLayer(d, 'deco', 'filigree');
E.varyLayer(a, E.rng('a')); E.varyLayer(b, E.rng('b'));
ok(a.seed !== b.seed && (a.rot !== b.rot || a.sx !== b.sx), 'two placements of the same deco differ');

console.log('\nTEST 4: clip-to-body blending references the item silhouette');
const dd = E.template('sword'); const deco = E.addLayer(dd, 'deco', 'engraving'); deco.clipToBody = true;
const rr = E.renderDoc(dd, {});
ok(rr.svg.indexOf('clipPath') > -1 && rr.svg.indexOf('clip-path="url(#') > -1, 'decoration is clipped to the body (not pasted on)');

console.log('\nTEST 5: one-click quality ops improve the analysis score');
const flat = E.defaultDoc('weapons'); const bl = E.addLayer(flat, 'part', 'blade'); bl.gradient = false; bl.shadow = 0;
const s0 = E.analyze(flat).score;
E.QUALITY.professionalize(flat);
const s1 = E.analyze(flat).score;
ok(s1 > s0, 'professionalize raises quality score (' + s0 + ' -> ' + s1 + ')');
E.QUALITY.masterpiece(flat); ok(E.renderDoc(flat, {}).svg.length > 200, 'masterpiece composes a full item');

console.log('\nTEST 6: quality analysis detects cheap/pasted issues + auto-fix');
const cheap = E.defaultDoc('weapons'); const p = E.addLayer(cheap, 'part', 'plate'); p.gradient = false; p.shadow = 0;
const dcp = E.addLayer(cheap, 'deco', 'gem'); dcp.clipToBody = false; dcp.shadow = 0;
const an = E.analyze(cheap);
ok(an.issues.some(i => i.k === 'flat') && an.issues.some(i => i.k === 'pasted'), 'flags flat + pasted-on issues');
const fixed = E.autoFix(cheap);
ok(fixed.score > an.score, 'auto-fix improves score (' + an.score + ' -> ' + fixed.score + ')');

console.log('\nTEST 7: stats -> real qm buff / food buff');
const wb = E.buildBuff('weapons', { damage: 100, critChance: 20, critDamage: 60 }, ['fire_damage', 'royal']);
ok(wb.buffData && wb.buffData.t === 'qm' && wb.buffData.flat > 0, 'weapon buff is a qm buff with flat points');
const fb = E.buildBuff('food', { healing: 80, duration: 120 }, []);
ok(fb.foodBuff && fb.foodBuff.val > 0 && fb.foodBuff.mins === 120, 'food buff carries value + duration');

console.log('\nTEST 8: full render is stable across all part/deco/fx types (no throw)');
let threw = null;
try { const big = E.defaultDoc('weapons'); Object.keys(E.PARTS).forEach(t => E.addLayer(big, 'part', t)); Object.keys(E.DECOS).forEach(t => { const l = E.addLayer(big, 'deco', t); l.clipToBody = true; }); Object.keys(E.FX).forEach(t => E.addLayer(big, 'fx', t)); E.renderDoc(big, { light: 45 }); }
catch (e) { threw = e; }
ok(!threw, 'renders every registered part/deco/fx type without error' + (threw ? ' (' + threw.message + ')' : ''));

console.log('\nTEST 9: ORIGINAL ART PRESERVATION (upgrade builds on top, never ruins it)');
const ORIGIN = '<div class="art-stage" data-orig="crown-of-suns"><svg><path d="M1 1"/></svg></div>';
const od = E.defaultDoc('weapons'); od.origin = ORIGIN;
// base body requirement is satisfied by the preserved original art (no "noBody" complaint)
const oa = E.analyze(od);
ok(!oa.issues.some(i => i.k === 'noBody'), 'origin art counts as the base body (no "no base part" issue)');
ok(!oa.issues.some(i => i.k === 'detail'), 'origin art counts as detail (no "low detail" complaint on 0 layers)');
// rendered shop/equipped art embeds the ORIGINAL art verbatim, behind the overlay
const oHtml = E.renderArtHTML(od);
ok(oHtml.indexOf('data-orig="crown-of-suns"') > -1, 'renderArtHTML embeds the original art verbatim');
ok(oHtml.indexOf('fs-origin-base') > -1, 'original art is placed as the preserved foundation layer');
// adding an upgrade layer on top keeps the original art intact
const gem = E.addLayer(od, 'deco', 'gem'); E.varyLayer(gem, E.rng('x'));
const oHtml2 = E.renderArtHTML(od);
ok(oHtml2.indexOf('data-orig="crown-of-suns"') > -1, 'original art still present after adding an upgrade layer');
ok(oHtml2.length > oHtml.length, 'upgrade layer stacks ON TOP of the original art');
// a doc WITHOUT origin renders the normal generated stage (no foundation)
ok(E.renderArtHTML(E.template('sword')).indexOf('fs-origin-base') === -1, 'non-origin items render normally (no foundation)');

console.log(fails ? '\nFAILED: ' + fails : '\nALL FORGE STUDIO ENGINE TESTS PASSED.');
process.exit(fails ? 1 : 0);
