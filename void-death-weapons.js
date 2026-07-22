/* =====================================================================
   VOID DEATH WEAPONS
   Four brand-new, one-of-a-kind VOID weapons with completely new hand-built
   animated SVG art (no reuse of any existing weapon art) and fully EDITABLE
   X-spam abilities. Every ability knob (point values, momentum window, memory
   cycle, required press count, pressure-stack limit, collapse reward, etc.)
   lives in the weapon's `buffData`, so an admin can retune it live from the
   website Shop Item Editor (the ADVANCED buff-data JSON, or the dedicated
   VOID ability fields). Loaded as a sibling module (like royal-town-armors.js).

   Combat engine: BCA_SYS.combat.voidBonus (in index.html) reads these buffData
   types (void_momentum / void_memory / void_nth / void_pressure).
   ===================================================================== */
(function () {
  function boot() {
    var BCA = window.BCA_SYS;
    if (!BCA || !BCA.shop || !BCA.shop.db || !BCA.shop.db.weapons) return setTimeout(boot, 400);
    var S = BCA.shop;
    if (S._voidDeathWeapons) return; S._voidDeathWeapons = true;

    // ---- shared art-stage wrapper (same shape the shop grid + equipped avatar expect) ----
    function wrap(inner, glow) {
      return '<div class="art-stage rarity-mythic w-full h-32 flex items-center justify-center relative z-10" style="filter:drop-shadow(0 0 26px ' + glow + ')">'
        + '<span class="art-corner art-tl"></span><span class="art-corner art-tr"></span><span class="art-corner art-bl"></span><span class="art-corner art-br"></span>'
        + '<span class="rarity-tag" style="border-color:' + glow + ';color:#f5f3ff;text-shadow:0 0 8px ' + glow + ';">VOID DEATH</span>'
        + '<svg viewBox="0 0 100 100" class="w-28 h-28 art-float drop-shadow-2xl">' + inner + '</svg></div>';
    }
    function rot(cx, cy, dur, inner, dir) {
      return '<g>' + inner + '<animateTransform attributeName="transform" type="rotate" from="' + (dir < 0 ? 360 : 0) + ' ' + cx + ' ' + cy + '" to="' + (dir < 0 ? 0 : 360) + ' ' + cx + ' ' + cy + '" dur="' + dur + 's" repeatCount="indefinite"/></g>';
    }
    function pulse(inner, dur, lo, hi) {
      return '<g>' + inner + '<animate attributeName="opacity" values="' + lo + ';' + hi + ';' + lo + '" dur="' + (dur || 2) + 's" repeatCount="indefinite"/></g>';
    }

    // ---------- 1) GRAVEMAW NULLBLADE — void execution sword ----------
    function artGravemaw() {
      var teeth = ''; for (var i = 0; i < 6; i++) { var y = 30 + i * 6; teeth += '<path d="M48,' + y + ' L50,' + (y - 2) + ' L52,' + y + ' L50,' + (y + 2) + ' Z" fill="#c4b5fd"/>'; }
      return '<defs>'
        + '<linearGradient id="gmw_b" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1a1030"/><stop offset="55%" stop-color="#05030c"/><stop offset="100%" stop-color="#000"/></linearGradient>'
        + '<radialGradient id="gmw_au" cx="50%" cy="45%" r="55%"><stop offset="0%" stop-color="#a855f7" stop-opacity=".5"/><stop offset="100%" stop-color="transparent"/></radialGradient>'
        + '<linearGradient id="gmw_v" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e9d5ff"/><stop offset="100%" stop-color="#6d28d9"/></linearGradient></defs>'
        + '<circle cx="50" cy="46" r="46" fill="url(#gmw_au)"><animate attributeName="opacity" values=".55;1;.55" dur="2.4s" repeatCount="indefinite"/></circle>'
        // predatory curved blade (jaw-like outer edge) + tri-point tip
        + '<path d="M50,6 C40,20 44,44 40,64 L50,72 L60,64 C56,44 60,20 50,6 Z" fill="url(#gmw_b)" stroke="#7c3aed" stroke-width="1.2"/>'
        + '<path d="M50,6 L46,12 M50,6 L54,12 M50,6 L50,13" stroke="#c4b5fd" stroke-width="1" fill="none"/>'
        // bone ridges along the outer jaw edge
        + '<g stroke="#3b0764" stroke-width="0.7" opacity="0.85">' + (function () { var s = ''; for (var j = 0; j < 8; j++) { var yy = 16 + j * 6; s += '<path d="M41,' + yy + ' l-3,-2 M59,' + yy + ' l3,-2"/>'; } return s; })() + '</g>'
        // moving silver-black veins (animated drift)
        + '<path d="M50,10 C47,26 53,40 49,62" stroke="url(#gmw_v)" stroke-width="1.1" fill="none" opacity="0.9"><animate attributeName="d" values="M50,10 C47,26 53,40 49,62;M50,10 C53,26 47,40 51,62;M50,10 C47,26 53,40 49,62" dur="1.6s" repeatCount="indefinite"/></path>'
        // hollow channel with rotating void teeth
        + rot(50, 44, 3.2, '<rect x="47" y="26" width="6" height="36" rx="3" fill="#000" stroke="#4c1d95" stroke-width="0.6"/>' + teeth, 1)
        // skeletal-wing guard w/ six claws
        + '<g fill="none" stroke="#a78bfa" stroke-width="1.3"><path d="M50,66 C34,60 22,64 14,74 M50,66 C40,66 30,70 24,78 M50,66 C42,70 36,76 34,82"/><path d="M50,66 C66,60 78,64 86,74 M50,66 C60,66 70,70 76,78 M50,66 C58,70 64,76 66,82"/></g>'
        + pulse('<g fill="#1a1030"><circle cx="20" cy="74" r="1.6"/><circle cx="80" cy="74" r="1.6"/></g>', 1.2, 0.4, 1)
        // bone-cord grip w/ counter-rotating rings
        + '<rect x="47" y="66" width="6" height="18" rx="2" fill="#2a1a4a" stroke="#111" stroke-width="0.5"/>'
        + rot(50, 71, 4, '<circle cx="50" cy="71" r="3.4" fill="none" stroke="#7c3aed" stroke-width="0.8"/>', 1) + rot(50, 78, 4, '<circle cx="50" cy="78" r="3.4" fill="none" stroke="#7c3aed" stroke-width="0.8"/>', -1)
        // floating jawless skull pommel, collapsing black star in each socket
        + '<path d="M44,86 Q50,82 56,86 Q57,92 50,94 Q43,92 44,86 Z" fill="#0d0820" stroke="#a78bfa" stroke-width="0.8"/>'
        + '<circle cx="47" cy="88" r="1.5" fill="#000"/><circle cx="53" cy="88" r="1.5" fill="#000"/>'
        + pulse('<circle cx="47" cy="88" r="1.5" fill="#a855f7"/><circle cx="53" cy="88" r="1.5" fill="#a855f7"/>', 1, 0.2, 0.9);
    }

    // ---------- 2) ECLIPSE WIDOW SOULSPLITTER — void ceremonial sword ----------
    function artEclipseWidow() {
      var halo = ''; for (var i = 0; i < 14; i++) { var a = (i / 14) * Math.PI * 2; var x = 50 + Math.cos(a) * 12, y = 66 + Math.sin(a) * 12; halo += '<g><rect x="' + (x - 1.2) + '" y="' + (y - 1.2) + '" width="2.4" height="2.4" fill="#1a1030" stroke="#c4b5fd" stroke-width="0.4"/><circle cx="' + x + '" cy="' + y + '" r="0.7" fill="#fff"/><line x1="' + x + '" y1="' + y + '" x2="' + (50 + Math.cos(a) * 16) + '" y2="' + (66 + Math.sin(a) * 16) + '" stroke="#8b5cf6" stroke-width="0.5"/></g>'; }
      var stars = ''; for (var s = 0; s < 12; s++) { var sx = 46 + (s * 7) % 9, sy = 12 + (s * 5) % 44; stars += '<circle cx="' + sx + '" cy="' + sy + '" r="0.5" fill="#fff"><animate attributeName="cy" values="' + sy + ';60" dur="' + (3 + s % 3) + 's" repeatCount="indefinite"/><animate attributeName="opacity" values="0.9;0" dur="' + (3 + s % 3) + 's" repeatCount="indefinite"/></circle>'; }
      return '<defs>'
        + '<linearGradient id="ew_b" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0a0618" stop-opacity="0.6"/><stop offset="100%" stop-color="#1e1b4b" stop-opacity="0.85"/></linearGradient>'
        + '<radialGradient id="ew_au" cx="50%" cy="55%" r="55%"><stop offset="0%" stop-color="#c4b5fd" stop-opacity=".45"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs>'
        + '<circle cx="50" cy="52" r="46" fill="url(#ew_au)"><animate attributeName="opacity" values=".5;.95;.5" dur="3s" repeatCount="indefinite"/></circle>'
        + stars
        // outer transparent crystal blade + 5-fin crystal crown at the tip
        + '<path d="M50,4 L46,16 L47,50 L53,50 L54,16 Z" fill="url(#ew_b)" stroke="#c4b5fd" stroke-width="1"/>'
        + '<g stroke="#e6ddff" stroke-width="0.9" fill="none"><path d="M50,4 L42,16 M50,4 L46,14 M50,4 L50,12 M50,4 L54,14 M50,4 L58,16"/></g>'
        // inner floating blade (offset, lags — expressed as a delayed drift)
        + '<path d="M50,10 L48,18 L49,48 L51,48 L52,18 Z" fill="#8b5cf6" opacity="0.55"><animateTransform attributeName="transform" type="translate" values="0 0;1.5 1;0 0" dur="1.4s" repeatCount="indefinite"/></path>'
        // thin edge "absence of light"
        + '<line x1="46" y1="16" x2="47" y2="50" stroke="#000" stroke-width="0.8"/><line x1="54" y1="16" x2="53" y2="50" stroke="#000" stroke-width="0.8"/>'
        // silver rearranging symbols
        + pulse('<g fill="#e6ddff" font-size="3" font-family="serif"><text x="43" y="26">\u2720</text><text x="55" y="34">\u2059</text><text x="43" y="42">\u16DF</text></g>', 1.8, 0.4, 0.95)
        // mini eclipse near the guard
        + '<circle cx="50" cy="54" r="4" fill="#000"/><circle cx="52" cy="52" r="4" fill="none" stroke="#e6ddff" stroke-width="0.9"/>'
        // rotating 14-segment halo guard
        + rot(50, 66, 12, halo, 1)
        // crystal-plate handle + floating black rose pommel (petals)
        + '<rect x="48" y="72" width="4" height="14" rx="1.5" fill="#2a2450" stroke="#c4b5fd" stroke-width="0.4"/>'
        + rot(50, 90, 8, '<g fill="#0d0820" stroke="#8b5cf6" stroke-width="0.5">' + (function () { var r = ''; for (var q = 0; q < 5; q++) { var aa = (q / 5) * Math.PI * 2; r += '<ellipse cx="' + (50 + Math.cos(aa) * 2.4) + '" cy="' + (90 + Math.sin(aa) * 2.4) + '" rx="2.2" ry="1.1" transform="rotate(' + (aa * 57) + ' ' + (50 + Math.cos(aa) * 2.4) + ' ' + (90 + Math.sin(aa) * 2.4) + ')"/>'; } return r; })() + '<circle cx="50" cy="90" r="1.4" fill="#c4b5fd"/></g>', 1);
    }

    // ---------- 3) ABYSSAL REQUIEM WORLDSPIKE — void funeral spear ----------
    function artWorldspike() {
      var sectC = ['#3b2a06', '#0a0a0a', '#111', '#0d1b2a', '#1a1420', '#0b1e3a', '#04121f'];
      var sections = ''; for (var i = 0; i < 7; i++) { var y = 40 + i * 6.2; sections += '<rect x="47.5" y="' + y + '" width="5" height="5.6" rx="0.6" fill="' + sectC[i] + '" stroke="#1e3a8a" stroke-width="0.4"/>'; }
      var orbit = ''; for (var s = 0; s < 5; s++) { var a = (s / 5) * Math.PI * 2; orbit += '<rect x="' + (50 + Math.cos(a) * 9 - 0.8) + '" y="' + (26 + Math.sin(a) * 9 - 0.8) + '" width="1.6" height="1.6" fill="#93c5fd"/>'; }
      return '<defs>'
        + '<radialGradient id="ws_au" cx="50%" cy="30%" r="55%"><stop offset="0%" stop-color="#38bdf8" stop-opacity=".5"/><stop offset="100%" stop-color="transparent"/></radialGradient>'
        + '<radialGradient id="ws_orb" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#000"/><stop offset="70%" stop-color="#0b1e3a"/><stop offset="100%" stop-color="#1e3a8a"/></radialGradient></defs>'
        + '<circle cx="50" cy="28" r="44" fill="url(#ws_au)"><animate attributeName="opacity" values=".5;1;.5" dur="2.6s" repeatCount="indefinite"/></circle>'
        // constellation line travelling up the staff
        + '<line x1="50" y1="86" x2="50" y2="40" stroke="#38bdf8" stroke-width="0.5" stroke-dasharray="2 4" opacity="0.7"><animate attributeName="stroke-dashoffset" values="20;0" dur="1.2s" repeatCount="indefinite"/></line>'
        // 3D void-compass spearhead: front needle, back hook, two side crescents
        + '<path d="M50,4 L53,24 L50,30 L47,24 Z" fill="#0d1b2a" stroke="#93c5fd" stroke-width="1"/>'
        + '<path d="M50,30 q8,4 6,12" fill="none" stroke="#60a5fa" stroke-width="1.4"/>'
        + '<path d="M36,22 q-4,6 2,12 M64,22 q4,6 -2,12" fill="none" stroke="#3b82f6" stroke-width="1.4"/>'
        // central black orb + rings rotating at different angles + orbiting shards
        + '<circle cx="50" cy="26" r="5" fill="url(#ws_orb)"/>'
        + rot(50, 26, 5, '<ellipse cx="50" cy="26" rx="9" ry="3.4" fill="none" stroke="#60a5fa" stroke-width="0.7"/>', 1)
        + rot(50, 26, 7, '<ellipse cx="50" cy="26" rx="3.4" ry="9" fill="none" stroke="#93c5fd" stroke-width="0.7"/>', -1)
        + rot(50, 26, 9, orbit, 1)
        // 7 staff sections (each a different material), slight counter-rotation feel
        + sections
        // funeral-bell counterweight + hanging masks (closed eyes)
        + '<path d="M44,86 Q44,80 50,80 Q56,80 56,86 L58,90 L42,90 Z" fill="#0b1e3a" stroke="#93c5fd" stroke-width="0.7"/>'
        + '<circle cx="50" cy="90.5" r="1" fill="#38bdf8"/>'
        + '<g stroke="#1e3a8a" stroke-width="0.5"><path d="M45,90 l-2,5 M55,90 l2,5"/></g>'
        + '<g fill="#0d1b2a" stroke="#60a5fa" stroke-width="0.3"><ellipse cx="43" cy="96" rx="1.6" ry="2"/><ellipse cx="57" cy="96" rx="1.6" ry="2"/></g>'
        + '<g stroke="#000" stroke-width="0.5"><path d="M42,95.5 h2 M56,95.5 h2"/></g>';
    }

    // ---------- 4) LAST OBLIVION GRAVETIDE — void catastrophe hammer ----------
    function artGravetide() {
      var stoneTeeth = ''; for (var i = 0; i < 9; i++) { var a = (i / 9) * Math.PI * 2; stoneTeeth += '<rect x="' + (28 + Math.cos(a) * 7 - 1) + '" y="' + (30 + Math.sin(a) * 7 - 1) + '" width="2" height="2" fill="#57534e"/>'; }
      var arms = ''; for (var j = 0; j < 6; j++) { var b = (j / 6) * Math.PI * 2; arms += '<line x1="70" y1="30" x2="' + (70 + Math.cos(b) * 8) + '" y2="' + (30 + Math.sin(b) * 8) + '" stroke="#9ca3af" stroke-width="1.2"/>'; }
      return '<defs>'
        + '<radialGradient id="gt_au" cx="50%" cy="32%" r="60%"><stop offset="0%" stop-color="#fb923c" stop-opacity=".4"/><stop offset="60%" stop-color="#7c3aed" stop-opacity=".3"/><stop offset="100%" stop-color="transparent"/></radialGradient>'
        + '<radialGradient id="gt_bh" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#000"/><stop offset="70%" stop-color="#1a1030"/><stop offset="100%" stop-color="#7c3aed"/></radialGradient></defs>'
        + '<circle cx="50" cy="30" r="46" fill="url(#gt_au)"><animate attributeName="opacity" values=".5;1;.5" dur="2.2s" repeatCount="indefinite"/></circle>'
        // dark energy ribbons between the halves
        + '<path d="M42,30 q8,-6 16,0" stroke="#fb923c" stroke-width="1" fill="none" opacity="0.7"><animate attributeName="d" values="M42,30 q8,-6 16,0;M42,30 q8,6 16,0;M42,30 q8,-6 16,0" dur="1.4s" repeatCount="indefinite"/></path>'
        // LEFT half: cracked ancient stone cube + 9 square teeth spiral + staples + runes
        + '<rect x="16" y="18" width="24" height="24" rx="1" fill="#292524" stroke="#111" stroke-width="1"/>'
        + '<path d="M20,20 l6,8 l-4,6 l8,4" stroke="#0c0a09" stroke-width="0.8" fill="none"/>'
        + '<g stroke="#78716c" stroke-width="0.8"><path d="M18,26 h4 M34,24 h4 M20,40 h5"/></g>'
        + rot(28, 30, 14, stoneTeeth, 1)
        + pulse('<g fill="#fb923c"><circle cx="24" cy="24" r="0.7"/><circle cx="34" cy="36" r="0.7"/></g>', 1.6, 0.3, 1)
        // floating black core
        + '<circle cx="50" cy="30" r="3.4" fill="#0d0820" stroke="#c4b5fd" stroke-width="0.6"><animate attributeName="r" values="3;3.8;3" dur="1.5s" repeatCount="indefinite"/></circle>'
        // RIGHT half: mechanical cage w/ mini black hole, 6 arms, planetary rings
        + '<rect x="60" y="18" width="24" height="24" rx="2" fill="#1c1917" stroke="#6b7280" stroke-width="1"/>'
        + '<circle cx="70" cy="30" r="4" fill="url(#gt_bh)"><animate attributeName="r" values="3.5;5;3.5" dur="2s" repeatCount="indefinite"/></circle>'
        + rot(70, 30, 6, '<ellipse cx="70" cy="30" rx="8" ry="3" fill="none" stroke="#a78bfa" stroke-width="0.6"/>', 1)
        + rot(70, 30, 4, arms, -1)
        // thick handle spine + floating armor plates + 4 locking rings
        + '<rect x="48" y="42" width="4" height="40" rx="1" fill="#3f3f46" stroke="#111" stroke-width="0.5"/>'
        + '<g fill="none" stroke="#9ca3af" stroke-width="1"><rect x="45" y="48" width="10" height="3" rx="1"/><rect x="45" y="56" width="10" height="3" rx="1"/><rect x="45" y="64" width="10" height="3" rx="1"/><rect x="45" y="72" width="10" height="3" rx="1"/></g>'
        // pyramid pommel + upward-falling hourglass
        + '<path d="M44,82 L56,82 L50,94 Z" fill="#1a1030" stroke="#fb923c" stroke-width="0.7"/>'
        + '<g stroke="#fbbf24" stroke-width="0.6"><path d="M47,85 h6 l-3,3 z M47,90 l3,-2 l3,2"/></g>'
        + pulse('<circle cx="50" cy="86" r="0.7" fill="#fbbf24"><animate attributeName="cy" values="90;84" dur="1.4s" repeatCount="indefinite"/></circle>', 1.4, 0.3, 1);
    }

    // ---- the four weapons: art + editable buffData + shop description ----
    var W = [
      { id: 'void_w_gravemaw', name: 'Gravemaw Nullblade', glow: '#a855f7', price: 220000000, art: artGravemaw,
        bd: { t: 'void_momentum', base: 32, step: 2, max: 64, windowMs: 800 },
        bdsc: '<span class="text-fuchsia-200">DEVOURING MOMENTUM</span><br>+32 Pts per strike, building +2 per fast consecutive strike up to +64. Stopping longer than the momentum window resets to 32.' },
      { id: 'void_w_eclipsewidow', name: 'Eclipse Widow Soulsplitter', glow: '#c4b5fd', price: 245000000, art: artEclipseWidow,
        bd: { t: 'void_memory', base: 41, cycle: 4, fraction: 1 / 3 },
        bdsc: '<span class="text-violet-200">WIDOW MEMORY</span><br>+41 Pts per strike. Every 4th strike adds a memory burst equal to one third of the last three strikes (normally +41), so the 4th strike awards 82.' },
      { id: 'void_w_worldspike', name: 'Abyssal Requiem Worldspike', glow: '#38bdf8', price: 265000000, art: artWorldspike,
        bd: { t: 'void_nth', base: 48, every: 7, burst: 96 },
        bdsc: '<span class="text-sky-200">SEVENTH REQUIEM</span><br>+48 Pts per strike. Every 7th strike rings the funeral bell for a +96 requiem burst (144 total), then the count resets.' },
      { id: 'void_w_gravetide', name: 'Last Oblivion Gravetide', glow: '#fb923c', price: 285000000, art: artGravetide,
        bd: { t: 'void_pressure', base: 35, step: 5, maxStacks: 6, collapse: 40 },
        bdsc: '<span class="text-orange-200">GRAVETIDE PRESSURE</span><br>+35 Pts per strike, +5 per pressure stack up to 6 (35\u219265). The max-pressure strike triggers a Gravetide Collapse for +40, then all stacks reset.' }
    ];

    // Register the item record (shop.db.weapons) + unique art (legendaryArt) — persistent, so the
    // weapon is purchasable/equippable and shows the SAME unique art on the card AND the avatar.
    function inject() {
      W.forEach(function (w) {
        if (!S.db.weapons.some(function (x) { return x.id === w.id; })) {
          S.db.weapons.push({ id: w.id, name: w.name, sub: 'Void Death', tier: 19, req: 'Void Clearance', price: w.price, buffData: w.bd, buffDesc: w.bdsc });
        }
        S.legendaryArt[w.id] = (function (fn, glow) { return function () { return wrap(fn(), glow); }; })(w.art, w.glow);
        try { if (S.artCache) { delete S.artCache[w.id]; delete S.artCache['LEG_' + w.id]; delete S.artCache['EXACT_weapons_' + w.id]; } } catch (e) {}
      });
      try { if (BCA.exactVisuals) { BCA.exactVisuals._metaCache = {}; if (BCA.exactVisuals.clearEquipmentCaches) BCA.exactVisuals.clearEquipmentCaches(); } } catch (e) {}
    }
    inject();

    // DOM-inject purchase cards into the Royal Town WARLORD BAZAAR (weapons-forward shop), immune
    // to that shop's repeated catalog/grid rebuilds — exactly like the royal-town-armors pack.
    var TARGET_SHOP = 'warlord';
    function fmt(n) { return (n || 0).toLocaleString(); }
    function domInjectVoidWeapons() {
      try {
        var T = BCA.travel && BCA.travel.town; if (!T) return;
        if (T.currentShop !== TARGET_SHOP) return;
        var grid = document.getElementById('rts-grid'); if (!grid) return;
        var html = '';
        W.forEach(function (w) {
          if (grid.querySelector('[data-void-id="' + w.id + '"]')) return;
          var pf = BCA.state && BCA.state.profile;
          var owned = !!(pf && ((pf.ownedWeapons && pf.ownedWeapons.indexOf(w.id) > -1) || (pf.bag && pf.bag.weapons && pf.bag.weapons.some(function (x) { return (x.id || x) === w.id; }))));
          var equipped = !!(pf && pf.activeWeapon && pf.activeWeapon.id === w.id);
          var btn = equipped
            ? '<button class="btn-military w-full py-2 text-xs bg-green-950 border-green-600 text-green-300" disabled>EQUIPPED</button>'
            : owned
              ? '<button onclick="BCA_SYS.travel.town.equipMixed(\'weapons\',\'' + w.id + '\')" class="btn-military w-full py-2 text-xs bg-blue-950 border-blue-600 text-blue-300">EQUIP</button>'
              : '<button onclick="BCA_SYS.travel.town.buyMixed(\'weapons\',\'' + w.id + '\')" class="btn-military w-full py-2 text-xs bg-[#150022] border-fuchsia-700 text-fuchsia-200">PURCHASE \u2014 ' + fmt(w.price) + 'g</button>';
          html += '<div class="shop-card panel-lux p-4 flex flex-col justify-between relative" data-void-id="' + w.id + '">'
            + wrap(w.art(), w.glow)
            + '<div class="mb-3 border-b border-[#333] pb-2 relative z-10 mt-2"><h4 class="cinzel text-base text-white mb-1 text-center leading-tight">' + w.name + '</h4>'
            + '<p class="text-[9px] uppercase tracking-widest font-bold text-center mb-1" style="color:#d8b4fe">Tier 19 \u00B7 Void Death Weapon</p>'
            + '<p class="text-[9px] text-fuchsia-200 font-bold uppercase tracking-widest text-center bg-[#050505] p-1 border border-[#222] rounded leading-snug">' + w.bdsc + '</p></div>'
            + '<div class="relative z-10">' + btn + '</div></div>';
        });
        if (html) grid.insertAdjacentHTML('afterbegin', html);
      } catch (e) {}
    }

    function wrapRenderers() {
      var T = BCA.travel && BCA.travel.town; if (!T) return;
      if (T.render && !T.render._voidWpns) { var orr = T.render.bind(T); T.render = function () { try { inject(); } catch (e) {} var r = orr.apply(this, arguments); try { domInjectVoidWeapons(); } catch (e2) {} return r; }; T.render._voidWpns = true; }
      if (T.openShop && !T.openShop._voidWpns) { var oos = T.openShop.bind(T); T.openShop = function () { try { inject(); } catch (e) {} var r = oos.apply(this, arguments); try { domInjectVoidWeapons(); } catch (e2) {} return r; }; T.openShop._voidWpns = true; }
    }
    wrapRenderers();
    domInjectVoidWeapons();
    setInterval(function () { try { wrapRenderers(); domInjectVoidWeapons(); } catch (e) {} }, 700);

    // Re-add the item records + art after any shop.db rebuild (generateDB recreates shop.db).
    if (typeof S.generateDB === 'function' && !S.generateDB._voidWpns) {
      var og = S.generateDB.bind(S);
      S.generateDB = function () { var r = og.apply(this, arguments); try { inject(); } catch (e) {} return r; };
      S.generateDB._voidWpns = true;
    }
  }
  boot();
})();
