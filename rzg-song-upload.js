/* ============================================================================
   RZG THEME SONG — ADMIN ONLY (no code, no links)
   ----------------------------------------------------------------------------
   ONLY an admin can set the song that plays for the ENTIRE game. Normal players
   can never set/change/upload music — they simply HEAR whatever theme the admin
   sets. When an admin sets a song it becomes the new main RZG theme for everyone
   automatically; new players do NOT have to do anything.

   - Admins get a "GAME THEME" panel on the RZG MUSIC screen with
     "SET A SONG FOR THE ENTIRE GAME" (pick an MP3) + "REMOVE".
   - Non-admins get NO upload UI at all.

   The song is stored in the SHARED cloud (bca_system/rzg_theme_meta + _blob) via
   the Firestore-compat shim (same API forge-studio uses), so every client hears
   it. RZG only — never Akisuma. Reuses the existing MP3 track engine (_syncMp3).

   Cost-conscious: the tiny META doc is watched live; the big BLOB doc is fetched
   ONCE per version and cached in IndexedDB, so each device downloads a given song
   only one time. Both are non-hot bca_system docs (not on the live-sync path).
   ============================================================================ */
(function () {
  var DB_NAME = 'bca_rzg_music', STORE = 'songs';
  var META = 'rzg_theme_meta', BLOB = 'rzg_theme_blob';
  var MAX_BYTES = 10 * 1024 * 1024; // ~10MB cap for the game-wide song (protects the DB + egress)
  function S() { return window.BCA_SYS; }
  function notify(m) { try { S().ui.notify(m); } catch (e) {} }
  function isAdmin() { var s = S(); return !!(s && s.state && s.state.profile && s.state.profile.isAdmin); }
  function cloud() { var FS = window.__BCA_FS, DB = window.__BCA_DB; return (FS && DB && FS.doc && FS.setDoc && FS.getDoc) ? { FS: FS, DB: DB } : null; }

  /* ---- tiny IndexedDB blob cache (download a given song once per device) ---- */
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

  function cleanName(n) { return String(n || 'RZG THEME').replace(/\.(mp3|m4a|ogg|wav|aac|flac)$/i, '').toUpperCase().slice(0, 28) || 'RZG THEME'; }
  function status(m) { var el = document.getElementById('rzg-song-upload-status'); if (el) el.textContent = m || ''; }
  function fileToDataUrl(file, cb) { try { var r = new FileReader(); r.onload = function () { cb(r.result); }; r.onerror = function () { cb(null); }; r.readAsDataURL(file); } catch (e) { cb(null); } }
  function dataUrlToObjUrl(du, cb) { try { fetch(du).then(function (r) { return r.blob(); }).then(function (b) { cb(URL.createObjectURL(b)); }).catch(function () { cb(du); }); } catch (e) { cb(du); } }
  function rzgActive() { var el = document.getElementById('screen-rzg-hq'); return !!(el && el.classList.contains('active')); }

  // Register (or refresh) the single game-wide track. RZG playlist ONLY; always the current theme.
  function registerGlobal(url, name) {
    var s = S(), A = s.audio, M = s.music; if (!A || !A.tracks || !M) return -1;
    var idx = s.rzgSong._globalIdx;
    if (idx == null || !A.tracks[idx] || !A.tracks[idx]._globalTrack) {
      idx = A.tracks.length; A.tracks.push({ name: name || 'RZG THEME', mp3: url, _globalTrack: true }); s.rzgSong._globalIdx = idx;
    } else {
      var t = A.tracks[idx]; if (t._el) { try { t._el.pause(); } catch (e) {} t._el = null; } t.mp3 = url; if (name) t.name = name;
    }
    if (M.rzg.indexOf(idx) < 0) M.rzg.unshift(idx); // RZG playlist ONLY — never Akisuma
    M.rzgCurrent = idx;                              // becomes the NEW MAIN RZG THEME for everyone
    return idx;
  }
  function applyGlobalUrl(url, name) {
    var s = S(); var idx = registerGlobal(url, name); s.rzgSong._globalName = name;
    if (rzgActive()) { try { s.music.play(idx, 'rzg'); } catch (e) {} } // if a player is in RZG HQ, swap it in live (fade)
    if (s.rzgSong._renderPanel) s.rzgSong._renderPanel();
  }
  function removeGlobalLocal() {
    var s = S(), A = s.audio, M = s.music, idx = s.rzgSong._globalIdx;
    if (idx != null && A.tracks[idx]) { if (A.tracks[idx]._el) { try { A.tracks[idx]._el.pause(); } catch (e) {} } A.tracks[idx].mp3 = ''; }
    var p = M.rzg.indexOf(idx); if (p >= 0) M.rzg.splice(p, 1);
    var wasCurrent = (M.rzgCurrent === idx);
    s.rzgSong._globalIdx = null; s.rzgSong._globalName = ''; s.rzgSong._globalSetBy = '';
    if (wasCurrent) { M.rzgCurrent = (M.rzg.filter(function (i) { return i !== idx; })[0] || 0); if (rzgActive()) { try { S().music.play(M.rzgCurrent, 'rzg'); } catch (e) {} } }
    if (s.rzgSong._renderPanel) s.rzgSong._renderPanel();
  }

  // ADMIN ONLY: set the song that plays for the whole game.
  function setGlobal(file) {
    var s = S();
    if (!isAdmin()) { notify('ADMIN ONLY.'); return; }
    if (!file) return;
    if (file.size > MAX_BYTES) { notify('SONG TOO LARGE — keep it under ~10MB (about 6-7 min at 192kbps).'); return; }
    var c = cloud(); if (!c) { notify('CLOUD OFFLINE — can\'t set the game theme right now. Try again when online.'); return; }
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
      dataUrlToObjUrl(dataUrl, function (u) { applyGlobalUrl(u, name); status('GAME THEME SET FOR EVERYONE: ' + name + ' \u2014 all RZG players now hear it.'); });
      try { fetch(dataUrl).then(function (r) { return r.blob(); }).then(function (b) { idbPutKey('global:' + version, { blob: b, name: name }); }); } catch (e) {}
      try { s.utils.logEvent('[RZG MUSIC] ' + by + ' set the GAME-WIDE RZG theme (' + name + ').'); } catch (e) {}
    });
  }
  // ADMIN ONLY: remove the game-wide theme (restore built-in anthems for everyone).
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

  // EVERY client (admin or not): watch the META doc; pull + cache the BLOB once per version; apply as
  // the RZG theme automatically. New players get the current theme on boot with zero manual action.
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

  function boot() {
    var s = S();
    if (!s || !s.audio || !s.audio.tracks || !s.music || !s.rzg) return setTimeout(boot, 400);
    if (s.rzgSong && s.rzgSong._installed) return;
    s.rzgSong = s.rzgSong || {}; s.rzgSong._installed = true;
    s.rzgSong._globalIdx = null; s.rzgSong._globalName = ''; s.rzgSong._globalVersion = 0; s.rzgSong._globalSetBy = '';
    s.rzgSong.setGlobal = setGlobal;         // admin only (gated inside)
    s.rzgSong.clearGlobal = clearGlobal;     // admin only (gated inside)
    s.rzgSong.hasGlobal = function () { return s.rzgSong._globalIdx != null; };
    s.rzgSong._wireGlobal = wireGlobal;      // exposed for tests (peer-propagation) + manual re-sync

    wireGlobal(); // start listening for the admin theme on EVERY client (incl. brand-new players)

    /* ---------------- UI on the RZG MUSIC screen (ADMIN ONLY) ---------------- */
    function renderPanel() {
      var body = document.getElementById('rzg-song-upload-body'); if (!body) return;
      var hasGlobal = s.rzgSong.hasGlobal();
      body.innerHTML =
        (hasGlobal
          ? '<div class="text-[11px] text-[#e5b814] cinzel mb-2">\uD83D\uDCE2 CURRENT GAME THEME: ' + String(s.rzgSong._globalName || 'CUSTOM') + (s.rzgSong._globalSetBy ? ' <span class="text-gray-400 normal-case">(set by ' + String(s.rzgSong._globalSetBy) + ')</span>' : '') + '</div>'
          : '<div class="text-[11px] text-gray-400 cinzel mb-2">No custom game theme set — the built-in anthems are playing.</div>')
        + '<div class="text-[10px] text-gray-300 normal-case tracking-normal mb-2">Pick an MP3 from your device. It becomes the RZG theme for EVERY player automatically (they don\u2019t have to do anything). RZG only, never Akisuma.</div>'
        + '<input id="rzg-song-global-file" type="file" accept="audio/*,.mp3,.m4a,.ogg,.wav" style="display:none;">'
        + '<button id="rzg-song-global-set" class="btn-military w-full py-3 text-sm bg-yellow-950 border-yellow-500 text-yellow-200">\uD83D\uDCE2 SET A SONG FOR THE ENTIRE GAME</button>'
        + (hasGlobal ? '<button id="rzg-song-global-remove" class="btn-military w-full py-2 text-[10px] mt-2 bg-red-950 border-red-700 text-red-400">REMOVE THE GAME-WIDE THEME</button>' : '')
        + '<div id="rzg-song-upload-status" class="text-[9px] text-emerald-400 uppercase mt-2 break-words"></div>'
        + '<div class="text-[8px] text-gray-500 normal-case mt-1">Only an admin can set the music. Every player just hears it automatically.</div>';
      var gFile = document.getElementById('rzg-song-global-file'), gSet = document.getElementById('rzg-song-global-set');
      if (gSet && gFile) gSet.onclick = function () { gFile.click(); };
      if (gFile) gFile.onchange = function () { var f = gFile.files && gFile.files[0]; if (f) setGlobal(f); };
      var gRm = document.getElementById('rzg-song-global-remove'); if (gRm) gRm.onclick = function () { clearGlobal(); };
    }
    s.rzgSong._renderPanel = renderPanel;

    function injectPanel() {
      var view = document.getElementById('rzg-view-music'); if (!view) return;
      var existing = document.getElementById('rzg-song-upload-panel');
      if (!isAdmin()) { if (existing) existing.remove(); return; } // NON-ADMINS get NO upload UI
      if (existing) { renderPanel(); return; }
      var inner = view.querySelector('.max-w-2xl') || view.firstElementChild || view;
      var panel = document.createElement('div');
      panel.id = 'rzg-song-upload-panel';
      panel.className = 'panel-lux p-4 border-yellow-700 mb-4';
      panel.innerHTML = '<h3 class="cinzel text-lg text-yellow-300 text-center mb-1">\uD83D\uDC51 GAME THEME (ADMIN)</h3><div id="rzg-song-upload-body"></div>';
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
    try { console.log('[RZG SONG UPLOAD] ready (admin-only game-wide theme)'); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
