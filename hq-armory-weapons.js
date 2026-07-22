/* =====================================================================
   HQ ARMORY — "HYBRID HQ BUILD" WEAPONS
   The old "HQ Exclusive Armory" (separate ownedHqWeapons / activeHqWeapon,
   duration-only relics, ids hq_w_*) is retired. These are its replacement:
   brand-new, one-of-a-kind legendary weapons with completely hand-built,
   extremely detailed animated SVG art (no reuse of any existing weapon art).

   They are TREATED AS REGULAR WEAPONS: registered into shop.db.weapons under
   the 'HQ Armory' sub and bought/equipped through the normal weapon flow, so
   equipping one REPLACES your currently equipped weapon (exactly like any other
   weapon) and its art shows on the shop card AND on the equipped avatar.

   Each carries a HYBRID buffData (type 'hqhybrid', handled by the combat engine
   in index.html):
     - flat + a regular crit/fury POINTS ability  -> works in EVERY mode
       (HQ Command AND Arena/etc.), so they are never a waste outside Command.
     - hqDuration (Command run time) + hqGold (gold per spam) -> applied ONLY in
       HQ Command runs. In Arena and every other mode these weapons add NO time
       and NO gold at all.
   Every value lives in buffData, so an admin can retune them via the Shop Item
   Editor / Forge Studio (raw buffData JSON). Loaded as a sibling module.
   ===================================================================== */
