// Structural regression guards for:
//   (A) BUFF fixes: long buffs last ~99h; short buffs wear by SPAM COUNT (not score);
//       score no longer shaves buff time.
//   (B) SPAM logging: per-run spam count written into the [X-SPAM PROTOCOL] line + a
//       per-session spam counter.
//   (C) CLASSIFIED grouping: X-SPAM runs are grouped into per-player session summaries
//       (total score + total spams + time range) and color-coded per player.
//
// These are text-level guards over index.html (the game is one giant file with no unit
// harness). Functional behavior is proven separately by the headless-browser harness.
//
// Run: node test-buff-spamlog.mjs

import fs from "fs";
const src = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
let failures = 0;
function ok(cond, msg) { if (cond) console.log("  \u2713 " + msg); else { console.error("  \u2717 " + msg); failures++; } }
const has = (s) => src.includes(s);
const countOf = (s) => src.split(s).length - 1;

console.log("A) BUFF MECHANICS");
ok(countOf("var LONG_FOOD_HOURS = 99;") >= 2, "BOTH admin-food handlers define a 99-hour long-buff window");
ok(countOf("var durMs = (kind === 'long') ? (LONG_FOOD_HOURS * 3600000) : (mins * 60000);") >= 2, "both handlers: long foods use hours, short foods keep minutes");
ok(!/expireAt: now \+ mins \* 60000, desc: '\+' \+ v/.test(src), "old minutes-only long-food expiry is gone from both handlers");

ok(has("BCA_SYS.food._wearPerSpam != null"), "short-buff wear reads the tunable per-spam constant");
ok(has("_wearPerSpam: 6,"), "food config exposes _wearPerSpam (spam-count wear)");
ok(!has("const wearMult = 0.3 + Math.min(0.6, spamRate * 0.04);"), "old SCORE-scaled wear formula removed");
ok(!has("Math.round((basePts + Math.floor(bonus)) * wearMult)"), "wear no longer multiplies by points earned");

ok(has("scoreBurn: (_pts) => { /* no-op"), "scoreBurn is now a no-op (no score-based clock shaving)");
ok(!has("while (p._buffScoreBucket >= 5000) { p._buffScoreBucket -= 5000; mins++; }"), "old 5,000-score = -1 min burn loop removed");

console.log("B) SPAM COUNT LOGGING");
ok(has("st.sessionSpams = (st.sessionSpams || 0) + 1;"), "every scoring strike increments the session spam counter");
ok(countOf("${spams.toLocaleString()} spams") >= 2, "both saveRun and logRunEnd write the run's spam count");
ok(has("const spams = Math.max(0, Math.floor(BCA_SYS.state.runStrikes || 0));"), "run spam count is captured from runStrikes");

console.log("C) CLASSIFIED GROUPING + COLORS");
ok(has("parseSpamLog:"), "parseSpamLog helper exists");
ok(has("groupSpamLogs:"), "groupSpamLogs helper exists");
ok(has("renderSpamGroup:"), "renderSpamGroup helper exists");
ok(has("_playerColor:"), "_playerColor (per-player color) helper exists");
ok(has("got a total of"), "grouped row phrasing matches the requested summary format");
ok(has("const GAP = 45 * 60000;"), "runs cluster into sessions within a 45-min gap");
ok(has("renderSpamCategory("), "renderLogList routes the X-SPAM category through the grouped renderer");
ok(countOf("renderSpamCategory(all,") >= 2, "grouping applied in BOTH the ALL overview and the X-SPAM tab");
ok(has("gr.other.slice(0, cap).forEach"), "non-run spam-category lines are still rendered (nothing hidden)");

console.log(failures ? `\nFAILED: ${failures} guard(s).` : "\nALL BUFF + SPAM-LOG GUARDS PASSED.");
process.exit(failures ? 1 : 0);
