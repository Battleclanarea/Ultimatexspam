// Structural regression guards for:
//  BUG 1 - false "everyone ONLINE" on login (presence heartbeat first-sight seeding)
//  BUG 2 - armor flickering in/out on status/roster avatars (avatar-node preservation)
//  BUG 3 - two roster boards on the barracks menu (keep only per-barracks WHO'S HERE)
//  SHIELD - shields ride the shoulder / cover the body (authoritative off-hand placement)
//
// Functional behavior is verified separately in a headless browser (presence first-snapshot shows
// nobody falsely online; a real beat still reads online; and 16 shields all place on the off-hand
// below the shoulder). This file guards the source so the fixes cannot silently regress.
//
// Run: node test-status-shield-fixes.mjs

import fs from "fs";
const src = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
let failures = 0;
const ok = (c, m) => { if (c) console.log("  \u2713 " + m); else { console.error("  \u2717 " + m); failures++; } };
const has = (s) => src.includes(s);

console.log("BUG 1 - presence: no false 'everyone online' on first snapshot");
ok(has("if (P._prevTime[k] === undefined) { P._prevTime[k] = t; }"), "recordHeartbeats records first sight WITHOUT stamping it as a live beat");
ok(has("else if (P._prevTime[k] !== t) { P._prevTime[k] = t; P._localSeen[k] = seenNow; }"), "only a heartbeat CHANGE marks a player observed-online");
ok(!has("if (P._prevTime[k] === undefined || P._prevTime[k] !== (u.time || 0)) {"), "old first-sight-stamps-everyone code is gone");

console.log("BUG 2 - armor flicker: avatar node preserved when gear unchanged");
ok(has('data-gear-sig="'), "row carries a gear signature");
ok(has("if (cur.getAttribute('data-gear-sig') === fresh.getAttribute('data-gear-sig'))"), "row reconciliation compares gear signature");
ok(has("newFig.parentNode.replaceChild(oldFig, newFig)"), "existing avatar SVG is transplanted (not re-parsed) on score/status updates");

console.log("BUG 3 - barracks menu shows only WHO'S HERE (not a duplicate PLAYER STATUS board)");
ok(has("'rzg-view-nav': 1"), "the generic PLAYER STATUS board is denied on the barracks menu view");
ok(has("bar.toUpperCase() + ' \\u2014 WHO\\u2019S HERE"), "WHO'S HERE panel is labeled per-barracks");

console.log("SHIELD - authoritative off-hand placement (never on the shoulder / covering the body)");
ok(has('id="bca-shield-size-clamp"'), "final shield placement style block exists");
ok(has(".fighter-rig .fighter-shield.strict-shield-worn[data-strict-shield-type]{") || has(".fighter-rig .fighter-shield.strict-shield-worn[data-strict-shield-type]"), "override matches the strict per-type specificity");
ok(has("left:5% !important; right:auto !important; top:33% !important"), "shield pinned to the off-hand at forearm/hand height");
ok(has(".fighter-rig .fighter-shield.strict-shield-worn[data-strict-shield-type] .strict-shield-exact-art,"), "strict per-type inner transform is neutralized so the shield is not pushed off-place");

console.log(failures ? `\nFAILED: ${failures} guard(s).` : "\nALL STATUS + SHIELD GUARDS PASSED.");
process.exit(failures ? 1 : 0);
