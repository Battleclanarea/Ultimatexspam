// RZG theme song is ADMIN-ONLY: only an admin can set the song that plays for the whole game; normal
// players have NO upload UI and simply hear the admin-set theme automatically (new players included).
// Full runtime behaviour is verified in the headless browser; this guards the wiring.
//
// Run: node test-rzg-song-upload.mjs
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const mod = fs.readFileSync(new URL('./rzg-song-upload.js', import.meta.url), 'utf8');
let all = true;
const check = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n); all = c && all; };

check('index.html loads the rzg-song-upload.js sibling module', /rzg-song-upload\.js/.test(html));
check('admin-only gate uses profile.isAdmin', /function isAdmin\(\)[\s\S]*profile\.isAdmin/.test(mod));
check('setGlobal + clearGlobal both refuse non-admins', (mod.match(/if \(!isAdmin\(\)\) \{ notify\('ADMIN ONLY\.'\); return; \}/g) || []).length >= 2);

// NO personal / per-device upload feature exists anymore
check('personal upload API removed (no rzgSong.upload)', !/rzgSong\.upload\s*=/.test(mod) && !/CHOOSE A SONG FROM MY DEVICE/.test(mod));
check('no per-device personal track slot (_uploaded/_trackIdx/_personalActive)', !/_uploaded/.test(mod) && !/_trackIdx/.test(mod) && !/_personalActive/.test(mod));

// shared cloud storage
check('game-wide song stored in shared cloud (bca_system meta + blob docs)', /'bca_system', META/.test(mod) && /'bca_system', BLOB/.test(mod));
check('meta is watched live via onSnapshot; blob fetched via getDoc', /onSnapshot\(c\.FS\.doc\(c\.DB, 'bca_system', META\)/.test(mod) && /getDoc\(c\.FS\.doc\(c\.DB, 'bca_system', BLOB\)/.test(mod));
check('blob cached in IndexedDB per version (download once per device)', /idbGetKey\('global:' \+ meta\.version/.test(mod) && /idbPutKey\('global:' \+ (meta\.)?version/.test(mod));
check('EVERY client wires the watcher on boot (new players auto-get the theme)', /wireGlobal\(\); \/\/ start listening/.test(mod));

// becomes the main theme for everyone
check('reuses the existing MP3 track engine (mp3 field + _syncMp3)', /\bmp3: url\b/.test(mod) && /_syncMp3/.test(mod));
check('game-wide song is RZG-only and becomes rzgCurrent (the main theme)', /M\.rzg\.indexOf\(idx\) < 0\) M\.rzg\.unshift\(idx\)/.test(mod) && /M\.rzgCurrent = idx;/.test(mod) && !/aksm/.test(mod));
check('applies/ swaps live only in RZG (screen-rzg-hq)', /function rzgActive/.test(mod) && /screen-rzg-hq/.test(mod));
check('size cap protects the DB/egress (~10MB)', /MAX_BYTES = 10 \* 1024 \* 1024/.test(mod) && /SONG TOO LARGE/.test(mod));

// UI is admin-only
check('admin UI: SET/REMOVE for the whole game', /SET A SONG FOR THE ENTIRE GAME/.test(mod) && /REMOVE THE GAME-WIDE THEME/.test(mod));
check('panel is NOT injected for non-admins (removed if present)', /if \(!isAdmin\(\)\) \{ if \(existing\) existing\.remove\(\); return; \}/.test(mod));

console.log('\n' + (all ? 'ALL RZG-SONG-UPLOAD TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
