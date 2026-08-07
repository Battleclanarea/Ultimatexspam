/* ============================================================================
   LIVE EVENTS — ADMIN-CREATED EVENT BOARDS (name + image, cloud-synced)
   ----------------------------------------------------------------------------
   Works like the admin GAME THEME song (rzg-song-upload.js), but for EVENTS:
   ONLY an admin can create/remove live events. Every player automatically sees
   a created event as a full devotion board in the EVENTS section — with the
   admin's uploaded IMAGE as its animated-board background, its own DEVOTION
   DUTY X-spam terminal (+1 per press), clan/barracks/warrior ledgers, and full
   EVENTS SCORE INJECTOR + booster support (riding the same bca_events_v1
   increments and the 15s batched booster flush as the built-in boards).

   How it plugs in: index.html's events engine exposes BCA_SYS.events
   .registerBoard/.unregisterBoard/.rebuildBoards — every scoring/spam/injector
   pipeline iterates the EVENTS defs, so a registered board behaves exactly
   like CALL OF DUTY / BLACKMOOR / TRIVIA WARS with zero extra plumbing.

   Cloud layout (same cost-conscious META/BLOB split as the theme song):
   - bca_system/live_events_meta   TINY, watched live via onSnapshot:
       { version, updated, events: [{ id, name, accent, imgV, by, created }] }
   - bca_system/live_event_img_<id>  BIG (downscaled JPEG data URL), fetched
       ONCE per imgV and cached in IndexedDB — each device downloads a given
       banner exactly once. Non-hot bca_system docs (classic path, no live-sync).
   ============================================================================ */
