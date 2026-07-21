// Structural regression guards for the lag + visual-glitch fixes.
// Functional behavior (throttle counts, shield size) is proven by the headless-browser harness.
//
// Run: node test-lag-visual-fixes.mjs

import fs from "fs";
const src = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
let failures = 0;
const ok = (c, m) => { if (c) console.log("  \u2713 " + m); else { console.error("  \u2717 " + m); failures++; } };
const has = (s) => src.includes(s);
const countOf = (s) => src.split(s).length - 1;

console.log("PERF: per-strike animation throttles (reduce main-thread load -> no frozen clock/dropped inputs)");
ok(has("BCA_SYS.combat._swingAt") && has("if (_swNow - (BCA_SYS.combat._swingAt[containerId] || 0) < 45) return;"), "swingFighter restart is throttled to ~45ms");
ok(has("const _wpnArtChanged =") && has("if (_wpnArtChanged || _waNow - BCA_SYS.combat._wpnAnimAt >= 45)"), "weapon-action restart/validate throttled (immediate on art change)");
ok(has("                    }\n                    BCA_SYS.audio.playWeaponSound(profile.sound);\n                },"), "strike SOUND still plays every strike (outside the throttle block)");

console.log("PERF: Akisuma joystick bind-once (no stacked 60fps rAF / duplicate listeners)");
ok(has("if(bindJoystick._bound){ reset(); return; }") && has("bindJoystick._bound = true;"), "bindJoystick binds exactly once");
ok(has("function onStick(e){"), "joystick uses event delegation so it survives DOM re-render");
ok(has("var scr=document.getElementById('screen-aksm-hq'); if(scr&&scr.classList.contains('active')&&cur==='hq'){ var gps=navigator.getGamepads"), "single gamepad poll only works while the joystick screen is active");

console.log("PERF: Royal Walls single strike handler (no double addWallHP / double work)");
ok(countOf("!T._wallStrikeEventsF2dc) wallHit") >= 2, "legacy wall handlers defer to the canonical guarded handler");
ok(has("else if (T.loc === 'Royal Walls' && !T._wallStrikeEventsF2dc) wallHit(null);"), "wall keydown also de-duplicated");

console.log("PERF: Arena opponent figure only rebuilt on change (not every ~700ms snapshot)");
ok(has("if (cur._oppFigSig !== _oppSig)"), "opponent SVG figure rebuilt only when gear/name signature changes");

console.log("VISUAL: giant-shield hard size clamp");
ok(has('id="bca-shield-size-clamp"'), "final shield size-clamp style block exists");
ok(has(".fighter-rig .fighter-shield{ max-width:56% !important; max-height:60% !important;"), "shield box hard-capped so it can never cover the body");

console.log(failures ? `\nFAILED: ${failures} guard(s).` : "\nALL LAG + VISUAL GUARDS PASSED.");
process.exit(failures ? 1 : 0);
