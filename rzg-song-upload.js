/* ============================================================================
   RZG SONG — IN-GAME UPLOADER (no code, no links)
   ----------------------------------------------------------------------------
   Adds a button on the RZG MUSIC screen so a player can pick an MP3 file from
   their own device and have it play as the RZG theme — it loops, fades in, and
   is saved on this device (IndexedDB) so it survives reloads. Plays in RZG only.

   This is device-local playback (your song, your device). To make a song the
   theme for the WHOLE clan you must host it and use rzg-theme-song.js instead;
   that path is unchanged and both can coexist.
   ============================================================================ */
(function () {
  var DB_NAME = 'bca_rzg_music', STORE = 'songs', KEY = 'rzgTheme';
  function S() { return window.BCA_SYS; }

  /* ---- tiny IndexedDB blob store (handles big files; survives reloads) ---- */
  function idbOpen(cb) {
    try {
      if (!window.indexedDB) return cb(null);
      var r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = function () { try { r.result.createObjectStore(STORE); } catch (e) {} };
      r.onsuccess = function () { cb(r.result); };
      r.onerror = function () { cb(null); };
    } catch (e) { cb(null); }
  }
  function idbPut(blob, name) { idbOpen(function (db) { if (!db) return; try { var tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put({ blob: blob, name: name }, KEY); } catch (e) {} }); }
  function idbGet(cb) { idbOpen(function (db) { if (!db) return cb(null); try { var g = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY); g.onsuccess = function () { cb(g.result || null); }; g.onerror = function () { cb(null); }; } catch (e) { cb(null); } }); }
  function idbDel() { idbOpen(function (db) { if (!db) return; try { db.transaction(STORE, 'readwrite').objectStore(STORE).delete(KEY); } catch (e) {} }); }

  function cleanName(n) { return String(n || 'MY RZG SONG').replace(/\.(mp3|m4a|ogg|wav|aac|flac)$/i, '').toUpperCase().slice(0, 28) || 'MY RZG SONG'; }
  function status(m) { var el = document.getElementById('rzg-song-upload-status'); if (el) el.textContent = m || ''; }

  // Register (or update) the single uploaded track as an RZG-only track and make it the RZG theme.
  function registerUrl(url, name) {
    var s = S(); var A = s.audio, M = s.music; if (!A || !A.tracks || !M) return -1;
    var idx = s.rzgSong._trackIdx;
    if (idx == null || !A.tracks[idx] || !A.tracks[idx]._uploaded) {
      idx = A.tracks.length; A.tracks.push({ name: name || 'MY RZG SONG', mp3: url, _uploaded: true }); s.rzgSong._trackIdx = idx;
    } else {
      var t = A.tracks[idx]; if (t._el) { try { t._el.pause(); } catch (e) {} t._el = null; } t.mp3 = url; if (name) t.name = name;
    }
    if (M.rzg.indexOf(idx) < 0) M.rzg.unshift(idx);   // RZG playlist ONLY — never Akisuma
    M.rzgCurrent = idx;                                // becomes the RZG theme (drops in at RZG HQ)
    return idx;
  }

  function boot() {
    var s = S();
    if (!s || !s.audio || !s.audio.tracks || !s.music || !s.rzg) return setTimeout(boot, 400);
    if (s.rzgSong && s.rzgSong._installed) return;
    s.rzgSong = s.rzgSong || {}; s.rzgSong._installed = true; s.rzgSong._trackIdx = (s.rzgSong._trackIdx != null ? s.rzgSong._trackIdx : null); s.rzgSong._name = '';

    // Pick a file from this device -> play it now + save it for next time.
    s.rzgSong.upload = function (file) {
      if (!file) return;
      try {
        var url = URL.createObjectURL(file);
        var nm = cleanName(file.name);
        s.rzgSong._name = nm;
        idbPut(file, file.name || nm);
        var idx = registerUrl(url, nm);
        try { s.music.play(idx, 'rzg'); } catch (e) { try { s.audio.currentTrackIndex = idx; s.audio.playRZGTheme(); s.audio._syncMp3 && s.audio._syncMp3(); } catch (e2) {} }
        status('NOW PLAYING YOUR SONG: ' + nm + ' — looping, saved on this device.');
        try { s.utils.logEvent('[RZG MUSIC] ' + ((s.state.profile || {}).id || 'PLAYER') + ' set a custom RZG theme song from their device (' + nm + ').'); } catch (e) {}
      } catch (e) { status('Could not load that file. Please pick an MP3/audio file.'); }
      renderPanel();
    };
    // Remove the custom song and go back to the built-in anthems.
    s.rzgSong.clear = function () {
      idbDel();
      var A = s.audio, M = s.music, idx = s.rzgSong._trackIdx;
      if (idx != null && A.tracks[idx]) { if (A.tracks[idx]._el) { try { A.tracks[idx]._el.pause(); } catch (e) {} } A.tracks[idx].mp3 = ''; }
      var p = M.rzg.indexOf(idx); if (p >= 0) M.rzg.splice(p, 1);
      if (M.rzgCurrent === idx) M.rzgCurrent = M.rzg[0] || 0;
      s.rzgSong._trackIdx = null; s.rzgSong._name = '';
      try { A.currentTrackIndex = M.rzgCurrent; if (A.stopTheme) A.stopTheme(); } catch (e) {}
      status('Removed your song — the built-in RZG anthems are back.');
      renderPanel();
    };
    s.rzgSong.hasSong = function () { return !!s.rzgSong._name; };
    s.rzgSong.play = function () { var i = s.rzgSong._trackIdx; if (i != null) try { s.music.play(i, 'rzg'); } catch (e) {} };

    // Restore a previously-uploaded song on load: it becomes the RZG theme again (plays when you
    // enter RZG HQ / press play — autoplay before any tap is blocked by the browser, which is normal).
    idbGet(function (rec) {
      if (rec && rec.blob) {
        try { var url = URL.createObjectURL(rec.blob); s.rzgSong._name = cleanName(rec.name); registerUrl(url, s.rzgSong._name); } catch (e) {}
        renderPanel();
      }
    });

    /* ---------------- UI on the RZG MUSIC screen ---------------- */
    function renderPanel() {
      var body = document.getElementById('rzg-song-upload-body'); if (!body) return;
      var has = s.rzgSong.hasSong();
      body.innerHTML =
        '<div class="text-[10px] text-gray-300 normal-case tracking-normal mb-2">Pick an MP3 (or any audio file) from THIS device. It loops, fades in, and plays as your RZG theme. Saved on this device.</div>'
        + '<input id="rzg-song-file" type="file" accept="audio/*,.mp3,.m4a,.ogg,.wav" style="display:none;">'
        + '<button id="rzg-song-pick" class="btn-military w-full py-3 text-sm bg-pink-950 border-pink-500 text-pink-200">\uD83C\uDFB5 CHOOSE A SONG FROM MY DEVICE</button>'
        + (has
            ? '<div class="mt-2 flex items-center gap-2"><span class="text-[11px] text-[#e5b814] cinzel flex-1 truncate">\u266A ' + String(s.rzgSong._name) + '</span>'
              + '<button id="rzg-song-play" class="btn-military px-3 py-2 text-[10px] bg-green-950 border-green-600 text-green-300">PLAY</button>'
              + '<button id="rzg-song-remove" class="btn-military px-3 py-2 text-[10px] bg-red-950 border-red-700 text-red-400">REMOVE</button></div>'
            : '')
        + '<div id="rzg-song-upload-status" class="text-[9px] text-emerald-400 uppercase mt-2 break-words"></div>'
        + '<div class="text-[8px] text-gray-500 normal-case mt-1">Plays on THIS device only. To make it the theme for the whole clan, host the file and use rzg-theme-song.js.</div>';
      var fileEl = document.getElementById('rzg-song-file');
      var pick = document.getElementById('rzg-song-pick');
      if (pick && fileEl) pick.onclick = function () { fileEl.click(); };
      if (fileEl) fileEl.onchange = function () { var f = fileEl.files && fileEl.files[0]; if (f) s.rzgSong.upload(f); };
      var pl = document.getElementById('rzg-song-play'); if (pl) pl.onclick = function () { s.rzgSong.play(); };
      var rm = document.getElementById('rzg-song-remove'); if (rm) rm.onclick = function () { s.rzgSong.clear(); };
    }
    s.rzgSong._renderPanel = renderPanel;

    function injectPanel() {
      var view = document.getElementById('rzg-view-music'); if (!view) return;
      if (document.getElementById('rzg-song-upload-panel')) { renderPanel(); return; }
      var inner = view.querySelector('.max-w-2xl') || view.firstElementChild || view;
      var panel = document.createElement('div');
      panel.id = 'rzg-song-upload-panel';
      panel.className = 'panel-lux p-4 border-pink-700 mb-4';
      panel.innerHTML = '<h3 class="cinzel text-lg text-pink-300 text-center mb-1">\uD83C\uDFB5 YOUR OWN SONG</h3><div id="rzg-song-upload-body"></div>';
      // put it right under the RZG MUSIC title, above the track list
      var list = document.getElementById('rzg-music-list');
      if (list && list.parentElement === inner) inner.insertBefore(panel, list);
      else if (inner.children.length > 1) inner.insertBefore(panel, inner.children[1]);
      else inner.appendChild(panel);
      renderPanel();
    }

    // Inject when the RZG MUSIC screen opens (nav hook) + on boot + a few retries.
    if (s.rzg && s.rzg.nav && !s.rzg.nav._rzgSongHook) {
      var oldNav = s.rzg.nav.bind(s.rzg);
      s.rzg.nav = function (t) { var r = oldNav.apply(this, arguments); if (t === 'music') { setTimeout(injectPanel, 30); setTimeout(injectPanel, 120); } return r; };
      s.rzg.nav._rzgSongHook = true;
    }
    [400, 1200, 3000].forEach(function (t) { setTimeout(injectPanel, t); });
    try { console.log('[RZG SONG UPLOAD] ready'); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