(function () {
  var META = 'live_events_meta', BLOB_PREFIX = 'live_event_img_';
  var DB_NAME = 'bca_live_events', STORE = 'imgs';
  var MAX_SRC_BYTES = 8 * 1024 * 1024;   // refuse absurd source files outright
  var MAX_IMG_BYTES = 1.4 * 1024 * 1024; // cap the STORED banner (data URL) — protects DB + egress
  var MAX_EVENTS = 12;

  function S() { return window.BCA_SYS; }
  function notify(m) { try { S().ui.notify(m); } catch (e) {} }
  function isAdmin() { var s = S(); return !!(s && s.state && s.state.profile && s.state.profile.isAdmin); }
  function meId() { var s = S(); return String(((s && s.state && s.state.profile) || {}).id || 'ADMIN').toUpperCase(); }
  function cloud() { var FS = window.__BCA_FS, DB = window.__BCA_DB; return (FS && DB && FS.doc && FS.setDoc && FS.getDoc) ? { FS: FS, DB: DB } : null; }
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function logEvt(m) { try { S().utils.logEvent(m); } catch (e) {} }

  /* ---- tiny IndexedDB banner cache (download a given image once per device) ---- */
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

  function hash4(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36).slice(0, 4); }
  function cleanName(n) { return String(n || '').replace(/\s+/g, ' ').trim().toUpperCase().slice(0, 32); }
  // Stable id from the name: creating again with the same name REPLACES that event.
  function idFor(name) { return 'lv_' + String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) + '_' + hash4(name); }
  function status(m, isErr) { var el = document.getElementById('live-events-status'); if (el) { el.textContent = m || ''; el.style.color = isErr ? '#f87171' : '#34d399'; } }

  /* ---- image intake: downscale to a wide banner + compress under the byte cap ---- */
  function fileToDataUrl(file, cb) { try { var r = new FileReader(); r.onload = function () { cb(r.result); }; r.onerror = function () { cb(null); }; r.readAsDataURL(file); } catch (e) { cb(null); } }
  function downscaleBanner(file, cb) {
    fileToDataUrl(file, function (src) {
      if (!src) return cb(null);
      var img = new Image();
      img.onload = function () {
        try {
          var maxW = 1280, maxH = 480;
          var scale = Math.min(1, maxW / (img.width || maxW), maxH / (img.height || maxH));
          var w = Math.max(1, Math.round((img.width || maxW) * scale));
          var h = Math.max(1, Math.round((img.height || maxH) * scale));
          var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          var q = 0.85, out = cv.toDataURL('image/jpeg', q);
          while (out.length > MAX_IMG_BYTES && q > 0.4) { q -= 0.12; out = cv.toDataURL('image/jpeg', q); }
          cb(out.length <= MAX_IMG_BYTES ? out : null);
        } catch (e) { cb(null); }
      };
      img.onerror = function () { cb(null); };
      img.src = src;
    });
  }
  function dataUrlToObjUrl(du, cb) { try { fetch(du).then(function (r) { return r.blob(); }).then(function (b) { cb(URL.createObjectURL(b)); }).catch(function () { cb(du); }); } catch (e) { cb(du); } }

  /* ================= EVERY CLIENT: adopt the admin-created events automatically ================= */
  var LE = { _metaEvents: [], _metaVersion: 0, _wired: false, _imgApplied: {} };

  function applyImg(id, imgV) {
    if (!imgV) return;
    var stamp = id + ':' + imgV;
    if (LE._imgApplied[stamp]) return;
    LE._imgApplied[stamp] = true;
    var setUrl = function (url) {
      if (!url) return;
      try {
        var s = S(); var defs = s.events && s.events.defs; if (!defs) return;
        for (var i = 0; i < defs.length; i++) {
          if (defs[i].id === id) { defs[i].img = url; s.events.rebuildBoards(); break; }
        }
      } catch (e) {}
    };
    idbGetKey(stamp, function (rec) {
      if (rec && rec.blob) { setUrl(URL.createObjectURL(rec.blob)); return; }
      var c = cloud(); if (!c) return;
      try {
        Promise.resolve(c.FS.getDoc(c.FS.doc(c.DB, 'bca_system', BLOB_PREFIX + id))).then(function (snap) {
          var d = (snap && snap.data) ? snap.data() : snap; var du = d && d.dataUrl;
          if (!du || (d.v && d.v !== imgV)) return;
          dataUrlToObjUrl(du, setUrl);
          try { fetch(du).then(function (r) { return r.blob(); }).then(function (b) { idbPutKey(stamp, { blob: b }); }); } catch (e) {}
        });
      } catch (e) {}
    });
  }

  function applyMeta(meta) {
    var s = S(); if (!s || !s.events || !s.events.registerBoard) return;
    if (!meta || typeof meta !== 'object') return;
    if (meta.version && meta.version === LE._metaVersion) return;
    LE._metaVersion = meta.version || LE._metaVersion;
    var list = (meta.events && meta.events.length ? meta.events : []).slice(0, MAX_EVENTS);
    LE._metaEvents = list;
    var keep = {};
    list.forEach(function (ev) {
      if (!ev || !ev.id) return;
      keep[ev.id] = true;
      s.events.registerBoard({ id: ev.id, name: ev.name, duty: ev.name, accent: ev.accent || '#e5b814' });
      applyImg(ev.id, ev.imgV || 0);
    });
    // Remove any live board no longer in the meta (built-ins are protected by unregisterBoard).
    try {
      (s.events.defs || []).slice().forEach(function (d) { if (d.live && !keep[d.id]) s.events.unregisterBoard(d.id); });
    } catch (e) {}
    renderPanel();
  }
  LE._applyMeta = applyMeta; // exposed for tests

  function wire() {
    if (LE._wired) return;
    var c = cloud(); if (!c) { setTimeout(wire, 3000); return; }
    LE._wired = true;
    try { c.FS.onSnapshot(c.FS.doc(c.DB, 'bca_system', META), function (snap) { try { applyMeta((snap && snap.data) ? snap.data() : snap); } catch (e) {} }); } catch (e) {}
    try { Promise.resolve(c.FS.getDoc(c.FS.doc(c.DB, 'bca_system', META))).then(function (snap) { try { applyMeta((snap && snap.data) ? snap.data() : snap); } catch (e) {} }); } catch (e2) {}
  }

  /* ================= ADMIN: create / remove live events ================= */
  function writeMeta(c, events, cb) {
    var version = Date.now();
    var p = c.FS.setDoc(c.FS.doc(c.DB, 'bca_system', META), { version: version, updated: version, events: events }, { merge: true });
    if (p && p.then) p.then(function () { cb && cb(true, version); }, function () { cb && cb(false, version); });
    else cb && cb(true, version);
  }
  function createEvent(name, accent, file) {
    if (!isAdmin()) { notify('ADMIN ONLY.'); return; }
    name = cleanName(name);
    if (!name || name.length < 2) { status('ENTER AN EVENT NAME (2+ CHARACTERS).', true); return; }
    var c = cloud(); if (!c) { status('CLOUD OFFLINE — live events need the live link.', true); return; }
    if (file && file.size > MAX_SRC_BYTES) { status('IMAGE TOO LARGE — pick one under ~8MB.', true); return; }
    var id = idFor(name);
    var others = (LE._metaEvents || []).filter(function (e) { return e && e.id !== id; });
    if (others.length >= MAX_EVENTS) { status('LIMIT REACHED (' + MAX_EVENTS + ' live events). Remove one first.', true); return; }
    var finish = function (imgV) {
      var entry = { id: id, name: name, accent: accent || '#e5b814', imgV: imgV || 0, by: meId(), created: Date.now() };
      writeMeta(c, others.concat([entry]), function (ok) {
        if (!ok) { status('CLOUD WRITE FAILED — the event did not save for everyone. Try again.', true); return; }
        status('LIVE EVENT "' + name + '" IS UP FOR EVERYONE.');
        logEvt('[EVENTS] ' + meId() + ' launched the LIVE EVENT "' + name + '"' + (imgV ? ' with a custom banner' : '') + ' — it now has its own devotion board + X-spam duty.');
        notify('\u2694 LIVE EVENT LAUNCHED: ' + name);
        // Local instant-apply (the snapshot echo also lands, guarded by version).
        applyMeta({ version: Date.now() + 1, events: others.concat([entry]) });
      });
    };
    if (!file) { finish(0); return; }
    status('PREPARING THE BANNER IMAGE\u2026');
    downscaleBanner(file, function (dataUrl) {
      if (!dataUrl) { status('COULD NOT PROCESS THAT IMAGE — try a plain JPG/PNG.', true); return; }
      var imgV = Date.now();
      // blob first, then meta — a client that sees the new meta finds the banner ready
      var pb = c.FS.setDoc(c.FS.doc(c.DB, 'bca_system', BLOB_PREFIX + id), { v: imgV, dataUrl: dataUrl }, { merge: true });
      var go = function () { finish(imgV); };
      if (pb && pb.then) pb.then(go, function () { status('BANNER UPLOAD FAILED — event not created.', true); }); else go();
      try { fetch(dataUrl).then(function (r) { return r.blob(); }).then(function (b) { idbPutKey(id + ':' + imgV, { blob: b }); }); } catch (e) {}
    });
  }
  function removeEvent(id) {
    if (!isAdmin()) { notify('ADMIN ONLY.'); return; }
    var c = cloud(); if (!c) { status('CLOUD OFFLINE.', true); return; }
    var entry = (LE._metaEvents || []).filter(function (e) { return e && e.id === id; })[0];
    var rest = (LE._metaEvents || []).filter(function (e) { return e && e.id !== id; });
    writeMeta(c, rest, function (ok) {
      if (!ok) { status('CLOUD WRITE FAILED — try again.', true); return; }
      try { c.FS.setDoc(c.FS.doc(c.DB, 'bca_system', BLOB_PREFIX + id), { v: 0, dataUrl: '' }, { merge: true }); } catch (e) {}
      status('LIVE EVENT REMOVED FOR EVERYONE.');
      logEvt('[EVENTS] ' + meId() + ' ended the LIVE EVENT "' + ((entry && entry.name) || id) + '".');
      applyMeta({ version: Date.now() + 1, events: rest });
    });
  }

  /* ================= ADMIN UI (in the admin mini menu, next to the score injector) ================= */
  function renderPanel() {
    var body = document.getElementById('live-events-body'); if (!body) return;
    var rows = (LE._metaEvents || []).map(function (ev) {
      return '<div class="flex justify-between items-center gap-1 bg-[#111] border border-[#333] px-2 py-1">'
        + '<span class="text-[9px] font-black uppercase truncate flex-1" style="color:' + esc(ev.accent || '#e5b814') + '">' + esc(ev.name) + (ev.imgV ? ' \uD83D\uDDBC' : '') + '</span>'
        + '<button onclick="BCA_SYS.liveEvents.remove(\'' + esc(ev.id) + '\')" class="bg-[#2a0000] border border-red-800 text-red-500 font-bold text-[9px] px-2 py-1 uppercase">\u2716 END</button>'
        + '</div>';
    }).join('');
    body.innerHTML =
      '<label class="text-[8px] text-gray-400 uppercase">Event name (becomes its board + X-spam duty)</label>'
      + '<input type="text" id="live-evt-name" placeholder="E.G. HALLOWEEN SIEGE" class="bg-[#111] text-white text-[10px] p-1 border border-[#333] outline-none w-full uppercase">'
      + '<div class="flex gap-1 items-center"><label class="text-[8px] text-gray-400 uppercase flex-1">Board color</label><input type="color" id="live-evt-accent" value="#e5b814" class="bg-[#111] border border-[#333] w-10 h-6 p-0"></div>'
      + '<input type="file" id="live-evt-img" accept="image/*" style="display:none">'
      + '<button id="live-evt-pick" class="w-full bg-[#111] border border-[#555] text-gray-300 text-[9px] py-2 uppercase font-bold">\uD83D\uDDBC PICK BANNER IMAGE (OPTIONAL)</button>'
      + '<div id="live-evt-imgname" class="text-[8px] text-gray-500 uppercase text-center"></div>'
      + '<button onclick="BCA_SYS.liveEvents.createFromUI()" class="w-full bg-green-950 border border-green-600 text-green-400 font-bold text-[10px] py-2 uppercase tracking-wider">\u2694 LAUNCH LIVE EVENT (EVERYONE SEES IT)</button>'
      + '<div id="live-events-status" class="text-[8px] uppercase text-center mt-1 break-words"></div>'
      + (rows ? '<div class="text-[8px] text-gray-400 uppercase mt-1">Running live events</div><div class="flex flex-col gap-1">' + rows + '</div>'
              : '<div class="text-[8px] text-gray-500 uppercase text-center mt-1">No live events running</div>');
    var pick = document.getElementById('live-evt-pick'), f = document.getElementById('live-evt-img');
    if (pick && f) {
      pick.onclick = function () { f.click(); };
      f.onchange = function () { var el = document.getElementById('live-evt-imgname'); if (el) el.textContent = (f.files && f.files[0]) ? f.files[0].name : ''; };
    }
  }
  function injectPanel() {
    var menu = document.getElementById('admin-mini-menu'); if (!menu) return;
    var existing = document.getElementById('live-events-box');
    if (!isAdmin()) { if (existing) existing.remove(); return; } // NON-ADMINS get NO creator UI
    if (existing) { if (!document.getElementById('live-evt-name')) renderPanel(); return; }
    var box = document.createElement('div');
    box.id = 'live-events-box';
    box.className = 'flex flex-col gap-1 mt-2';
    box.innerHTML = '<div class="text-[9px] text-emerald-300 font-black uppercase tracking-widest text-center border-b border-[#333] pb-1">\uD83C\uDF89 LIVE EVENTS (ADMIN)</div>'
      + '<div id="live-events-body" class="flex flex-col gap-1"></div>';
    menu.appendChild(box);
    renderPanel();
  }

  function boot() {
    var s = S();
    if (!s || !s.events || !s.events.registerBoard || !s.state) return setTimeout(boot, 400);
    if (s.liveEvents && s.liveEvents._installed) return;
    s.liveEvents = {
      _installed: true,
      _state: LE,
      create: createEvent,   // admin only (gated inside)
      remove: removeEvent,   // admin only (gated inside)
      list: function () { return (LE._metaEvents || []).slice(); },
      _applyMeta: applyMeta, // exposed for tests / manual re-sync
      _wire: wire,
      createFromUI: function () {
        var nm = (document.getElementById('live-evt-name') || {}).value || '';
        var ac = (document.getElementById('live-evt-accent') || {}).value || '#e5b814';
        var f = document.getElementById('live-evt-img');
        createEvent(nm, ac, (f && f.files && f.files[0]) || null);
      }
    };

    wire(); // every client (admins AND players) adopts the current live events automatically

    // Admin UI: piggyback on the admin menu toggle exactly like the events injector box does.
    if (s.adminBoost && s.adminBoost.toggleMenu && !s.adminBoost.toggleMenu._liveEvt) {
      var oldToggle = s.adminBoost.toggleMenu.bind(s.adminBoost);
      s.adminBoost.toggleMenu = function () { var r = oldToggle(); setTimeout(injectPanel, 90); return r; };
      s.adminBoost.toggleMenu._liveEvt = true;
    }
    [1600, 4500, 9500].forEach(function (t) { setTimeout(injectPanel, t); });
    try { console.log('[LIVE EVENTS] ready (admin-only creator; boards sync to every player)'); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
