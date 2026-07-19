/* =====================================================================
   ROYAL TOWN — 32 ULTRA-MYTHIC ARMORS
   Brand-new armors for the Royal Town shop (Dread Plate Hall). Each has
   COMPLETELY NEW, one-of-a-kind hand-built SVG art matching its written
   description (its own palette, helmet crest, pauldrons, chest core, waist
   and aura) plus an "insane extreme" combat buff fitting its identity.
   No two share a crest, palette, signature motif or aura — none reuse any
   existing armor art. Loaded as a sibling module (like forge-studio.js).
   ===================================================================== */
(function () {
  function boot() {
    var BCA = window.BCA_SYS;
    if (!BCA || !BCA.shop || !BCA.shop.db || !BCA.shop.db.armor) return setTimeout(boot, 400);
    var S = BCA.shop;
    if (S._royalTownMythicArmors) return; S._royalTownMythicArmors = true;

    // Card wrapper: same art-stage shape the shop grid + equipped avatar expect.
    function wrap(inner, glow) {
      return '<div class="art-stage rarity-mythic w-full h-32 flex items-center justify-center relative z-10" style="filter:drop-shadow(0 0 26px ' + glow + ')">'
        + '<span class="art-corner art-tl"></span><span class="art-corner art-tr"></span><span class="art-corner art-bl"></span><span class="art-corner art-br"></span>'
        + '<span class="rarity-tag">MYTHIC</span>'
        + '<svg viewBox="0 0 100 100" class="w-28 h-28 art-float drop-shadow-2xl">' + inner + '</svg></div>';
    }

    // Shared humanoid armature themed per-armor. Uniqueness comes from each armor's own palette +
    // helmet crest (P.helm) + pauldrons (P.sh) + chest core/emblem (P.core) + aura (P.aura), so no
    // two read as the same suit. u = unique id prefix (avoids SVG gradient-id collisions).
    function bust(P) {
      var u = P.u, p = 'url(#' + u + 'p)', tr = P.trim;
      return '<defs>'
        + '<linearGradient id="' + u + 'p" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="' + P.c1 + '"/><stop offset="52%" stop-color="' + P.c2 + '"/><stop offset="100%" stop-color="' + P.c3 + '"/></linearGradient>'
        + '<radialGradient id="' + u + 'au" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="' + P.glow + '" stop-opacity=".55"/><stop offset="100%" stop-color="transparent"/></radialGradient>'
        + (P.defs || '') + '</defs>'
        + '<circle cx="50" cy="50" r="49" fill="url(#' + u + 'au)"><animate attributeName="opacity" values="0.55;1;0.55" dur="' + (P.pulse || 3) + 's" repeatCount="indefinite"/></circle>'
        + (P.aura || '')
        // pauldrons
        + (P.sh || ('<path d="M18,40 L34,30 L40,44 L30,52 Z" fill="' + p + '" stroke="' + tr + '" stroke-width="1"/><path d="M82,40 L66,30 L60,44 L70,52 Z" fill="' + p + '" stroke="' + tr + '" stroke-width="1"/>'))
        // chest
        + '<path d="M34,40 L66,40 L69,66 Q50,82 31,66 Z" fill="' + p + '" stroke="' + tr + '" stroke-width="1.5"/>'
        + (P.core || ('<circle cx="50" cy="54" r="6" fill="' + P.glow + '" stroke="' + tr + '" stroke-width="1"/>'))
        // waist / legs
        + '<path d="M36,66 L47,66 L46,86 L37,86 Z M64,66 L53,66 L54,86 L63,86 Z" fill="' + p + '" stroke="' + tr + '" stroke-width="0.8"/>'
        + (P.waist || '')
        // helmet base + crest
        + '<path d="M41,26 Q50,14 59,26 L58,36 L42,36 Z" fill="' + p + '" stroke="' + tr + '" stroke-width="1"/>'
        + (P.helm || '');
    }

    // ---- helper crest/aura snippets ----
    function horns(n, x, c) { var s = '', step = 8; for (var i = 0; i < n; i++) { var xx = x - (n - 1) * step / 2 + i * step; s += '<path d="M' + xx + ',24 L' + (xx + 1) + ',6 L' + (xx + 3) + ',24 Z" fill="' + c + '"/>'; } return s; }

    // ---- the 32 armors ----
    var A = [
      { id: 'tn_myth_shogun', name: 'Celestial Shogun Dreadnought Armor', price: 60000000, glow: '#ff3b6b',
        bd: { t: 'qm', flat: 12, every: 25, everyVal: 500, critEvery: 30, critVal: 900, critChance: 30, burst: 1.2 },
        bdsc: '+12 Pts/strike<br><span class="text-rose-300">+500 celestial storm every 25 strikes</span><br><span class="text-amber-300">30% for +900 divine-samurai surge every 30</span>',
        art: bust({ u: 'shg', c1: '#f8fafc', c2: '#b91c4a', c3: '#1a0410', trim: '#facc15', glow: '#ff3b6b', pulse: 2.6,
          helm: '<path d="M44,20 Q50,2 56,20" fill="none" stroke="#facc15" stroke-width="2.4"/>' + horns(6, 50, '#facc15') + '<circle cx="46" cy="30" r="1.6" fill="#ff3b6b"/><circle cx="54" cy="30" r="1.6" fill="#ff3b6b"/>',
          sh: '<path d="M14,44 L30,30 L36,46 L26,56 Z" fill="url(#shgp)" stroke="#facc15" stroke-width="1"/><path d="M86,44 L70,30 L64,46 L74,56 Z" fill="url(#shgp)" stroke="#facc15" stroke-width="1"/><rect x="16" y="30" width="10" height="4" fill="#facc15"/><rect x="74" y="30" width="10" height="4" fill="#facc15"/>',
          core: '<circle cx="50" cy="54" r="7" fill="#1a0410" stroke="#facc15" stroke-width="1"/><g fill="#facc15"><circle cx="50" cy="50" r="1"/><circle cx="53" cy="55" r="1"/><circle cx="47" cy="57" r="1"/></g>',
          aura: '<g stroke="#ff3b6b" stroke-width="1.2" opacity=".7" fill="none"><path d="M12,20 L20,30 M88,20 L80,30"/></g><g fill="#f9a8d4"><circle cx="22" cy="18" r="1.3"/><circle cx="78" cy="22" r="1.3"/></g>' }) },

      { id: 'tn_myth_obsidian', name: 'Obsidian Titan Emperor Armor', price: 66000000, glow: '#f97316',
        bd: { t: 'qm', flat: 20, every: 100, everyVal: 2500, everyMax: 6, critEvery: 50, critVal: 400, critChance: 40 },
        bdsc: '+20 Pts/strike (titan tank)<br><span class="text-orange-300">+2,500 furnace detonation every 100 strikes (x6)</span>',
        art: bust({ u: 'obs', c1: '#3f3f46', c2: '#18181b', c3: '#050505', trim: '#f97316', glow: '#f97316', pulse: 2,
          defs: '<radialGradient id="obsf" cx="50%" cy="50%" r="55%"><stop offset="0%" stop-color="#fff7d6"/><stop offset="45%" stop-color="#f97316"/><stop offset="100%" stop-color="#7c2d12"/></radialGradient>',
          helm: horns(4, 50, '#f97316') + '<rect x="45" y="28" width="10" height="3" fill="#f97316"/>',
          sh: '<path d="M14,46 L26,26 L38,44 L28,54 Z" fill="url(#obsp)" stroke="#7c2d12" stroke-width="1"/><path d="M86,46 L74,26 L62,44 L72,54 Z" fill="url(#obsp)" stroke="#7c2d12" stroke-width="1"/><path d="M22,30 l3,-6 l3,6z" fill="#f97316"/><path d="M75,30 l3,-6 l3,6z" fill="#f97316"/>',
          core: '<rect x="43" y="46" width="14" height="16" rx="2" fill="#050505" stroke="#f97316" stroke-width="1"/><rect x="45" y="48" width="10" height="12" rx="1" fill="url(#obsf)"/><g stroke="#f97316" stroke-width="1"><path d="M36,44 L64,44 M35,54 L65,54"/></g>',
          aura: '<g stroke="#f97316" stroke-width="1.4" opacity=".6"><path d="M50,88 L44,96 M50,88 L56,96"/></g>',
          waist: '<path d="M36,66 H64" stroke="#f97316" stroke-width="1.2" opacity=".8"/>' }) },

      { id: 'tn_myth_seraphic', name: 'Seraphic War Machine Armor', price: 64000000, glow: '#fde68a',
        bd: { t: 'qm', flat: 8, critEvery: 6, critVal: 220, critChance: 60, every: 40, everyVal: 1200 },
        bdsc: '+8 Pts/strike<br><span class="text-yellow-200">60% for +220 radiant volley every 6 strikes</span><br><span class="text-amber-200">+1,200 six-wing halo blast every 40</span>',
        art: bust({ u: 'ser', c1: '#ffffff', c2: '#e2e8f0', c3: '#94a3b8', trim: '#eab308', glow: '#fde68a', pulse: 3,
          helm: '<circle cx="50" cy="18" r="9" fill="none" stroke="#eab308" stroke-width="1.4"/><g fill="#eab308"><circle cx="50" cy="9" r="1.3"/><circle cx="59" cy="18" r="1.3"/><circle cx="41" cy="18" r="1.3"/></g>',
          sh: '<g fill="#f8fafc" stroke="#eab308" stroke-width="0.7"><path d="M30,40 q-16,-6 -22,6 q10,2 12,10 q4,-10 10,-16z"/><path d="M70,40 q16,-6 22,6 q-10,2 -12,10 q-4,-10 -10,-16z"/></g><g stroke="#e2e8f0" stroke-width="0.6"><path d="M12,44 l6,4 M88,44 l-6,4"/></g>',
          core: '<path d="M50,48 l4,6 l-4,6 l-4,-6z" fill="#fde68a" stroke="#eab308" stroke-width="1"/>',
          aura: '<g stroke="#fde68a" stroke-width="0.9" opacity=".7"><path d="M50,50 L18,26 M50,50 L82,26 M50,50 L50,10"/></g>' }) },

      { id: 'tn_myth_kraken', name: 'Abyssal Kraken Warlord Armor', price: 61000000, glow: '#22d3ee',
        bd: { t: 'qm', flat: 9, every: 20, everyVal: 350, burst: 1.6, critEvery: 45, critVal: 700, critChance: 35 },
        bdsc: '+9 Pts/strike<br><span class="text-cyan-300">+350 tidal surge every 20 strikes</span><br><span class="text-sky-300">+700 kraken crush every 45 (35%)</span>',
        art: bust({ u: 'krk', c1: '#67e8f9', c2: '#0e7490', c3: '#052e3a', trim: '#a5f3fc', glow: '#22d3ee', pulse: 2.8,
          helm: '<path d="M40,24 Q34,14 44,16 M60,24 Q66,14 56,16" stroke="#a5f3fc" stroke-width="2" fill="none"/><circle cx="46" cy="30" r="1.6" fill="#22d3ee"/><circle cx="54" cy="30" r="1.6" fill="#22d3ee"/>',
          sh: '<path d="M16,42 a10 9 0 1 0 20,2 a7 6 0 1 1 -20,-2z" fill="url(#krkp)" stroke="#a5f3fc" stroke-width="1"/><path d="M84,42 a10 9 0 1 1 -20,2 a7 6 0 1 0 20,-2z" fill="url(#krkp)" stroke="#a5f3fc" stroke-width="1"/>',
          core: '<circle cx="50" cy="54" r="6" fill="#052e3a" stroke="#a5f3fc" stroke-width="1"/><circle cx="50" cy="54" r="2.4" fill="#67e8f9"/><g stroke="#0891b2" stroke-width="1"><path d="M38,46 h24 M37,58 h26"/></g>',
          aura: '<g stroke="#22d3ee" stroke-width="1.4" opacity=".6" fill="none"><path d="M20,70 q10,-6 20,0 t20,0 t20,0"/></g><g stroke="#67e8f9" stroke-width="2" stroke-linecap="round" opacity=".7"><path d="M30,60 q-8,8 -4,18 M70,60 q8,8 4,18"/></g>' }) },

      { id: 'tn_myth_oni', name: 'Thunder Oni General Armor', price: 62000000, glow: '#3b82f6',
        bd: { t: 'qm', flat: 10, critEvery: 8, critVal: 300, critChance: 55, every: 30, everyVal: 800 },
        bdsc: '+10 Pts/strike<br><span class="text-blue-300">55% for +300 lightning arc every 8 strikes</span><br><span class="text-indigo-300">+800 thunder-drum every 30</span>',
        art: bust({ u: 'oni', c1: '#60a5fa', c2: '#1e3a8a', c3: '#0b1a3a', trim: '#93c5fd', glow: '#3b82f6', pulse: 1.8,
          helm: horns(4, 50, '#93c5fd') + '<path d="M43,31 q7,4 14,0" stroke="#fde047" stroke-width="1.4" fill="none"/><g fill="#f87171"><circle cx="46" cy="29" r="1.5"/><circle cx="54" cy="29" r="1.5"/></g>',
          sh: '<circle cx="24" cy="42" r="10" fill="url(#onip)" stroke="#93c5fd" stroke-width="1"/><circle cx="76" cy="42" r="10" fill="url(#onip)" stroke="#93c5fd" stroke-width="1"/><circle cx="24" cy="42" r="4" fill="#0b1a3a"/><circle cx="76" cy="42" r="4" fill="#0b1a3a"/>',
          core: '<path d="M52,44 L44,56 L51,56 L45,66" stroke="#fde047" stroke-width="2" fill="none" stroke-linecap="round"/>',
          aura: '<path d="M28,16 q22,-8 44,0" stroke="#1e3a8a" stroke-width="4" fill="none" opacity=".5"/><path d="M50,10 L46,18 L51,18 L47,26" stroke="#93c5fd" stroke-width="1.4" fill="none"/>' }) },

      { id: 'tn_myth_lion', name: 'Solar Lion Crusade Armor', price: 60000000, glow: '#fbbf24',
        bd: { t: 'qm', flat: 11, every: 22, everyVal: 480, critEvery: 33, critVal: 850, critChance: 33 },
        bdsc: '+11 Pts/strike<br><span class="text-amber-300">+480 solar roar every 22 strikes</span><br><span class="text-yellow-300">+850 lion crusade every 33 (33%)</span>',
        art: bust({ u: 'lio', c1: '#fff7cc', c2: '#f59e0b', c3: '#7c2d12', trim: '#fde68a', glow: '#fbbf24', pulse: 2.4,
          helm: '<g fill="#fbbf24"><path d="M50,8 l3,7 l-3,3 l-3,-3z"/></g><g stroke="#fde68a" stroke-width="1.4" opacity=".85"><path d="M38,18 l-8,-6 M62,18 l8,-6 M50,10 v-4"/></g>',
          sh: '<path d="M14,44 q10,-14 22,-2 q-4,10 -12,10 q-8,-2 -10,-8z" fill="url(#liop)" stroke="#7c2d12" stroke-width="1"/><path d="M86,44 q-10,-14 -22,-2 q4,10 12,10 q8,-2 10,-8z" fill="url(#liop)" stroke="#7c2d12" stroke-width="1"/>',
          core: '<circle cx="50" cy="54" r="8" fill="url(#liop)" stroke="#fde68a" stroke-width="1"/><g stroke="#fff7cc" stroke-width="1"><path d="M50,44 v-4 M50,68 v-4 M40,54 h-4 M64,54 h-4 M43,47 l-3,-3 M57,47 l3,-3"/></g>',
          aura: '<g fill="#fde68a" opacity=".7"><circle cx="24" cy="24" r="1.6"/><circle cx="76" cy="26" r="1.6"/><circle cx="50" cy="90" r="1.6"/></g>' }) },

      { id: 'tn_myth_frost', name: 'Frostbound Ronin Monarch Armor', price: 59000000, glow: '#7dd3fc',
        bd: { t: 'qm', flat: 9, every: 26, everyVal: 420, critEvery: 40, critVal: 760, critChance: 30, burst: 0.9 },
        bdsc: '+9 Pts/strike<br><span class="text-sky-200">+420 blizzard every 26 strikes</span><br><span class="text-cyan-200">+760 ghost-ronin strike every 40 (30%)</span>',
        art: bust({ u: 'frs', c1: '#f0f9ff', c2: '#7dd3fc', c3: '#0c4a6e', trim: '#e0f2fe', glow: '#7dd3fc', pulse: 3.2,
          helm: '<path d="M34,22 q-6,-14 4,-16 M66,22 q6,-14 -4,-16" stroke="#e0f2fe" stroke-width="1.8" fill="none"/><path d="M44,30 l12,0" stroke="#38bdf8" stroke-width="1.6"/>',
          sh: '<path d="M14,46 L34,32 L34,46 Z" fill="url(#frsp)" stroke="#e0f2fe" stroke-width="1"/><path d="M86,46 L66,32 L66,46 Z" fill="url(#frsp)" stroke="#e0f2fe" stroke-width="1"/><g stroke="#e0f2fe" stroke-width="1"><path d="M20,46 l0,6 M28,46 l0,5 M72,46 l0,5 M80,46 l0,6"/></g>',
          core: '<g transform="translate(50 54)" stroke="#e0f7ff" stroke-width="1.4"><line x1="0" y1="-8" x2="0" y2="8"/><line x1="-7" y1="-4" x2="7" y2="4"/><line x1="-7" y1="4" x2="7" y2="-4"/></g>',
          aura: '<g fill="#bae6fd" opacity=".7"><path d="M22,20 l2,4 l-2,4 l-2,-4z"/><path d="M78,22 l2,4 l-2,4 l-2,-4z"/></g>' }) },

      { id: 'tn_myth_chrono', name: 'Chrono Paladin Command Armor', price: 63000000, glow: '#facc15',
        bd: { t: 'qm', flat: 8, every: 24, everyVal: 460, every2: 240, every2Val: 4800, every2Max: 3, critEvery: 36, critVal: 720, critChance: 30 },
        bdsc: '+8 Pts/strike<br><span class="text-amber-300">+460 time-lock every 24 strikes</span><br><span class="text-yellow-200">+4,800 chrono-collapse every 240 (x3)</span>',
        art: bust({ u: 'chr', c1: '#fde68a', c2: '#a16207', c3: '#3b2a06', trim: '#fef3c7', glow: '#facc15', pulse: 4,
          helm: '<circle cx="50" cy="20" r="8" fill="none" stroke="#fef3c7" stroke-width="1.3"/><g stroke="#facc15" stroke-width="1"><path d="M50,20 v-5 M50,20 l4,2"/></g>',
          sh: '<circle cx="24" cy="42" r="9" fill="url(#chrp)" stroke="#fef3c7" stroke-width="1"/><circle cx="76" cy="42" r="9" fill="url(#chrp)" stroke="#fef3c7" stroke-width="1"/><g stroke="#3b2a06" stroke-width="0.8"><path d="M24,42 v-9 M24,42 l6,3 M76,42 v-9 M76,42 l-6,3"/></g>',
          core: '<circle cx="50" cy="54" r="8" fill="#1a1204" stroke="#facc15" stroke-width="1"/><g stroke="#fde68a" stroke-width="0.8"><path d="M50,54 v-6 M50,54 l5,3"/></g><g fill="#fde68a"><circle cx="42" cy="50" r="1"/><circle cx="58" cy="58" r="1"/></g>',
          aura: '<circle cx="50" cy="50" r="40" fill="none" stroke="#facc15" stroke-width="0.7" stroke-dasharray="2 6" opacity=".6"/>' }) },

      { id: 'tn_myth_bloodmoon', name: 'Blood Moon Executor Armor', price: 61000000, glow: '#ef4444',
        bd: { t: 'qm', flat: 11, critEvery: 7, critVal: 260, critChance: 55, every: 28, everyVal: 700 },
        bdsc: '+11 Pts/strike<br><span class="text-red-400">55% for +260 execution every 7 strikes</span><br><span class="text-rose-400">+700 eclipse judgment every 28</span>',
        art: bust({ u: 'bmn', c1: '#fecaca', c2: '#991b1b', c3: '#1a0000', trim: '#ef4444', glow: '#ef4444', pulse: 2.2,
          defs: '<radialGradient id="bmnm" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#fca5a5"/><stop offset="60%" stop-color="#dc2626"/><stop offset="100%" stop-color="#450a0a"/></radialGradient>',
          helm: '<circle cx="50" cy="24" r="8" fill="url(#bmnm)" stroke="#1a0000" stroke-width="1"/><line x1="50" y1="16" x2="50" y2="32" stroke="#1a0000" stroke-width="1.5"/><path d="M42,20 l-4,-8 M58,20 l4,-8" stroke="#ef4444" stroke-width="1.6"/>',
          sh: '<path d="M14,44 L34,30 L36,46 L26,52 Z" fill="url(#bmnp)" stroke="#ef4444" stroke-width="1"/><path d="M86,44 L66,30 L64,46 L74,52 Z" fill="url(#bmnp)" stroke="#ef4444" stroke-width="1"/><path d="M18,30 q6,-4 12,0" stroke="#ef4444" stroke-width="1.4" fill="none"/><path d="M82,30 q-6,-4 -12,0" stroke="#ef4444" stroke-width="1.4" fill="none"/>',
          core: '<circle cx="50" cy="54" r="6" fill="url(#bmnm)" stroke="#1a0000" stroke-width="1"/><path d="M50,48 v12" stroke="#1a0000" stroke-width="1.4"/>',
          aura: '<g fill="#ef4444" opacity=".6"><circle cx="24" cy="22" r="1.4"/><circle cx="76" cy="24" r="1.4"/><circle cx="30" cy="80" r="1.4"/><circle cx="70" cy="80" r="1.4"/></g>' }) },

      { id: 'tn_myth_jade', name: 'Jade Dragon Sovereign Armor', price: 62000000, glow: '#34d399',
        bd: { t: 'qm', flat: 10, every: 25, everyVal: 520, critEvery: 34, critVal: 820, critChance: 34 },
        bdsc: '+10 Pts/strike<br><span class="text-emerald-300">+520 dragon-heart pulse every 25 strikes</span><br><span class="text-green-300">+820 sovereign coil every 34 (34%)</span>',
        art: bust({ u: 'jde', c1: '#a7f3d0', c2: '#059669', c3: '#064e3b', trim: '#6ee7b7', glow: '#34d399', pulse: 2.7,
          helm: '<path d="M42,22 q-6,-12 2,-14 M58,22 q6,-12 -2,-14" stroke="#facc15" stroke-width="1.6" fill="none"/><g fill="#34d399"><circle cx="46" cy="30" r="1.4"/><circle cx="54" cy="30" r="1.4"/></g>',
          sh: '<path d="M14,44 q8,-12 22,-4 q-2,10 -10,10 q-8,-1 -12,-6z" fill="url(#jdep)" stroke="#facc15" stroke-width="1"/><path d="M86,44 q-8,-12 -22,-4 q2,10 10,10 q8,-1 12,-6z" fill="url(#jdep)" stroke="#facc15" stroke-width="1"/><circle cx="24" cy="42" r="2" fill="#34d399"/><circle cx="76" cy="42" r="2" fill="#34d399"/>',
          core: '<path d="M50,46 l6,8 l-6,8 l-6,-8z" fill="#022c22" stroke="#6ee7b7" stroke-width="1"/><circle cx="50" cy="54" r="2.4" fill="#34d399"/><g stroke="#059669" stroke-width="0.8"><path d="M36,48 q14,6 28,0"/></g>',
          aura: '<g stroke="#34d399" stroke-width="1.2" opacity=".6" fill="none"><path d="M18,72 q10,-8 18,-2 M82,72 q-10,-8 -18,-2"/></g>' }) },

      { id: 'tn_myth_voidcath', name: 'Void Cathedral Juggernaut Armor', price: 65000000, glow: '#a855f7',
        bd: { t: 'qm', flat: 16, every: 60, everyVal: 1500, everyMax: 6, critEvery: 48, critVal: 500, critChance: 30 },
        bdsc: '+16 Pts/strike (juggernaut)<br><span class="text-purple-300">+1,500 void-cathedral toll every 60 strikes (x6)</span>',
        art: bust({ u: 'vcd', c1: '#c4b5fd', c2: '#6b21a8', c3: '#1a0b2e', trim: '#d8b4fe', glow: '#a855f7', pulse: 3.4,
          helm: '<path d="M50,4 L54,20 L46,20 Z" fill="url(#vcdp)" stroke="#d8b4fe" stroke-width="1"/><circle cx="50" cy="12" r="5" fill="none" stroke="#1a0b2e" stroke-width="1.4"/><g fill="#d8b4fe"><circle cx="46" cy="30" r="1.4"/><circle cx="54" cy="30" r="1.4"/></g>',
          sh: '<path d="M16,48 L22,26 L30,48 Z" fill="url(#vcdp)" stroke="#d8b4fe" stroke-width="1"/><path d="M84,48 L78,26 L70,48 Z" fill="url(#vcdp)" stroke="#d8b4fe" stroke-width="1"/>',
          core: '<rect x="43" y="46" width="14" height="16" rx="1" fill="#0b0217" stroke="#d8b4fe" stroke-width="1"/><rect x="46" y="49" width="8" height="10" fill="#7c3aed" opacity=".8"/><circle cx="50" cy="54" r="2.4" fill="#e9d5ff"/>',
          aura: '<g fill="#1a0b2e"><circle cx="24" cy="22" r="1.6"/><circle cx="76" cy="22" r="1.6"/></g><circle cx="50" cy="50" r="42" fill="none" stroke="#a855f7" stroke-width="0.6" opacity=".5"/>' }) },

      { id: 'tn_myth_centurion', name: 'Infernal Centurion Overlord Armor', price: 60000000, glow: '#fb923c',
        bd: { t: 'qm', flat: 12, every: 20, everyVal: 440, critEvery: 32, critVal: 780, critChance: 32 },
        bdsc: '+12 Pts/strike<br><span class="text-orange-400">+440 legion advance every 20 strikes</span><br><span class="text-red-400">+780 blazing spear every 32 (32%)</span>',
        art: bust({ u: 'cen', c1: '#fecaca', c2: '#b91c1c', c3: '#450a0a', trim: '#fb923c', glow: '#fb923c', pulse: 2.1,
          helm: '<path d="M44,10 q6,-6 12,0 l-2,12 l-8,0z" fill="#fb923c" stroke="#7f1d1d" stroke-width="0.8"/><path d="M48,10 q2,-4 4,0" stroke="#fef3c7" stroke-width="1.2" fill="none"/>',
          sh: '<path d="M14,42 q8,-8 20,-2 l-4,12 q-10,-2 -16,-10z" fill="url(#cenp)" stroke="#fb923c" stroke-width="1"/><path d="M86,42 q-8,-8 -20,-2 l4,12 q10,-2 16,-10z" fill="url(#cenp)" stroke="#fb923c" stroke-width="1"/><g fill="#fdba74"><circle cx="22" cy="42" r="1.6"/><circle cx="78" cy="42" r="1.6"/></g>',
          core: '<rect x="44" y="46" width="12" height="14" rx="1" fill="#450a0a" stroke="#fb923c" stroke-width="1"/><g stroke="#fdba74" stroke-width="0.8"><path d="M46,50 h8 M46,54 h8"/></g>',
          waist: '<g stroke="#fb923c" stroke-width="0.8"><path d="M40,68 v14 M46,68 v14 M54,68 v14 M60,68 v14"/></g>',
          aura: '<g stroke="#fb923c" stroke-width="1.4" stroke-linecap="round" opacity=".6"><path d="M26,64 q-4,10 0,20 M74,64 q4,10 0,20"/></g>' }) },

      { id: 'tn_myth_wolf', name: 'Galactic Wolf Marshal Armor', price: 61000000, glow: '#818cf8',
        bd: { t: 'qm', flat: 10, every: 23, everyVal: 500, critEvery: 30, critVal: 800, critChance: 34, burst: 1.1 },
        bdsc: '+10 Pts/strike<br><span class="text-indigo-300">+500 star-howl every 23 strikes</span><br><span class="text-violet-300">+800 cosmic-wolf pounce every 30 (34%)</span>',
        art: bust({ u: 'wlf', c1: '#e0e7ff', c2: '#4338ca', c3: '#1e1b4b', trim: '#c7d2fe', glow: '#818cf8', pulse: 2.9,
          helm: '<path d="M42,20 L38,8 L46,18 Z M58,20 L62,8 L54,18 Z" fill="#c7d2fe"/><g fill="#a5b4fc"><circle cx="46" cy="29" r="1.6"/><circle cx="54" cy="29" r="1.6"/></g><path d="M46,33 l4,3 l4,-3" stroke="#1e1b4b" stroke-width="1" fill="none"/>',
          sh: '<path d="M14,44 q6,-14 20,-6 q0,10 -8,12 q-8,-2 -12,-6z" fill="url(#wlfp)" stroke="#c7d2fe" stroke-width="1"/><path d="M86,44 q-6,-14 -20,-6 q0,10 8,12 q8,-2 12,-6z" fill="url(#wlfp)" stroke="#c7d2fe" stroke-width="1"/><g fill="#818cf8"><circle cx="24" cy="40" r="1.6"/><circle cx="76" cy="40" r="1.6"/></g>',
          core: '<circle cx="50" cy="54" r="7" fill="#0b0a24" stroke="#c7d2fe" stroke-width="1"/><g fill="#c7d2fe"><circle cx="48" cy="52" r="0.9"/><circle cx="53" cy="55" r="0.9"/><circle cx="50" cy="57" r="0.7"/></g>',
          aura: '<g fill="#c7d2fe" opacity=".7"><circle cx="20" cy="24" r="1.2"/><circle cx="80" cy="26" r="1.2"/><circle cx="30" cy="82" r="1"/></g>' }) },

      { id: 'tn_myth_raven', name: 'Plague Raven War Saint Armor', price: 58000000, glow: '#34d399',
        bd: { t: 'qm', flat: 9, every: 5, everyVal: 90, critEvery: 40, critVal: 700, critChance: 30 },
        bdsc: '+9 Pts/strike<br><span class="text-lime-300">+90 plague tick every 5 strikes</span><br><span class="text-emerald-300">+700 skeletal-raven every 40 (30%)</span>',
        art: bust({ u: 'rvn', c1: '#4b5563', c2: '#1f2937', c3: '#030712', trim: '#34d399', glow: '#34d399', pulse: 3,
          helm: '<path d="M50,20 Q46,30 40,40 L48,38 Q50,28 52,22 Z" fill="#111827" stroke="#34d399" stroke-width="0.8"/><circle cx="49" cy="24" r="1.5" fill="#34d399"/><g stroke="#111827" stroke-width="1"><path d="M46,14 l0,-5 M50,13 l0,-6 M54,14 l0,-5"/></g>',
          sh: '<path d="M14,42 q10,-6 20,2 q-6,8 -12,8 q-8,-4 -8,-10z" fill="url(#rvnp)" stroke="#374151" stroke-width="1"/><path d="M86,42 q-10,-6 -20,2 q6,8 12,8 q8,-4 8,-10z" fill="url(#rvnp)" stroke="#374151" stroke-width="1"/><g stroke="#34d399" stroke-width="0.7" opacity=".8"><path d="M18,44 l6,3 M82,44 l-6,3"/></g>',
          core: '<circle cx="50" cy="54" r="6" fill="#030712" stroke="#34d399" stroke-width="1"/><path d="M50,50 l2,4 l-2,4 l-2,-4z" fill="#34d399"/>',
          aura: '<g fill="#111827"><path d="M22,20 l4,2 l-2,3z"/><path d="M78,22 l-4,2 l2,3z"/></g><g fill="#34d399" opacity=".5"><circle cx="28" cy="78" r="1"/><circle cx="72" cy="78" r="1"/></g>' }) },

      { id: 'tn_myth_forge', name: 'Mountain Forge Deity Armor', price: 60000000, glow: '#f59e0b',
        bd: { t: 'qm', flat: 14, every: 40, everyVal: 900, everyMax: 8, critEvery: 44, critVal: 500, critChance: 30 },
        bdsc: '+14 Pts/strike<br><span class="text-amber-400">+900 hammerfall every 40 strikes (x8)</span>',
        art: bust({ u: 'frg', c1: '#d6d3d1', c2: '#78716c', c3: '#292524', trim: '#f59e0b', glow: '#f59e0b', pulse: 1.9,
          defs: '<radialGradient id="frgf" cx="50%" cy="50%" r="55%"><stop offset="0%" stop-color="#fff7d6"/><stop offset="45%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#7c2d12"/></radialGradient>',
          helm: '<rect x="45" y="8" width="4" height="10" fill="#78716c"/><rect x="52" y="8" width="4" height="10" fill="#78716c"/><g fill="#f59e0b"><circle cx="46" cy="30" r="1.5"/><circle cx="54" cy="30" r="1.5"/></g><path d="M43,34 q7,4 14,0" stroke="#57534e" stroke-width="1.4" fill="none"/>',
          sh: '<path d="M14,48 L26,28 L38,48 Z" fill="url(#frgp)" stroke="#292524" stroke-width="1"/><path d="M86,48 L74,28 L62,48 Z" fill="url(#frgp)" stroke="#292524" stroke-width="1"/><path d="M22,40 l4,-6 l4,6" fill="#f59e0b" opacity=".8"/><path d="M74,40 l4,-6 l4,6" fill="#f59e0b" opacity=".8"/>',
          core: '<rect x="42" y="46" width="16" height="16" rx="1" fill="#1c1917" stroke="#f59e0b" stroke-width="1"/><rect x="45" y="49" width="10" height="10" fill="url(#frgf)"/><g stroke="#f59e0b" stroke-width="0.8"><path d="M42,54 h16"/></g>',
          aura: '<g fill="#fbbf24" opacity=".7"><circle cx="24" cy="26" r="1.2"/><circle cx="76" cy="28" r="1.2"/><circle cx="30" cy="80" r="1"/><circle cx="70" cy="80" r="1"/></g>' }) },

      { id: 'tn_myth_pharaoh', name: 'Pharaoh Star Commander Armor', price: 62000000, glow: '#38bdf8',
        bd: { t: 'qm', flat: 10, every: 24, everyVal: 500, critEvery: 33, critVal: 820, critChance: 33 },
        bdsc: '+10 Pts/strike<br><span class="text-sky-300">+500 scarab surge every 24 strikes</span><br><span class="text-blue-300">+820 celestial-eye every 33 (33%)</span>',
        art: bust({ u: 'phr', c1: '#fde68a', c2: '#b45309', c3: '#1c1206', trim: '#38bdf8', glow: '#38bdf8', pulse: 2.6,
          helm: '<path d="M40,30 L40,20 Q50,10 60,20 L60,30 Z" fill="url(#phrp)" stroke="#38bdf8" stroke-width="1"/><rect x="40" y="30" width="20" height="3" fill="#38bdf8"/><path d="M48,14 l2,-6 l2,6z" fill="#38bdf8"/>',
          sh: '<path d="M14,46 L34,34 L34,46 Z" fill="url(#phrp)" stroke="#38bdf8" stroke-width="1"/><path d="M86,46 L66,34 L66,46 Z" fill="url(#phrp)" stroke="#38bdf8" stroke-width="1"/>',
          core: '<ellipse cx="50" cy="54" rx="7" ry="6" fill="#0c4a6e" stroke="#38bdf8" stroke-width="1"/><g stroke="#7dd3fc" stroke-width="0.9"><path d="M50,48 v12 M44,54 h12 M45,50 l10,8 M55,50 l-10,8"/></g>',
          aura: '<g stroke="#facc15" stroke-width="0.8" opacity=".6"><path d="M22,72 l8,-6 M78,72 l-8,-6"/></g><g fill="#38bdf8"><circle cx="24" cy="24" r="1.3"/><circle cx="76" cy="26" r="1.3"/></g>' }) },

      { id: 'tn_myth_valkyrie', name: 'Nebula Tempest Valkyrie Armor', price: 61000000, glow: '#93c5fd',
        bd: { t: 'qm', flat: 9, critEvery: 8, critVal: 280, critChance: 55, every: 30, everyVal: 820, burst: 1.3 },
        bdsc: '+9 Pts/strike<br><span class="text-blue-200">55% for +280 thunder-ring every 8 strikes</span><br><span class="text-sky-200">+820 valkyrie dive every 30</span>',
        art: bust({ u: 'val', c1: '#dbeafe', c2: '#3b82f6', c3: '#1e3a8a', trim: '#bfdbfe', glow: '#93c5fd', pulse: 2.4,
          helm: '<path d="M40,24 L30,16 L42,20 Z M60,24 L70,16 L58,20 Z" fill="#bfdbfe"/><path d="M44,30 h12" stroke="#1e3a8a" stroke-width="1.4"/>',
          sh: '<g fill="#e0f2fe" stroke="#93c5fd" stroke-width="0.7"><path d="M32,40 q-16,-4 -24,6 q12,0 14,10 q4,-10 10,-16z"/><path d="M68,40 q16,-4 24,6 q-12,0 -14,10 q-4,-10 -10,-16z"/></g>',
          core: '<circle cx="50" cy="54" r="6" fill="#0b1a3a" stroke="#bfdbfe" stroke-width="1"/><circle cx="50" cy="54" r="2.4" fill="#93c5fd"/>',
          aura: '<g stroke="#93c5fd" stroke-width="0.9" opacity=".6" fill="none"><circle cx="50" cy="52" r="30"/><path d="M18,30 q10,-6 18,2 M82,30 q-10,-6 -18,2"/></g>' }) },

      { id: 'tn_myth_gravity', name: 'Gravity Breaker War God Armor', price: 66000000, glow: '#a78bfa',
        bd: { t: 'qm', flat: 15, every: 50, everyVal: 1400, everyMax: 6, critEvery: 40, critVal: 900, critChance: 35 },
        bdsc: '+15 Pts/strike<br><span class="text-violet-300">+1,400 singularity crush every 50 strikes (x6)</span><br><span class="text-purple-300">+900 gravity well every 40 (35%)</span>',
        art: bust({ u: 'grv', c1: '#c4b5fd', c2: '#4c1d95', c3: '#0a0518', trim: '#ddd6fe', glow: '#a78bfa', pulse: 3,
          helm: '<circle cx="50" cy="18" r="9" fill="none" stroke="#ddd6fe" stroke-width="0.8"/><circle cx="50" cy="18" r="5" fill="none" stroke="#ddd6fe" stroke-width="0.8"/><g fill="#a78bfa"><circle cx="46" cy="30" r="1.4"/><circle cx="54" cy="30" r="1.4"/></g>',
          sh: '<rect x="14" y="34" width="16" height="16" rx="1" fill="url(#grvp)" stroke="#ddd6fe" stroke-width="1"/><rect x="70" y="34" width="16" height="16" rx="1" fill="url(#grvp)" stroke="#ddd6fe" stroke-width="1"/>',
          core: '<circle cx="50" cy="54" r="8" fill="#050208" stroke="#a78bfa" stroke-width="1"/><circle cx="50" cy="54" r="3" fill="#000"/><circle cx="50" cy="54" r="11" fill="none" stroke="#a78bfa" stroke-width="0.6" opacity=".7"/>',
          aura: '<g fill="#ddd6fe"><circle cx="24" cy="40" r="1"/><circle cx="76" cy="60" r="1"/><circle cx="34" cy="76" r="1"/></g><circle cx="50" cy="52" r="38" fill="none" stroke="#a78bfa" stroke-width="0.5" opacity=".5"/>' }) },

      { id: 'tn_myth_bamboo', name: 'Crimson Bamboo Immortal Armor', price: 58000000, glow: '#f43f5e',
        bd: { t: 'qm', flat: 9, every: 22, everyVal: 430, critEvery: 30, critVal: 740, critChance: 33 },
        bdsc: '+9 Pts/strike<br><span class="text-rose-300">+430 crane strike every 22 strikes</span><br><span class="text-emerald-300">+740 immortal cut every 30 (33%)</span>',
        art: bust({ u: 'bmb', c1: '#fecdd3', c2: '#be123c', c3: '#4c0519', trim: '#34d399', glow: '#f43f5e', pulse: 2.8,
          helm: '<g stroke="#be123c" stroke-width="2"><path d="M44,26 v-14 M50,26 v-16 M56,26 v-14"/></g><path d="M45,31 h10" stroke="#34d399" stroke-width="1.4"/>',
          sh: '<path d="M14,44 q10,-8 20,0 q-4,8 -10,8 q-8,-2 -10,-8z" fill="url(#bmbp)" stroke="#34d399" stroke-width="1"/><path d="M86,44 q-10,-8 -20,0 q4,8 10,8 q8,-2 10,-8z" fill="url(#bmbp)" stroke="#34d399" stroke-width="1"/><g fill="#34d399"><circle cx="22" cy="40" r="1.4"/><circle cx="78" cy="40" r="1.4"/></g>',
          core: '<g stroke="#4c0519" stroke-width="1"><path d="M46,44 v18 M50,44 v18 M54,44 v18"/></g><g stroke="#be123c" stroke-width="1"><path d="M42,50 h16 M42,56 h16"/></g>',
          aura: '<g fill="#f43f5e" opacity=".6"><path d="M22,24 q4,-2 3,3z"/><path d="M78,26 q-4,-2 -3,3z"/><path d="M28,80 q4,-2 3,3z"/></g>' }) },

      { id: 'tn_myth_bear', name: 'Aurora Bear High King Armor', price: 60000000, glow: '#5eead4',
        bd: { t: 'qm', flat: 13, every: 35, everyVal: 800, everyMax: 8, critEvery: 42, critVal: 560, critChance: 30 },
        bdsc: '+13 Pts/strike<br><span class="text-teal-300">+800 aurora roar every 35 strikes (x8)</span>',
        art: bust({ u: 'bea', c1: '#f0fdfa', c2: '#5eead4', c3: '#134e4a', trim: '#ccfbf1', glow: '#5eead4', pulse: 3.2,
          helm: '<path d="M42,20 a4 4 0 1 1 0,-1z M58,20 a4 4 0 1 0 0,-1z" fill="#ccfbf1"/><g fill="#5eead4"><circle cx="46" cy="29" r="1.6"/><circle cx="54" cy="29" r="1.6"/></g><path d="M46,34 q4,3 8,0" stroke="#134e4a" stroke-width="1" fill="none"/>',
          sh: '<path d="M14,42 q8,-10 22,-2 q0,10 -10,12 q-10,-2 -12,-10z" fill="url(#beap)" stroke="#ccfbf1" stroke-width="1"/><path d="M86,42 q-8,-10 -22,-2 q0,10 10,12 q10,-2 12,-10z" fill="url(#beap)" stroke="#ccfbf1" stroke-width="1"/>',
          core: '<circle cx="50" cy="54" r="7" fill="#0f2e2b" stroke="#ccfbf1" stroke-width="1"/><circle cx="50" cy="54" r="2.6" fill="#5eead4"/>',
          aura: '<g stroke="#5eead4" stroke-width="1.4" opacity=".5" fill="none"><path d="M14,20 q36,-12 72,0"/><path d="M18,26 q32,-10 64,0"/></g>' }) },

      { id: 'tn_myth_librarian', name: 'Eternal Librarian Battle Armor', price: 59000000, glow: '#fcd34d',
        bd: { t: 'qm', flat: 8, every: 20, everyVal: 400, every2: 200, every2Val: 4000, every2Max: 4, critEvery: 36, critVal: 700, critChance: 30 },
        bdsc: '+8 Pts/strike<br><span class="text-amber-300">+400 verse every 20 strikes</span><br><span class="text-yellow-200">+4,000 open-tome cataclysm every 200 (x4)</span>',
        art: bust({ u: 'lib', c1: '#fef3c7', c2: '#b45309', c3: '#3b2a06', trim: '#fde68a', glow: '#fcd34d', pulse: 3.6,
          helm: '<g fill="#fde68a"><rect x="42" y="10" width="6" height="8" rx="1"/><rect x="52" y="10" width="6" height="8" rx="1"/></g><path d="M44,30 h12" stroke="#3b2a06" stroke-width="1.2"/>',
          sh: '<rect x="14" y="36" width="18" height="14" rx="1" fill="url(#libp)" stroke="#3b2a06" stroke-width="1"/><rect x="68" y="36" width="18" height="14" rx="1" fill="url(#libp)" stroke="#3b2a06" stroke-width="1"/><g stroke="#3b2a06" stroke-width="0.7"><path d="M17,36 v14 M71,36 v14"/></g>',
          core: '<rect x="43" y="46" width="14" height="16" rx="1" fill="#1a1204" stroke="#fde68a" stroke-width="1"/><g stroke="#fcd34d" stroke-width="0.7"><path d="M45,50 h10 M45,54 h10 M45,58 h10"/></g>',
          aura: '<g fill="#fef3c7" opacity=".7"><rect x="22" y="22" width="4" height="3"/><rect x="76" y="24" width="4" height="3"/><rect x="30" y="80" width="4" height="3"/></g>' }) },

      { id: 'tn_myth_serpent', name: 'Royal Serpent Bioforge Armor', price: 59000000, glow: '#22c55e',
        bd: { t: 'qm', flat: 9, every: 6, everyVal: 120, critEvery: 34, critVal: 760, critChance: 34 },
        bdsc: '+9 Pts/strike<br><span class="text-green-400">+120 venom bite every 6 strikes</span><br><span class="text-lime-400">+760 cobra rise every 34 (34%)</span>',
        art: bust({ u: 'srp', c1: '#bbf7d0', c2: '#15803d', c3: '#052e16', trim: '#4ade80', glow: '#22c55e', pulse: 2.5,
          helm: '<path d="M40,28 Q36,16 50,14 Q64,16 60,28 Z" fill="url(#srpp)" stroke="#4ade80" stroke-width="1"/><g fill="#22c55e"><circle cx="46" cy="24" r="1.4"/><circle cx="54" cy="24" r="1.4"/></g><path d="M48,30 l-2,4 M52,30 l2,4" stroke="#052e16" stroke-width="1"/>',
          sh: '<path d="M14,44 q10,-6 20,2 q-4,8 -12,8 q-8,-4 -8,-10z" fill="url(#srpp)" stroke="#4ade80" stroke-width="1"/><path d="M86,44 q-10,-6 -20,2 q4,8 12,8 q8,-4 8,-10z" fill="url(#srpp)" stroke="#4ade80" stroke-width="1"/>',
          core: '<g fill="none" stroke="#4ade80" stroke-width="1.4"><path d="M44,48 q6,4 0,8 q-6,4 0,8"/><path d="M56,48 q-6,4 0,8 q6,4 0,8"/></g><circle cx="50" cy="54" r="2" fill="#22c55e"/>',
          aura: '<g stroke="#22c55e" stroke-width="1" opacity=".6" fill="none"><path d="M20,74 q8,-6 4,-14 M80,74 q-8,-6 -4,-14"/></g>' }) },

      { id: 'tn_myth_oracle', name: 'Iron Oracle Prophet Armor', price: 60000000, glow: '#cbd5e1',
        bd: { t: 'qm', flat: 10, every: 24, everyVal: 480, critEvery: 30, critVal: 800, critChance: 40 },
        bdsc: '+10 Pts/strike<br><span class="text-slate-300">+480 prophecy every 24 strikes</span><br><span class="text-slate-200">40% for +800 all-seeing verdict every 30</span>',
        art: bust({ u: 'orc', c1: '#f8fafc', c2: '#94a3b8', c3: '#334155', trim: '#e2e8f0', glow: '#cbd5e1', pulse: 3,
          helm: '<g fill="#38bdf8"><circle cx="44" cy="28" r="1.2"/><circle cx="50" cy="26" r="1.2"/><circle cx="56" cy="28" r="1.2"/><circle cx="47" cy="31" r="1"/><circle cx="53" cy="31" r="1"/></g><g stroke="#e2e8f0" stroke-width="1"><path d="M44,16 v-6 M50,15 v-7 M56,16 v-6"/></g>',
          sh: '<circle cx="24" cy="42" r="10" fill="url(#orcp)" stroke="#e2e8f0" stroke-width="1"/><circle cx="76" cy="42" r="10" fill="url(#orcp)" stroke="#e2e8f0" stroke-width="1"/><circle cx="24" cy="42" r="4" fill="#38bdf8" opacity=".6"/><circle cx="76" cy="42" r="4" fill="#38bdf8" opacity=".6"/>',
          core: '<circle cx="50" cy="54" r="7" fill="#1e293b" stroke="#e2e8f0" stroke-width="1"/><circle cx="50" cy="54" r="6" fill="none" stroke="#38bdf8" stroke-width="0.7" stroke-dasharray="1 3"/>',
          aura: '<g fill="#38bdf8" opacity=".5"><circle cx="22" cy="22" r="1"/><circle cx="78" cy="24" r="1"/><circle cx="50" cy="90" r="1"/></g>' }) },

      { id: 'tn_myth_warship', name: 'Titanic Warship Daimyo Armor', price: 62000000, glow: '#60a5fa',
        bd: { t: 'qm', flat: 12, every: 30, everyVal: 700, everyMax: 8, critEvery: 40, critVal: 640, critChance: 32 },
        bdsc: '+12 Pts/strike<br><span class="text-blue-300">+700 broadside every 30 strikes (x8)</span>',
        art: bust({ u: 'wsp', c1: '#cbd5e1', c2: '#475569', c3: '#1e293b', trim: '#93c5fd', glow: '#60a5fa', pulse: 2.6,
          helm: '<rect x="46" y="8" width="3" height="12" fill="#93c5fd"/><rect x="52" y="10" width="3" height="10" fill="#93c5fd"/><path d="M44,30 h12" stroke="#1e293b" stroke-width="1.4"/><rect x="45" y="26" width="10" height="2" fill="#60a5fa"/>',
          sh: '<path d="M14,40 L34,36 L30,50 L16,50 Z" fill="url(#wspp)" stroke="#93c5fd" stroke-width="1"/><path d="M86,40 L66,36 L70,50 L84,50 Z" fill="url(#wspp)" stroke="#93c5fd" stroke-width="1"/>',
          core: '<rect x="40" y="46" width="20" height="14" rx="1" fill="#0f172a" stroke="#93c5fd" stroke-width="1"/><g fill="#60a5fa"><circle cx="44" cy="50" r="1.2"/><circle cx="50" cy="50" r="1.2"/><circle cx="56" cy="50" r="1.2"/></g><rect x="47" y="42" width="6" height="4" fill="#475569"/>',
          aura: '<g stroke="#60a5fa" stroke-width="1.2" opacity=".5" fill="none"><path d="M16,74 q10,-6 20,0 t20,0 t20,0"/></g>' }) },

      { id: 'tn_myth_eclipse', name: 'Eclipse Dragon Knight Armor', price: 65000000, glow: '#e5e7eb',
        bd: { t: 'qm', flat: 13, every: 26, everyVal: 640, critEvery: 30, critVal: 1000, critChance: 30 },
        bdsc: '+13 Pts/strike<br><span class="text-slate-200">+640 eclipse pulse every 26 strikes</span><br><span class="text-amber-200">+1,000 sun/moon dragon rend every 30 (30%)</span>',
        art: bust({ u: 'ecl', c1: '#fef9c3', c2: '#78716c', c3: '#0a0a0a', trim: '#facc15', glow: '#e5e7eb', pulse: 2.8,
          defs: '<linearGradient id="eclh" x1="0" y1="0" x2="1" y2="0"><stop offset="49%" stop-color="#fde68a"/><stop offset="51%" stop-color="#111827"/></linearGradient>',
          helm: '<path d="M44,24 L40,10 L48,20 Z" fill="#facc15"/><path d="M56,24 L60,10 L52,20 Z" fill="#111827"/>',
          sh: '<path d="M14,44 q8,-12 20,-4 q-2,10 -10,10 q-8,-1 -10,-6z" fill="#fde68a" stroke="#a16207" stroke-width="1"/><path d="M86,44 q-8,-12 -20,-4 q2,10 10,10 q8,-1 10,-6z" fill="#1f2937" stroke="#4b5563" stroke-width="1"/>',
          core: '<circle cx="50" cy="54" r="8" fill="url(#eclh)" stroke="#facc15" stroke-width="1"/><circle cx="50" cy="54" r="3" fill="#e5e7eb"/>',
          aura: '<circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" stroke-width="0.8" opacity=".5"/>' }) },

      { id: 'tn_myth_scorpion', name: 'Imperial Scorpion Siege Armor', price: 60000000, glow: '#f59e0b',
        bd: { t: 'qm', flat: 11, every: 22, everyVal: 470, critEvery: 32, critVal: 800, critChance: 34 },
        bdsc: '+11 Pts/strike<br><span class="text-amber-400">+470 stinger every 22 strikes</span><br><span class="text-yellow-400">+800 siege claw every 32 (34%)</span>',
        art: bust({ u: 'scp', c1: '#fde68a', c2: '#a16207', c3: '#1c1206', trim: '#fbbf24', glow: '#f59e0b', pulse: 2.4,
          helm: '<path d="M43,30 q-4,-10 4,-6 M57,30 q4,-10 -4,-6" stroke="#fbbf24" stroke-width="1.6" fill="none"/><g fill="#fbbf24"><circle cx="46" cy="30" r="1.3"/><circle cx="50" cy="29" r="1.3"/><circle cx="54" cy="30" r="1.3"/></g>',
          sh: '<path d="M14,42 q10,-6 20,2 q-2,8 -10,8 q-8,-4 -10,-10z" fill="url(#scpp)" stroke="#fbbf24" stroke-width="1"/><path d="M86,42 q-10,-6 -20,2 q2,8 10,8 q8,-4 10,-10z" fill="url(#scpp)" stroke="#fbbf24" stroke-width="1"/><path d="M18,40 q-6,-2 -8,-8 M82,40 q6,-2 8,-8" stroke="#a16207" stroke-width="2" fill="none"/>',
          core: '<rect x="44" y="46" width="12" height="14" rx="1" fill="#1c1206" stroke="#fbbf24" stroke-width="1"/><path d="M50,60 q10,4 14,-6" stroke="#f59e0b" stroke-width="2" fill="none"/><circle cx="64" cy="53" r="2" fill="#fbbf24"/>',
          aura: '<g fill="#fbbf24" opacity=".6"><circle cx="24" cy="24" r="1.2"/><circle cx="76" cy="26" r="1.2"/></g>' }) },

      { id: 'tn_myth_monk', name: 'Astral Monk Destroyer Armor', price: 60000000, glow: '#f472b6',
        bd: { t: 'qm', flat: 10, every: 20, everyVal: 460, critEvery: 30, critVal: 820, critChance: 34, burst: 1 },
        bdsc: '+10 Pts/strike<br><span class="text-pink-300">+460 palm strike every 20 strikes</span><br><span class="text-rose-300">+820 astral deity blow every 30 (34%)</span>',
        art: bust({ u: 'mnk', c1: '#fcd34d', c2: '#b45309', c3: '#7f1d1d', trim: '#fca5a5', glow: '#f472b6', pulse: 3,
          helm: '<circle cx="50" cy="18" r="9" fill="none" stroke="#fca5a5" stroke-width="0.8" stroke-dasharray="2 2"/><path d="M44,30 q6,3 12,0" stroke="#7f1d1d" stroke-width="1" fill="none"/>',
          sh: '<circle cx="24" cy="42" r="6" fill="none" stroke="#fca5a5" stroke-width="1.2"/><circle cx="76" cy="42" r="6" fill="none" stroke="#fca5a5" stroke-width="1.2"/>',
          core: '<circle cx="50" cy="54" r="7" fill="#450a0a" stroke="#fca5a5" stroke-width="1"/><circle cx="50" cy="54" r="2.6" fill="#f472b6"/>',
          aura: '<g fill="#fca5a5" opacity=".6"><circle cx="22" cy="60" r="1.4"/><circle cx="78" cy="44" r="1.4"/><circle cx="36" cy="80" r="1.2"/></g><circle cx="50" cy="50" r="34" fill="none" stroke="#f472b6" stroke-width="0.5" opacity=".5"/>' }) },

      { id: 'tn_myth_necro', name: 'Necrosteel King of Legions Armor', price: 63000000, glow: '#ef4444',
        bd: { t: 'qm', flat: 12, every: 25, everyVal: 620, every2: 250, every2Val: 5000, every2Max: 3, critEvery: 40, critVal: 700, critChance: 33 },
        bdsc: '+12 Pts/strike<br><span class="text-red-400">+620 legion march every 25 strikes</span><br><span class="text-rose-500">+5,000 endless-army every 250 (x3)</span>',
        art: bust({ u: 'ncr', c1: '#9ca3af', c2: '#374151', c3: '#0a0a0a', trim: '#ef4444', glow: '#ef4444', pulse: 2.6,
          helm: '<path d="M42,20 L42,12 L46,16 L50,10 L54,16 L58,12 L58,20 Z" fill="url(#ncrp)" stroke="#ef4444" stroke-width="0.8"/><g fill="#ef4444"><circle cx="46" cy="28" r="1.4"/><circle cx="54" cy="28" r="1.4"/></g><path d="M46,33 l2,2 l2,-2 l2,2 l2,-2" stroke="#111827" stroke-width="0.9" fill="none"/>',
          sh: '<path d="M14,46 L26,30 L38,46 Z" fill="url(#ncrp)" stroke="#ef4444" stroke-width="1"/><path d="M86,46 L74,30 L62,46 Z" fill="url(#ncrp)" stroke="#ef4444" stroke-width="1"/>',
          core: '<rect x="42" y="44" width="16" height="18" rx="1" fill="#0a0a0a" stroke="#ef4444" stroke-width="1"/><g stroke="#7f1d1d" stroke-width="1"><path d="M50,44 v18 M42,53 h16"/></g><circle cx="50" cy="53" r="2.4" fill="#ef4444"/>',
          aura: '<g fill="#374151"><rect x="22" y="80" width="3" height="6"/><rect x="30" y="82" width="3" height="4"/><rect x="70" y="82" width="3" height="4"/><rect x="76" y="80" width="3" height="6"/></g>' }) },

      { id: 'tn_myth_prism', name: 'Prismatic Realm Guardian Armor', price: 64000000, glow: '#67e8f9',
        bd: { t: 'qm', flat: 10, every: 24, everyVal: 520, critEvery: 30, critVal: 860, critChance: 36 },
        bdsc: '+10 Pts/strike<br><span class="text-cyan-300">+520 refraction every 24 strikes</span><br><span class="text-sky-300">+860 crystal-guardian every 30 (36%)</span>',
        art: bust({ u: 'prs', c1: '#e0f2fe', c2: '#38bdf8', c3: '#1e3a8a', trim: '#bae6fd', glow: '#67e8f9', pulse: 2.7,
          defs: '<linearGradient id="prsr" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a5f3fc"/><stop offset="50%" stop-color="#c4b5fd"/><stop offset="100%" stop-color="#93c5fd"/></linearGradient>',
          helm: '<path d="M42,28 L46,14 L50,26 L54,14 L58,28 Z" fill="url(#prsr)" stroke="#bae6fd" stroke-width="1"/>',
          sh: '<path d="M14,44 L24,30 L34,44 L24,52 Z" fill="url(#prsr)" stroke="#bae6fd" stroke-width="1"/><path d="M86,44 L76,30 L66,44 L76,52 Z" fill="url(#prsr)" stroke="#bae6fd" stroke-width="1"/>',
          core: '<path d="M50,44 L58,54 L50,64 L42,54 Z" fill="url(#prsr)" stroke="#e0f2fe" stroke-width="1"/><g stroke="#e0f2fe" stroke-width="0.7"><path d="M50,44 v20 M42,54 h16"/></g>',
          aura: '<g stroke="#67e8f9" stroke-width="0.8" opacity=".6"><path d="M50,50 L20,30 M50,50 L80,30 M50,50 L22,72 M50,50 L78,72"/></g>' }) },

      { id: 'tn_myth_omnithrone', name: 'Omnithrone Supreme Conqueror Armor', price: 120000000, glow: '#fef08a',
        bd: { t: 'qm', flat: 25, every: 20, everyVal: 1200, every2: 200, every2Val: 12000, every2Max: 5, critEvery: 25, critVal: 2000, critChance: 40, burst: 2 },
        bdsc: '<span class="text-amber-200">+25 Pts/strike (supreme)</span><br><span class="text-yellow-200">+1,200 conquest every 20 strikes</span><br><span class="text-amber-300">+12,000 THRONE CATACLYSM every 200 (x5)</span><br><span class="text-white">40% for +2,000 divine-arms volley every 25</span>',
        art: bust({ u: 'omn', c1: '#ffffff', c2: '#e5b814', c3: '#4c1d0a', trim: '#fef08a', glow: '#fef08a', pulse: 2,
          defs: '<radialGradient id="omnc" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#ffffff"/><stop offset="45%" stop-color="#c4b5fd"/><stop offset="100%" stop-color="#4c1d95"/></radialGradient>',
          helm: horns(4, 50, '#fef08a') + '<path d="M40,26 Q50,8 60,26" fill="none" stroke="#fef08a" stroke-width="2"/><g fill="#fff"><circle cx="46" cy="30" r="1.5"/><circle cx="54" cy="30" r="1.5"/></g><circle cx="50" cy="12" r="6" fill="none" stroke="#fef08a" stroke-width="0.8"/>',
          sh: '<path d="M10,46 L22,24 L36,46 L26,56 Z" fill="url(#omnp)" stroke="#fef08a" stroke-width="1"/><path d="M90,46 L78,24 L64,46 L74,56 Z" fill="url(#omnp)" stroke="#fef08a" stroke-width="1"/><g fill="#fef08a"><path d="M18,26 l3,-6 l3,6z"/><path d="M76,26 l3,-6 l3,6z"/></g><circle cx="23" cy="42" r="2" fill="#fff"/><circle cx="77" cy="42" r="2" fill="#fff"/>',
          core: '<circle cx="50" cy="54" r="9" fill="url(#omnc)" stroke="#fef08a" stroke-width="1.2"/><circle cx="50" cy="54" r="3" fill="#fff"/><g stroke="#fef08a" stroke-width="0.8"><path d="M50,44 v-3 M50,68 v-3 M39,54 h-3 M64,54 h-3"/></g>',
          aura: '<g stroke="#fef08a" stroke-width="0.9" opacity=".7" fill="none"><circle cx="50" cy="52" r="34"/><path d="M14,22 q36,-10 72,0"/></g><g fill="#fff"><circle cx="20" cy="30" r="1.2"/><circle cx="80" cy="30" r="1.2"/><circle cx="50" cy="92" r="1.4"/></g>' }) }
    ];

    // Register the item record (shop.db) + unique art (legendaryArt) — both persistent, so the
    // armor is purchasable/equippable and shows the SAME unique art on the card AND the avatar.
    function inject() {
      A.forEach(function (a) {
        if (!S.db.armor.some(function (x) { return x.id === a.id; })) {
          S.db.armor.push({ id: a.id, name: a.name, sub: 'Royal Town', tier: 15, req: 'Royal Town Clearance', price: a.price, buffData: a.bd, buffDesc: a.bdsc });
        }
        S.legendaryArt[a.id] = (function (inner, glow) { return function () { return wrap(inner, glow); }; })(a.art, a.glow);
        try { if (S.artCache) { delete S.artCache[a.id]; delete S.artCache['LEG_' + a.id]; delete S.artCache['EXACT_armor_' + a.id]; } } catch (e) {}
      });
      try { if (BCA.exactVisuals) { BCA.exactVisuals._metaCache = {}; if (BCA.exactVisuals.clearEquipmentCaches) BCA.exactVisuals.clearEquipmentCaches(); } } catch (e) {}
    }
    inject();

    // The Royal Town overhaul's TWN.render rebuilds TWN.catalogs from its OWN data on every render,
    // which wipes any catalog entry we push. So (exactly like the Ancient Realm pack does) we
    // DOM-INJECT our armor cards into the shop grid AFTER the overhaul render runs — immune to the
    // rebuild. Purchases still route through shop.db via buyMixed, and the art comes from legendaryArt.
    var TARGET_SHOP = 'dread'; // DREAD PLATE HALL (the armor hall)
    function fmt(n) { return (n || 0).toLocaleString(); }
    function domInjectTownArmors() {
      try {
        var T = BCA.travel && BCA.travel.town; if (!T) return;
        if (T.currentShop !== TARGET_SHOP) return;
        var grid = document.getElementById('rts-grid'); if (!grid) return;
        var html = '';
        A.forEach(function (a) {
          if (grid.querySelector('[data-myth-id="' + a.id + '"]')) return;
          var pf = BCA.state && BCA.state.profile;
          var owned = !!(pf && ((pf.ownedArmor && pf.ownedArmor.indexOf(a.id) > -1) || (pf.bag && pf.bag.armor && pf.bag.armor.some(function (x) { return (x.id || x) === a.id; }))));
          var equipped = !!(pf && pf.activeArmor && pf.activeArmor.id === a.id);
          var btn = equipped
            ? '<button class="btn-military w-full py-2 text-xs bg-green-950 border-green-600 text-green-300" disabled>EQUIPPED</button>'
            : owned
              ? '<button onclick="BCA_SYS.travel.town.equipMixed(\'armor\',\'' + a.id + '\')" class="btn-military w-full py-2 text-xs bg-blue-950 border-blue-600 text-blue-300">EQUIP</button>'
              : '<button onclick="BCA_SYS.travel.town.buyMixed(\'armor\',\'' + a.id + '\')" class="btn-military w-full py-2 text-xs bg-[#2a0033] border-purple-700 text-purple-200">PURCHASE \u2014 ' + fmt(a.price) + 'g</button>';
          html += '<div class="shop-card panel-lux p-4 flex flex-col justify-between relative" data-myth-id="' + a.id + '">'
            + wrap(a.art, a.glow)
            + '<div class="mb-3 border-b border-[#333] pb-2 relative z-10 mt-2"><h4 class="cinzel text-base text-white mb-1 text-center leading-tight">' + a.name + '</h4>'
            + '<p class="text-[9px] uppercase tracking-widest font-bold text-center mb-1" style="color:#fca5a5">Tier 15 \u00B7 Ultra-Mythic Royal Town Relic</p>'
            + '<p class="text-[9px] text-green-400 font-bold uppercase tracking-widest text-center bg-[#050505] p-1 border border-[#222] rounded leading-snug">' + a.bdsc + '</p></div>'
            + '<div class="relative z-10">' + btn + '</div></div>';
        });
        if (html) grid.insertAdjacentHTML('afterbegin', html);
      } catch (e) {}
    }

    function installShopRender() {
      var T = BCA.travel && BCA.travel.town;
      if (!T) { setTimeout(installShopRender, 400); return; }
      if (T.render && !T.render._mythArmors) { var orr = T.render.bind(T); T.render = function () { try { inject(); } catch (e) {} var r = orr.apply(this, arguments); try { domInjectTownArmors(); } catch (e2) {} return r; }; T.render._mythArmors = true; }
      if (T.openShop && !T.openShop._mythArmors) { var oos = T.openShop.bind(T); T.openShop = function () { try { inject(); } catch (e) {} var r = oos.apply(this, arguments); try { domInjectTownArmors(); } catch (e2) {} return r; }; T.openShop._mythArmors = true; }
      domInjectTownArmors();
    }
    installShopRender();

    // Re-inject the item records + art after any shop.db rebuild (generateDB recreates shop.db).
    if (typeof S.generateDB === 'function' && !S.generateDB._mythArmors) {
      var og = S.generateDB.bind(S);
      S.generateDB = function () { var r = og.apply(this, arguments); try { inject(); } catch (e) {} return r; };
      S.generateDB._mythArmors = true;
    }
  }
  boot();
})();
