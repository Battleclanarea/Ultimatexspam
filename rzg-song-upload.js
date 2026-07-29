/* ============================================================================
   RZG SONG — IN-GAME UPLOADER + ADMIN GAME-WIDE THEME (no code, no links)
   ----------------------------------------------------------------------------
   On the RZG MUSIC screen there is a "YOUR OWN SONG" panel. It has two paths:

   1) EVERY player: "CHOOSE A SONG FROM MY DEVICE" — pick an MP3; it loops + plays
      as YOUR RZG theme, saved on this device (IndexedDB). Device-local (PR #299).

   2) ADMIN ONLY: "SET A SONG FOR THE ENTIRE GAME" — pick an MP3; it is stored in
      the shared cloud (bca_system/rzg_theme_meta + rzg_theme_blob) and becomes the
      RZG theme for EVERY player (RZG only, never Akisuma). Non-admins can't set or
      clear it. Admins can "REMOVE FOR EVERYONE" to restore the built-in anthems.

   Cost-conscious: the tiny META doc is watched live; the big BLOB doc is fetched
   ONCE per version and cached in IndexedDB, so each device downloads a given song
   only one time. Both docs are NON-hot bca_system docs (not on the live-sync path).
   ============================================================================ */
(function () {
  var DB_NAME = 'bca_rzg_music', STORE = 'songs', KEY = 'rzgTheme';
  var META = 'rzg_theme_meta', BLOB = 'rzg_theme_blob';
  var MAX_BYTES = 10 * 1024 * 1024; // ~10MB cap for the game-wide song (protects the DB + egress)
  function S() { return window.BCA_SYS; }
  function notify(m) { try { S().ui.notify(m); } catch (e) {} }
  function isAdmin() { var s = S(); return !!(s && s.state && s.state.profile && s.state.profile.isAdmin); }
  function cloud() { var FS = window.__BCA_FS, DB = window.__BCA_DB; return (FS && DB && FS.doc && FS.setDoc && FS.getDoc) ? { FS: FS, DB: DB } : null; }

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
  function idbPutKey(key, val) { idbOpen(function (db) { if (!db) return; try { db.transaction(STORE, 'readwrite').objectStore(STORE).put(val, key); } catch (e) {} }); }
  function idbGetKey(key, cb) { idbOpen(function (db) { if (!db) return cb(null); try { var g = db.transaction(STORE, 'readonly').objectStore(STORE).get(key); g.onsuccess = function () { cb(g.result || null); }; g.onerror = function () { cb(null); }; } catch (e) { cb(null); } }); }
  function idbDel(key) { idbOpen(function (db) { if (!db) return; try { db.transaction(STORE, 'readwrite').objectStore(STORE).delete(key); } catch (e) {} }); }

  function cleanName(n) { return String(n || 'RZG SONG').replace(/\.(mp3|m4a|ogg|wav|aac|flac)$/i, '').toUpperCase().slice(0, 28) || 'RZG SONG'; }
  function status(m) { var el = document.getElementById('rzg-song-upload-status'); if (el) el.textContent = m || ''; }
  function fileToDataUrl(file, cb) { try { var r = new FileReader(); r.onload = function () { cb(r.result); }; r.onerror = function () { cb(null); }; r.readAsDataURL(file); } catch (e) { cb(null); } }
  function dataUrlToObjUrl(du, cb) { try { fetch(du).then(function (r) { return r.blob(); }).then(function (b) { cb(URL.createObjectURL(b)); }).catch(function () { cb(du); }); } catch (e) { cb(du); } }
  function rzgActive() { var el = document.getElementById('screen-rzg-hq'); return !!(el && el.classList.contains('active')); }

  // Register (or refresh) a track in a fixed slot ('personal' or 'global'). RZG playlist ONLY.
  function registerTrack(kind, url, name, makeCurrent) {
    var s = S(), A = s.audio, M = s.music; if (!A || !A.tracks || !M) return -1;
    var idxKey = kind === 'global' ? '_globalIdx' : '_trackIdx';
    var flag = kind === 'global' ? '_globalTrack' : '_uploaded';
    var idx = s.rzgSong[idxKey];
    if (idx == null || !A.tracks[idx] || !A.tracks[idx][flag]) {
      idx = A.tracks.length; var t = { name: name || 'RZG SONG', mp3: url }; t[flag] = true; A.tracks.push(t); s.rzgSong[idxKey] = idx;
    } else {
      var t2 = A.tracks[idx]; if (t2._el) { try { t2._el.pause(); } catch (e) {} t2._el = null; } t2.mp3 = url; if (name) t2.name = name;
    }
    if (M.rzg.indexOf(idx) < 0) M.rzg.unshift(idx);   // RZG playlist ONLY — never Akisuma
    if (makeCurrent) M.rzgCurrent = idx;
    return idx;
  }
  function swapLiveIfInRzg(idx) { if (rzgActive()) { try { S().music.play(idx, 'rzg'); } catch (e) {} } }

  /* ======================= GAME-WIDE THEME (admin) ======================= */
  function applyGlobalUrl(url, name, force) {
    var s = S(), M = s.music;
    var makeCurrent = force || !s.rzgSong._personalActive; // a player's own active pick overrides for their session
    var idx = registerTrack('global', url, name, makeCurrent);
    s.rzgSong._globalName = name;
    if (makeCurrent) swapLiveIfInRzg(idx);
    if (s.rzgSong._renderPanel) s.rzgSong._renderPanel();
  }
  function removeGlobalLocal() {
    var s = S(), A = s.audio, M = s.music, idx = s.rzgSong._globalIdx;
    if (idx != null && A.tracks[idx]) { if (A.tracks[idx]._el) { try { A.tracks[idx]._el.pause(); } catch (e) {} } A.tracks[idx].mp3 = ''; }
    var p = M.rzg.indexOf(idx); if (p >= 0) M.rzg.splice(p, 1);
    var wasCurrent = (M.rzgCurrent === idx);
    s.rzgSong._globalIdx = null; s.rzgSong._globalName = ''; s.rzgSong._globalSetBy = '';
    if (wasCurrent) {
      var personal = (s.rzgSong._trackIdx != null && M.rzg.indexOf(s.rzgSong._trackIdx) >= 0) ? s.rzgSong._trackIdx : null;
      M.rzgCurrent = (personal != null) ? personal : (M.rzg.filter(function (i) { return i !== idx; })[0] || 0);
      if (rzgActive()) { try { S().music.play(M.rzgCurrent, 'rzg'); } catch (e) {} }
    }
    if (s.rzgSong._renderPanel) s.rzgSong._renderPanel();
  }

  // ADMIN: make a song the theme for the whole game.
  function setGlobal(file) {
    var s = S();
    if (!isAdmin()) { notify('ADMIN ONLY.'); return; }
    if (!file) return;
    if (file.size > MAX_BYTES) { notify('SONG TOO LARGE — keep it under ~10MB (about 6-7 min at 192kbps).'); return; }
    var c = cloud(); if (!c) { notify('CLOUD OFFLINE — can\'t set a game-wide song right now. Try again when online.'); return; }
    status('UPLOADING GAME THEME TO THE CLOUD\u2026');
    fileToDataUrl(file, function (dataUrl) {
      if (!dataUrl) { status('Could not read that file.'); return; }
      var version = Date.now(), name = cleanName(file.name), by = (s.state.profile || {}).id || 'ADMIN';
      try {
        // write the big BLOB first, then the tiny META (so a client that sees the new version finds the blob ready)
        var pb = c.FS.setDoc(c.FS.doc(c.DB, 'bca_system', BLOB), { dataUrl: dataUrl, version: version }, { merge: true });
        var writeMeta = function () { c.FS.setDoc(c.FS.doc(c.DB, 'bca_system', META), { version: version, name: name, hasSong: true, setBy: by, ts: version }, { merge: true }); };
        if (pb && pb.then) pb.then(writeMeta, function () { status('CLOUD WRITE FAILED — the song did not save for everyone.'); }); else writeMeta();
      } catch (e) { status('Cloud write failed: ' + e); return; }
      s.rzgSong._globalVersion = version; s.rzgSong._globalSetBy = by;
      dataUrlToObjUrl(dataUrl, function (u) { applyGlobalUrl(u, name, true); status('GAME THEME SET FOR EVERYONE: ' + name + ' \u2014 all RZG players will hear it.'); });
      try { fetch(dataUrl).then(function (r) { return r.blob(); }).then(function (b) { idbPutKey('global:' + version, { blob: b, name: name }); }); } catch (e) {}
      try { s.utils.logEvent('[RZG MUSIC] ' + by + ' set a GAME-WIDE RZG theme (' + name + ').'); } catch (e) {}
    });
  }
  // ADMIN: remove the game-wide theme (restore built-in anthems for everyone).
  function clearGlobal() {
    var s = S();
    if (!isAdmin()) { notify('ADMIN ONLY.'); return; }
    var c = cloud(); if (!c) { notify('CLOUD OFFLINE.'); return; }
    var version = Date.now();
    try { c.FS.setDoc(c.FS.doc(c.DB, 'bca_system', META), { version: version, name: '', hasSong: false, ts: version }, { merge: true }); } catch (e) {}
    s.rzgSong._globalVersion = version;
    removeGlobalLocal();
    status('REMOVED THE GAME-WIDE THEME. Built-in anthems restored for everyone.');
    try { s.utils.logEvent('[RZG MUSIC] ' + ((s.state.profile || {}).id || 'ADMIN') + ' removed the game-wide RZG theme.'); } catch (e) {}
  }

  // ALL clients: watch the META doc; pull + cache the BLOB once per version; apply as the RZG theme.
  function wireGlobal() {
    var s = S(); if (s.rzgSong._globalWired) return; var c = cloud(); if (!c) { setTimeout(wireGlobal, 3000); return; }
    s.rzgSong._globalWired = true;
    function onMeta(meta) {
      if (!meta) return;
      if (meta.hasSong && meta.version && meta.version !== s.rzgSong._globalVersion) {
        s.rzgSong._globalVersion = meta.version; s.rzgSong._globalSetBy = meta.setBy || '';
        var name = cleanName(meta.name);
        idbGetKey('global:' + meta.version, function (rec) {
          if (rec && rec.blob) { applyGlobalUrl(URL.createObjectURL(rec.blob), name); return; }
          try {
            Promise.resolve(c.FS.getDoc(c.FS.doc(c.DB, 'bca_system', BLOB))).then(function (snap) {
              var d = (snap && snap.data) ? snap.data() : snap; var du = d && d.dataUrl; if (!du) return;
              dataUrlToObjUrl(du, function (u) { applyGlobalUrl(u, name); });
              try { fetch(du).then(function (r) { return r.blob(); }).then(function (b) { idbPutKey('global:' + meta.version, { blob: b, name: name }); }); } catch (e) {}
            });
          } catch (e) {}
        });
      } else if (!meta.hasSong && s.rzgSong._globalIdx != null) {
        s.rzgSong._globalVersion = meta.version || s.rzgSong._globalVersion;
        removeGlobalLocal();
      }
    }
    try { c.FS.onSnapshot(c.FS.doc(c.DB, 'bca_system', META), function (snap) { onMeta((snap && snap.data) ? snap.data() : snap); }); } catch (e) {}
    try { Promise.resolve(c.FS.getDoc(c.FS.doc(c.DB, 'bca_system', META))).then(function (snap) { onMeta((snap && snap.data) ? snap.data() : snap); }); } catch (e) {}
  }

  /* ======================= PERSONAL (this device) ======================= */
  function boot() {
    var s = S();
    if (!s || !s.audio || !s.audio.tracks || !s.music || !s.rzg) return setTimeout(boot, 400);
    if (s.rzgSong && s.rzgSong._installed) return;
    s.rzgSong = s.rzgSong || {}; s.rzgSong._installed = true;
    s.rzgSong._trackIdx = (s.rzgSong._trackIdx != null ? s.rzgSong._trackIdx : null); s.rzgSong._name = ''; s.rzgSong._personalActive = false;
    s.rzgSong._globalIdx = null; s.rzgSong._globalName = ''; s.rzgSong._globalVersion = 0; s.rzgSong._globalSetBy = '';

    s.rzgSong.upload = function (file) {
      if (!file) return;
      try {
        var url = URL.createObjectURL(file), nm = cleanName(file.name);
        s.rzgSong._name = nm; s.rzgSong._personalActive = true;
        idbPutKey(KEY, { blob: file, name: file.name || nm });
        var idx = registerTrack('personal', url, nm, true);
        try { s.music.play(idx, 'rzg'); } catch (e) { try { s.audio.currentTrackIndex = idx; s.audio.playRZGTheme(); s.audio._syncMp3 && s.audio._syncMp3(); } catch (e2) {} }
        status('NOW PLAYING YOUR SONG: ' + nm + ' — looping, saved on this device.');
        try { s.utils.logEvent('[RZG MUSIC] ' + ((s.state.profile || {}).id || 'PLAYER') + ' set a personal RZG theme (' + nm + ').'); } catch (e) {}
      } catch (e) { status('Could not load that file. Please pick an MP3/audio file.'); }
      renderPanel();
    };
    s.rzgSong.clear = function () {
      idbDel(KEY);
      var A = s.audio, M = s.music, idx = s.rzgSong._trackIdx;
      if (idx != null && A.tracks[idx]) { if (A.tracks[idx]._el) { try { A.tracks[idx]._el.pause(); } catch (e) {} } A.tracks[idx].mp3 = ''; }
      var p = M.rzg.indexOf(idx); if (p >= 0) M.rzg.splice(p, 1);
      s.rzgSong._trackIdx = null; s.rzgSong._name = ''; s.rzgSong._personalActive = false;
      // fall back to the game-wide theme if one is set, else a built-in anthem
      var g = (s.rzgSong._globalIdx != null && M.rzg.indexOf(s.rzgSong._globalIdx) >= 0) ? s.rzgSong._globalIdx : null;
      if (M.rzgCurrent === idx) { M.rzgCurrent = (g != null) ? g : (M.rzg.filter(function (i) { return i !== idx; })[0] || 0); if (rzgActive()) { try { A.currentTrackIndex = M.rzgCurrent; if (A.stopTheme) A.stopTheme(); s.music.play(M.rzgCurrent, 'rzg'); } catch (e) {} } }
      status('Removed your song — ' + (g != null ? 'the game theme is back.' : 'the built-in RZG anthems are back.'));
      renderPanel();
    };
    s.rzgSong.hasSong = function () { return !!s.rzgSong._name; };
    s.rzgSong.play = function () { var i = s.rzgSong._trackIdx; if (i != null) { s.rzgSong._personalActive = true; try { s.music.play(i, 'rzg'); } catch (e) {} } };
    s.rzgSong.setGlobal = setGlobal;
    s.rzgSong.clearGlobal = clearGlobal;
    s.rzgSong.hasGlobal = function () { return s.rzgSong._globalIdx != null; };
    s.rzgSong._wireGlobal = wireGlobal; // exposed for tests (peer-propagation) + manual re-sync

    // restore a previously-uploaded personal song (only becomes the theme if no game-wide theme is set)
    idbGetKey(KEY, function (rec) {
      if (rec && rec.blob) {
        try { var url = URL.createObjectURL(rec.blob); s.rzgSong._name = cleanName(rec.name); registerTrack('personal', url, s.rzgSong._name, s.rzgSong._globalIdx == null); } catch (e) {}
        renderPanel();
      }
    });
    wireGlobal();

    /* ---------------- UI on the RZG MUSIC screen ---------------- */
    function renderPanel() {
      var body = document.getElementById('rzg-song-upload-body'); if (!body) return;
      var has = s.rzgSong.hasSong(), admin = isAdmin(), hasGlobal = s.rzgSong.hasGlobal();
      var html =
        (hasGlobal
          ? '<div class="text-[10px] text-[#e5b814] cinzel mb-2">\uD83D\uDCE2 GAME THEME: ' + String(s.rzgSong._globalName || 'CUSTOM') + (s.rzgSong._globalSetBy ? ' <span class="text-gray-400 normal-case">(set by ' + String(s.rzgSong._globalSetBy) + ')</span>' : '') + '</div>'
          : '')
        + '<div class="text-[10px] text-gray-300 normal-case tracking-normal mb-2">Pick an MP3 from THIS device. It loops, fades in, and plays as your RZG theme (saved on this device).</div>'
        + '<input id="rzg-song-file" type="file" accept="audio/*,.mp3,.m4a,.ogg,.wav" style="display:none;">'
        + '<button id="rzg-song-pick" class="btn-military w-full py-3 text-sm bg-pink-950 border-pink-500 text-pink-200">\uD83C\uDFB5 CHOOSE A SONG FROM MY DEVICE</button>'
        + (has
            ? '<div class="mt-2 flex items-center gap-2"><span class="text-[11px] text-[#e5b814] cinzel flex-1 truncate">\u266A ' + String(s.rzgSong._name) + '</span>'
              + '<button id="rzg-song-play" class="btn-military px-3 py-2 text-[10px] bg-green-950 border-green-600 text-green-300">PLAY</button>'
              + '<button id="rzg-song-remove" class="btn-military px-3 py-2 text-[10px] bg-red-950 border-red-700 text-red-400">REMOVE</button></div>'
            : '');
      if (admin) {
        html += '<div class="mt-3 pt-3 border-t border-yellow-800/60">'
          + '<div class="text-[10px] text-yellow-300 cinzel mb-1">\uD83D\uDC51 ADMIN \u2014 WHOLE-GAME THEME</div>'
          + '<div class="text-[9px] text-gray-400 normal-case mb-2">Pick an MP3 and it plays as the RZG theme for EVERY player (stored in the cloud). RZG only, never Akisuma.</div>'
          + '<input id="rzg-song-global-file" type="file" accept="audio/*,.mp3,.m4a,.ogg,.wav" style="display:none;">'
          + '<button id="rzg-song-global-set" class="btn-military w-full py-3 text-sm bg-yellow-950 border-yellow-500 text-yellow-200">\uD83D\uDCE2 SET A SONG FOR THE ENTIRE GAME</button>'
          + (hasGlobal ? '<button id="rzg-song-global-remove" class="btn-military w-full py-2 text-[10px] mt-2 bg-red-950 border-red-700 text-red-400">REMOVE THE GAME-WIDE THEME</button>' : '')
          + '</div>';
      }
      html += '<div id="rzg-song-upload-status" class="text-[9px] text-emerald-400 uppercase mt-2 break-words"></div>'
        + '<div class="text-[8px] text-gray-500 normal-case mt-1">Personal songs play on THIS device only. Only an admin can set the theme for the whole game.</div>';
      body.innerHTML = html;
      var fileEl = document.getElementById('rzg-song-file'), pick = document.getElementById('rzg-song-pick');
      if (pick && fileEl) pick.onclick = function () { fileEl.click(); };
      if (fileEl) fileEl.onchange = function () { var f = fileEl.files && fileEl.files[0]; if (f) s.rzgSong.upload(f); };
      var pl = document.getElementById('rzg-song-play'); if (pl) pl.onclick = function () { s.rzgSong.play(); };
      var rm = document.getElementById('rzg-song-remove'); if (rm) rm.onclick = function () { s.rzgSong.clear(); };
      var gFile = document.getElementById('rzg-song-global-file'), gSet = document.getElementById('rzg-song-global-set');
      if (gSet && gFile) gSet.onclick = function () { gFile.click(); };
      if (gFile) gFile.onchange = function () { var f = gFile.files && gFile.files[0]; if (f) setGlobal(f); };
      var gRm = document.getElementById('rzg-song-global-remove'); if (gRm) gRm.onclick = function () { clearGlobal(); };
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
      var list = document.getElementById('rzg-music-list');
      if (list && list.parentElement === inner) inner.insertBefore(panel, list);
      else if (inner.children.length > 1) inner.insertBefore(panel, inner.children[1]);
      else inner.appendChild(panel);
      renderPanel();
    }

    if (s.rzg && s.rzg.nav && !s.rzg.nav._rzgSongHook) {
      var oldNav = s.rzg.nav.bind(s.rzg);
      s.rzg.nav = function (t) { var r = oldNav.apply(this, arguments); if (t === 'music') { setTimeout(injectPanel, 30); setTimeout(injectPanel, 120); } return r; };
      s.rzg.nav._rzgSongHook = true;
    }
    [400, 1200, 3000].forEach(function (t) { setTimeout(injectPanel, t); });
    try { console.log('[RZG SONG UPLOAD] ready (personal + admin game-wide theme)'); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
