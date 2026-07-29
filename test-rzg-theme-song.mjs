// The custom RZG theme song is configured in a tiny, GitHub-viewable file (rzg-theme-song.js) that
// sets window.RZG_MP3_URL, loaded synchronously in <head> before the music engine builds its tracks.
// Full playback (loop + fade + RZG-only) is verified in the headless browser; this guards the wiring.
//
// Run: node test-rzg-theme-song.mjs
import fs from 'fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const cfg = fs.readFileSync(new URL('./rzg-theme-song.js', import.meta.url), 'utf8');
let all = true;
const check = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + ' :: ' + n); all = c && all; };

check('rzg-theme-song.js sets window.RZG_MP3_URL (the paste spot)', /window\.RZG_MP3_URL\s*=\s*''/.test(cfg));
check('rzg-theme-song.js sets window.RZG_MP3_NAME', /window\.RZG_MP3_NAME\s*=/.test(cfg));
check('rzg-theme-song.js documents link + repo-path options', /PASTE YOUR MP3/.test(cfg) && /assets\/music/.test(cfg));
check('index.html loads rzg-theme-song.js synchronously in <head> (before the music engine)', /<script src="\.\/rzg-theme-song\.js\?v=\d+"><\/script>/.test(html));
check('the config script is loaded BEFORE the tailwind/CDN + body scripts (in <head>)', html.indexOf('rzg-theme-song.js') < html.indexOf('cdn.tailwindcss.com'));
check('music engine reads window.RZG_MP3_URL (falls back to empty)', /var RZG_MP3_URL  = \(typeof window !== 'undefined' && window\.RZG_MP3_URL\)  \? window\.RZG_MP3_URL  : '';/.test(html));
check('music engine reads window.RZG_MP3_NAME', /var RZG_MP3_NAME = \(typeof window !== 'undefined' && window\.RZG_MP3_NAME\) \? window\.RZG_MP3_NAME : 'RZG CUSTOM ANTHEM';/.test(html));
check('the MP3 track is registered into the RZG playlist only + made the RZG theme', /if \(rzgCustomMp3 >= 0\) \{ if \(S\.music\.rzg\.indexOf\(rzgCustomMp3\) < 0\) S\.music\.rzg\.unshift\(rzgCustomMp3\); S\.music\.rzgCurrent = rzgCustomMp3; \}/.test(html));

console.log('\n' + (all ? 'ALL RZG-THEME-SONG TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(all ? 0 : 1);
