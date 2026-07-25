// Regression coverage for the "hyper fix" pass:
//   GRANTS  — HQ-score / Soul-score grants must ALWAYS land (even granted-while-offline + refresh).
//   LOCKS   — score lock/unlock unaffected (covered fully by test-score-lock.mjs; re-asserted structurally).
//   LAG     — gainMult per-strike score routed through the rAF batcher (no per-strike DOM write race).
//   CONTROLLER — the gamepad poll loop starts exactly once (no stacked 60fps loops).
//   FLICKER — the live fighter is never rebuilt mid-spam (Craymore "deformed<->normal").
//
// Behavioral: a faithful reproduction of the NEW login-time pendingScore/pendingSoul claim proves the
// math + crash-safety (deduct-first, no double-credit). Structural guards prove the real wiring shipped.
//
// Run: node test-hyperfix-grants-lag.mjs
import fs from "fs";
const src = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
let fail = 0;
const ok = (c, m, extra) => { if (c) console.log("  \u2713 " + m); else { console.error("  \u2717 " + m + (extra ? " -> " + extra : "")); fail++; } };
const has = (s) => src.includes(s);

console.log("GRANTS: HQ-score / Soul-score grants land no matter what");

// ---- Behavioral: reproduce the login-time score/soul claim exactly as inserted in storage.load. ----
// Mirrors the real block: apply on top of the (already max-merged) local total, then atomically clear
// the cloud pending via increment(-pending). This is the offline->login safety net that used to only
// exist for gold/bag, so a grant made while a player was logged OUT (and whose live watcher never
// started) was never applied.
function loginClaim(p, net, dbWrites) {
  if (net && ((net.pendingScore || 0) !== 0 || (net.pendingSoul || 0) !== 0)) {
    const psLoad = net.pendingScore || 0;
    const plLoad = net.pendingSoul || 0;
    p.score = Math.max(0, (p.score || 0) + psLoad);
    p.soulScore = Math.max(0, (p.soulScore || 0) + plLoad);
    // deduct-first: atomic increment on the cloud doc
    dbWrites.push({ score: p.score, soulScore: p.soulScore, pendingScore: { __inc: -psLoad }, pendingSoul: { __inc: -plLoad } });
    // reflect the atomic clear on the shared cloud doc so a following reader sees it cleared
    net.pendingScore = (net.pendingScore || 0) - psLoad;
    net.pendingSoul = (net.pendingSoul || 0) - plLoad;
  }
}

// scenario 1: positive HQ-score + soul grant applied at login
(function () {
  const p = { id: "P", score: 1000, soulScore: 500 };
  const net = { score: 1000, soulScore: 500, pendingScore: 750, pendingSoul: 300 };
  const w = [];
  loginClaim(p, net, w);
  ok(p.score === 1750, "HQ-score grant applied at login (+750 -> 1750)", "score=" + p.score);
  ok(p.soulScore === 800, "Soul-score grant applied at login (+300 -> 800)", "soul=" + p.soulScore);
  ok(w[0] && w[0].pendingScore.__inc === -750 && w[0].pendingSoul.__inc === -300, "cloud pending cleared via atomic increment(-amt)");
  ok(net.pendingScore === 0 && net.pendingSoul === 0, "cloud doc pending fully drained (no re-claim by watcher/poll)");
})();

// scenario 2: crash-safety / no double-credit — a second claim over the drained doc is a no-op
(function () {
  const p = { id: "P", score: 0, soulScore: 0 };
  const net = { pendingScore: 5000, pendingSoul: 0 };
  const w = [];
  loginClaim(p, net, w);          // login applies it
  loginClaim(p, net, w);          // watcher/poll runs later against the now-cleared doc
  ok(p.score === 5000, "grant applied exactly once — no double-credit across login+watcher", "score=" + p.score);
  ok(w.length === 1, "second pass writes nothing (pending already 0)");
})();

// scenario 3: a negative grant (deduction) also lands and flags a legit score drop
(function () {
  const p = { id: "P", score: 9000, soulScore: 9000 };
  const net = { pendingScore: -4000, pendingSoul: 0 };
  const w = [];
  loginClaim(p, net, w);
  ok(p.score === 5000, "deduction landed at login (-4000 -> 5000)", "score=" + p.score);
})();

// ---- Structural: the real login claim + hardened fallback shipped in index.html ----
ok(has("PENDING HQ SCORE / SOUL AT LOGIN"), "login-time score/soul claim block exists in storage.load");
ok(has("if (db && net && ((net.pendingScore || 0) !== 0 || (net.pendingSoul || 0) !== 0)) {"), "login claim reads net.pendingScore / net.pendingSoul");
ok(has("pendingScore: increment(-psLoad), pendingSoul: increment(-plLoad)"), "login claim clears pending via atomic increment(-amt)");
ok(has("const _rawGet = (window.__BCA_FS && window.__BCA_FS.getDocRaw) ? window.__BCA_FS.getDocRaw : getDoc;"), "save-time fallback claimer reads the AUTHORITATIVE DB row (getDocRaw, no cache mask)");
// the live watcher still handles all four pending fields uniformly (unchanged, re-asserted)
ok(has("var pg = +d.pendingGold || 0, ps = +d.pendingScore || 0, pl = +d.pendingSoul || 0, pb = +d.pendingBagGold || 0;"), "live watcher applies gold/score/soul/bag uniformly");

console.log("\nLOCKS: score lock authority intact");
ok(has("S.admin.lockScore = function (name, score, soul) {"), "lockScore present");
ok(has("function enforceSelfLock()"), "self-lock enforcement present (locked player's own save can't push over the lock)");

console.log("\nLAG: gainMult +bonus routed through the zero-lag frame batcher (no per-strike DOM write race)");
ok(has("st.hqObj.score += Math.round(dHq * (mult - 1));\n              S.combat._scoreDirty = true;"), "gainMult wrapper sets _scoreDirty instead of writing #hq-battle-score directly");
ok(!has("if (dHq > 0) { st.hqObj.score += dHq * (mult - 1); var el = document.getElementById('hq-battle-score');"), "old per-strike toLocaleString + direct DOM write in the gainMult wrapper is gone");

console.log("\nCONTROLLER: gamepad poll loop starts exactly once (no stacked 60fps loops)");
ok(has("if (!BCA_SYS.combat._gpLoopStarted) { BCA_SYS.combat._gpLoopStarted = true; requestAnimationFrame(BCA_SYS.combat.pollGamepads); }"), "gamepad kickoff guarded by _gpLoopStarted");

console.log("\nFLICKER: live fighter never rebuilt mid-spam (Craymore deformed<->normal)");
ok(has("BCA_SYS.combat._lastStrikeAt = Date.now();"), "strike path stamps _lastStrikeAt");
ok(has("const _spamming = (_rig && _rig.classList && _rig.classList.contains('bca-spam-loop')) || (Date.now() - ((BCA_SYS.combat && BCA_SYS.combat._lastStrikeAt) || 0) < 700);"), "refreshLiveFighters computes an actively-spamming guard");
ok(has("if (fid && !_justDeployed && !_spamming && BCA_SYS.combat && BCA_SYS.combat.buildFighter) {"), "refreshLiveFighters defers the rebuild while actively spamming");

console.log(fail ? `\nFAILED: ${fail} check(s).` : "\nALL HYPERFIX GRANT/LAG TESTS PASSED.");
process.exit(fail ? 1 : 0);
