// Structural guards (pure Node) for the "event clan deductions must stick" fix in index.html.
// A clan's event score = simScore (an ever-growing hardcoded baseline) + boost, and negative
// boosts were clamped back to >=0 by the devotion floor - so deductions instantly shot back up.
// The fix stores an ABSOLUTE, authoritative override (evtabs__<key>) that replaces simScore/boost
// for that clan and is applied verbatim (never floored) on cloud sync.
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let all = true;
function check(n, c) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n); all = c && all; }

check('absolute override map + key helper exist', /EV = \{ boost: \{\}, _floor: \{\}, abs: \{\}/.test(html) && /function absKeyOf\(evt, kind, id\)/.test(html));
check('clanScore uses frozen base + boost (deduction sticks, boosters still add on top)', /if \(hasAbs\(ak\)\) return Math\.max\(0, Math\.floor\(EV\.abs\[ak\]\) \+ boost\);/.test(html) && /return Math\.max\(0, simScore\(evt, 'clan', cid\) \+ boost\);/.test(html));
check('setClanAbs stores the frozen base as total minus current boost', /var base = Math\.floor\(Math\.max\(0, Math\.floor\(val \|\| 0\)\) - boostOf\(evt, 'clan', cid\)\);/.test(html));
check('cloud sync applies evtabs overrides verbatim (NOT floored)', /if \(cloudT >= \(EV\.absT\[k\] \|\| 0\)\) \{ EV\.abs\[k\] = d\[k\]; EV\.absT\[k\] = cloudT; \}/.test(html));
check('setClanAbs writes the frozen base (not an increment)', /function setClanAbs\(evt, cid, val\)[\s\S]*?payload\[ak\] = base;/.test(html));
check('admin clan deduct/inject routes through the absolute override', /if \(kind === 'clan'\) \{[\s\S]*?setClanAbs\(evt, id, clanScore\(evt, id\) \+ amt\);/.test(html));
check('admin clan wipe locks the clan at an absolute 0', /if \(kind === 'clan'\) \{[\s\S]*?setClanAbs\(evt, id, 0\);/.test(html));
// the devotion floor "keep highest" (which caused the re-inflation) must NOT be applied to the override keys
check('absolute overrides handled separately from the floored evt__ boosts', /if \(k\.indexOf\('evtabs__'\) === 0\)[\s\S]*?return;\s*\n\s*\}[\s\S]*?if \(k\.indexOf\('evt__'\) === 0 && typeof d\[k\] === 'number'\) EV\.boost\[k\] = Math\.max/.test(html));
// MONOTONIC STALE-ECHO GUARD (fixes additions reverting after a deduction)
check('setClanAbs stamps a monotonic timestamp on the write', /EV\.abs\[ak\] = base; EV\.absT\[ak\] = ts;/.test(html) && /payload\[absTCloudKey\(ak\)\] = ts;/.test(html));
check('cloud sync ignores a STALE (older-timestamp) echo', /if \(cloudT >= \(EV\.absT\[k\] \|\| 0\)\)/.test(html));
check('applyEventsDoc exposed for verification', /EV\._applyCloud = applyEventsDoc;/.test(html));

console.log('\n' + (all ? 'ALL EVENTS-DEDUCT-STICK TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
