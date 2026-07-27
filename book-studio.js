/* =====================================================================
   BOOK STUDIO  -  a pro admin tool for BOOKS (sibling module, like Food Studio).
   ---------------------------------------------------------------------
   Books are their OWN shop category: the ROYAL LIBRARY (a nav card + view).
   Unlike food, books give NO buffs - they are pure INFORMATION. For any book an
   admin can:
     1) Choose from many unique COVER base designs, FONT styles, cover MATERIALS,
        DECORATIONS, spine styles and colours -> near-endless unique looks.
     2) PLUG IN LARGE INFO split into any number of ordered PAGES; reading a book
        reveals the next unique page (sequential, never repeats), stored per-book
        + per-player so it can be re-read forever. Read pages are logged to the
        player's INTEL FILES (a "ROYAL LIBRARY" section), exactly like foods'
        recovered files.
   Saved books persist to localStorage ('bca_book_studio_v1') + the cloud
   ('bca_system/book_studio') and apply live, the same pipeline Food Studio uses.
   ===================================================================== */
(function () {
  var LS_KEY = 'bca_book_studio_v1';
  var CLOUD_DOC = 'book_studio';
  var STORE = {};              // bookId -> config
  var cloudWired = false;

  function S() { return window.BCA_SYS; }
  function cloud() { var FS = window.__BCA_FS, DB = window.__BCA_DB; return (FS && DB && FS.doc && FS.setDoc && FS.onSnapshot) ? { FS: FS, DB: DB } : null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function isAdmin() { var s = S(); return !!(s && s.state && s.state.profile && s.state.profile.isAdmin); }
  function pf() { var s = S(); return (s && s.state && s.state.profile) || {}; }
  function notify(m) { try { S().ui.notify(m); } catch (e) {} }
  function persist() { try { var s = S(); s.storage.lastSavedDataStr = ''; s.ui.updateHeader(); s.storage.save(true); } catch (e) {} }
  function refreshInv() { try { var s = S(); if (s.carry && s.carry.renderInv && document.getElementById('rzg-view-inv')) s.carry.renderInv(); } catch (e) {} }
  function bookName(id) { var it = findBook(id); return (it && it.name) || (STORE[id] && STORE[id].name) || id; }

  /* ---------------- carry placement + caps (books behave like gear) ----------------
     Books live in the SAME carry structure as other items so they persist via p.bag:
       inventory -> p.bag.__cw.inv.books   (max INV_CAP = 5)
       bag       -> p.bag.__cw.stash.books (max = the upgradeable bag cap, base 10)
       closet    -> owned but NOT in inventory or bag (derived, exactly like gear).
     p.ownedBooks is the master ownership list. */
  var INV_CAP = 5;
  function bagCap() { try { var s = S(); if (s.bags && typeof s.bags.cap === 'function') { var c = s.bags.cap('books'); if (c) return c; } } catch (e) {} return 10; }
  function cwArr(which) {
    var p = pf(); if (!p.bag || typeof p.bag !== 'object') p.bag = { gold: 0 };
    if (!p.bag.__cw) p.bag.__cw = {}; var w = p.bag.__cw;
    if (!w.inv) w.inv = {}; if (!w.stash) w.stash = {};
    if (!Array.isArray(w.inv.books)) w.inv.books = [];
    if (!Array.isArray(w.stash.books)) w.stash.books = [];
    return w[which === 'inv' ? 'inv' : 'stash'].books;
  }
  function invBooks() { return cwArr('inv'); }
  function bagBooks() { return cwArr('stash'); }
  function inInv(id) { return invBooks().indexOf(id) >= 0; }
  function inBag(id) { return bagBooks().indexOf(id) >= 0; }
  function owned(id) { var p = pf(); return !!((p.ownedBooks && p.ownedBooks.indexOf(id) >= 0) || inInv(id) || inBag(id)); }
  function closetBooks() { var p = pf(); return (p.ownedBooks || []).filter(function (id) { return !inInv(id) && !inBag(id); }); }
  function refreshAll() { refreshInv(); try { var s = S(); if (s.carry && s.carry.renderBag && document.getElementById('rzg-view-bag')) s.carry.renderBag(); } catch (e) {} try { if (document.getElementById('rzg-view-closet') && S().closet && S().closet.open) appendClosetBooks(); } catch (e) {} try { renderLibrary(); } catch (e) {} }
  // move a book between inventory / bag / closet (closet = removed from both carried arrays)
  function toBag(id) { if (!owned(id) || inBag(id)) return; if (bagBooks().length >= bagCap()) return notify('BAG FULL: BOOKS (' + bagCap() + ' MAX). Upgrade your bag, or move one to inventory/closet.'); var i = invBooks().indexOf(id); if (i >= 0) invBooks().splice(i, 1); bagBooks().push(id); if (pf().activeBook === id) pf().activeBook = null; persist(); refreshAll(); }
  function toInv(id) { if (!owned(id) || inInv(id)) return; if (invBooks().length >= INV_CAP) return notify('INVENTORY FULL: BOOKS (' + INV_CAP + ' MAX). Move one to your bag or closet first.'); var j = bagBooks().indexOf(id); if (j >= 0) bagBooks().splice(j, 1); invBooks().push(id); persist(); refreshAll(); }
  function toCloset(id) { if (!owned(id)) return; var i = invBooks().indexOf(id); if (i >= 0) invBooks().splice(i, 1); var j = bagBooks().indexOf(id); if (j >= 0) bagBooks().splice(j, 1); if (pf().activeBook === id) pf().activeBook = null; persist(); refreshAll(); notify('MOVED TO CLOSET: ' + bookName(id)); }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  function setVal(id, v) { var el = document.getElementById(id); if (el) el.value = (v == null ? '' : v); }
  function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }
  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'book'; }

  /* =====================================================================
     DESIGN LIBRARIES  -  covers x materials x decorations x fonts x colours
     compose into a near-endless set of unique book looks.
     ===================================================================== */
  // Cover base shapes (each returns SVG inner markup on a 100x140 book). `mat` = material fill id.
  var COVERS = {
    tome:      { name: 'Ancient Tome',    art: function (m) { return '<rect x="14" y="8" width="72" height="124" rx="4" fill="url(#' + m + ')"/><rect x="20" y="14" width="60" height="112" rx="3" fill="none" stroke="#00000055" stroke-width="2"/>'; } },
    grimoire:  { name: 'Grimoire',        art: function (m) { return '<path d="M16,10 L84,10 Q88,10 88,16 L88,124 Q88,132 80,130 Q50,122 20,130 Q12,132 12,124 L12,16 Q12,10 16,10Z" fill="url(#' + m + ')"/>'; } },
    ledger:    { name: 'War Ledger',      art: function (m) { return '<rect x="12" y="10" width="76" height="120" rx="2" fill="url(#' + m + ')"/><rect x="12" y="10" width="10" height="120" fill="#00000055"/>'; } },
    codex:     { name: 'Codex',           art: function (m) { return '<rect x="14" y="8" width="72" height="124" rx="6" fill="url(#' + m + ')"/><rect x="14" y="8" width="72" height="124" rx="6" fill="none" stroke="#ffffff22" stroke-width="1.5"/><path d="M50,8 L50,132" stroke="#00000033" stroke-width="1"/>'; } },
    scrolltome:{ name: 'Scroll-Bound',    art: function (m) { return '<rect x="16" y="14" width="68" height="112" rx="3" fill="url(#' + m + ')"/><circle cx="16" cy="20" r="6" fill="#00000055"/><circle cx="16" cy="120" r="6" fill="#00000055"/><circle cx="84" cy="20" r="6" fill="#00000055"/><circle cx="84" cy="120" r="6" fill="#00000055"/>'; } },
    slab:      { name: 'Stone Slab',      art: function (m) { return '<rect x="12" y="8" width="76" height="124" rx="1" fill="url(#' + m + ')"/><path d="M20,20 H80 M20,120 H80" stroke="#00000044" stroke-width="2"/>'; } },
    folio:     { name: 'Royal Folio',     art: function (m) { return '<rect x="14" y="8" width="72" height="124" rx="8" fill="url(#' + m + ')"/><rect x="22" y="18" width="56" height="104" rx="6" fill="none" stroke="#ffffff33" stroke-width="1.4"/>'; } },
    diptych:   { name: 'Diptych',         art: function (m) { return '<rect x="12" y="10" width="37" height="120" rx="3" fill="url(#' + m + ')"/><rect x="51" y="10" width="37" height="120" rx="3" fill="url(#' + m + ')"/>'; } },
    spellbook: { name: 'Spellbook',       art: function (m) { return '<path d="M50,8 C30,8 16,12 16,12 L16,128 C16,128 32,124 50,124 C68,124 84,128 84,128 L84,12 C84,12 70,8 50,8Z" fill="url(#' + m + ')"/><path d="M50,10 L50,124" stroke="#00000033" stroke-width="1.4"/>'; } },
    manual:    { name: 'Field Manual',    art: function (m) { return '<rect x="16" y="10" width="68" height="120" rx="2" fill="url(#' + m + ')"/><rect x="16" y="10" width="68" height="20" fill="#00000044"/><rect x="16" y="110" width="68" height="20" fill="#00000033"/>'; } },
    relicbook: { name: 'Relic Book',      art: function (m) { return '<rect x="14" y="8" width="72" height="124" rx="10" fill="url(#' + m + ')"/><circle cx="50" cy="70" r="26" fill="none" stroke="#ffffff22" stroke-width="2"/>'; } },
    journal:   { name: 'Journal',         art: function (m) { return '<rect x="18" y="10" width="64" height="120" rx="4" fill="url(#' + m + ')"/><path d="M30,10 L30,130 M18,70 H82" stroke="#00000022" stroke-width="1.2"/>'; } }
  };
  var DEFAULT_COVER = 'tome';

  // Cover MATERIAL palettes -> a linearGradient. `c1` top, `c2` bottom.
  var MATERIALS = {
    leather:  { name: 'Oxblood Leather',  c1: '#5a2417', c2: '#2a0f08' },
    obsidian: { name: 'Obsidian',         c1: '#2a2440', c2: '#0a0714' },
    gilt:     { name: 'Gilded',           c1: '#e6c063', c2: '#7a5a12' },
    ivory:    { name: 'Ivory',            c1: '#f2e8d0', c2: '#c9b98a' },
    emerald:  { name: 'Emerald',          c1: '#146a4a', c2: '#052318' },
    crimson:  { name: 'Crimson',          c1: '#9a1526', c2: '#3a0710' },
    azure:    { name: 'Azure',            c1: '#1d5fa8', c2: '#0a1f3a' },
    amethyst: { name: 'Amethyst',         c1: '#6a2ea0', c2: '#26103f' },
    bone:     { name: 'Bleached Bone',    c1: '#d8d2c0', c2: '#8a8272' },
    ash:      { name: 'Ashen Slate',      c1: '#4a4e56', c2: '#191b20' },
    verdigris:{ name: 'Verdigris',        c1: '#3aa08a', c2: '#0f342c' },
    sanguine: { name: 'Sanguine Velvet',  c1: '#6e0f1a', c2: '#1a0308' }
  };
  var DEFAULT_MATERIAL = 'leather';

  // DECORATIONS layered over the cover.
  var DECOS = {
    none:      function () { return ''; },
    emblem:    function (g) { return '<circle cx="50" cy="52" r="17" fill="none" stroke="' + g + '" stroke-width="2.4"/><path d="M50,40 L54,50 L64,50 L56,57 L59,68 L50,61 L41,68 L44,57 L36,50 L46,50Z" fill="' + g + '"/>'; },
    foilcorners:function (g) { return '<path d="M18,14 h14 M18,14 v14 M82,14 h-14 M82,14 v14 M18,126 h14 M18,126 v-14 M82,126 h-14 M82,126 v-14" stroke="' + g + '" stroke-width="2.4" fill="none"/>'; },
    clasp:     function (g) { return '<rect x="44" y="60" width="12" height="20" rx="2" fill="' + g + '"/><rect x="40" y="66" width="20" height="7" rx="2" fill="' + g + '"/>'; },
    gem:       function (g) { return '<path d="M50,44 L58,52 L50,64 L42,52Z" fill="' + g + '" stroke="#ffffffaa" stroke-width="1"/>'; },
    runes:     function (g) { return '<g stroke="' + g + '" stroke-width="2" fill="none"><path d="M32,30 v10 M32,35 h6"/><path d="M64,30 v10 M60,30 l4,5 4,-5"/><path d="M32,100 l6,10 M38,100 l-6,10"/><path d="M62,100 v10 M62,105 h6"/></g>'; },
    banner:    function (g) { return '<path d="M34,14 h32 v22 l-16,-8 -16,8Z" fill="' + g + '"/>'; },
    skull:     function (g) { return '<path d="M42,46 Q42,38 50,38 Q58,38 58,46 Q58,52 54,54 L54,58 L46,58 L46,54 Q42,52 42,46Z" fill="' + g + '"/><circle cx="46.5" cy="47" r="2" fill="#000"/><circle cx="53.5" cy="47" r="2" fill="#000"/>'; },
    sun:       function (g) { return '<g stroke="' + g + '" stroke-width="2"><circle cx="50" cy="50" r="9" fill="none"/><path d="M50,34 v8 M50,58 v8 M34,50 h8 M58,50 h8 M39,39 l5,5 M61,39 l-5,5 M39,61 l5,-5 M61,61 l-5,-5"/></g>'; }
  };

  // FONT styles for the title (family stacks that render in-browser + weight/case/spacing).
  var FONTS = {
    cinzel:    { name: 'Cinzel Royal',    css: "font-family:'Cinzel',serif;font-weight:800;letter-spacing:.06em;" },
    blackletter:{ name: 'Iron Blackletter',css: "font-family:'UnifrakturCook','Cinzel',serif;font-weight:700;letter-spacing:.02em;" },
    serifbold: { name: 'Serif Bold',      css: "font-family:Georgia,'Times New Roman',serif;font-weight:800;letter-spacing:.03em;" },
    slab:      { name: 'Slab Stamp',      css: "font-family:'Rockwell','Courier New',monospace;font-weight:800;text-transform:uppercase;letter-spacing:.08em;" },
    mono:      { name: 'Typewriter',      css: "font-family:'Courier New',monospace;font-weight:700;letter-spacing:.02em;" },
    script:    { name: 'Royal Script',    css: "font-family:'Brush Script MT','Segoe Script',cursive;font-weight:600;font-style:italic;" },
    gothic:    { name: 'Gothic Caps',     css: "font-family:'Arial Black','Impact',sans-serif;font-weight:900;text-transform:uppercase;letter-spacing:.05em;" },
    condensed: { name: 'Condensed',       css: "font-family:'Arial Narrow',sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:.12em;" },
    elegant:   { name: 'Elegant Thin',    css: "font-family:'Didot','Bodoni MT',Georgia,serif;font-weight:500;letter-spacing:.1em;" },
    fantasy:   { name: 'Fantasy',         css: "font-family:'Papyrus','Luminari',fantasy;font-weight:700;letter-spacing:.04em;" },
    small:     { name: 'Small Caps',      css: "font-family:'Cinzel',serif;font-weight:700;font-variant:small-caps;letter-spacing:.14em;" },
    heavy:     { name: 'Heavy Wide',      css: "font-family:Georgia,serif;font-weight:900;letter-spacing:.16em;text-transform:uppercase;" }
  };
  var DEFAULT_FONT = 'cinzel';

  function defaultArt() {
    return { cover: DEFAULT_COVER, material: DEFAULT_MATERIAL, deco: 'emblem', font: DEFAULT_FONT, ink: '#f2e8c8', accent: '#e5b814', spine: true, tag: 'TOME' };
  }

  // Compose a full book-cover card from a config. `sfx` = unique suffix for gradient ids.
  function composeCover(a, sfx) {
    a = a || defaultArt();
    sfx = String(sfx || 'x').replace(/[^a-zA-Z0-9_]/g, '');
    var coverKey = COVERS[a.cover] ? a.cover : DEFAULT_COVER;
    var mat = MATERIALS[a.material] || MATERIALS[DEFAULT_MATERIAL];
    var deco = (DECOS[a.deco] || DECOS.emblem);
    var accent = a.accent || '#e5b814';
    var ink = a.ink || '#f2e8c8';
    var matId = 'bkmat_' + sfx;
    var spine = a.spine ? '<rect x="14" y="8" width="7" height="124" fill="#00000066"/>' : '';
    var title = esc((a.title || a.tag || 'TOME')).toUpperCase().slice(0, 22);
    var fontCss = (FONTS[a.font] || FONTS[DEFAULT_FONT]).css;
    var svg = '<svg viewBox="0 0 100 140" class="w-24 h-32 drop-shadow-2xl" role="img" aria-label="' + esc(title) + '">'
      + '<defs><linearGradient id="' + matId + '" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="' + mat.c1 + '"/><stop offset="100%" stop-color="' + mat.c2 + '"/></linearGradient></defs>'
      + COVERS[coverKey].art(matId) + spine + deco(accent)
      + '</svg>';
    return '<div class="art-stage w-full h-40 flex items-center justify-center relative z-10" style="filter:drop-shadow(0 0 20px ' + accent + '55);">'
      + '<span class="rarity-tag" style="color:' + ink + ';border-color:' + accent + ';background:linear-gradient(180deg,rgba(10,6,2,.85),rgba(0,0,0,.55));">' + esc(a.tag || 'TOME') + '</span>'
      + '<div style="position:relative;">' + svg
      + '<div style="position:absolute;left:0;right:0;top:44%;transform:translateY(-50%);text-align:center;padding:0 14%;color:' + ink + ';font-size:9px;line-height:1.15;text-shadow:0 1px 2px #000;' + fontCss + '">' + title + '</div>'
      + '</div></div>';
  }

  /* ---------------- pages (split large info into ordered pages) ---------------- */
  function splitInfo(text, count) {
    text = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    if (!text) return [];
    var n = Math.max(1, Math.min(100000, Math.floor(num(count, 1))));
    var sents = text.split(/(?<=[.!?])\s+/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
    var units, sep;
    if (sents.length >= n) { units = sents; sep = ' '; }
    else { var words = text.split(' '); if (words.length >= n) { units = words; sep = ' '; } else { units = text.split(''); sep = ''; } }
    var m = units.length, groups = Math.min(n, m), out = [];
    for (var g = 0; g < groups; g++) { var a = Math.floor(g * m / groups), b = Math.floor((g + 1) * m / groups); if (b <= a) b = a + 1; out.push(units.slice(a, b).join(sep)); }
    return out;
  }
  function buildPages(cfg) {
    if (!cfg || !cfg.info || !cfg.info.text) return [];
    var key = (cfg.info.count || 0) + '|' + cfg.info.text.length;
    if (cfg._pages && cfg._pagesKey === key) return cfg._pages;
    cfg._pages = splitInfo(cfg.info.text, cfg.info.count);
    cfg._pagesKey = key;
    return cfg._pages;
  }

  /* ---------------- reader modal (per-book, reused) ---------------- */
  function ensureModal() {
    var m = document.getElementById('book-studio-modal'); if (m) return m;
    m = document.createElement('div');
    m.id = 'book-studio-modal';
    m.className = 'hidden fixed inset-0 z-[662] items-center justify-center p-4';
    m.style.cssText += 'background:rgba(4,4,8,0.92);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);';
    m.innerHTML =
      '<div class="panel-lux p-6 md:p-8 border-2 border-amber-600 max-w-2xl w-full relative overflow-hidden shadow-[0_0_60px_rgba(229,184,20,0.35)] max-h-[88vh] flex flex-col" style="background:linear-gradient(160deg,#1a1206,#08060f);">'
      + '<div class="text-amber-300 text-[10px] font-black uppercase tracking-[0.4em] text-center mb-2">\uD83D\uDCD6 ROYAL LIBRARY</div>'
      + '<h2 id="bkm-title" class="cinzel text-xl md:text-2xl text-amber-300 text-center mb-1">BOOK</h2>'
      + '<div id="bkm-author" class="text-[10px] text-center text-gray-400 uppercase tracking-widest mb-1"></div>'
      + '<div id="bkm-prog" class="text-[10px] text-center text-[#e5b814] font-black uppercase tracking-[0.3em] mb-3"></div>'
      + '<div class="text-[12px] md:text-base text-amber-50 leading-relaxed overflow-y-auto scrollbar-hide bg-[#0c0a06] border border-amber-900 p-4 rounded" style="min-height:80px;max-height:40vh;">'
      + '<div class="text-[9px] text-amber-600 uppercase tracking-widest mb-2 font-bold">PAGE</div><p id="bkm-page" style="font-style:italic;"></p></div>'
      + '<div class="flex gap-2 mt-3">'
      + '<button id="bkm-next" class="btn-military py-3 flex-1 text-sm">TURN THE PAGE (NEXT)</button>'
      + '<button id="bkm-arch" class="btn-military py-3 flex-1 text-[11px]">\uD83D\uDCC1 ALL READ PAGES</button>'
      + '</div>'
      + '<div id="bkm-archive" class="mt-3 overflow-y-auto scrollbar-hide" style="display:none;max-height:28vh;"></div>'
      + '<button class="btn-military py-3 w-full text-sm mt-3" onclick="var m=document.getElementById(\'book-studio-modal\');m.classList.remove(\'flex\');m.classList.add(\'hidden\');">CLOSE</button>'
      + '</div>';
    document.body.appendChild(m);
    return m;
  }
  /* ---------------- buy -> owned (inventory) -> equip -> read ---------------- */
  // Buy a book: spend its price (vault gold; the Royal Library is an HQ view), then add it to the
  // player's owned books so it appears in their INVENTORY to equip + read. Free (price 0) = instant.
  function buy(bookId) {
    var s = S(), p = pf(); var it = findBook(bookId); var cfg = STORE[bookId]; if (!it && !cfg) return;
    var name = (it && it.name) || (cfg && cfg.name) || bookId;
    if (owned(bookId)) { notify('ALREADY IN YOUR INVENTORY \u2014 read it there.'); return; }
    var price = Math.max(0, (it && +it.price) || (cfg && +cfg.price) || 0);
    if (price > 0) {
      if ((p.gold || 0) < price) return notify('NOT ENOUGH VAULT GOLD (' + price.toLocaleString() + 'G NEEDED).');
      p.gold = (p.gold || 0) - price;
    }
    if (!p.ownedBooks) p.ownedBooks = [];
    if (p.ownedBooks.indexOf(bookId) < 0) p.ownedBooks.push(bookId);
    // Place it: inventory first (max 5), then bag (upgradeable, base 10), else it rests in the closet.
    var where;
    if (invBooks().length < INV_CAP) { invBooks().push(bookId); where = 'INVENTORY'; }
    else if (bagBooks().length < bagCap()) { bagBooks().push(bookId); where = 'BAG'; }
    else where = 'CLOSET (inventory & bag full)';
    persist();
    try { s.utils.logEvent('[LIBRARY] ' + (p.id || 'GUEST') + ' acquired the book "' + name + '"' + (price ? (' for ' + price.toLocaleString() + 'G') : ' (free)') + ' \u2192 ' + where + '.'); } catch (e) {}
    notify('ACQUIRED: ' + name + ' \u2014 now in your ' + where + '.');
    try { renderLibrary(); } catch (e) {}
    refreshAll();
  }
  function equip(bookId) { var p = pf(); if (!owned(bookId)) return notify('BUY THIS BOOK FIRST.'); p.activeBook = bookId; persist(); notify('EQUIPPED: ' + ((findBook(bookId) || {}).name || (STORE[bookId] && STORE[bookId].name) || bookId)); refreshInv(); }
  function unequip() { var p = pf(); p.activeBook = null; persist(); refreshInv(); }

  // Reveal the NEXT unread page of a book (advances progress, logs an intel recovery, re-readable).
  function readNext(bookId) {
    var s = S(); var p = s && s.state && s.state.profile; var cfg = STORE[bookId]; if (!p || !cfg) return;
    // Reading requires OWNING the book (buy it in the Royal Library first). Admins can always read.
    if (!owned(bookId) && !isAdmin()) { notify('ACQUIRE THIS BOOK FIRST (buy it in the ROYAL LIBRARY).'); try { openLibrary(); } catch (e) {} return; }
    var pages = buildPages(cfg); var total = pages.length; if (!total) { openReader(bookId, -1); return; }
    p.bookProgress = p.bookProgress || {};
    var rec = p.bookProgress[bookId] = p.bookProgress[bookId] || { progress: 0 };
    rec.progress = Math.max(0, rec.progress || 0);
    var idx, isNew = false;
    if (rec.progress >= total) { idx = total - 1; }
    else { idx = rec.progress; rec.progress = idx + 1; isNew = true; }
    var it = findBook(bookId) || { name: cfg.name };
    if (isNew) {
      try { s.storage.lastSavedDataStr = ''; s.ui.updateHeader(); s.storage.save(true); } catch (e) {}
      try { s.utils.logEvent('[INTEL RECOVERY] ' + p.id + ' read ' + (it.name || cfg.name) + ' page ' + (idx + 1) + ' of ' + total + ' (Royal Library).'); } catch (e) {}
    }
    openReader(bookId, idx);
  }
  function openReader(bookId, idx) {
    var s = S(); var p = (s && s.state && s.state.profile) || {}; var cfg = STORE[bookId]; if (!cfg) return;
    var pages = buildPages(cfg); var total = pages.length;
    var it = findBook(bookId) || { name: cfg.name };
    var prog = Math.max(0, Math.min(total, (p.bookProgress && p.bookProgress[bookId] && p.bookProgress[bookId].progress) || 0));
    if (idx < 0) idx = Math.max(0, prog - 1);
    var m = ensureModal();
    m.querySelector('#bkm-title').innerText = String(it.name || cfg.name || 'BOOK').toUpperCase();
    m.querySelector('#bkm-author').innerText = cfg.author ? ('BY ' + String(cfg.author).toUpperCase()) : '';
    m.querySelector('#bkm-prog').innerText = total ? ('PAGE ' + (idx + 1) + ' OF ' + total + '  \u00B7  ' + prog + ' / ' + total + ' READ') : 'NO PAGES';
    m.querySelector('#bkm-page').innerText = pages[idx] || '(this book has no written pages yet)';
    var nextBtn = m.querySelector('#bkm-next');
    nextBtn.style.display = (prog < total) ? 'block' : 'none';
    nextBtn.onclick = function () { readNext(bookId); };
    var arch = m.querySelector('#bkm-archive'), archBtn = m.querySelector('#bkm-arch');
    arch.style.display = 'none'; arch.innerHTML = '';
    archBtn.onclick = function () {
      if (arch.style.display === 'none') {
        var rows = '';
        for (var i = prog - 1; i >= 0; i--) rows += '<div class="px-2 py-2 border-b border-[#2a2410] text-[11px] text-amber-100 leading-snug cursor-pointer hover:bg-[#20180a]" style="font-style:italic;" onclick="BCA_SYS.books.openReader(\'' + esc(bookId) + '\',' + i + ')"><span class="text-amber-500 font-black">p.' + (i + 1) + '</span> ' + esc(pages[i]) + '</div>';
        arch.innerHTML = rows || '<div class="text-gray-500 text-center p-2 text-[10px] uppercase">NO PAGES READ YET.</div>';
        arch.style.display = 'block';
      } else arch.style.display = 'none';
    };
    m.classList.remove('hidden'); m.classList.add('flex');
  }

  /* ---------------- shop.db 'books' category + Royal Library view ---------------- */
  function findBook(id) {
    var s = S(); if (!s || !s.shop || !s.shop.db) return null;
    var arr = s.shop.db.books || []; for (var i = 0; i < arr.length; i++) if (arr[i] && arr[i].id === id) return arr[i];
    return null;
  }
  function apply() {
    var s = S(); if (!s || !s.shop || !s.shop.db) return;
    if (!s.shop.db.books) s.shop.db.books = [];         // BOOKS get their OWN category bucket
    s.shop.legendaryArt = s.shop.legendaryArt || {};
    window.__BCA_bookStudioIds = {};
    Object.keys(STORE).forEach(function (id) {
      var cfg = STORE[id]; if (!cfg) return; window.__BCA_bookStudioIds[id] = 1;
      var ex = findBook(id);
      if (!ex) s.shop.db.books.push({ id: id, name: cfg.name || 'UNTITLED BOOK', author: cfg.author || '', sub: 'Royal Library', tier: cfg.tier || 1, req: 'ROYAL LIBRARY', price: cfg.price || 0, cat: 'books', bookStudio: true });
      else { ex.name = cfg.name || ex.name; ex.author = cfg.author || ex.author; ex.price = (cfg.price != null ? cfg.price : ex.price); }
      if (cfg.art) { (function (bid, artCfg) { s.shop.legendaryArt[bid] = function () { return composeCover(artCfg, bid); }; })(id, cfg.art); }
    });
    if (document.getElementById('rzg-view-library')) renderLibrary();
  }
  function ensureView() {
    if (document.getElementById('rzg-view-library')) return;
    var navView = document.getElementById('rzg-view-nav'); if (!navView || !navView.parentElement) return;
    var d = document.createElement('div'); d.id = 'rzg-view-library'; d.className = 'rzg-view p-3 md:p-6 items-center justify-start pb-10';
    d.innerHTML = '<div class="w-full max-w-3xl mx-auto mt-2"><div class="text-center border-b border-amber-900 pb-3 mb-5">'
      + '<h2 class="cinzel text-2xl md:text-4xl text-amber-300 drop-shadow-[0_0_15px_rgba(229,184,20,0.4)]">ROYAL LIBRARY</h2>'
      + '<p class="text-[9px] md:text-[10px] text-gray-400 uppercase tracking-[0.3em] font-bold mt-1">Read the realm\u2019s tomes \u00B7 information only \u00B7 no buffs</p></div>'
      + '<div id="library-grid" class="grid grid-cols-2 sm:grid-cols-3 gap-3"></div>'
      + '<button onclick="BCA_SYS.rzg.nav(\'nav\')" class="btn-military w-full py-3 mt-5 text-sm">Return to Headquarters</button></div>';
    navView.parentElement.appendChild(d);
  }
  function renderLibrary() {
    var s = S(); var grid = document.getElementById('library-grid'); if (!grid) return;
    var books = (s.shop.db.books || []).slice();
    var p = (s.state && s.state.profile) || {};
    if (!books.length) { grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#777;font-size:12px;padding:16px;">The library is empty. An admin can forge tomes in BOOK STUDIO.</div>'; return; }
    grid.innerHTML = books.map(function (b) {
      var cfg = STORE[b.id]; var art = cfg && cfg.art ? composeCover(cfg.art, b.id) : '<div class="h-40 flex items-center justify-center text-gray-600">\uD83D\uDCD5</div>';
      var pages = cfg ? buildPages(cfg).length : 0;
      var prog = Math.max(0, Math.min(pages, (p.bookProgress && p.bookProgress[b.id] && p.bookProgress[b.id].progress) || 0));
      var owns = owned(b.id); var price = Math.max(0, +b.price || 0);
      var action = owns
        ? '<button onclick="BCA_SYS.books.read(\'' + esc(b.id) + '\')" class="btn-military w-full py-2 text-[11px] mt-2 bg-amber-950 border-amber-600 text-amber-300">READ</button>'
          + '<div class="text-[8px] text-emerald-400 uppercase tracking-widest mt-1">OWNED \u00B7 also in your inventory</div>'
        : '<button onclick="BCA_SYS.books.buy(\'' + esc(b.id) + '\')" class="btn-military w-full py-2 text-[11px] mt-2 bg-emerald-950 border-emerald-600 text-emerald-300">' + (price > 0 ? ('BUY \u2014 ' + price.toLocaleString() + 'G') : 'GET \u2014 FREE') + '</button>';
      return '<div class="panel-lux p-2 flex flex-col items-center text-center border border-[#3a2a05]">' + art
        + '<div class="cinzel text-[13px] text-amber-200 mt-1 leading-tight">' + esc(b.name) + '</div>'
        + (b.author ? '<div class="text-[8px] text-gray-500 uppercase tracking-widest">by ' + esc(b.author) + '</div>' : '')
        + '<div class="text-[8px] text-[#e5b814] uppercase tracking-widest mt-1">' + prog + ' / ' + pages + ' pages read</div>'
        + action + '</div>';
    }).join('');
  }
  function openLibrary() { ensureView(); renderLibrary(); try { S().rzg.nav('library'); } catch (e) {} try { S().utils.logEvent('[LIBRARY] ' + ((S().state.profile || {}).id || 'GUEST') + ' entered the Royal Library.'); } catch (e) {} }

  function wireNavCard() {
    var grid = document.getElementById('rzg-nav'); if (!grid) return setTimeout(wireNavCard, 500);
    if (document.getElementById('rzg-library-nav-card')) return;
    var c = document.createElement('div'); c.id = 'rzg-library-nav-card';
    c.className = 'panel-lux p-4 md:p-6 text-center hover:border-amber-500 transition cursor-pointer group flex flex-col justify-center min-h-[120px]';
    c.onclick = function () { openLibrary(); };
    c.innerHTML = '<h3 class="cinzel text-lg md:text-xl text-amber-400 mb-1 group-hover:text-white transition">ROYAL LIBRARY</h3><p class="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-widest font-bold">Tomes \u00B7 Lore \u00B7 Info</p>';
    grid.appendChild(c);
  }
  function hookNav() {
    var s = S(); if (!s || !s.rzg || !s.rzg.nav || s.rzg.nav._bookStudio) return;
    var orig = s.rzg.nav.bind(s.rzg);
    // library -> render the shop; inv/bag/closet -> (re)append the BOOKS section. openInv/openBag/
    // closet.open call the modules' internal render directly (bypassing the S.carry wrappers), so we
    // also catch the nav here and re-append after a tick.
    s.rzg.nav = function (t) {
      var r = orig.apply(this, arguments);
      if (t === 'library') { ensureView(); renderLibrary(); }
      else if (t === 'inv') { try { appendInvBooks(); } catch (e) {} setTimeout(function () { try { appendInvBooks(); } catch (e) {} }, 60); }
      else if (t === 'bag') { try { appendBagBooks(); } catch (e) {} setTimeout(function () { try { appendBagBooks(); } catch (e) {} }, 60); }
      else if (t === 'closet') { setTimeout(function () { try { appendClosetBooks(); } catch (e) {} }, 60); }
      return r;
    };
    s.rzg.nav._bookStudio = true;
  }

  /* ---------------- INVENTORY / BAG / CLOSET book sections ----------------
     Books are carried like gear: max 5 in inventory, up to the (upgradeable) bag cap in the bag,
     and the rest rest in the closet. Each section offers the moves that make sense for it. */
  function bookRow(id, buttons) {
    var p = pf(); var it = findBook(id) || { name: (STORE[id] && STORE[id].name) || id };
    var cfg = STORE[id]; var pages = cfg ? buildPages(cfg).length : 0;
    var prog = Math.max(0, Math.min(pages, (p.bookProgress && p.bookProgress[id] && p.bookProgress[id].progress) || 0));
    var eq = p.activeBook === id;
    return '<div class="panel-lux p-2 flex items-center justify-between gap-2 border-[#333] mb-2"><div class="min-w-0">'
      + '<div class="text-[11px] text-amber-200 font-bold uppercase tracking-wide truncate">\uD83D\uDCD6 ' + esc(it.name) + (eq ? ' <span class="text-[8px] text-amber-400">(EQUIPPED)</span>' : '') + '</div>'
      + '<div class="text-[8px] text-gray-500 uppercase tracking-widest">' + prog + ' / ' + pages + ' pages read</div></div>'
      + '<div class="flex gap-1 shrink-0 flex-wrap justify-end">' + buttons + '</div></div>';
  }
  function readBtn(id) { return '<button onclick="BCA_SYS.books.read(\'' + esc(id) + '\')" class="btn-military py-1 px-2 text-[9px] bg-amber-950 border-amber-600 text-amber-300">READ</button>'; }
  // INVENTORY (max 5): EQUIP/UNEQUIP + READ + move to BAG / CLOSET.
  function appendInvBooks() {
    var view = document.getElementById('rzg-view-inv'); if (!view) return;
    var inner = view.querySelector('.max-w-2xl'); if (!inner) return;
    var old = document.getElementById('inv-books-section'); if (old && old.parentNode) old.parentNode.removeChild(old);
    var p = pf(); var ids = invBooks().slice(); var rows = '';
    ids.forEach(function (id) {
      var eq = p.activeBook === id;
      var eqBtn = eq
        ? '<button onclick="BCA_SYS.books.unequip()" class="btn-military py-1 px-2 text-[9px] bg-amber-900 border-amber-500 text-white">UNEQUIP</button>'
        : '<button onclick="BCA_SYS.books.equip(\'' + esc(id) + '\')" class="btn-military py-1 px-2 text-[9px] bg-amber-950 border-amber-600 text-amber-200">EQUIP</button>';
      rows += bookRow(id, eqBtn + readBtn(id)
        + '<button onclick="BCA_SYS.books.toBag(\'' + esc(id) + '\')" class="btn-military py-1 px-2 text-[9px] bg-[#1a1a1a] border-[#555] text-gray-300">&rarr; BAG</button>'
        + '<button onclick="BCA_SYS.books.toCloset(\'' + esc(id) + '\')" class="btn-military py-1 px-2 text-[9px] bg-yellow-950 border-[#e5b814] text-[#e5b814]">&rarr; CLOSET</button>');
    });
    if (!rows) rows = '<div class="text-[9px] text-gray-600 uppercase tracking-widest text-center py-3">No books in your inventory \u2014 buy tomes in the ROYAL LIBRARY.</div>';
    var box = document.createElement('div'); box.id = 'inv-books-section'; box.className = 'mb-4';
    box.innerHTML = '<h4 class="cinzel text-sm text-amber-300 mb-2">\uD83D\uDCD6 BOOKS (' + ids.length + '/' + INV_CAP + ')</h4>' + rows;
    var openBag = inner.querySelector('button[onclick*="openBag"]');
    if (openBag) inner.insertBefore(box, openBag); else inner.appendChild(box);
  }
  // BAG (up to the upgradeable cap): move to INVENTORY / CLOSET + READ.
  function appendBagBooks() {
    var view = document.getElementById('rzg-view-bag'); if (!view) return;
    var inner = view.querySelector('.max-w-2xl'); if (!inner) return;
    var old = document.getElementById('bag-books-section'); if (old && old.parentNode) old.parentNode.removeChild(old);
    var ids = bagBooks().slice(); var rows = '';
    ids.forEach(function (id) {
      rows += bookRow(id, '<button onclick="BCA_SYS.books.toInv(\'' + esc(id) + '\')" class="btn-military py-1 px-2 text-[9px] bg-blue-900 border-blue-500 text-white">&rarr; INVENTORY</button>'
        + readBtn(id)
        + '<button onclick="BCA_SYS.books.toCloset(\'' + esc(id) + '\')" class="btn-military py-1 px-2 text-[9px] bg-yellow-950 border-[#e5b814] text-[#e5b814]">&rarr; CLOSET</button>');
    });
    if (!rows) rows = '<div class="text-[9px] text-gray-600 uppercase tracking-widest text-center py-3">No books in your bag.</div>';
    var box = document.createElement('div'); box.id = 'bag-books-section'; box.className = 'mb-4';
    box.innerHTML = '<h4 class="cinzel text-sm text-amber-300 mb-2">\uD83D\uDCD6 BOOKS (' + ids.length + '/' + bagCap() + ')</h4>' + rows;
    var upBtn = inner.querySelector('button[onclick*="bags.open"]');
    if (upBtn) inner.insertBefore(box, upBtn); else inner.appendChild(box);
  }
  // CLOSET (owned books not carried): move to INVENTORY / BAG + READ.
  function appendClosetBooks() {
    var view = document.getElementById('rzg-view-closet'); if (!view) return;
    var inner = view.querySelector('div'); if (!inner) return;
    var old = document.getElementById('closet-books-section'); if (old && old.parentNode) old.parentNode.removeChild(old);
    var ids = closetBooks(); var rows = '';
    ids.forEach(function (id) {
      rows += bookRow(id, '<button onclick="BCA_SYS.books.toInv(\'' + esc(id) + '\')" class="btn-military py-1 px-2 text-[9px] bg-blue-900 border-blue-500 text-white">EQUIP &rarr; INVENTORY</button>'
        + '<button onclick="BCA_SYS.books.toBag(\'' + esc(id) + '\')" class="btn-military py-1 px-2 text-[9px] bg-[#1a1a1a] border-[#555] text-gray-300">&rarr; BAG</button>'
        + readBtn(id));
    });
    var box = document.createElement('div'); box.id = 'closet-books-section'; box.className = 'mb-4';
    box.innerHTML = '<div class="text-center border-t border-[#333] pt-4 mt-5 mb-3"><h3 class="cinzel text-xl text-[#e5b814]">\uD83D\uDCD6 STORED BOOKS (' + ids.length + ')</h3></div>'
      + (rows || '<div class="text-[9px] text-gray-600 uppercase tracking-widest text-center py-3">No books stored in your closet.</div>');
    var ret = inner.querySelector('button[onclick*="nav(\'nav\')"]') || inner.querySelector('button[onclick*="rzg.nav"]');
    if (ret) inner.insertBefore(box, ret); else inner.appendChild(box);
  }
  function hookInventory() {
    var s = S(); if (!s || !s.carry) return;
    if (s.carry.renderInv && !s.carry.renderInv._bookStudio) { var oi = s.carry.renderInv.bind(s.carry); s.carry.renderInv = function () { var r = oi.apply(this, arguments); try { appendInvBooks(); } catch (e) {} return r; }; s.carry.renderInv._bookStudio = true; }
    if (s.carry.renderBag && !s.carry.renderBag._bookStudio) { var ob = s.carry.renderBag.bind(s.carry); s.carry.renderBag = function () { var r = ob.apply(this, arguments); try { appendBagBooks(); } catch (e) {} return r; }; s.carry.renderBag._bookStudio = true; }
  }

  /* ---------------- INTEL FILES archive section (ROYAL LIBRARY files) ---------------- */
  function renderLibraryArchive() {
    var s = S(); var list = document.getElementById('intel-file-list'); if (!list) return;
    var p = (s && s.state && s.state.profile) || {};
    var old = document.getElementById('library-files-archive'); if (old && old.parentNode) old.parentNode.removeChild(old);
    var books = [];
    Object.keys(STORE).forEach(function (id) {
      var cfg = STORE[id]; if (!cfg) return; var pages = buildPages(cfg); if (!pages.length) return;
      var prog = Math.max(0, Math.min(pages.length, (p.bookProgress && p.bookProgress[id] && p.bookProgress[id].progress) || 0));
      var it = findBook(id); books.push({ id: id, name: (it && it.name) || cfg.name || id, pages: pages, prog: prog });
    });
    if (!books.length) return;
    if (!books.some(function (b) { return b.prog > 0; })) return;
    var box = document.createElement('div');
    box.id = 'library-files-archive'; box.className = 'panel-lux p-4 mb-4 border-2 border-amber-700'; box.style.cssText = 'background:linear-gradient(160deg,#1a1206,#0a0714);';
    var sections = '';
    books.forEach(function (b) {
      if (!b.prog) return; var rows = '';
      for (var i = b.prog - 1; i >= 0; i--) rows += '<div class="flex items-start gap-2 px-2 py-2 border-b border-[#2a2410] cursor-pointer hover:bg-[#20180a]" onclick="BCA_SYS.books.openReader(\'' + esc(b.id) + '\',' + i + ')"><span class="text-amber-400 font-black text-[10px] w-12 shrink-0">p.' + (i + 1) + '</span><span class="text-amber-100 text-[11px] leading-snug" style="font-style:italic;">' + esc(b.pages[i]) + '</span></div>';
      sections += '<div class="mt-3"><div class="text-[11px] text-amber-300 font-black uppercase tracking-widest border-b border-[#3a2a05] pb-1">' + esc(b.name) + ' <span class="text-[#e5b814]">' + b.prog + ' / ' + b.pages.length + '</span></div><div class="max-h-[240px] overflow-y-auto scrollbar-hide">' + rows + '</div></div>';
    });
    box.innerHTML = '<div class="cinzel text-lg text-amber-300 text-center">\uD83D\uDCDA ROYAL LIBRARY PAGES</div><div class="text-[10px] text-center text-[#e5b814] font-black uppercase tracking-[0.3em] mt-1">Pages read from library tomes \u00B7 re-readable</div>' + sections;
    list.parentNode.insertBefore(box, list);
  }
  function hookArchive() {
    var s = S(); if (!s || !s.food || !s.food.openArchive || s.food.openArchive._bookStudioArch) return;
    var orig = s.food.openArchive.bind(s.food);
    s.food.openArchive = function () { var r = orig.apply(this, arguments); try { renderLibraryArchive(); } catch (e) {} return r; };
    s.food.openArchive._bookStudioArch = true;
  }

  /* ---------------- persistence ---------------- */
  function stripRuntime(cfg) { var c = JSON.parse(JSON.stringify(cfg)); delete c._pages; delete c._pagesKey; return c; }
  function saveLocal() { try { var out = {}; Object.keys(STORE).forEach(function (k) { out[k] = stripRuntime(STORE[k]); }); localStorage.setItem(LS_KEY, JSON.stringify(out)); } catch (e) {} }
  function loadLocal() { try { var raw = localStorage.getItem(LS_KEY); if (raw) { var o = JSON.parse(raw); if (o && typeof o === 'object') STORE = o; } } catch (e) {} }
  function pushCloud(id) { var c = cloud(); if (!c) return; try { var d = {}; d[id] = STORE[id] ? stripRuntime(STORE[id]) : null; c.FS.setDoc(c.FS.doc(c.DB, 'bca_system', CLOUD_DOC), { books: d }, { merge: true }); } catch (e) {} }
  function wireCloud() {
    var c = cloud(); if (cloudWired || !c) return; cloudWired = true;
    try {
      c.FS.onSnapshot(c.FS.doc(c.DB, 'bca_system', CLOUD_DOC), function (snap) {
        var data = (snap && snap.exists && snap.exists()) ? snap.data() : (snap && snap.data ? snap.data() : null);
        var books = (data && data.books) ? data.books : {}; var next = {};
        Object.keys(books).forEach(function (k) { if (books[k]) next[k] = books[k]; });
        STORE = next; saveLocal(); try { apply(); } catch (e) {}
        try { if (document.getElementById('book-studio-panel')) refreshBookList(); } catch (e) {}
      });
    } catch (e) {}
  }
  function saveConfig(cfg) {
    if (!cfg || !cfg.id) return;
    cfg.savedAt = Date.now(); STORE[cfg.id] = cfg; delete cfg._pages; delete cfg._pagesKey;
    saveLocal(); try { apply(); } catch (e) {} pushCloud(cfg.id);
  }
  function removeConfig(id) {
    if (!id || !STORE[id]) return; delete STORE[id]; saveLocal();
    try { var s = S(); if (s.shop && s.shop.db && s.shop.db.books) s.shop.db.books = s.shop.db.books.filter(function (b) { return b && b.id !== id; }); } catch (e) {}
    try { var s2 = S(); if (s2.shop && s2.shop.legendaryArt) delete s2.shop.legendaryArt[id]; } catch (e) {}
    try { renderLibrary(); } catch (e) {} pushCloud(id);
  }

  /* ---------------- ADMIN UI (BOOK STUDIO) ---------------- */
  function status(m) { var el = document.getElementById('bk-status'); if (el) el.textContent = m || ''; }
  var _prevSeq = 0;
  function readForm() {
    var mode = val('bk-mode');
    var id, name;
    if (mode === 'new') { name = (val('bk-new-name') || '').trim() || 'UNTITLED BOOK'; id = 'book_bk_' + slug(name) + '_' + Date.now().toString(36); }
    else { id = val('bk-existing'); var it = findBook(id); name = it ? it.name : id; }
    if (!id) return null;
    var cfg = (STORE[id] ? JSON.parse(JSON.stringify(STORE[id])) : {});
    cfg.id = id; cfg.name = (mode === 'new') ? name : (val('bk-new-name') || name); cfg.cat = 'books';
    cfg.author = (val('bk-author') || '').trim();
    if (mode === 'new') { cfg.price = Math.max(0, Math.round(num(val('bk-new-price'), 0))); cfg.tier = 1; }
    cfg.art = {
      cover: val('bk-cover') || DEFAULT_COVER, material: val('bk-material') || DEFAULT_MATERIAL, deco: val('bk-deco') || 'emblem',
      font: val('bk-font') || DEFAULT_FONT, ink: val('bk-ink') || '#f2e8c8', accent: val('bk-accent') || '#e5b814',
      spine: true, tag: (val('bk-tag') || 'TOME').toUpperCase(), title: cfg.name
    };
    cfg.info = { text: val('bk-info-text') || '', count: Math.max(1, Math.round(num(val('bk-info-count'), 20))) };
    return cfg;
  }
  function updatePreview() { var el = document.getElementById('bk-preview'); if (!el) return; var cfg = readForm(); if (!cfg) { el.innerHTML = ''; return; } el.innerHTML = composeCover(cfg.art, 'prev' + (++_prevSeq)); }
  function refreshBookList() {
    var s = S(); var sel = document.getElementById('bk-existing'); if (!sel || !s || !s.shop || !s.shop.db) return;
    var books = s.shop.db.books || []; var q = (val('bk-existing-search') || '').trim().toUpperCase(); var prev = sel.value;
    sel.innerHTML = books.filter(function (b) { return b && b.id && (!q || String(b.name || '').toUpperCase().indexOf(q) >= 0); }).map(function (b) { return '<option value="' + esc(b.id) + '">' + esc(b.name) + '</option>'; }).join('');
    if (prev && Array.prototype.some.call(sel.options, function (o) { return o.value === prev; })) sel.value = prev;
  }
  function loadConfigIntoForm(id) {
    var cfg = STORE[id]; var art = (cfg && cfg.art) || defaultArt();
    setVal('bk-new-name', (cfg && cfg.name) || ''); setVal('bk-author', (cfg && cfg.author) || '');
    setVal('bk-cover', art.cover || DEFAULT_COVER); setVal('bk-material', art.material || DEFAULT_MATERIAL); setVal('bk-deco', art.deco || 'emblem');
    setVal('bk-font', art.font || DEFAULT_FONT); setVal('bk-ink', art.ink || '#f2e8c8'); setVal('bk-accent', art.accent || '#e5b814'); setVal('bk-tag', art.tag || 'TOME');
    setVal('bk-info-text', (cfg && cfg.info && cfg.info.text) || ''); setVal('bk-info-count', (cfg && cfg.info && cfg.info.count) || 20);
    updatePreview();
  }
  function toggleMode() {
    var mode = val('bk-mode'); var ex = document.getElementById('bk-existing-wrap');
    if (ex) ex.style.display = (mode === 'new') ? 'none' : 'block';
    if (mode !== 'new') { var id = val('bk-existing'); if (id) loadConfigIntoForm(id); else updatePreview(); } else updatePreview();
  }
  function doSave() { if (!isAdmin()) return status('ADMIN ONLY.'); var cfg = readForm(); if (!cfg) return status('NAME A BOOK FIRST.'); saveConfig(cfg); status('SAVED & SHELVED: ' + cfg.name + (cloud() ? ' (SYNCED)' : ' (LOCAL ONLY)')); setVal('bk-mode', 'existing'); toggleMode(); refreshBookList(); var sel = document.getElementById('bk-existing'); if (sel) { sel.value = cfg.id; loadConfigIntoForm(cfg.id); } }
  function doDelete() { if (!isAdmin()) return status('ADMIN ONLY.'); var id = val('bk-existing'); if (val('bk-mode') === 'new' || !id) return status('SELECT AN EXISTING BOOK.'); removeConfig(id); status('BOOK REMOVED: ' + id); refreshBookList(); }
  function injectUI() {
    if (!isAdmin()) return;
    var menu = document.getElementById('admin-mini-menu'); if (!menu || document.getElementById('book-studio-panel')) return;
    var hd = 'text-[9px] text-[#e5b814] font-black uppercase tracking-widest text-center border-b border-[#333] pb-1 mt-2';
    var lb = 'text-[8px] text-gray-400 uppercase';
    var inp = 'bg-[#111] text-white text-[10px] p-1 border border-[#333] outline-none w-full';
    function opts(o) { return o.map(function (x) { return '<option value="' + x[0] + '">' + esc(x[1]) + '</option>'; }).join(''); }
    var coverOpts = Object.keys(COVERS).map(function (k) { return '<option value="' + k + '">' + esc(COVERS[k].name) + '</option>'; }).join('');
    var matOpts = Object.keys(MATERIALS).map(function (k) { return '<option value="' + k + '">' + esc(MATERIALS[k].name) + '</option>'; }).join('');
    var fontOpts = Object.keys(FONTS).map(function (k) { return '<option value="' + k + '">' + esc(FONTS[k].name) + '</option>'; }).join('');
    var decoOpts = opts([['emblem', 'Star Emblem'], ['foilcorners', 'Foil Corners'], ['clasp', 'Clasp'], ['gem', 'Gem'], ['runes', 'Runes'], ['banner', 'Banner'], ['skull', 'Skull'], ['sun', 'Sun'], ['none', 'None']]);
    var box = document.createElement('div');
    box.id = 'book-studio-panel'; box.className = 'flex flex-col gap-1';
    box.innerHTML =
        '<div class="' + hd + '">\uD83D\uDCD6 BOOK STUDIO (ROYAL LIBRARY)</div>'
      + '<label class="' + lb + '">Target</label>'
      + '<select id="bk-mode" class="' + inp + '"><option value="existing">EDIT EXISTING BOOK</option><option value="new">CREATE NEW BOOK</option></select>'
      + '<div id="bk-existing-wrap"><input id="bk-existing-search" class="' + inp + '" placeholder="FILTER BOOKS..."><select id="bk-existing" class="' + inp + '"></select></div>'
      + '<label class="' + lb + '">Title</label><input id="bk-new-name" class="' + inp + '" placeholder="e.g. THE VOID CHRONICLES">'
      + '<label class="' + lb + '">Author</label><input id="bk-author" class="' + inp + '" placeholder="e.g. ARCHIVIST OF RZG">'
      + '<label class="' + lb + '">Price (gold, 0 = free to read)</label><input id="bk-new-price" type="number" class="' + inp + '" placeholder="0">'
      + '<div id="bk-preview" class="my-1 flex justify-center"></div>'
      + '<div class="' + hd + '">\uD83C\uDFA8 DESIGN (near-endless combos)</div>'
      + '<label class="' + lb + '">Cover design</label><select id="bk-cover" class="' + inp + '">' + coverOpts + '</select>'
      + '<label class="' + lb + '">Cover material / colour</label><select id="bk-material" class="' + inp + '">' + matOpts + '</select>'
      + '<label class="' + lb + '">Decoration</label><select id="bk-deco" class="' + inp + '">' + decoOpts + '</select>'
      + '<label class="' + lb + '">Title font style</label><select id="bk-font" class="' + inp + '">' + fontOpts + '</select>'
      + '<div class="flex gap-1"><div class="flex-1"><label class="' + lb + '">Accent</label><input id="bk-accent" type="color" value="#e5b814" class="' + inp + ' h-7 p-0"></div><div class="flex-1"><label class="' + lb + '">Title ink</label><input id="bk-ink" type="color" value="#f2e8c8" class="' + inp + ' h-7 p-0"></div></div>'
      + '<label class="' + lb + '">Rarity tag</label><input id="bk-tag" class="' + inp + '" placeholder="TOME">'
      + '<div class="' + hd + '">\uD83D\uDCDA INFO / PAGES (no buffs \u2014 information only)</div>'
      + '<label class="' + lb + '">Paste the book\u2019s text (split into pages, 1 revealed per read)</label>'
      + '<textarea id="bk-info-text" rows="4" class="' + inp + '" placeholder="Paste the full contents of the book here..."></textarea>'
      + '<label class="' + lb + '">TOTAL pages</label><input id="bk-info-count" type="number" class="' + inp + '" placeholder="20" value="20">'
      + '<button id="bk-save" class="w-full bg-amber-950 border border-amber-600 text-amber-300 font-bold text-[11px] py-2 uppercase tracking-wider mt-1">SAVE BOOK (SHELVE)</button>'
      + '<button id="bk-delete" class="w-full bg-red-950 border border-red-800 text-red-400 font-bold text-[9px] py-1 uppercase tracking-wider">REMOVE BOOK</button>'
      + '<div id="bk-status" class="text-[8px] text-emerald-400 uppercase break-words"></div>';
    if (menu.firstChild) menu.insertBefore(box, menu.firstChild); else menu.appendChild(box);
    document.getElementById('bk-mode').onchange = toggleMode;
    document.getElementById('bk-existing-search').oninput = refreshBookList;
    document.getElementById('bk-existing').onchange = function () { var id = val('bk-existing'); if (id) loadConfigIntoForm(id); else updatePreview(); };
    ['bk-new-name', 'bk-cover', 'bk-material', 'bk-deco', 'bk-font', 'bk-ink', 'bk-accent', 'bk-tag'].forEach(function (id) { var el = document.getElementById(id); if (el) { el.oninput = updatePreview; el.onchange = updatePreview; } });
    document.getElementById('bk-save').onclick = doSave;
    document.getElementById('bk-delete').onclick = doDelete;
    refreshBookList(); toggleMode(); updatePreview();
  }

  /* ---------------- boot + self-heal ---------------- */
  function install() {
    var s = S(); if (!s || !s.shop || !s.rzg) return false;
    try { apply(); } catch (e) {}
    try { hookNav(); } catch (e) {}
    try { hookInventory(); } catch (e) {}
    try { hookArchive(); } catch (e) {}
    try { wireNavCard(); } catch (e) {}
    wireCloud();
    // keep books re-injected after shop rebuilds
    if (s.shop.generateDB && !s.shop.generateDB._bookStudio) {
      var orig = s.shop.generateDB.bind(s.shop);
      s.shop.generateDB = function () { var r = orig.apply(this, arguments); try { apply(); } catch (e) {} return r; };
      s.shop.generateDB._bookStudio = true;
    }
    if (s.adminBoost && s.adminBoost.toggleMenu && !s.adminBoost.toggleMenu._bookStudio) {
      var ot = s.adminBoost.toggleMenu.bind(s.adminBoost);
      s.adminBoost.toggleMenu = function () { var r = ot.apply(this, arguments); setTimeout(injectUI, 70); return r; };
      s.adminBoost.toggleMenu._bookStudio = true;
    }
    if (!s.books) {
      s.books = {
        open: openLibrary, read: readNext, openReader: openReader, composeCover: composeCover,
        buy: buy, equip: equip, unequip: unequip, owned: owned, appendInvBooks: appendInvBooks,
        toBag: toBag, toInv: toInv, toCloset: toCloset, appendBagBooks: appendBagBooks, appendClosetBooks: appendClosetBooks,
        invBooks: function () { return invBooks().slice(); }, bagBooks: function () { return bagBooks().slice(); }, closetBooks: closetBooks, caps: function () { return { inv: INV_CAP, bag: bagCap() }; },
        covers: function () { return Object.keys(COVERS); }, fonts: function () { return Object.keys(FONTS); },
        materials: function () { return Object.keys(MATERIALS); }, decos: function () { return Object.keys(DECOS); },
        store: function () { return STORE; }, save: saveConfig, remove: removeConfig, buildPages: buildPages,
        splitInfo: splitInfo, renderLibraryArchive: renderLibraryArchive
      };
    }
    return true;
  }
  function boot() {
    loadLocal();
    var s = S();
    if (!s || !s.shop || !s.rzg || !s.state) return setTimeout(boot, 400);
    install();
    [800, 2000, 4000, 8000].forEach(function (t) { setTimeout(function () { try { install(); injectUI(); } catch (e) {} }, t); });
    try { console.log('[BOOK STUDIO] ready -', Object.keys(COVERS).length, 'covers x', Object.keys(FONTS).length, 'fonts x', Object.keys(MATERIALS).length, 'materials x', Object.keys(DECOS).length, 'decorations'); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
