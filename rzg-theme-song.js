/* ============================================================================
   RZG THEME SONG  —  paste your own downloaded MP3 here.
   ----------------------------------------------------------------------------
   This is the ONE place to add a custom song for the RZG theme. (index.html is
   too big for GitHub to display, so the setting lives here in this tiny file.)

   HOW TO USE — two ways, pick one:
     • Option A (link):  paste a direct https:// link to a .mp3 between the
       quotes on the RZG_MP3_URL line below.
           window.RZG_MP3_URL = 'https://example.com/my-song.mp3';
     • Option B (file):  drop the .mp3 into this repo — e.g. put it in an
       "assets/music/" folder — and use a relative path:
           window.RZG_MP3_URL = './assets/music/my-song.mp3';

   A 3–6 minute song is perfect. It LOOPS forever, FADES IN smoothly, appears
   in the RZG MUSIC list + the radio bar, and plays as the RZG theme when you
   enter RZG HQ. It plays in RZG ONLY — never Akisuma.

   Leave RZG_MP3_URL as ''  to keep only the built-in synth war anthems
   (that's the default — nothing changes until you paste a song).
   ============================================================================ */

window.RZG_MP3_URL  = '';                     // <-- PASTE YOUR MP3 LINK / PATH HERE
window.RZG_MP3_NAME = 'RZG CUSTOM ANTHEM';    // <-- (optional) the title shown in the radio + RZG MUSIC
