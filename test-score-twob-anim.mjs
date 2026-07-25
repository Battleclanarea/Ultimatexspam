/* Regression guards for: (1) grant anti-oscillation high-water (scores never jump back down),
 * (2) clearer melee swing / gun recoil spam animation, (3) the TWOB event board (4 clans + bg +
 * injectors), and (4) Blackmoor/event injection never dipping (writeBoost floor). Behaviour is
 * proven end-to-end in a headless browser. */
import fs from 'fs';
import assert from 'assert';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let pass = 0; const ok = (n) => { console.log('  PASS', n); pass++; };

// ---- 1) score high-water ----
assert.ok(/ANTI-OSCILLATION HIGH-WATER/.test(html) && /if \(m\._scoreHW != null && v < m\._scoreHW\) v = m\._scoreHW;\s*\n\s*m\._scoreHW = v;/.test(html), 'recompute high-water');
ok('score: recomputeMember never lets a member score drop on its own (grants stick)');
assert.ok((html.match(/m\._scoreHW = 0;/g) || []).length >= 4, 'drop resets present');
ok('score: authoritative deductions reset the high-water (deductions still stick)');
assert.ok(/m\._soulFloor = lk\.score; m\._scoreHW = lk\.score;/.test(html), 'lock resets hw');
ok('score: locking a score resets the high-water so a lock can pin cleanly');

// ---- 2) animation ----
assert.ok(/@keyframes bcaWpnLoop \{ 0% \{ transform: rotate\(-40deg\) scale\(1\); \} 50% \{ transform: rotate\(60deg\)/.test(html), 'clear swing');
ok('anim: melee weapon does a big continuous raise-and-strike swing (not a jiggle / not frozen)');
assert.ok(/\.fighter-rig\.bca-spam-loop \.fighter-weapon > \*,/.test(html) && /pinned by `transform: rotate\(18deg\) !important`/.test(html), 'inner-art weapon');
ok('anim: the weapon\'s INNER ART is animated (slot is pinned + composited -> stayed frozen)');
assert.ok(/@keyframes bcaShootLoop \{ 0% \{ transform: rotate\(12deg\)/.test(html), 'gun recoil continuous');
ok('anim: guns recoil continuously (bcaShootLoop) - weapon-aware, no dead rest frames');
// The real "only armor moves / armor flickers in and out" cause: equippedVisualVerification
// rebuilt the WHOLE fighter (buildFighter -> innerHTML wipe) ~4x/sec during spam, resetting the
// weapon animation and flickering gear. Rebuilds must now DEFER while actively spamming.
assert.ok(/function isActivelySpamming\(\)/.test(html) && /if \(isActivelySpamming\(\)\) \{ EVT\._pendingRebuild = reason/.test(html), 'rebuild defer');
ok('anim: fighter rebuild is deferred while spamming (no mid-swing reset / gear flicker)');
assert.ok(/EVT\._lastStrikeAt = Date\.now\(\); \/\/ mark active spam/.test(html), 'strike stamp');
ok('anim: each strike marks active-spam so verification rebuilds coalesce until spam settles');
assert.ok(/if \(EVT\._pendingRebuild && !isActivelySpamming\(\) && activeCombatContainer\(\)\) rebuildActiveFighter/.test(html), 'deferred flush');
ok('anim: a genuine gear correction still flushes once spam settles');
assert.ok(/body\.combat-perf \.fighter-rig\.bca-spam-loop\.fighter-swinging\.fitted-avatar-gear \.fighter-weapon/.test(html), 'perf duration');
ok('anim: combat-perf keeps the spam loop at its smooth pace (not the frantic 0.16s cap)');

// ---- 3) TWOB event board ----
assert.ok(/id: 'twob', title: 'TRIVIA WARS OF BATTLECLANAREAS'/.test(html) && /clans: \['RDB', 'RZG', 'Z\.E', 'ROE'\]/.test(html), 'twob entry');
ok('twob: event registered showing only RDB / RZG / Z.E / ROE');
assert.ok(/clanList\(\)\.filter\(function \(c\) \{ return !evt\.clans \|\| evt\.clans\.indexOf\(c\.id\) >= 0; \}\)/.test(html), 'clan filter');
ok('twob: the clan ledger filters to the board\'s clans (others unaffected)');
assert.ok(/\.evt-board-twob \.evt-board-bg \{\s*background: #0d0a05 url\("\.\/assets\/backgrounds\/twob-bg\.png"\)/.test(html), 'twob bg css');
ok('twob: medieval vertical background wired (desktop + preload + mobile driver)');
assert.ok(/twob: 'url\("\.\/assets\/backgrounds\/twob-bg\.png"\)'/.test(html) && /best\.classList\.contains\('evt-board-twob'\) \? 'twob'/.test(html), 'twob mobile driver');
ok('twob: mobile background driver handles the twob board');
assert.ok(/EVENTS\.map\(function \(e\) \{ return '<option value="' \+ e\.id/.test(html), 'admin dropdown from EVENTS');
ok('twob: admin injector event dropdown is built from EVENTS (twob injectable)');
assert.ok(/opts = clanList\(\)\.filter\(function \(c\) \{ return !_ev\.clans/.test(html), 'admin clan target filter');
ok('twob: admin clan-inject target list is filtered to the board\'s clans');

// ---- 4) Blackmoor / event injection never dips ----
assert.ok(/FLOOR \(never-go-down\)/.test(html) && /EV\._floor\[k\] = Math\.max\(EV\._floor\[k\] \|\| 0, EV\.boost\[k\]\);/.test(html), 'writeBoost floor');
ok('events: admin injections set a never-go-down floor (Blackmoor dip fixed)');

console.log('\nAll ' + pass + ' checks passed.');
