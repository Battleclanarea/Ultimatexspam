// Structural guards (pure Node) for two fixes in index.html:
//  1) LIVE SCORE BROADCAST: a small {score,soulScore} merge to bca_users on a throttled cadence
//     during a run, so other players see scores update quickly (not every ~5s / not frozen).
//  2) BARRACKS RUN LOCK: no early ABORT/BACK/forfeit during a run, and BCA0 locks scoring without
//     ending the run (the wall-clock timer finishes it).
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let all = true;
function check(n, c, extra) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n + (extra != null ? ' -> ' + extra : '')); all = c && all; }

// ---- Fix 1: live score broadcast ----
check('live-score script present', /id="live-score-broadcast"/.test(html));
check('live-score cadence is throttled (2500ms)', /LIVE_MS\s*=\s*2500/.test(html));
check('live-score only runs during a run', /if \(act !== 'hq_run' && act !== 'arena_run'\) return;/.test(html));
check('live-score skips when nothing changed (skip-unchanged)', /if \(sc === lastScore && sl === lastSoul\) return;/.test(html));
check('live-score writes a tiny score+soul merge to bca_users', /FS\.setDoc\(FS\.doc\(DB, 'bca_users', p\.id\), \{ id: p\.id, score: sc, soulScore: sl \}, \{ merge: true \}\);/.test(html));
// it must NOT include a timestamp field (would break skip-unchanged and spam writes)
{
  const m = html.match(/id="live-score-broadcast"[\s\S]*?<\/script>/);
  const blk = m ? m[0] : '';
  check('live-score merge omits any lastUpdate/time field', !/lastUpdate|\btime\b/.test(blk.replace(/<!--[\s\S]*?-->/g, '')));
}

// ---- Fix 2: barracks run lock ----
check('nav hides ABORT/BACK on the active run screen (hq-active)', /if \(target === 'nav' \|\| target === 'hq-active'\) \{ abortBtn\.classList\.add\('hidden'\)/.test(html));
check('barracksRunLocked helper exists', /barracksRunLocked: \(\) => \{ const st = BCA_SYS\.state; return st\.currentActivity === 'hq_run' && st\.hqObj && !st\.hqObj\.finished; \}/.test(html));
check('final run-lock wrapper present', /id="barracks-run-lock-final"/.test(html));
check('final wrapper guards forceExit, goBack and forfeit', /wrap\(S\.rzg, 'forceExit'\); wrap\(S\.rzg, 'goBack'\); wrap\(S\.hq, 'forfeit'\);/.test(html));

// ---- Fix 2: BCA0 must NOT end an HQ run early ----
{
  // isolate the effective bca0 patch body (the one guarded by _noScoreDropPatch)
  const s = html.indexOf('BCA_SYS.combat.bca0 = function ()');
  const e = html.indexOf('_noScoreDropPatch = true;', s);
  const body = html.slice(s, e);
  const hqBranch = body.slice(body.indexOf("if (st.currentActivity === 'hq_run' && st.hqObj)"), body.indexOf("if (st.currentActivity === 'arena_run'"));
  check('BCA0 still locks scoring (cheatLockMatch)', /st\.cheatLockMatch = true;/.test(body));
  check('BCA0 hq_run branch does NOT finish the run', !/st\.hqObj\.finished = true;/.test(hqBranch));
  check('BCA0 hq_run branch does NOT clear the run timer', !/clearInterval\(st\.hqObj\.timer\)/.test(hqBranch));
  check('BCA0 hq_run branch does NOT nav away / end the run early', !/BCA_SYS\.rzg\.nav\('nav'\)/.test(hqBranch) && !/st\.currentActivity = 'hq'/.test(hqBranch));
  check('BCA0 hq_run branch marks the run cheat-locked', /st\.hqObj\.cheatLocked = true;/.test(hqBranch));
}

console.log('\n' + (all ? 'ALL RUN-LOCK/LIVE-SCORE TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
