// Verifies the admin PASSWORD OVERRIDE login logic by extracting the REAL login-validation snippet
// from index.html and running it against mocks. Proves: (A) an admin override lets the target log in
// with the new code, (B) the old code is rejected once an override is set, (C) with no override the
// normal bca_users pass check applies, (D) a wrong pass with no override is rejected.
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

// --- extract the login else-branch body (from `const data = docSnap.data();` to the end of the
//     override / data.pass checks) ---
const startMarker = 'const data = docSnap.data();';
const endMarker = 'return BCA_SYS.ui.notify("INVALID SECURITY CODE.");\n                                }\n                            }';
const si = html.indexOf(startMarker);
if (si < 0) { console.error('FAIL: login snippet start not found'); process.exit(1); }
const ei = html.indexOf(endMarker, si);
if (ei < 0) { console.error('FAIL: login snippet end not found'); process.exit(1); }
let snippet = html.slice(si, ei + 'return BCA_SYS.ui.notify("INVALID SECURITY CODE.");\n                                }'.length);
// sanity: must contain the override logic we added
if (!/ADMIN PASSWORD OVERRIDE|_override/.test(snippet)) { console.error('FAIL: extracted snippet missing override logic'); process.exit(1); }

function makeRunner() {
  const body = 'return (async function(){ ' + snippet + '\n return {ok:true}; })();';
  return new Function('docSnap', 'id', 'passHash', 'doc', 'db', 'getDoc', 'localStorage', 'BCA_SYS', body);
}
const fn = makeRunner();

// mocks
const H = (s) => 'hash(' + s + ')'; // deterministic stand-in for hashPass
function run({ id, entered, storedPass, cloudOverride, localOverride }) {
  const cloudOv = { overrides: {} };
  if (cloudOverride != null) cloudOv.overrides[id] = cloudOverride;
  const localStore = { bca_password_overrides_v1: JSON.stringify(localOverride != null ? { [id]: localOverride } : {}) };
  const localStorage = { getItem: (k) => (k in localStore ? localStore[k] : null) };
  const getDoc = async () => ({ exists: () => true, data: () => cloudOv });
  const doc = () => ({});
  const BCA_SYS = { state: { authMode: 'login' }, ui: { notify: (m) => ({ rejected: true, msg: m }) } };
  const docSnap = { exists: () => true, data: () => ({ pass: storedPass }) };
  return fn(docSnap, id, H(entered), doc, {}, getDoc, localStorage, BCA_SYS);
}

let ok = true;
function check(name, cond) { console.log((cond ? 'PASS' : 'FAIL') + ' :: ' + name); ok = cond && ok; }

// A: cloud override = hash(NEWPASS), user enters NEWPASS -> allowed
let r = await run({ id: 'IZIRATOR', entered: 'NEWPASS', storedPass: 'hash(OLDPASS)', cloudOverride: 'hash(NEWPASS)' });
check('override set + correct new code -> login allowed', r && r.ok === true);

// B: cloud override = hash(NEWPASS), user enters OLDPASS -> rejected
r = await run({ id: 'IZIRATOR', entered: 'OLDPASS', storedPass: 'hash(OLDPASS)', cloudOverride: 'hash(NEWPASS)' });
check('override set + old code -> rejected', r && r.rejected === true);

// B2: override present only LOCALLY (cloud read empty) still honored
r = await run({ id: 'IZIRATOR', entered: 'NEWPASS', storedPass: 'hash(OLDPASS)', cloudOverride: null, localOverride: 'hash(NEWPASS)' });
check('local override fallback + correct code -> allowed', r && r.ok === true);

// C: no override, stored pass = hash(Z), user enters Z -> allowed
r = await run({ id: 'BOB', entered: 'Z', storedPass: 'hash(Z)', cloudOverride: null });
check('no override + matching stored pass -> allowed', r && r.ok === true);

// D: no override, stored pass = hash(Z), user enters W -> rejected
r = await run({ id: 'BOB', entered: 'W', storedPass: 'hash(Z)', cloudOverride: null });
check('no override + wrong pass -> rejected', r && r.rejected === true);

console.log(ok ? '\nALL PASSWORD-OVERRIDE TESTS PASSED' : '\nSOME TESTS FAILED');
process.exit(ok ? 0 : 1);