(function () {
  function boot() {
    var BCA = window.BCA_SYS;
    if (!BCA || !BCA.shop || !BCA.shop.db || !BCA.shop.db.weapons || !BCA.shop.legendaryArt) return setTimeout(boot, 400);
    var S = BCA.shop;
    if (S._hqArmoryWeapons) return; S._hqArmoryWeapons = true;

    /* ---- shared helpers (same art-stage shape the shop grid + avatar expect) ---- */
    function wrap(inner, glow) {
      return '<div class="art-stage rarity-mythic w-full h-32 flex items-center justify-center relative z-10" style="filter:drop-shadow(0 0 26px ' + glow + ') drop-shadow(0 0 9px #e5b814);background:radial-gradient(circle at 50% 35%,rgba(90,0,0,0.55),rgba(0,0,0,0.92) 74%)">'
        + '<span class="art-corner art-tl"></span><span class="art-corner art-tr"></span><span class="art-corner art-bl"></span><span class="art-corner art-br"></span>'
        + '<span class="rarity-tag" style="border-color:' + glow + ';color:#fff7cc;text-shadow:0 0 8px ' + glow + ';">HQ ARMORY</span>'
        + '<svg viewBox="0 0 100 100" class="w-28 h-28 art-float drop-shadow-2xl">' + inner + '</svg>'
        + '<span class="art-flavor" style="color:#fca5a5;">Hybrid HQ Build — forged for High Command</span></div>';
    }
    function rot(cx, cy, dur, inner, dir) {
      return '<g>' + inner + '<animateTransform attributeName="transform" type="rotate" from="' + (dir < 0 ? 360 : 0) + ' ' + cx + ' ' + cy + '" to="' + (dir < 0 ? 0 : 360) + ' ' + cx + ' ' + cy + '" dur="' + dur + 's" repeatCount="indefinite"/></g>';
    }
    function pulse(inner, dur, lo, hi) {
      return '<g>' + inner + '<animate attributeName="opacity" values="' + lo + ';' + hi + ';' + lo + '" dur="' + (dur || 2) + 's" repeatCount="indefinite"/></g>';
    }
    function gem(x, y, r, id) { // faceted diamond
      return '<path d="M' + x + ',' + (y - r) + ' L' + (x + r * 0.85) + ',' + y + ' L' + x + ',' + (y + r) + ' L' + (x - r * 0.85) + ',' + y + ' Z" fill="url(#' + id + ')" stroke="#fff" stroke-width="0.5"/><path d="M' + (x - r * 0.45) + ',' + (y - r * 0.3) + ' L' + (x + r * 0.45) + ',' + (y - r * 0.3) + '" stroke="#fff" stroke-width="0.4" opacity="0.9"/>';
    }
    function ruby(x, y, r, id, gid) {
      return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="url(#' + id + ')" stroke="url(#' + gid + ')" stroke-width="0.7"/><circle cx="' + (x - r * 0.35) + '" cy="' + (y - r * 0.35) + '" r="' + (r * 0.3) + '" fill="#fff" opacity="0.85"/>';
    }
    // shared crimson/gold/diamond defs, unique gradient ids per weapon key
    function defs(k) {
      return '<defs>'
        + '<linearGradient id="g' + k + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#fff7cc"/><stop offset="45%" stop-color="#e5b814"/><stop offset="100%" stop-color="#4a3205"/></linearGradient>'
        + '<linearGradient id="b' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#52525b"/><stop offset="52%" stop-color="#121212"/><stop offset="100%" stop-color="#000"/></linearGradient>'
        + '<linearGradient id="r' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fca5a5"/><stop offset="50%" stop-color="#b91c1c"/><stop offset="100%" stop-color="#3a0000"/></linearGradient>'
        + '<radialGradient id="d' + k + '" cx="50%" cy="35%" r="60%"><stop offset="0%" stop-color="#fff"/><stop offset="55%" stop-color="#fde68a"/><stop offset="100%" stop-color="#7c5a08"/></radialGradient>'
        + '<radialGradient id="a' + k + '" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ff2a2a" stop-opacity="0.42"/><stop offset="100%" stop-color="transparent"/></radialGradient>'
        + '<linearGradient id="m' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff3b0"/><stop offset="45%" stop-color="#ff8a1e"/><stop offset="100%" stop-color="#7a1500"/></linearGradient>'
        + '</defs>';
    }
    function aura(k, glow) {
      return '<circle cx="50" cy="50" r="47" fill="url(#a' + k + ')"><animate attributeName="opacity" values="0.5;1;0.5" dur="2.6s" repeatCount="indefinite"/></circle>'
        + '<circle cx="50" cy="50" r="43" fill="none" stroke="url(#g' + k + ')" stroke-width="0.9" stroke-dasharray="3 6" opacity="0.85"/>'
        + '<circle cx="50" cy="50" r="39" fill="none" stroke="' + glow + '" stroke-width="0.5" stroke-dasharray="1 9" opacity="0.7"/>';
    }

    /* ================= 1) TYRANT'S WARCROWN EXECUTIONER ================= */
    function artExecutioner() {
      var k = 'ex';
      var crownSpikes = ''; for (var i = 0; i < 5; i++) { var x = 40 + i * 5; crownSpikes += '<path d="M' + x + ',14 L' + (x + 2.5) + ',5 L' + (x + 5) + ',14 Z" fill="url(#g' + k + ')" stroke="#3a0000" stroke-width="0.5"/>'; }
      var teeth = ''; for (var j = 0; j < 7; j++) { var yy = 30 + j * 6; teeth += '<path d="M47.5,' + yy + ' L50,' + (yy - 2.4) + ' L52.5,' + yy + '" stroke="url(#m' + k + ')" stroke-width="0.8" fill="none"/>'; }
      return defs(k) + aura(k, '#ff2a2a')
        // spiked imperial warcrown atop the blade
        + '<rect x="39" y="13" width="22" height="4" rx="1.2" fill="url(#g' + k + ')" stroke="#3a0000" stroke-width="0.6"/>' + crownSpikes
        + ruby(50, 15, 1.8, 'r' + k, 'g' + k)
        // colossal executioner greatsword blade with molten fuller
        + '<path d="M50,17 L58,24 L56,74 L50,82 L44,74 L42,24 Z" fill="url(#b' + k + ')" stroke="url(#g' + k + ')" stroke-width="1.3"/>'
        + pulse('<path d="M50,20 L50,76" stroke="url(#m' + k + ')" stroke-width="1.8"/>', 1.5, 0.55, 1)
        + teeth
        + '<path d="M46,30 L42,26 M54,30 L58,26 M46,50 L42,46 M54,50 L58,46" stroke="url(#g' + k + ')" stroke-width="0.7"/>'
        // skull-and-wing crossguard
        + '<path d="M26,72 Q50,62 74,72 Q66,80 56,76 L44,76 Q34,80 26,72 Z" fill="url(#g' + k + ')" stroke="#3a0000" stroke-width="1"/>'
        + '<path d="M44,74 Q50,70 56,74 Q57,80 50,82 Q43,80 44,74 Z" fill="#0a0a0a" stroke="url(#g' + k + ')" stroke-width="0.7"/>'
        + pulse('<circle cx="47.5" cy="76" r="1.1" fill="#ff2a2a"/><circle cx="52.5" cy="76" r="1.1" fill="#ff2a2a"/>', 1, 0.3, 1)
        + gem(30, 72, 2, 'd' + k) + gem(70, 72, 2, 'd' + k)
        // gilded grip + ruby pommel
        + '<rect x="47" y="82" width="6" height="12" rx="2.4" fill="url(#r' + k + ')" stroke="url(#g' + k + ')" stroke-width="0.9"/>'
        + '<path d="M47,85 L53,88 M47,90 L53,93" stroke="url(#g' + k + ')" stroke-width="1"/>'
        + ruby(50, 96, 2.6, 'r' + k, 'g' + k);
    }

    /* ================= 2) OBSIDIAN SOVEREIGN WARBLADE ================= */
    function artSovereign() {
      var k = 'sv';
      var serr = ''; for (var i = 0; i < 9; i++) { var y = 20 + i * 5.4; serr += '<path d="M60,' + y + ' l6,-2 l-2,4 Z" fill="url(#g' + k + ')" stroke="#3a2600" stroke-width="0.3"/>'; }
      return defs(k) + aura(k, '#f5c542')
        // sweeping obsidian sabre with gold spine + serrated back edge
        + '<path d="M40,84 C40,50 48,24 62,8 C58,26 56,52 60,78 L52,86 Z" fill="url(#b' + k + ')" stroke="url(#g' + k + ')" stroke-width="1.3"/>'
        + serr
        + pulse('<path d="M44,80 C44,52 51,28 61,12" stroke="url(#m' + k + ')" stroke-width="1.3" fill="none"/>', 1.7, 0.5, 1)
        // sovereign eye gem set into the blade
        + '<ellipse cx="50" cy="52" rx="6" ry="3.4" fill="#0a0a0a" stroke="url(#g' + k + ')" stroke-width="0.9"/>'
        + pulse('<circle cx="50" cy="52" r="2.1" fill="url(#r' + k + ')"/><circle cx="49.3" cy="51.3" r="0.7" fill="#fff"/>', 1.4, 0.4, 1)
        // winged gold crossguard
        + '<path d="M34,82 Q50,74 66,82 Q58,90 50,86 Q42,90 34,82 Z" fill="url(#g' + k + ')" stroke="#3a2600" stroke-width="1"/>'
        + gem(34, 82, 2, 'd' + k) + gem(66, 82, 2, 'd' + k)
        // grip + faceted pommel
        + '<rect x="47.5" y="86" width="5" height="11" rx="2" fill="#1a1206" stroke="url(#g' + k + ')" stroke-width="0.8"/>'
        + '<path d="M47.5,89 L52.5,91 M47.5,93 L52.5,95" stroke="url(#g' + k + ')" stroke-width="0.8"/>'
        + rot(50, 98, 6, gem(50, 98, 3, 'd' + k), 1);
    }

    /* ================= 3) AURELIAN COMMAND SCEPTER ================= */
    function artScepter() {
      var k = 'sc';
      var rays = ''; for (var i = 0; i < 12; i++) { var a = (i / 12) * Math.PI * 2; rays += '<line x1="50" y1="20" x2="' + (50 + Math.cos(a) * 15) + '" y2="' + (20 + Math.sin(a) * 15) + '" stroke="url(#g' + k + ')" stroke-width="' + (i % 2 ? 0.6 : 1.2) + '"/>'; }
      return defs(k) + aura(k, '#ffd54a')
        // radiant sunburst command head with orbiting halo
        + rot(50, 20, 16, rays, 1)
        + '<circle cx="50" cy="20" r="8" fill="url(#d' + k + ')" stroke="url(#g' + k + ')" stroke-width="1"/>'
        // imperial eagle silhouette in the sun disc
        + '<path d="M50,15 L54,20 L51,20 L52,25 L50,23 L48,25 L49,20 L46,20 Z" fill="#3a0000"/>'
        + rot(50, 20, 9, '<circle cx="50" cy="20" r="11.5" fill="none" stroke="#ff2a2a" stroke-width="0.6" stroke-dasharray="2 4"/>', -1)
        // jewelled command shaft
        + '<rect x="47.6" y="27" width="4.8" height="60" rx="2.4" fill="url(#b' + k + ')" stroke="url(#g' + k + ')" stroke-width="1"/>'
        + '<path d="M45,36 L55,40 M45,48 L55,52 M45,60 L55,64 M45,72 L55,76" stroke="url(#g' + k + ')" stroke-width="1.3"/>'
        + ruby(50, 32, 2, 'r' + k, 'g' + k) + gem(50, 44, 2, 'd' + k) + ruby(50, 56, 2, 'r' + k, 'g' + k) + gem(50, 68, 2, 'd' + k)
        // collared base + ruby pommel
        + '<path d="M44,86 L56,86 L54,90 L46,90 Z" fill="url(#g' + k + ')" stroke="#3a0000" stroke-width="0.6"/>'
        + ruby(50, 94, 3, 'r' + k, 'g' + k);
    }

    /* ================= 4) BLOODMARSHAL ANNIHILATOR ================= */
    function artAnnihilator() {
      var k = 'an';
      function bladeHead(cx, flip) {
        var s = flip ? -1 : 1;
        return '<path d="M' + cx + ',26 q' + (26 * s) + ',2 ' + (30 * s) + ',26 q' + (-14 * s) + ',-8 ' + (-30 * s) + ',-4 Z" fill="url(#b' + k + ')" stroke="url(#g' + k + ')" stroke-width="1.2"/>'
          + '<path d="M' + cx + ',30 q' + (18 * s) + ',2 ' + (22 * s) + ',18" stroke="url(#r' + k + ')" stroke-width="1.4" fill="none"/>';
      }
      var drips = ''; for (var i = 0; i < 4; i++) { drips += '<circle cx="' + (24 + i * 17) + '" cy="' + (50 + (i % 2) * 4) + '" r="1.2" fill="#b91c1c"><animate attributeName="cy" values="' + (50 + (i % 2) * 4) + ';60" dur="' + (2 + i % 2) + 's" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="' + (2 + i % 2) + 's" repeatCount="indefinite"/></circle>'; }
      return defs(k) + aura(k, '#e01e1e')
        // twin brutal axe heads
        + bladeHead(50, false) + bladeHead(50, true)
        + drips
        // molten central core skull
        + '<circle cx="50" cy="30" r="5.5" fill="#0a0a0a" stroke="url(#g' + k + ')" stroke-width="1"/>'
        + pulse('<circle cx="47.8" cy="29" r="1.1" fill="#ff2a2a"/><circle cx="52.2" cy="29" r="1.1" fill="#ff2a2a"/><path d="M48,33 l1,1 l1,-1 l1,1 l1,-1" stroke="#ff2a2a" stroke-width="0.6" fill="none"/>', 1.1, 0.35, 1)
        // heavy war-haft with binding rings + hanging skull charm
        + '<rect x="47.8" y="34" width="4.4" height="52" rx="2" fill="url(#b' + k + ')" stroke="url(#g' + k + ')" stroke-width="0.9"/>'
        + '<g fill="none" stroke="url(#g' + k + ')" stroke-width="1"><rect x="45.5" y="42" width="9" height="3" rx="1"/><rect x="45.5" y="54" width="9" height="3" rx="1"/><rect x="45.5" y="66" width="9" height="3" rx="1"/></g>'
        + '<path d="M46,86 Q50,82 54,86 Q55,92 50,94 Q45,92 46,86 Z" fill="#0d0d0d" stroke="url(#g' + k + ')" stroke-width="0.7"/>'
        + pulse('<circle cx="48.3" cy="88" r="1" fill="#e01e1e"/><circle cx="51.7" cy="88" r="1" fill="#e01e1e"/>', 1, 0.3, 1);
    }

    /* ================= 5) GODKING'S RUIN VANQUISHER ================= */
    function artVanquisher() {
      var k = 'vq';
      var halo = ''; for (var i = 0; i < 10; i++) { var a = (i / 10) * Math.PI * 2; halo += '<path d="M' + (50 + Math.cos(a) * 15) + ',' + (30 + Math.sin(a) * 15) + ' l' + (Math.cos(a) * 4) + ',' + (Math.sin(a) * 4) + '" stroke="url(#g' + k + ')" stroke-width="1"/>'; }
      return defs(k) + aura(k, '#ff5533')
        // orbiting halo of blades behind the head
        + rot(50, 30, 18, halo, 1)
        // colossal cleaver head
        + '<path d="M18,44 L74,40 L74,58 L46,58 L44,72 L34,72 L33,58 L18,58 Z" fill="url(#b' + k + ')" stroke="url(#g' + k + ')" stroke-width="1.3"/>'
        + '<path d="M22,46 L70,44" stroke="url(#m' + k + ')" stroke-width="2.2"/><path d="M22,55 L70,55" stroke="url(#g' + k + ')" stroke-width="1"/>'
        // god-king mask embossed on the cleaver
        + '<path d="M50,30 Q60,32 60,44 Q50,50 40,44 Q40,32 50,30 Z" fill="#0a0a0a" stroke="url(#g' + k + ')" stroke-width="0.9"/>'
        + pulse('<path d="M45,38 l3,2 M55,38 l-3,2" stroke="#ff5533" stroke-width="1" fill="none"/><path d="M47,45 q3,2 6,0" stroke="#ff5533" stroke-width="0.7" fill="none"/>', 1.3, 0.4, 1)
        + gem(38, 51, 2.2, 'd' + k) + gem(66, 51, 2.2, 'd' + k)
        // socket + spiked tang
        + '<rect x="74" y="45" width="18" height="5" rx="1" fill="url(#g' + k + ')" stroke="#3a0000" stroke-width="0.6"/>'
        + '<circle cx="92" cy="47.5" r="2.4" fill="#000" stroke="url(#g' + k + ')" stroke-width="0.8"/>'
        // handle down-left + ruby pommel
        + '<rect x="30" y="58" width="7" height="30" rx="2.6" fill="url(#r' + k + ')" stroke="url(#g' + k + ')" stroke-width="0.9" transform="rotate(6 33 72)"/>'
        + ruby(35, 90, 3, 'r' + k, 'g' + k);
    }

    /* ================= 6) IMPERATOR'S ETERNAL BROADSWORD ================= */
    function artBroadsword() {
      var k = 'im';
      var flames = ''; for (var i = 0; i < 5; i++) { var x = 44 + i * 3; flames += '<path d="M' + x + ',18 q1,-6 2,0" stroke="url(#m' + k + ')" stroke-width="1" fill="none"><animate attributeName="opacity" values="0.4;1;0.4" dur="' + (0.8 + i * 0.15) + 's" repeatCount="indefinite"/></path>'; }
      var laurel = ''; for (var j = 0; j < 6; j++) { laurel += '<ellipse cx="' + (34 + j * 2) + '" cy="' + (78 - j) + '" rx="2.2" ry="1" fill="url(#g' + k + ')" transform="rotate(' + (-30 + j * 4) + ' ' + (34 + j * 2) + ' ' + (78 - j) + ')"/><ellipse cx="' + (66 - j * 2) + '" cy="' + (78 - j) + '" rx="2.2" ry="1" fill="url(#g' + k + ')" transform="rotate(' + (30 - j * 4) + ' ' + (66 - j * 2) + ' ' + (78 - j) + ')"/>'; }
      return defs(k) + aura(k, '#ffcf40')
        + flames
        // broad, tall imperial blade wreathed in gold fire
        + '<path d="M50,14 L57,26 L55,72 L50,80 L45,72 L43,26 Z" fill="url(#b' + k + ')" stroke="url(#g' + k + ')" stroke-width="1.3"/>'
        + pulse('<path d="M50,18 L50,74" stroke="url(#m' + k + ')" stroke-width="2"/>', 1.4, 0.5, 1)
        + '<path d="M46,34 L54,34 M46,46 L54,46 M46,58 L54,58" stroke="url(#g' + k + ')" stroke-width="0.7"/>'
        // laurel-wreath crossguard
        + '<path d="M30,74 Q50,66 70,74" fill="none" stroke="url(#g' + k + ')" stroke-width="1.4"/>' + laurel
        + gem(50, 72, 2.4, 'd' + k)
        // grip + imperial eagle pommel
        + '<rect x="47.4" y="78" width="5.2" height="12" rx="2" fill="url(#r' + k + ')" stroke="url(#g' + k + ')" stroke-width="0.9"/>'
        + '<path d="M47.4,81 L52.6,84 M47.4,86 L52.6,89" stroke="url(#g' + k + ')" stroke-width="0.9"/>'
        + '<path d="M50,90 L46,94 L48,95 L44,98 L50,96 L56,98 L52,95 L54,94 Z" fill="url(#g' + k + ')" stroke="#3a2600" stroke-width="0.5"/>'
        + pulse('<circle cx="50" cy="93" r="1" fill="#ff2a2a"/>', 1, 0.4, 1);
    }

    // ---- weapon records: hybrid buffData + description + unique art ----
    function desc(pts, regLine, hqDur, hqGold) {
      return '<span class="text-amber-200">HYBRID HQ BUILD</span><br>'
        + '+' + pts + ' Pts/Strike \u00B7 ' + regLine + ' <span class="text-gray-400 normal-case">(works in every mode)</span><br>'
        + '<span class="text-yellow-400">HQ COMMAND ONLY: ' + hqDur + 's run time \u00B7 +' + hqGold + ' gold per spam</span><br>'
        + '<span class="text-gray-400 normal-case">Powerful in Arena &amp; every other mode; the run-time &amp; gold apply ONLY to HQ Command.</span>';
    }
    var W = [
      { id: 'hqa_warcrown', name: "Tyrant's Warcrown Executioner", glow: '#ff2a2a', price: 62000000, art: artExecutioner,
        bd: { t: 'hqhybrid', reg: 'crit', flat: 40, ch: 18, mult: 2.2, hqDuration: 60, hqGold: 8 },
        regLine: '18% chance for 2.2x Command Crit' },
      { id: 'hqa_sovereign', name: 'Obsidian Sovereign Warblade', glow: '#f5c542', price: 98000000, art: artSovereign,
        bd: { t: 'hqhybrid', reg: 'fury', flat: 38, burstMult: 1.2, hqDuration: 70, hqGold: 7 },
        regLine: '+1.2 Pts per recent strike/sec (Fury)' },
      { id: 'hqa_scepter', name: 'Aurelian Command Scepter', glow: '#ffd54a', price: 140000000, art: artScepter,
        bd: { t: 'hqhybrid', reg: 'crit', flat: 45, ch: 15, mult: 2.5, hqDuration: 90, hqGold: 10 },
        regLine: '15% chance for 2.5x Command Crit' },
      { id: 'hqa_bloodmarshal', name: 'Bloodmarshal Annihilator', glow: '#e01e1e', price: 188000000, art: artAnnihilator,
        bd: { t: 'hqhybrid', reg: 'fury', flat: 42, burstMult: 1.5, hqDuration: 80, hqGold: 9 },
        regLine: '+1.5 Pts per recent strike/sec (Fury)' },
      { id: 'hqa_godkingruin', name: "Godking's Ruin Vanquisher", glow: '#ff5533', price: 250000000, art: artVanquisher,
        bd: { t: 'hqhybrid', reg: 'crit', flat: 50, ch: 20, mult: 2.6, hqDuration: 100, hqGold: 12 },
        regLine: '20% chance for 2.6x Command Crit' },
      { id: 'hqa_imperator', name: "Imperator's Eternal Broadsword", glow: '#ffcf40', price: 320000000, art: artBroadsword,
        bd: { t: 'hqhybrid', reg: 'fury', flat: 55, burstMult: 1.8, hqDuration: 120, hqGold: 14 },
        regLine: '+1.8 Pts per recent strike/sec (Fury)' }
    ];

    // Register item record (shop.db.weapons, sub 'HQ Armory') + unique art (legendaryArt), so the
    // weapon is purchasable/equippable like any weapon and shows the SAME art on card AND avatar.
    function inject() {
      W.forEach(function (w) {
        if (!S.db.weapons.some(function (x) { return x.id === w.id; })) {
          S.db.weapons.push({ id: w.id, name: w.name, sub: 'HQ Armory', tier: 20, req: 'HQ Command Clearance', price: w.price, buffData: w.bd, buffDesc: desc(w.bd.flat, w.regLine, w.bd.hqDuration, w.bd.hqGold) });
        }
        S.legendaryArt[w.id] = (function (fn, glow) { return function () { return wrap(fn(), glow); }; })(w.art, w.glow);
        try { if (S.artCache) { delete S.artCache[w.id]; delete S.artCache['LEG_' + w.id]; delete S.artCache['EXACT_weapons_' + w.id]; } } catch (e) {}
      });
      try { if (BCA.exactVisuals) { BCA.exactVisuals._metaCache = {}; if (BCA.exactVisuals.clearEquipmentCaches) BCA.exactVisuals.clearEquipmentCaches(); } } catch (e) {}
    }
    inject();

    // Re-add the item records + art after any shop.db rebuild (generateDB recreates shop.db).
    if (typeof S.generateDB === 'function' && !S.generateDB._hqArmory) {
      var og = S.generateDB.bind(S);
      S.generateDB = function () { var r = og.apply(this, arguments); try { inject(); } catch (e) {} return r; };
      S.generateDB._hqArmory = true;
    }
    // Safety re-inject in case another module rebuilds the catalog after us.
    setInterval(function () { try { inject(); } catch (e) {} }, 4000);
  }
  boot();
})();
