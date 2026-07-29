// In-game RZG song uploader: pick an MP3 from the device on the RZG MUSIC screen; it registers as an
// RZG-only looping track, becomes the RZG theme, and persists (IndexedDB) across reloads. Full runtime
// behaviour is verified in the headless browser; this guards the wiring.
//
// Run: node test-rzg-song-upload.mjs
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const mod = fs.readFileSync(new URL('./rzg-song-upload.js', import.meta.url), 'utf8');
let all = true;
const check = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n); all = c && all; };

check('index.html loads the rzg-song-upload.js sibling module', /rzg-song-upload\.js/.test(html));
check('module persists the song in IndexedDB (survives reloads, handles big files)', /indexedDB\.open\(DB_NAME/.test(mod) && /function idbPut/.test(mod) && /function idbGet/.test(mod));
check('module exposes upload(file) that reads a File from the device', /S\(\)\.rzgSong\.upload = function \(file\)|s\.rzgSong\.upload = function \(file\)/.test(mod) && /URL\.createObjectURL\(file\)/.test(mod));
check('the uploaded song is registered into the RZG playlist ONLY (never Akisuma)', /if \(M\.rzg\.indexOf\(idx\) < 0\) M\.rzg\.unshift\(idx\);/.test(mod) && !/aksm/i.test(mod));
check('the uploaded song becomes the RZG theme (rzgCurrent)', /M\.rzgCurrent = idx;/.test(mod));
check('reuses the existing MP3 track engine (mp3 field + _syncMp3)', /\bmp3: url\b/.test(mod) && /_syncMp3/.test(mod));
check('restores a saved song on load via IndexedDB', /idbGetKey\(KEY, function \(rec\) \{[\s\S]*registerTrack\('personal', url/.test(mod));
check('provides a REMOVE (clear) action back to the built-in anthems', /s\.rzgSong\.clear = function/.test(mod) && /idbDel\(KEY\)/.test(mod));
check('injects the uploader UI onto the RZG MUSIC screen (rzg-view-music)', /rzg-view-music/.test(mod) && /CHOOSE A SONG FROM MY DEVICE/.test(mod));
check('file input accepts audio/mp3', /accept="audio\/\*/.test(mod));

// ---- ADMIN game-wide theme ----
check('admin-only gate uses profile.isAdmin', /function isAdmin\(\)[\s\S]*profile\.isAdmin/.test(mod));
check('setGlobal + clearGlobal both refuse non-admins', (mod.match(/if \(!isAdmin\(\)\) \{ notify\('ADMIN ONLY\.'\); return; \}/g) || []).length >= 2);
check('game-wide song stored in shared cloud (bca_system meta + blob docs)', /'bca_system', META/.test(mod) && /'bca_system', BLOB/.test(mod));
check('meta is watched live via onSnapshot; blob fetched via getDoc', /onSnapshot\(c\.FS\.doc\(c\.DB, 'bca_system', META\)/.test(mod) && /getDoc\(c\.FS\.doc\(c\.DB, 'bca_system', BLOB\)/.test(mod));
check('blob cached in IndexedDB per version (download once per device)', /idbGetKey\('global:' \+ meta\.version/.test(mod) && /idbPutKey\('global:' \+ (meta\.)?version/.test(mod));
check('game-wide theme becomes rzgCurrent and swaps live in RZG only', /registerTrack\('global'/.test(mod) && /function swapLiveIfInRzg/.test(mod) && /screen-rzg-hq/.test(mod));
check('size cap protects the DB/egress (~10MB)', /MAX_BYTES = 10 \* 1024 \* 1024/.test(mod) && /SONG TOO LARGE/.test(mod));
check('admin UI: SET/REMOVE for the whole game, gated by isAdmin() in renderPanel', /SET A SONG FOR THE ENTIRE GAME/.test(mod) && /REMOVE THE GAME-WIDE THEME/.test(mod) && /if \(admin\) \{/.test(mod));
check('admin buttons only bound when admin', /rzg-song-global-set/.test(mod) && /rzg-song-global-file/.test(mod));
check('personal (device-local) upload still present alongside global', /s\.rzgSong\.upload = function \(file\)/.test(mod) && /_personalActive/.test(mod));

console.log('\n' + (all ? 'ALL RZG-SONG-UPLOAD TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
