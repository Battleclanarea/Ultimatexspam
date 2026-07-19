// Physically exercises the REAL cloudVerify() from index.html (the outer pre-login gate that
// was rejecting admin-changed passwords BEFORE auth.submit's own override logic could run) plus
// the "special roster" narrowing, proving an admin-set password lets a NORMAL account (IZIRATOR)
// log in. Extracts the actual function text and runs it against an in-memory cloud.
import fs from 'fs';
import crypto from 'crypto';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

// --- extract the real cloudVerify function body ---
function extractFn(marker) {
  const s = html.indexOf(marker);
  if (s < 0) throw new Error('marker not found: ' + marker);
  const open = html.indexOf('{', s);
  let i = open + 1, depth = 1;
  while (i < html.length && depth > 0) { const c = html[i]; if (c === '{') depth++; else if (c === '}') depth--; i++; }
  return html.slice(open + 1, i - 1); // inner body between the outermost braces
}
const cvBody = extractFn('S.auth.cloudVerify = async function (id, pass, mode, isSpecial, isAdminPass)');

let all = true;
function check(n, c, extra) { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n + (extra != null ? ' -> ' + extra : '')); all = c && all; }

// --- deps the real function closes over ---
const sha256 = async (m) => crypto.createHash('sha256').update(String(m == null ? '' : m)).digest('hex');
const idOf = (v) => String(v || '').trim().replace(/\s+/g, ' ').toUpperCase();

// in-memory cloud + localStorage
function makeWorld({ users = {}, overrides = null, localOverrides = null, throwGet = false }) {
  const store = { 'bca_users': users, 'bca_system': {} };
  if (overrides) store['bca_system']['password_overrides'] = { overrides };
  const FS = {
    doc: (DB, col, id) => ({ col, id }),
    getDoc: async (ref) => {
      if (throwGet) throw new Error('network');
      const data = (store[ref.col] || {})[ref.id];
      return { exists: () => data !== undefined, data: () => data };
    },
  };
  const localStorage = {
    _d: { 'bca_password_overrides_v1': localOverrides ? JSON.stringify(localOverrides) : '{}' },
    getItem(k) { return this._d[k] ?? null; },
    setItem(k, v) { this._d[k] = v; },
  };
  return { FS, DB: {}, localStorage };
}

function buildCloudVerify(world) {
  const fn = new Function(
    'idOf', 'hasCloud', 'FS', 'DB', 'localSave', 'sha256', 'localStorage', 'JSON', 'Promise', 'setTimeout',
    'return (async function (id, pass, mode, isSpecial, isAdminPass) {' + cvBody + '});'
  );
  const localSave = (id) => { try { return JSON.parse(world.localStorage.getItem('bca_v8_' + idOf(id)) || 'null'); } catch (e) { return null; } };
  return fn(idOf, true, world.FS, world.DB, localSave, sha256, world.localStorage, JSON, Promise, setTimeout);
}

const OLD = await sha256('OLDCODE');
const NEW = await sha256('NEWPASS123');

// Scenario 1: admin changed IZIRATOR's code -> cloud override present, bca_users.pass still STALE.
await (async () => {
  const world = makeWorld({ users: { IZIRATOR: { id: 'IZIRATOR', pass: OLD } }, overrides: { IZIRATOR: NEW } });
  const cloudVerify = buildCloudVerify(world);
  const okNew = await cloudVerify('IZIRATOR', 'NEWPASS123', 'login', false, false);
  check('IZIRATOR logs in with the NEW admin-set code (override authoritative)', okNew.ok === true, JSON.stringify(okNew));
  const okOld = await cloudVerify('IZIRATOR', 'OLDCODE', 'login', false, false);
  check('the OLD/stale bca_users.pass no longer works once an override exists', okOld.ok === false, JSON.stringify(okOld));
  const okWrong = await cloudVerify('IZIRATOR', 'GARBAGE', 'login', false, false);
  check('a wrong code is still rejected', okWrong.ok === false, JSON.stringify(okWrong));
})();

// Scenario 2: cloud override doc missing, but LOCAL mirror has it (offline admin device).
await (async () => {
  const world = makeWorld({ users: { IZIRATOR: { id: 'IZIRATOR', pass: OLD } }, localOverrides: { IZIRATOR: NEW } });
  const cloudVerify = buildCloudVerify(world);
  const okNew = await cloudVerify('IZIRATOR', 'NEWPASS123', 'login', false, false);
  check('local-mirror override also authorizes the new code', okNew.ok === true, JSON.stringify(okNew));
})();

// Scenario 3: no override at all -> falls back to bca_users.pass.
await (async () => {
  const world = makeWorld({ users: { NORMALGUY: { id: 'NORMALGUY', pass: NEW } } });
  const cloudVerify = buildCloudVerify(world);
  const ok = await cloudVerify('NORMALGUY', 'NEWPASS123', 'login', false, false);
  check('no override: correct stored pass allowed', ok.ok === true, JSON.stringify(ok));
  const bad = await cloudVerify('NORMALGUY', 'NOPE', 'login', false, false);
  check('no override: wrong stored pass rejected', bad.ok === false, JSON.stringify(bad));
})();

// Scenario 4: register existing callsign rejected.
await (async () => {
  const world = makeWorld({ users: { IZIRATOR: { id: 'IZIRATOR', pass: OLD } } });
  const cloudVerify = buildCloudVerify(world);
  const r = await cloudVerify('IZIRATOR', 'ANY', 'register', false, false);
  check('register on an existing callsign is rejected', r.ok === false && /ALREADY REGISTERED/.test(r.msg || ''), JSON.stringify(r));
})();

// Scenario 5: the "special roster" gate is narrowed to genuine officers only (both auth layers).
(() => {
  const uhfNarrowed = /var isSpecial = \(S\.state\.selectedClanId === 'RZG' && !!specialPasses\[id\]\);/.test(html);
  check('UHF wrapper: isSpecial keys off the officer map, not all roster members', uhfNarrowed);
  const innerNarrowed = /if \(clan === 'RZG' && specialAccounts\[id\]\) \{/.test(html);
  check('inner auth.submit: fixed-code gate keys off the officer map, not allRzgAccounts', innerNarrowed);
  // sanity: the officer map still contains the 6 reserved accounts and NOT IZIRATOR
  const hasOfficers = /LEAFY.*DIABETIC.*CRYSTAL.*GOOFY.*TEEKO.*ZEKKEROK II/.test(html);
  check('officer map still lists the 6 reserved accounts (IZIRATOR is not one)', hasOfficers && !/IZIRATOR["']\s*:/.test(html));
})();

console.log('\n' + (all ? 'ALL IZIRATOR PASSWORD TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
