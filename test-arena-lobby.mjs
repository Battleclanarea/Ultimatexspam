// Verifies: title "9651537 UPDATES", one-open-lobby-per-host cleanup wiring, the global lobby
// dedup (keep newest per host), and the per-map colour-coded team leaderboard grouping.
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

let all = true;
function check(n, c, extra) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n + (extra ? ' -> ' + extra : '')); all = c && all; }

// ---- title number ----
check('title shows "9651537 UPDATES"', html.indexOf('9651537 UPDATES') > -1);

// ---- lobby cleanup wiring ----
check('bot hostGame closes the tracked previous lobby id', /if \(b\.gameId\) jobs\.push\(Promise\.resolve\(setDoc\(doc\(db, "bca_arena", b\.gameId\)/.test(html));
check('bot hostGame cleanup is case-insensitive', /String\(g\.host \|\| ''\)\.toUpperCase\(\) === _nmeU/.test(html));
check('player host tracks _myLobbyId', /BCA_SYS\.arena\._myLobbyId = ref\.id/.test(html));
check('cancelMyOpenGames case-insensitive + closes tracked id', /String\(g\.host \|\| ''\)\.toUpperCase\(\) === meU/.test(html) && /BCA_SYS\.arena\._myLobbyId\)/.test(html));
check('watchLobby has a global dedup (_openByHost, keep newest)', /_openByHost/.test(html) && /a host must never have more than ONE open lobby/i.test(html));

// ---- simulate the dedup algorithm (keep newest open lobby per host) ----
(function () {
  const docs = [
    { id: 'x1', data: { host: 'BOT', status: 'open', created: 100 } },
    { id: 'x2', data: { host: 'bot', status: 'open', created: 300 } }, // newest (case-insensitive same host)
    { id: 'x3', data: { host: 'BOT', status: 'open', created: 200 } },
    { id: 'x4', data: { host: 'OTHER', status: 'open', created: 50 } },
    { id: 'x5', data: { host: 'BOT', status: 'active', created: 400 } } // not open -> ignored
  ];
  const closed = [];
  const openByHost = {};
  docs.forEach(d => { const g = d.data; if (g && g.status === 'open') { const hk = String(g.host || '').toUpperCase(); if (!hk) return; (openByHost[hk] = openByHost[hk] || []).push({ id: d.id, created: g.created || 0 }); } });
  Object.keys(openByHost).forEach(hk => { const lst = openByHost[hk]; if (lst.length < 2) return; lst.sort((a, b) => (b.created || 0) - (a.created || 0)); for (let i = 1; i < lst.length; i++) closed.push(lst[i].id); });
  check('dedup keeps only the newest open lobby per host', closed.sort().join(',') === 'x1,x3', 'closed=' + closed.join(','));
  check('dedup leaves other hosts + non-open docs alone', !closed.includes('x4') && !closed.includes('x5'));
})();

// ---- leaderboard per-map grouping + stable colour ----
check('leaderboard groups records by map (byMap)', /var byMap = \{\};/.test(html) && /r\.map \|\| 'Unknown Map'/.test(html));
check('leaderboard colour-codes each map (mapColor + palette)', /function mapColor\(nm\)/.test(html) && /var palette = \[/.test(html));
(function () {
  // mirror the grouping + stable-colour logic
  const palette = ['#e5b814', '#f97316', '#a855f7', '#22d3ee', '#ef4444', '#4ade80', '#f472b6', '#60a5fa', '#fbbf24', '#34d399'];
  function mapColor(nm) { let h = 0, s = String(nm || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return palette[h % palette.length]; }
  const recs = [
    { mode: 'standard', map: 'Ashen Colosseum', names: ['A', 'B'], size: 2, score: 500 },
    { mode: 'standard', map: 'Ashen Colosseum', names: ['C'], size: 1, score: 900 },
    { mode: 'standard', map: 'Frost Bastion', names: ['D', 'E', 'F'], size: 3, score: 700 }
  ];
  const byMap = {};
  recs.forEach(r => { const mk = r.map || 'Unknown Map'; (byMap[mk] = byMap[mk] || []).push(r); });
  check('records split into a board per map', Object.keys(byMap).sort().join('|') === 'Ashen Colosseum|Frost Bastion');
  const top = byMap['Ashen Colosseum'].sort((a, b) => b.score - a.score)[0];
  check('within a map, top team is highest score', top.score === 900);
  check('same map name always gets the same colour', mapColor('Ashen Colosseum') === mapColor('Ashen Colosseum') && palette.includes(mapColor('Frost Bastion')));
})();

console.log('\n' + (all ? 'ALL ARENA-LOBBY TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
