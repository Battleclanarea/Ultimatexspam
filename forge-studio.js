/* =============================================================================
   FORGE STUDIO — professional, layer-based vector item editor for admins.
   A no-code creation suite: every item is a stack of editable LAYERS (parts,
   decorations, effects). Each layer can be selected, moved, scaled, stretched,
   rotated, mirrored, recolored, textured, glowed, hidden, locked, duplicated,
   grouped, reordered, copied/pasted, randomized and reset independently.
   Real materials + lighting come from SVG gradients/filters; decorations blend
   into the item silhouette (clip-to-body) instead of looking pasted on; a
   procedural variation engine keeps reused parts unique. Includes one-click
   quality ops, a quality analyzer, undo/redo, templates/presets, import/export,
   version history, multi-preview (rotate/zoom/pan/light), and an Upgrade mode
   that loads any existing item as editable layers while preserving its identity.

   This is the 2D vector-equivalent of the requested suite (the game's art system
   is procedural SVG, not a 3D engine): "3D preview" = rotate/zoom/pan + light
   direction; "sculpt/bevel/taper" = live shape parameters; "thousands of
   decorations" = procedural libraries with a per-placement variation engine.

   Pure engine functions are exported for Node tests; DOM/UI only runs in-browser.
   ========================================================================== */
(function () {
  'use strict';

  /* ----------------------------- utilities ------------------------------- */
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hashStr(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return mulberry32(hashStr(seed)); }
  function uid(p) { return (p || 'l') + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  function clamp(n, a, b) { n = +n; if (isNaN(n)) n = a; return Math.max(a, Math.min(b, n)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function rr(R, a, b) { return a + (b - a) * R(); }
  function ri(R, a, b) { return Math.round(rr(R, a, b)); }
  function n2(n) { return Math.round(n * 100) / 100; }

  function hexToRgb(h) { h = String(h || '#888').replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; var n = parseInt(h, 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
  function rgbToHex(r, g, b) { function c(x) { x = Math.round(clamp(x, 0, 255)).toString(16); return x.length < 2 ? '0' + x : x; } return '#' + c(r) + c(g) + c(b); }
  function shade(h, amt) { var c = hexToRgb(h); var t = amt < 0 ? 0 : 255, p = Math.abs(amt); return rgbToHex(c.r + (t - c.r) * p, c.g + (t - c.g) * p, c.b + (t - c.b) * p); }
  function mix(a, b, t) { var x = hexToRgb(a), y = hexToRgb(b); return rgbToHex(x.r + (y.r - x.r) * t, x.g + (y.g - x.g) * t, x.b + (y.b - x.b) * t); }
  function hsvToHex(h, s, v) { h = (h % 360 + 360) % 360; s = clamp(s, 0, 1); v = clamp(v, 0, 1); var c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c, r = 0, g = 0, b = 0; if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; } return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255); }
  function hexToHsv(hex) { var c = hexToRgb(hex), r = c.r / 255, g = c.g / 255, b = c.b / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0; if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return { h: Math.round(h), s: mx ? d / mx : 0, v: mx }; }

  /* --------------------------- shape primitives -------------------------- */
  // All generators draw CENTERED on the origin (0,0), roughly within
  // [-40..40] x [-48..48]; the renderer positions/scales/rotates them.
  function poly(pts) { return 'M' + pts.map(function (p) { return n2(p[0]) + ',' + n2(p[1]); }).join(' L') + ' Z'; }

  /* ------------------------------ PART LIBRARY --------------------------- */
  // gen(layer, R, ctx) -> { d: '<svg-inner>', sil: 'pathD' (silhouette for clip) }
  // ctx: { lg, rg, edge, accent, glow } ids/colors provided by the renderer.
  var PARTS = {
    blade: function (l, R, c) {
      var w = 7 + (l.params.width || 0) * 6, len = 40 + (l.params.height || 0) * 10, taper = 0.15 + (l.params.taper || 0) * 0.5, cur = (l.params.curvature || 0) * 10;
      var tipY = -len, midw = w * (1 - taper);
      var d = 'M0,' + n2(tipY) + ' C' + n2(w * 0.6 + cur) + ',' + n2(tipY * 0.62) + ' ' + n2(midw) + ',' + n2(tipY * 0.28) + ' ' + n2(w) + ',18'
        + ' L' + n2(-w) + ',18 C' + n2(-midw) + ',' + n2(tipY * 0.28) + ' ' + n2(-w * 0.6 + cur) + ',' + n2(tipY * 0.62) + ' 0,' + n2(tipY) + ' Z';
      var sil = d;
      var fuller = '<path d="M0,' + n2(tipY + 4) + ' L0,16" stroke="' + c.edge + '" stroke-width="1.1" opacity="0.5"/>';
      var spec = '<path d="M-1.6,' + n2(tipY + 6) + ' L-1.6,15" stroke="#ffffff" stroke-width="1.4" opacity="0.28"/>';
      return { d: '<path d="' + d + '" fill="url(#' + c.lg + ')" stroke="' + c.edge + '" stroke-width="1.4" stroke-linejoin="round"/>' + fuller + spec, sil: sil };
    },
    greatblade: function (l, R, c) { var p = Object.assign({}, l.params); p.width = (l.params.width || 0) + 0.6; p.height = (l.params.height || 0) + 0.6; return PARTS.blade(Object.assign({}, l, { params: p }), R, c); },
    curved_blade: function (l, R, c) {
      var len = 40 + (l.params.height || 0) * 10, w = 6 + (l.params.width || 0) * 5, bend = 14 + (l.params.curvature || 0) * 16;
      var d = 'M0,18 C' + n2(-bend) + ',' + n2(-len * 0.4) + ' ' + n2(-bend * 0.4) + ',' + n2(-len * 0.9) + ' ' + n2(bend * 0.5) + ',' + n2(-len)
        + ' C' + n2(bend * 0.2) + ',' + n2(-len * 0.85) + ' ' + n2(-bend * 0.2) + ',' + n2(-len * 0.4) + ' ' + n2(w) + ',18 Z';
      return { d: '<path d="' + d + '" fill="url(#' + c.lg + ')" stroke="' + c.edge + '" stroke-width="1.3" stroke-linejoin="round"/><path d="M2,14 C' + n2(-bend * 0.5) + ',' + n2(-len * 0.4) + ' ' + n2(-bend * 0.2) + ',' + n2(-len * 0.85) + ' ' + n2(bend * 0.45) + ',' + n2(-len + 3) + '" fill="none" stroke="#fff" stroke-width="1" opacity="0.25"/>', sil: d };
    },
    dagger_blade: function (l, R, c) { var p = Object.assign({}, l.params); p.height = (l.params.height || 0) - 0.55; p.width = (l.params.width || 0) - 0.2; return PARTS.blade(Object.assign({}, l, { params: p }), R, c); },
    axe_head: function (l, R, c) {
      var s = 20 + (l.params.width || 0) * 10;
      var d = 'M-2,-30 Q' + n2(-s * 1.6) + ',-26 ' + n2(-s * 1.8) + ',6 Q' + n2(-s) + ',-2 -2,2 Z M2,-30 Q' + n2(s * 1.6) + ',-26 ' + n2(s * 1.8) + ',6 Q' + n2(s) + ',-2 2,2 Z';
      return { d: '<path d="' + d + '" fill="url(#' + c.lg + ')" stroke="' + c.edge + '" stroke-width="1.4" stroke-linejoin="round"/>', sil: d };
    },
    spear_head: function (l, R, c) { var len = 30 + (l.params.height || 0) * 10, w = 8 + (l.params.width || 0) * 5; var d = poly([[0, -len], [w, -len * 0.45], [w * 0.4, 6], [-w * 0.4, 6], [-w, -len * 0.45]]); return { d: '<path d="' + d + '" fill="url(#' + c.lg + ')" stroke="' + c.edge + '" stroke-width="1.3" stroke-linejoin="round"/>', sil: d }; },
    hammer_head: function (l, R, c) { var w = 22 + (l.params.width || 0) * 12, h = 16 + (l.params.height || 0) * 8; var d = 'M' + n2(-w) + ',' + n2(-h) + ' H' + n2(w) + ' Q' + n2(w + 5) + ',0 ' + n2(w) + ',' + n2(h) + ' H' + n2(-w) + ' Q' + n2(-w - 5) + ',0 ' + n2(-w) + ',' + n2(-h) + ' Z'; return { d: '<path d="' + d + '" rx="4" fill="url(#' + c.lg + ')" stroke="' + c.edge + '" stroke-width="1.6" stroke-linejoin="round"/>', sil: d }; },
    mace_head: function (l, R, c) { var rad = 15 + (l.params.width || 0) * 8, spk = ''; for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2; spk += '<path d="M' + n2(Math.cos(a) * rad) + ',' + n2(Math.sin(a) * rad) + ' L' + n2(Math.cos(a) * (rad + 8)) + ',' + n2(Math.sin(a) * (rad + 8)) + '" stroke="' + c.edge + '" stroke-width="4" stroke-linecap="round"/>'; } return { d: spk + '<circle r="' + n2(rad) + '" fill="url(#' + c.rg + ')" stroke="' + c.edge + '" stroke-width="1.6"/>', sil: 'M0,' + n2(-rad - 8) + ' A' + n2(rad + 8) + ',' + n2(rad + 8) + ' 0 1,0 0.1,' + n2(-rad - 8) + ' Z' }; },
    staff_orb: function (l, R, c) { var rad = 12 + (l.params.width || 0) * 8; return { d: '<circle r="' + n2(rad) + '" fill="url(#' + c.rg + ')" stroke="' + c.edge + '" stroke-width="1.4"/><circle r="' + n2(rad * 0.45) + '" fill="' + c.accent + '" opacity="0.85"/>', sil: 'M0,' + n2(-rad) + ' A' + n2(rad) + ',' + n2(rad) + ' 0 1,0 0.1,' + n2(-rad) + ' Z' }; },
    bow: function (l, R, c) { var h = 40 + (l.params.height || 0) * 10, b = 18 + (l.params.curvature || 0) * 8; return { d: '<path d="M0,' + n2(-h) + ' Q' + n2(b) + ',0 0,' + n2(h) + '" fill="none" stroke="url(#' + c.lg + ')" stroke-width="5" stroke-linecap="round"/><line x1="0" y1="' + n2(-h) + '" x2="0" y2="' + n2(h) + '" stroke="' + c.edge + '" stroke-width="1"/>', sil: 'M-4,' + n2(-h) + ' Q' + n2(b + 4) + ',0 -4,' + n2(h) + ' L4,' + n2(h) + ' Q' + n2(b - 4) + ',0 4,' + n2(-h) + ' Z' }; },
    shaft: function (l, R, c) { var len = 34 + (l.params.height || 0) * 14, w = 2.6 + (l.params.width || 0) * 2; return { d: '<rect x="' + n2(-w) + '" y="-6" width="' + n2(w * 2) + '" height="' + n2(len) + '" rx="' + n2(w) + '" fill="url(#' + c.lg + ')" stroke="' + c.edge + '" stroke-width="0.8"/>', sil: 'M' + n2(-w) + ',-6 h' + n2(w * 2) + ' v' + n2(len) + ' h' + n2(-w * 2) + ' Z' }; },
    handle: function (l, R, c) { var len = 16 + (l.params.height || 0) * 8, w = 3.2 + (l.params.width || 0) * 2, wraps = ''; for (var i = 0; i < 5; i++) { wraps += '<line x1="' + n2(-w) + '" y1="' + n2(i * 3) + '" x2="' + n2(w) + '" y2="' + n2(i * 3 + 1.4) + '" stroke="' + shade(l.fill, -0.35) + '" stroke-width="1.2"/>'; } return { d: '<rect x="' + n2(-w) + '" y="-2" width="' + n2(w * 2) + '" height="' + n2(len) + '" rx="' + n2(w) + '" fill="url(#' + c.lg + ')" stroke="' + c.edge + '" stroke-width="0.8"/>' + wraps, sil: 'M' + n2(-w) + ',-2 h' + n2(w * 2) + ' v' + n2(len) + ' h' + n2(-w * 2) + ' Z' }; },
    guard: function (l, R, c) { var w = 16 + (l.params.width || 0) * 12; return { d: '<rect x="' + n2(-w) + '" y="-3.5" width="' + n2(w * 2) + '" height="7" rx="3" fill="url(#' + c.lg + ')" stroke="' + c.edge + '" stroke-width="1"/>', sil: 'M' + n2(-w) + ',-3.5 h' + n2(w * 2) + ' v7 h' + n2(-w * 2) + ' Z' }; },
    crossguard: function (l, R, c) { var w = 18 + (l.params.width || 0) * 12; return { d: '<path d="M' + n2(-w) + ',2 Q' + n2(-w * 1.1) + ',-6 ' + n2(-w * 0.5) + ',-4 L' + n2(w * 0.5) + ',-4 Q' + n2(w * 1.1) + ',-6 ' + n2(w) + ',2 Q0,7 ' + n2(-w) + ',2 Z" fill="url(#' + c.lg + ')" stroke="' + c.edge + '" stroke-width="1.1" stroke-linejoin="round"/>', sil: 'M' + n2(-w) + ',-6 h' + n2(w * 2) + ' v13 h' + n2(-w * 2) + ' Z' }; },
    pommel: function (l, R, c) { var rad = 5 + (l.params.width || 0) * 4; return { d: '<circle r="' + n2(rad) + '" fill="url(#' + c.rg + ')" stroke="' + c.edge + '" stroke-width="1"/><circle r="' + n2(rad * 0.4) + '" fill="' + c.accent + '" opacity="0.7"/>', sil: 'M0,' + n2(-rad) + ' A' + n2(rad) + ',' + n2(rad) + ' 0 1,0 0.1,' + n2(-rad) + ' Z' }; },
    plate: function (l, R, c) { var w = 24 + (l.params.width || 0) * 12, h = 30 + (l.params.height || 0) * 14; var d = 'M' + n2(-w) + ',' + n2(-h) + ' Q0,' + n2(-h - 6) + ' ' + n2(w) + ',' + n2(-h) + ' L' + n2(w * 0.8) + ',' + n2(h) + ' Q0,' + n2(h + 8) + ' ' + n2(-w * 0.8) + ',' + n2(h) + ' Z'; return { d: '<path d="' + d + '" fill="url(#' + c.lg + ')" stroke="' + c.edge + '" stroke-width="1.4" stroke-linejoin="round"/>', sil: d }; },
    armor_torso: function (l, R, c) { var w = 26 + (l.params.width || 0) * 10; var d = 'M' + n2(-w) + ',-34 Q0,-40 ' + n2(w) + ',-34 L' + n2(w - 4) + ',6 Q0,14 ' + n2(-w + 4) + ',6 Z'; var lines = '<path d="M0,-30 V6" stroke="' + c.edge + '" stroke-width="1" opacity="0.5"/><path d="M' + n2(-w + 6) + ',-14 H' + n2(w - 6) + '" stroke="' + c.edge + '" stroke-width="1" opacity="0.4"/>'; return { d: '<path d="' + d + '" fill="url(#' + c.lg + ')" stroke="' + c.edge + '" stroke-width="1.6" stroke-linejoin="round"/>' + lines, sil: d }; },
    helmet: function (l, R, c) { var w = 16 + (l.params.width || 0) * 8; var d = 'M' + n2(-w) + ',6 Q' + n2(-w) + ',' + n2(-w * 1.6) + ' 0,' + n2(-w * 1.6) + ' Q' + n2(w) + ',' + n2(-w * 1.6) + ' ' + n2(w) + ',6 Z'; return { d: '<path d="' + d + '" fill="url(#' + c.lg + ')" stroke="' + c.edge + '" stroke-width="1.4" stroke-linejoin="round"/><rect x="' + n2(-w * 0.5) + '" y="-6" width="' + n2(w) + '" height="4" fill="#0a0a12" opacity="0.7"/>', sil: d }; },
    shield_round: function (l, R, c) { var rad = 26 + (l.params.width || 0) * 8; return { d: '<circle r="' + n2(rad) + '" fill="url(#' + c.rg + ')" stroke="' + c.edge + '" stroke-width="2.4"/><circle r="' + n2(rad * 0.7) + '" fill="none" stroke="' + shade(l.fill, -0.3) + '" stroke-width="1.4"/><circle r="' + n2(rad * 0.18) + '" fill="' + c.accent + '"/>', sil: 'M0,' + n2(-rad) + ' A' + n2(rad) + ',' + n2(rad) + ' 0 1,0 0.1,' + n2(-rad) + ' Z' }; },
    shield_kite: function (l, R, c) { var w = 22 + (l.params.width || 0) * 8, h = 30 + (l.params.height || 0) * 10; var d = 'M0,' + n2(-h) + ' L' + n2(w) + ',' + n2(-h * 0.5) + ' L' + n2(w * 0.6) + ',' + n2(h) + ' L0,' + n2(h + 6) + ' L' + n2(-w * 0.6) + ',' + n2(h) + ' L' + n2(-w) + ',' + n2(-h * 0.5) + ' Z'; return { d: '<path d="' + d + '" fill="url(#' + c.lg + ')" stroke="' + c.edge + '" stroke-width="2.2" stroke-linejoin="round"/><path d="M0,' + n2(-h + 4) + ' V' + n2(h) + ' M' + n2(-w + 5) + ',' + n2(-h * 0.4) + ' H' + n2(w - 5) + '" stroke="' + shade(l.fill, -0.3) + '" stroke-width="1.2" opacity="0.6"/>', sil: d }; },
    shield_heater: function (l, R, c) { var w = 22 + (l.params.width || 0) * 8, h = 30 + (l.params.height || 0) * 10; var d = 'M' + n2(-w) + ',' + n2(-h) + ' H' + n2(w) + ' L' + n2(w * 0.9) + ',' + n2(h * 0.2) + ' Q0,' + n2(h + 6) + ' ' + n2(-w * 0.9) + ',' + n2(h * 0.2) + ' Z'; return { d: '<path d="' + d + '" fill="url(#' + c.lg + ')" stroke="' + c.edge + '" stroke-width="2.2" stroke-linejoin="round"/>', sil: d }; },
    cloth: function (l, R, c) { var w = 20 + (l.params.width || 0) * 10, h = 30 + (l.params.height || 0) * 14; var d = 'M' + n2(-w) + ',' + n2(-h) + ' Q0,' + n2(-h + 4) + ' ' + n2(w) + ',' + n2(-h) + ' Q' + n2(w + 4) + ',0 ' + n2(w * 0.7) + ',' + n2(h) + ' Q0,' + n2(h + 8) + ' ' + n2(-w * 0.7) + ',' + n2(h) + ' Q' + n2(-w - 4) + ',0 ' + n2(-w) + ',' + n2(-h) + ' Z'; return { d: '<path d="' + d + '" fill="url(#' + c.lg + ')" stroke="' + c.edge + '" stroke-width="1" opacity="0.95"/>', sil: d }; },
    food_plate: function (l, R, c) { var rad = 26 + (l.params.width || 0) * 8; return { d: '<ellipse rx="' + n2(rad) + '" ry="' + n2(rad * 0.5) + '" fill="url(#' + c.rg + ')" stroke="' + c.edge + '" stroke-width="1.6"/><ellipse rx="' + n2(rad * 0.7) + '" ry="' + n2(rad * 0.34) + '" fill="none" stroke="' + shade(l.fill, -0.2) + '" stroke-width="1"/>', sil: 'M0,' + n2(-rad * 0.5) + ' A' + n2(rad) + ',' + n2(rad * 0.5) + ' 0 1,0 0.1,' + n2(-rad * 0.5) + ' Z' }; },
    food_stack: function (l, R, c) { var w = 16 + (l.params.width || 0) * 8, layers = ''; for (var i = 0; i < 3; i++) { layers += '<ellipse cy="' + n2(-i * 7) + '" rx="' + n2(w - i * 2) + '" ry="' + n2((w - i * 2) * 0.4) + '" fill="url(#' + c.lg + ')" stroke="' + c.edge + '" stroke-width="1"/>'; } return { d: layers, sil: 'M' + n2(-w) + ',6 h' + n2(w * 2) + ' v-28 h' + n2(-w * 2) + ' Z' }; }
  };

  /* ---------------------------- DECORATION LIBRARY ----------------------- */
  var DECOS = {
    gem: function (l, R, c) { var s = 5 + (l.params.width || 0) * 4; var d = poly([[0, -s], [s * 0.75, -s * 0.25], [s * 0.5, s], [-s * 0.5, s], [-s * 0.75, -s * 0.25]]); return { d: '<path d="' + d + '" fill="url(#' + c.rg + ')" stroke="' + c.edge + '" stroke-width="0.8"/><path d="M0,' + n2(-s) + ' L0,' + n2(s) + ' M' + n2(-s * 0.75) + ',' + n2(-s * 0.25) + ' L' + n2(s * 0.75) + ',' + n2(-s * 0.25) + '" stroke="#fff" stroke-width="0.5" opacity="0.4"/>', sil: d }; },
    gem_round: function (l, R, c) { var s = 5 + (l.params.width || 0) * 4; return { d: '<circle r="' + n2(s) + '" fill="url(#' + c.rg + ')" stroke="' + c.edge + '" stroke-width="0.8"/><circle cx="' + n2(-s * 0.3) + '" cy="' + n2(-s * 0.3) + '" r="' + n2(s * 0.28) + '" fill="#fff" opacity="0.5"/>', sil: 'M0,' + n2(-s) + ' A' + n2(s) + ',' + n2(s) + ' 0 1,0 0.1,' + n2(-s) + ' Z' }; },
    rune: function (l, R, c) { var s = 5 + (l.params.width || 0) * 3, pts = 3 + ri(R, 0, 3), path = ''; for (var i = 0; i < pts; i++) { path += (i ? ' L' : 'M') + n2(rr(R, -s, s)) + ',' + n2(rr(R, -s, s)); } return { d: '<path d="' + path + '" fill="none" stroke="' + c.accent + '" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>', sil: '' }; },
    engraving: function (l, R, c) { var s = 8 + (l.params.width || 0) * 6, p = 'M' + n2(-s) + ',0 '; for (var i = -s; i <= s; i += 2) { p += 'Q' + n2(i + 1) + ',' + n2(rr(R, -2, 2) - 3) + ' ' + n2(i + 2) + ',0 '; } return { d: '<path d="' + p + '" fill="none" stroke="' + shade(l.fill, -0.4) + '" stroke-width="0.9" opacity="0.7"/>', sil: '' }; },
    filigree: function (l, R, c) { var s = 8 + (l.params.width || 0) * 6; return { d: '<path d="M0,0 C' + n2(-s) + ',' + n2(-s) + ' ' + n2(-s) + ',' + n2(s) + ' 0,0 C' + n2(s) + ',' + n2(-s) + ' ' + n2(s) + ',' + n2(s) + ' 0,0" fill="none" stroke="' + c.accent + '" stroke-width="1.1" opacity="0.85"/><circle cx="' + n2(-s) + '" r="1.4" fill="' + c.accent + '"/><circle cx="' + n2(s) + '" r="1.4" fill="' + c.accent + '"/>', sil: '' }; },
    chain: function (l, R, c) { var n = 4 + ri(R, 0, 3), s = ''; for (var i = 0; i < n; i++) { s += '<ellipse cx="' + n2(i * 5 - n * 2.5) + '" rx="2.6" ry="1.6" fill="none" stroke="url(#' + c.lg + ')" stroke-width="1.4"/>'; } return { d: s, sil: '' }; },
    wrap: function (l, R, c) { var s = 8, out = ''; for (var i = 0; i < 5; i++) { out += '<line x1="' + n2(-s) + '" y1="' + n2(i * 3 - 6) + '" x2="' + n2(s) + '" y2="' + n2(i * 3 - 5) + '" stroke="' + shade(l.fill, -0.3) + '" stroke-width="1.6" stroke-linecap="round"/>'; } return { d: out, sil: '' }; },
    rivet: function (l, R, c) { return { d: '<circle r="1.8" fill="url(#' + c.rg + ')" stroke="' + c.edge + '" stroke-width="0.5"/><circle cx="-0.5" cy="-0.5" r="0.6" fill="#fff" opacity="0.6"/>', sil: '' }; },
    spike: function (l, R, c) { var h = 8 + (l.params.height || 0) * 6; var d = poly([[0, -h], [3, 0], [-3, 0]]); return { d: '<path d="' + d + '" fill="url(#' + c.lg + ')" stroke="' + c.edge + '" stroke-width="0.8"/>', sil: d }; },
    horn: function (l, R, c) { var h = 12 + (l.params.height || 0) * 8; return { d: '<path d="M0,4 Q' + n2(-6) + ',' + n2(-h * 0.5) + ' ' + n2(2) + ',' + n2(-h) + ' Q' + n2(-1) + ',' + n2(-h * 0.5) + ' 4,4 Z" fill="url(#' + c.lg + ')" stroke="' + c.edge + '" stroke-width="0.9"/>', sil: '' }; },
    wing: function (l, R, c) { var s = 16 + (l.params.width || 0) * 10; var d = 'M0,0 Q' + n2(-s) + ',' + n2(-s * 0.6) + ' ' + n2(-s * 1.2) + ',' + n2(s * 0.2) + ' Q' + n2(-s * 0.6) + ',' + n2(s * 0.1) + ' 0,' + n2(s * 0.4) + ' Z'; return { d: '<path d="' + d + '" fill="url(#' + c.lg + ')" stroke="' + c.edge + '" stroke-width="0.9" opacity="0.92"/>', sil: d }; },
    bone: function (l, R, c) { var s = 10 + (l.params.height || 0) * 6; return { d: '<line x1="0" y1="' + n2(-s) + '" x2="0" y2="' + n2(s) + '" stroke="url(#' + c.lg + ')" stroke-width="3" stroke-linecap="round"/><circle cy="' + n2(-s) + '" r="2.4" fill="url(#' + c.rg + ')"/><circle cy="' + n2(s) + '" r="2.4" fill="url(#' + c.rg + ')"/>', sil: '' }; },
    crystal: function (l, R, c) { var s = 7 + (l.params.width || 0) * 5; var d = poly([[0, -s * 1.4], [s * 0.6, -s * 0.2], [s * 0.4, s], [-s * 0.4, s], [-s * 0.6, -s * 0.2]]); return { d: '<path d="' + d + '" fill="url(#' + c.rg + ')" stroke="' + c.edge + '" stroke-width="0.8" opacity="0.92"/><path d="M0,' + n2(-s * 1.4) + ' L0,' + n2(s) + '" stroke="#fff" stroke-width="0.6" opacity="0.4"/>', sil: d }; },
    ornament: function (l, R, c) { var s = 7 + (l.params.width || 0) * 5; return { d: '<circle r="' + n2(s) + '" fill="none" stroke="' + c.accent + '" stroke-width="1.2"/><circle r="' + n2(s * 0.5) + '" fill="' + c.accent + '" opacity="0.5"/><path d="M0,' + n2(-s) + ' L0,' + n2(-s - 4) + ' M0,' + n2(s) + ' L0,' + n2(s + 4) + '" stroke="' + c.accent + '" stroke-width="1"/>', sil: '' }; },
    emblem: function (l, R, c) { var s = 8 + (l.params.width || 0) * 5; var d = poly([[0, -s], [s, -s * 0.3], [s * 0.6, s], [-s * 0.6, s], [-s, -s * 0.3]]); return { d: '<path d="' + d + '" fill="url(#' + c.lg + ')" stroke="' + c.accent + '" stroke-width="1.2"/><circle r="' + n2(s * 0.35) + '" fill="' + c.accent + '"/>', sil: d }; },
    fragment: function (l, R, c) { var out = '', n = 4 + ri(R, 0, 4); for (var i = 0; i < n; i++) { var a = R() * Math.PI * 2, d = rr(R, 5, 12); out += '<rect x="' + n2(Math.cos(a) * d) + '" y="' + n2(Math.sin(a) * d) + '" width="' + n2(rr(R, 1.2, 3)) + '" height="' + n2(rr(R, 1.2, 3)) + '" fill="' + c.accent + '" opacity="' + n2(rr(R, 0.4, 0.9)) + '" transform="rotate(' + ri(R, 0, 90) + ')"/>'; } return { d: out, sil: '' }; },
    trim: function (l, R, c) { var s = 12 + (l.params.width || 0) * 8; return { d: '<path d="M' + n2(-s) + ',0 H' + n2(s) + '" stroke="url(#' + c.lg + ')" stroke-width="2.4"/><path d="M' + n2(-s) + ',0 H' + n2(s) + '" stroke="' + shade(l.fill, 0.3) + '" stroke-width="0.7" opacity="0.6"/>', sil: '' }; },
    ridge: function (l, R, c) { var s = 12 + (l.params.height || 0) * 8; return { d: '<path d="M0,' + n2(-s) + ' V' + n2(s) + '" stroke="' + shade(l.fill, 0.35) + '" stroke-width="1.4" opacity="0.55"/><path d="M1.4,' + n2(-s) + ' V' + n2(s) + '" stroke="' + shade(l.fill, -0.4) + '" stroke-width="1" opacity="0.5"/>', sil: '' }; }
  };

  /* ------------------------------ EFFECT LIBRARY ------------------------- */
  var FX = {
    fire: function (l, R, c) { var n = (l.fx.count || 8), out = ''; for (var i = 0; i < n; i++) { var x = rr(R, -14, 14), sz = rr(R, 3, 7) * (l.fx.size || 1); out += '<path class="fs-flick" style="animation-delay:' + n2(R() * 1.2) + 's" d="M' + n2(x) + ',12 Q' + n2(x - 3) + ',0 ' + n2(x) + ',' + n2(-sz * 3) + ' Q' + n2(x + 3) + ',0 ' + n2(x) + ',12 Z" fill="' + (l.fx.color || '#ff7a18') + '" opacity="' + n2((l.fx.opacity || 0.8)) + '"/>'; } return out; },
    ember: function (l, R, c) { var n = (l.fx.count || 14), out = ''; for (var i = 0; i < n; i++) { out += '<circle class="fs-rise" style="animation-delay:' + n2(R() * 2) + 's" cx="' + n2(rr(R, -18, 18)) + '" cy="' + n2(rr(R, -6, 18)) + '" r="' + n2(rr(R, 0.6, 1.8) * (l.fx.size || 1)) + '" fill="' + (l.fx.color || '#ffb14a') + '"/>'; } return out; },
    ice: function (l, R, c) { var n = (l.fx.count || 8), out = ''; for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2, d = rr(R, 10, 18); out += '<path d="M0,0 L' + n2(Math.cos(a) * d) + ',' + n2(Math.sin(a) * d) + '" stroke="' + (l.fx.color || '#8fe6ff') + '" stroke-width="1.4" opacity="' + n2(l.fx.opacity || 0.7) + '"/>'; } return '<g class="fs-pulse">' + out + '</g>'; },
    void: function (l, R, c) { return '<g class="fs-spin"><circle r="16" fill="none" stroke="' + (l.fx.color || '#a855f7') + '" stroke-width="2" stroke-dasharray="4 6" opacity="' + n2(l.fx.opacity || 0.8) + '"/><circle r="10" fill="none" stroke="' + (l.fx.color2 || '#22d3ee') + '" stroke-width="1.4" stroke-dasharray="2 5"/></g>'; },
    lightning: function (l, R, c) { var out = '', n = (l.fx.count || 3); for (var k = 0; k < n; k++) { var x = rr(R, -12, 12), p = 'M' + n2(x) + ',-16 '; for (var y = -12; y < 16; y += 5) { p += 'L' + n2(x + rr(R, -4, 4)) + ',' + n2(y) + ' '; } out += '<path class="fs-flick" style="animation-delay:' + n2(R()) + 's" d="' + p + '" fill="none" stroke="' + (l.fx.color || '#fde047') + '" stroke-width="1.4"/>'; } return out; },
    holy: function (l, R, c) { return '<g class="fs-pulse"><circle r="18" fill="' + (l.fx.color || '#fff3b0') + '" opacity="' + n2((l.fx.opacity || 0.35)) + '"/><circle r="10" fill="#fff" opacity="0.4"/></g>'; },
    poison: function (l, R, c) { var n = (l.fx.count || 8), out = ''; for (var i = 0; i < n; i++) { out += '<circle class="fs-rise" style="animation-delay:' + n2(R() * 2) + 's" cx="' + n2(rr(R, -14, 14)) + '" cy="' + n2(rr(R, -4, 14)) + '" r="' + n2(rr(R, 1.4, 3.4)) + '" fill="' + (l.fx.color || '#7bd64a') + '" opacity="0.6"/>'; } return out; },
    smoke: function (l, R, c) { var n = (l.fx.count || 6), out = ''; for (var i = 0; i < n; i++) { out += '<circle class="fs-rise" style="animation-delay:' + n2(R() * 3) + 's" cx="' + n2(rr(R, -12, 12)) + '" cy="' + n2(rr(R, -4, 14)) + '" r="' + n2(rr(R, 3, 7)) + '" fill="' + (l.fx.color || '#9aa2b1') + '" opacity="0.3"/>'; } return out; },
    aura: function (l, R, c) { return '<circle class="fs-pulse" r="' + n2(14 + (l.fx.size || 1) * 8) + '" fill="url(#' + c.rg + ')" opacity="' + n2(l.fx.opacity || 0.5) + '"/>'; },
    particles: function (l, R, c) { var n = (l.fx.count || 16), out = ''; for (var i = 0; i < n; i++) { out += '<circle class="fs-pulse" style="animation-delay:' + n2(R() * 1.5) + 's" cx="' + n2(rr(R, -20, 20)) + '" cy="' + n2(rr(R, -24, 20)) + '" r="' + n2(rr(R, 0.5, 1.6)) + '" fill="' + (l.fx.color || '#ffffff') + '" opacity="' + n2(rr(R, 0.4, 0.9)) + '"/>'; } return out; },
    trail: function (l, R, c) { return '<path class="fs-pulse" d="M-18,10 Q0,-10 18,10" fill="none" stroke="' + (l.fx.color || '#67e8f9') + '" stroke-width="' + n2(2 + (l.fx.size || 1) * 2) + '" stroke-linecap="round" opacity="' + n2(l.fx.opacity || 0.6) + '"/>'; },
    sparkle: function (l, R, c) { var n = (l.fx.count || 6), out = ''; for (var i = 0; i < n; i++) { var x = rr(R, -18, 18), y = rr(R, -22, 18), s = rr(R, 1.5, 3); out += '<path class="fs-pulse" style="animation-delay:' + n2(R()) + 's" d="M' + n2(x) + ',' + n2(y - s) + ' L' + n2(x) + ',' + n2(y + s) + ' M' + n2(x - s) + ',' + n2(y) + ' L' + n2(x + s) + ',' + n2(y) + '" stroke="' + (l.fx.color || '#fff') + '" stroke-width="0.9"/>'; } return out; }
  };

  // Catalog used by the "Add" library UI.
  var LIB = {
    part: ['blade', 'greatblade', 'curved_blade', 'dagger_blade', 'axe_head', 'spear_head', 'hammer_head', 'mace_head', 'staff_orb', 'bow', 'shaft', 'handle', 'guard', 'crossguard', 'pommel', 'plate', 'armor_torso', 'helmet', 'shield_round', 'shield_kite', 'shield_heater', 'cloth', 'food_plate', 'food_stack'],
    deco: ['gem', 'gem_round', 'rune', 'engraving', 'filigree', 'chain', 'wrap', 'rivet', 'spike', 'horn', 'wing', 'bone', 'crystal', 'ornament', 'emblem', 'fragment', 'trim', 'ridge'],
    fx: ['fire', 'ember', 'ice', 'void', 'lightning', 'holy', 'poison', 'smoke', 'aura', 'particles', 'trail', 'sparkle']
  };
  var RARITIES = ['common', 'rare', 'epic', 'legendary', 'mythic'];

  /* ------------------------------ doc + layers -------------------------- */
  function defaultLayer(kind, type) {
    var base = {
      id: uid(), kind: kind, type: type, name: type, seed: Math.floor(Math.random() * 1e6),
      x: 50, y: 60, sx: 1, sy: 1, rot: 0, mirrorX: false, mirrorY: false,
      hidden: false, locked: false, opacity: 1, group: null,
      fill: '#cbd5e1', fill2: '#475569', gradient: true, gradAngle: 90, stroke: '#0b0f19', strokeW: 1,
      metal: 0.4, texture: 0, textureScale: 3, glow: 0, glowColor: '#e5b814', shadow: 0.5, tint: 0, emissive: 0, clipToBody: false,
      params: { width: 0, height: 0, taper: 0, curvature: 0, bevel: 0 },
      fx: { color: '#ff7a18', color2: '#22d3ee', count: 10, size: 1, speed: 1, opacity: 0.8, bloom: 0.5, pulse: 0.5, trail: 1 }
    };
    if (kind === 'fx') { base.glow = 0.6; base.shadow = 0; }
    return base;
  }
  function defaultDoc(cat) {
    return { w: 100, h: 120, cat: cat || 'weapons', name: 'Untitled Relic', rarity: 'legendary', seed: Math.floor(Math.random() * 1e6), bg: 'rgba(10,10,16,.55)', layers: [] };
  }
  function cloneLayer(l) { var n = JSON.parse(JSON.stringify(l)); n.id = uid(); return n; }

  /* ------------------------------- renderer ----------------------------- */
  function layerCtx(l, lightAngle) {
    var lg = 'lg_' + l.id, rg = 'rg_' + l.id;
    return { lg: lg, rg: rg, edge: l.stroke, accent: l.glowColor, glow: l.glow };
  }
  function layerDefs(l, lightAngle) {
    var lg = 'lg_' + l.id, rg = 'rg_' + l.id, fid = 'fx_' + l.id;
    var hi = shade(l.fill, 0.35 + l.metal * 0.35), lo = shade(l.fill2 || l.fill, -0.25 - l.metal * 0.2);
    var ang = (l.gradAngle || 90) + (lightAngle || 0);
    var rad = ang * Math.PI / 180, x2 = n2(50 + Math.cos(rad) * 50), y2 = n2(50 + Math.sin(rad) * 50), x1 = n2(50 - Math.cos(rad) * 50), y1 = n2(50 - Math.sin(rad) * 50);
    var stops = l.gradient
      ? '<stop offset="0" stop-color="' + hi + '"/><stop offset="0.45" stop-color="' + l.fill + '"/><stop offset="1" stop-color="' + lo + '"/>'
      : '<stop offset="0" stop-color="' + l.fill + '"/><stop offset="1" stop-color="' + l.fill + '"/>';
    var out = '<linearGradient id="' + lg + '" x1="' + x1 + '%" y1="' + y1 + '%" x2="' + x2 + '%" y2="' + y2 + '%">' + stops + '</linearGradient>';
    out += '<radialGradient id="' + rg + '" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="' + shade(l.fill, 0.4) + '"/><stop offset="0.6" stop-color="' + l.fill + '"/><stop offset="1" stop-color="' + lo + '"/></radialGradient>';
    // per-layer filter: texture (turbulence) + glow (blur) + drop shadow
    var f = '';
    if (l.texture > 0) f += '<feTurbulence type="fractalNoise" baseFrequency="' + n2(0.02 * (l.textureScale || 3)) + '" numOctaves="2" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ' + n2(l.texture * 0.5) + ' 0" result="nn"/><feComposite in="nn" in2="SourceGraphic" operator="in" result="tex"/><feBlend in="SourceGraphic" in2="tex" mode="multiply" result="base"/>';
    var src = l.texture > 0 ? 'base' : 'SourceGraphic';
    if (l.glow > 0) f += '<feGaussianBlur in="' + src + '" stdDeviation="' + n2(l.glow * 4) + '" result="b"/><feFlood flood-color="' + l.glowColor + '" flood-opacity="' + n2(0.6 * l.glow) + '"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="' + src + '"/></feMerge>';
    if (f) out += '<filter id="' + fid + '" x="-60%" y="-60%" width="220%" height="220%">' + f + '</filter>';
    return { defs: out, filter: f ? fid : null };
  }
  function transformStr(l) {
    var sx = (l.mirrorX ? -1 : 1) * (l.sx || 1), sy = (l.mirrorY ? -1 : 1) * (l.sy || 1);
    return 'translate(' + n2(l.x) + ',' + n2(l.y) + ') rotate(' + n2(l.rot || 0) + ') scale(' + n2(sx) + ',' + n2(sy) + ')';
  }
  function bodySilhouette(doc, lightAngle) {
    // union of silhouettes from part layers -> a clip path
    var paths = [];
    doc.layers.forEach(function (l) {
      if (l.hidden || l.kind !== 'part') return;
      var gen = PARTS[l.type]; if (!gen) return;
      var out = gen(l, rng(doc.seed + '_' + l.id + '_' + l.seed), layerCtx(l, lightAngle));
      if (out && out.sil) paths.push('<path transform="' + transformStr(l) + '" d="' + out.sil + '"/>');
    });
    return paths;
  }
  function renderDoc(doc, opts) {
    opts = opts || {};
    var light = opts.light || 0, anim = opts.anim !== false;
    var defs = '', body = '', clipPaths = bodySilhouette(doc, light);
    var clipId = 'bodyclip_' + (doc.seed || 0);
    if (clipPaths.length) defs += '<clipPath id="' + clipId + '">' + clipPaths.join('') + '</clipPath>';
    doc.layers.forEach(function (l) {
      if (l.hidden) return;
      var R = rng(doc.seed + '_' + l.id + '_' + l.seed);
      var ctx = layerCtx(l, light);
      var dd = layerDefs(l, light); defs += dd.defs;
      var gen = (l.kind === 'fx') ? FX[l.type] : (l.kind === 'deco' ? DECOS[l.type] : PARTS[l.type]);
      if (!gen) return;
      var out = gen(l, R, ctx);
      var inner = (typeof out === 'string') ? out : out.d;
      var filt = dd.filter ? ' filter="url(#' + dd.filter + ')"' : '';
      var clip = (l.clipToBody && clipPaths.length && l.kind !== 'part') ? ' clip-path="url(#' + clipId + ')"' : '';
      var op = ' opacity="' + n2(clamp(l.opacity, 0, 1)) + '"';
      var sh = l.shadow > 0 ? ' style="filter:drop-shadow(0 1px ' + n2(l.shadow * 2) + 'px rgba(0,0,0,' + n2(0.5 * l.shadow) + '))"' : '';
      body += '<g transform="' + transformStr(l) + '"' + filt + clip + op + sh + '>' + inner + '</g>';
    });
    var vb = '0 0 ' + doc.w + ' ' + doc.h;
    var tf = 'transform:rotate(' + n2(light * 0) + 'deg);';
    var stage = '<svg viewBox="' + vb + '" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="overflow:visible">'
      + '<defs>' + defs + '</defs>' + body + '</svg>';
    return { svg: stage, clipId: clipId };
  }
  // ORIGINAL ART PRESERVATION: an upgraded item can carry doc.origin - the item's REAL art
  // HTML captured at upgrade time. It is rendered as an immutable foundation BEHIND the editor's
  // vector overlay so upgrades (new gems, glows, runes, effects) build on top of the original art
  // without ever ruining or replacing it.
  function originLayerHTML(doc) {
    return (doc && doc.origin)
      ? '<div class="fs-origin-base" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:0;pointer-events:none">' + doc.origin + '</div>'
      : '';
  }
  // Wrapper used for shop/equipped art (returns the string the game expects).
  function renderArtHTML(doc) {
    var r = renderDoc(doc, { light: 0 });
    var hasOrigin = !!(doc && doc.origin);
    var bg = hasOrigin ? 'transparent' : ('radial-gradient(circle at 50% 40%, ' + (doc.bg || 'rgba(10,10,16,.55)') + ', rgba(3,3,6,.96) 78%)');
    return '<div class="art-stage rarity-' + (doc.rarity || 'legendary') + ' w-full h-32 flex items-center justify-center relative z-10" style="background:' + bg + ';">'
      + originLayerHTML(doc)
      + '<div style="position:absolute;inset:0;z-index:1;pointer-events:none">' + r.svg + '</div>'
      + '</div>';
  }

  /* ------------------------------- layer ops ---------------------------- */
  function addLayer(doc, kind, type) { var l = defaultLayer(kind, type); if (kind === 'fx') { l.fill = '#ffffff'; } doc.layers.push(l); return l; }
  function removeLayer(doc, id) { doc.layers = doc.layers.filter(function (l) { return l.id !== id; }); }
  function indexOfLayer(doc, id) { for (var i = 0; i < doc.layers.length; i++) if (doc.layers[i].id === id) return i; return -1; }
  function moveLayer(doc, id, dir) { var i = indexOfLayer(doc, id); if (i < 0) return; var j = clamp(i + dir, 0, doc.layers.length - 1); if (j === i) return; var a = doc.layers.splice(i, 1)[0]; doc.layers.splice(j, 0, a); }
  function duplicateLayer(doc, id) { var i = indexOfLayer(doc, id); if (i < 0) return null; var n = cloneLayer(doc.layers[i]); n.x += 4; n.y += 4; n.name = doc.layers[i].name + ' copy'; doc.layers.splice(i + 1, 0, n); return n; }
  function mirrorLayer(doc, id, axis) { var i = indexOfLayer(doc, id); if (i < 0) return; if (axis === 'y') doc.layers[i].mirrorY = !doc.layers[i].mirrorY; else doc.layers[i].mirrorX = !doc.layers[i].mirrorX; }

  /* --------------------------- variation engine ------------------------- */
  function varyLayer(l, R) {
    // procedural per-placement variation so reused parts never look copied
    l.seed = Math.floor(R() * 1e6);
    l.rot = n2(l.rot + rr(R, -12, 12));
    l.sx = n2(clamp(l.sx * rr(R, 0.85, 1.18), 0.2, 4));
    l.sy = n2(clamp(l.sy * rr(R, 0.85, 1.18), 0.2, 4));
    l.params.curvature = n2(clamp((l.params.curvature || 0) + rr(R, -0.3, 0.3), -1, 1));
    l.params.width = n2(clamp((l.params.width || 0) + rr(R, -0.3, 0.3), -1, 2));
    l.fill = mix(l.fill, l.fill2, rr(R, 0, 0.25));
    return l;
  }
  function randomizeLayer(doc, id) { var i = indexOfLayer(doc, id); if (i < 0) return; varyLayer(doc.layers[i], rng(uid())); }

  /* ------------------------------ quality ops --------------------------- */
  var PALETTES = {
    realistic: ['#c9ced6', '#6b7280', '#3a2412'], premium: ['#f4d675', '#b8860b', '#3a2c00'], ancient: ['#b08d57', '#6b4f2a', '#2a1d0c'],
    elegant: ['#e8e4f0', '#9d8ec2', '#3a2f52'], brutal: ['#8a2020', '#3a0a0a', '#1a0505'], luxurious: ['#ffd700', '#8a6d1a', '#2a2000'],
    magical: ['#a855f7', '#22d3ee', '#1a0b33']
  };
  function ensureHighlight(doc) { doc.layers.forEach(function (l) { if (l.kind === 'part') { l.gradient = true; l.metal = clamp(l.metal + 0.2, 0, 1); l.shadow = clamp(Math.max(l.shadow, 0.6), 0, 1); } }); }
  function applyPalette(doc, name) { var p = PALETTES[name] || PALETTES.premium; doc.layers.forEach(function (l) { if (l.kind === 'part') { l.fill = p[0]; l.fill2 = p[1]; l.stroke = p[2]; l.gradient = true; } else if (l.kind === 'deco') { l.glowColor = p[0]; l.accent = p[0]; } }); }
  var QUALITY = {
    realistic: function (doc) { ensureHighlight(doc); doc.layers.forEach(function (l) { l.texture = clamp(Math.max(l.texture, 0.25), 0, 1); }); return 'Made more realistic (gradients, shadow, subtle texture).'; },
    premium: function (doc) { applyPalette(doc, 'premium'); ensureHighlight(doc); addDeco(doc, 'trim'); addDeco(doc, 'gem'); return 'Premium gold trim + gem + material polish.'; },
    ancient: function (doc) { applyPalette(doc, 'ancient'); doc.layers.forEach(function (l) { if (l.kind === 'part') { l.texture = 0.5; } }); addDeco(doc, 'engraving'); addDeco(doc, 'rune'); return 'Ancient bronze + wear + carvings.'; },
    elegant: function (doc) { applyPalette(doc, 'elegant'); addDeco(doc, 'filigree'); ensureHighlight(doc); return 'Elegant palette + filigree.'; },
    brutal: function (doc) { applyPalette(doc, 'brutal'); addDeco(doc, 'spike'); addDeco(doc, 'spike'); doc.layers.forEach(function (l) { if (l.kind === 'part') l.texture = 0.6; }); return 'Brutal red steel + spikes + battle wear.'; },
    luxurious: function (doc) { applyPalette(doc, 'luxurious'); addDeco(doc, 'gem'); addDeco(doc, 'trim'); addDeco(doc, 'ornament'); return 'Luxurious gold + gems + ornaments.'; },
    magical: function (doc) { applyPalette(doc, 'magical'); addFx(doc, 'aura'); addFx(doc, 'sparkle'); doc.layers.forEach(function (l) { if (l.kind === 'part') { l.emissive = 0.5; l.glow = clamp(Math.max(l.glow, 0.4), 0, 1); } }); return 'Magical aura + arcane glow + sparkle.'; },
    detail: function (doc) { addDeco(doc, 'filigree'); addDeco(doc, 'rune'); addDeco(doc, 'rivet'); return 'Added fine detail layers.'; },
    texture: function (doc) { doc.layers.forEach(function (l) { if (l.kind === 'part') l.texture = clamp(l.texture + 0.25, 0, 1); }); return 'Increased texture depth.'; },
    material: function (doc) { doc.layers.forEach(function (l) { if (l.kind === 'part') { l.metal = clamp(l.metal + 0.25, 0, 1); l.gradient = true; } }); return 'Improved material quality.'; },
    lighting: function (doc) { doc.layers.forEach(function (l) { if (l.kind === 'part') l.shadow = clamp(l.shadow + 0.2, 0, 1); }); addFx(doc, 'holy'); return 'Improved lighting (shadow + rim light).'; },
    silhouette: function (doc) { doc.layers.forEach(function (l) { if (l.kind === 'part') { l.strokeW = clamp(l.strokeW + 0.6, 0, 4); } }); return 'Strengthened silhouette (edge definition).'; },
    blend: function (doc) { doc.layers.forEach(function (l) { if (l.kind === 'deco') { l.clipToBody = true; l.shadow = 0.6; } }); return 'Blended decorations into the item silhouette.'; },
    removeCheap: function (doc) { doc.layers.forEach(function (l) { if (l.kind === 'part') { l.gradient = true; if (l.glow > 0.85) l.glow = 0.5; } }); return 'Removed cheap/flat details.'; },
    balance: function (doc) { doc.layers.forEach(function (l) { if (l.kind === 'deco' && Math.abs(l.x - 50) < 3) l.y = clamp(l.y, 20, 100); }); return 'Improved balance.'; },
    symmetry: function (doc) { doc.layers.forEach(function (l) { if (l.kind === 'deco') l.x = 50; }); return 'Improved symmetry (centered decorations).'; },
    professionalize: function (doc) { QUALITY.realistic(doc); QUALITY.material(doc); QUALITY.lighting(doc); QUALITY.blend(doc); QUALITY.silhouette(doc); return 'Professionalized: materials, lighting, blended decorations, silhouette.'; },
    masterpiece: function (doc) { var keys = Object.keys(PALETTES); applyPalette(doc, keys[Math.floor(Math.random() * keys.length)]); QUALITY.detail(doc); QUALITY.professionalize(doc); addDeco(doc, 'gem'); addFx(doc, 'sparkle'); return 'Random masterpiece composed.'; },
    maximum: function (doc) { QUALITY.professionalize(doc); QUALITY.detail(doc); QUALITY.texture(doc); doc.layers.forEach(function (l) { if (l.kind === 'part') { l.metal = clamp(l.metal + 0.2, 0, 1); l.texture = clamp(l.texture + 0.15, 0, 1); } }); return 'Maximum quality applied.'; }
  };
  function addDeco(doc, type) { var l = addLayer(doc, 'deco', type); l.x = 50; l.y = 40 + Math.random() * 40; l.clipToBody = false; varyLayer(l, rng(uid())); return l; }
  function addFx(doc, type) { var l = addLayer(doc, 'fx', type); l.x = 50; l.y = 55; return l; }

  /* --------------------------- quality analysis ------------------------- */
  function analyze(doc) {
    var issues = [], score = 100;
    var parts = doc.layers.filter(function (l) { return l.kind === 'part'; });
    var decos = doc.layers.filter(function (l) { return l.kind === 'deco'; });
    if (!parts.length && !doc.origin) { issues.push({ k: 'noBody', m: 'No base part — add a blade/plate/shield.', fix: null }); score -= 40; }
    var flat = parts.filter(function (l) { return !l.gradient; }).length;
    if (flat) { issues.push({ k: 'flat', m: flat + ' flat part(s) with no gradient (looks cheap).', fix: 'material' }); score -= 15; }
    var noShadow = parts.filter(function (l) { return l.shadow < 0.3; }).length;
    if (noShadow) { issues.push({ k: 'lighting', m: 'Weak lighting/shadow on ' + noShadow + ' part(s).', fix: 'lighting' }); score -= 10; }
    var types = {}; var repeated = 0; decos.forEach(function (l) { types[l.type] = (types[l.type] || 0) + 1; if (types[l.type] > 2) repeated++; });
    if (repeated) { issues.push({ k: 'repeat', m: 'Repeated identical decorations (add variation).', fix: 'vary' }); score -= 10; }
    var glowy = doc.layers.filter(function (l) { return l.glow > 0.85; }).length;
    if (glowy > 2) { issues.push({ k: 'glow', m: 'Excessive glow (' + glowy + ' layers).', fix: 'removeCheap' }); score -= 8; }
    var pasted = decos.filter(function (l) { return !l.clipToBody && l.shadow < 0.3; }).length;
    if (pasted) { issues.push({ k: 'pasted', m: pasted + ' decoration(s) look pasted on (enable blend).', fix: 'blend' }); score -= 12; }
    if (doc.layers.length < 3 && !doc.origin) { issues.push({ k: 'detail', m: 'Low detail — add more layers.', fix: 'detail' }); score -= 10; }
    return { score: Math.max(0, score), issues: issues };
  }
  function autoFix(doc) { var a = analyze(doc); a.issues.forEach(function (it) { if (it.fix === 'vary') { doc.layers.forEach(function (l) { if (l.kind === 'deco') varyLayer(l, rng(uid())); }); } else if (it.fix && QUALITY[it.fix]) QUALITY[it.fix](doc); }); return analyze(doc); }

  /* ------------------------------ stats/buff ---------------------------- */
  var ABILITIES = [
    ['fire_damage', 'Fire Damage', function (a) { a.flat += 6; a.d.push('+6 fire/strike'); }], ['ice_damage', 'Ice Damage', function (a) { a.flat += 5; a.d.push('+5 ice/strike'); }],
    ['void_damage', 'Void Damage', function (a) { a.flat += 7; a.d.push('+7 void/strike'); }], ['lightning', 'Lightning', function (a) { a.critEvery = 8; a.critVal = 30; a.critChance = 55; a.d.push('55% +30 every 8'); }],
    ['poison', 'Poison', function (a) { a.every = 5; a.everyVal = 18; a.d.push('+18 every 5'); }], ['healing_aura', 'Healing Aura', function (a) { a.flat += 3; a.d.push('+3 sustain/strike'); }],
    ['crit_burst', 'Critical Burst', function (a) { a.critEvery = 20; a.critVal = 150; a.critChance = 35; a.d.push('35% +150 every 20'); }], ['royal', 'Royal Power', function (a) { a.flat += 12; a.every = 50; a.everyVal = 500; a.d.push('+12/strike & +500 every 50'); }],
    ['boss_dmg', 'Boss Slayer', function (a) { a.flat += 10; a.d.push('+10 boss/strike'); }], ['spirit', 'Spirit Mode', function (a) { a.every = 30; a.everyVal = 200; a.d.push('+200 every 30'); }],
    ['life_steal', 'Life Steal', function (a) { a.flat += 5; a.d.push('+5 leech/strike'); }], ['armor_break', 'Armor Break', function (a) { a.every = 6; a.everyVal = 30; a.d.push('+30 every 6'); }]
  ];
  function buildBuff(cat, stats, abilities) {
    stats = stats || {}; abilities = abilities || [];
    if (cat === 'food') {
      var val = Math.max(1, Math.round((+stats.healing || 0) + (+stats.foodStrength || 0) + (+stats.damage || 0) / 4) || 20);
      var mins = clamp(stats.duration || 60, 5, 600);
      return { foodBuff: { t: 'flat', val: val, mins: mins, kind: 'short' }, buffDesc: '+' + val + ' PTS/STRIKE for ' + mins + ' min' };
    }
    var a = { flat: 0, every: 0, everyVal: 0, critEvery: 0, critVal: 0, critChance: 100, burst: 0, surgeAt: 0, surgeVal: 0, onceAt: 0, onceVal: 0, d: [] };
    a.flat += Math.round((+stats.damage || 0) / 2 + (+stats.defense || 0) / 3 + (+stats.magic || 0) / 3);
    if (+stats.speed) a.burst += (+stats.speed) / 25;
    if (+stats.critChance) { a.critEvery = 6; a.critChance = clamp(stats.critChance, 1, 100); a.critVal = Math.max(10, Math.round(+stats.critDamage || 40)); }
    abilities.forEach(function (k) { var A = ABILITIES.filter(function (x) { return x[0] === k; })[0]; if (A) A[2](a); });
    if (a.flat < 1 && !a.every && !a.critEvery && !a.burst) a.flat = 5;
    var buff = { t: 'qm' }; if (a.flat) buff.flat = a.flat; if (a.every && a.everyVal) { buff.every = a.every; buff.everyVal = a.everyVal; }
    if (a.critEvery && a.critVal) { buff.critEvery = a.critEvery; buff.critVal = a.critVal; buff.critChance = a.critChance; } if (a.burst) buff.burst = n2(a.burst);
    var desc = []; if (buff.flat) desc.push('+' + buff.flat + ' Pts/strike'); a.d.forEach(function (x) { desc.push(x); });
    return { buffData: buff, buffDesc: desc.join('<br>') };
  }

  /* ------------------------------- templates ---------------------------- */
  function template(kind) {
    var d = defaultDoc(kind === 'shield' ? 'shields' : kind === 'armor' ? 'armor' : kind === 'food' ? 'food' : 'weapons');
    if (kind === 'sword' || !kind) {
      var g = addLayer(d, 'part', 'blade'); g.y = 42; g.fill = '#dbe3ee'; g.fill2 = '#5b6472'; g.metal = 0.7; g.shadow = 0.7;
      var gu = addLayer(d, 'part', 'crossguard'); gu.y = 78; gu.fill = '#e5b814'; gu.fill2 = '#7a5c00';
      var h = addLayer(d, 'part', 'handle'); h.y = 84; h.fill = '#5a3a1a'; h.fill2 = '#2a1a0a';
      var p = addLayer(d, 'part', 'pommel'); p.y = 104; p.fill = '#e5b814'; p.fill2 = '#7a5c00';
      var gem = addDeco(d, 'gem'); gem.y = 78; gem.fill = '#22d3ee'; gem.fill2 = '#0e7490'; gem.glowColor = '#22d3ee';
    } else if (kind === 'shield') {
      var s = addLayer(d, 'part', 'shield_heater'); s.y = 60; s.fill = '#8892a5'; s.fill2 = '#3a4152'; s.metal = 0.6; s.shadow = 0.7;
      var e = addDeco(d, 'emblem'); e.y = 58; e.fill = '#e5b814'; e.glowColor = '#e5b814';
    } else if (kind === 'armor') {
      var t = addLayer(d, 'part', 'armor_torso'); t.y = 60; t.fill = '#8892a5'; t.fill2 = '#3a4152'; t.metal = 0.6; t.shadow = 0.7;
    } else if (kind === 'food') {
      var pl = addLayer(d, 'part', 'food_plate'); pl.y = 80; pl.fill = '#e5e7eb'; pl.fill2 = '#9aa2b1';
      var st = addLayer(d, 'part', 'food_stack'); st.y = 66; st.fill = '#c2703a'; st.fill2 = '#6b3a18';
    }
    QUALITY.realistic(d);
    return d;
  }

  var ENGINE = {
    mulberry32: mulberry32, rng: rng, hashStr: hashStr, uid: uid, clamp: clamp, esc: esc,
    hexToRgb: hexToRgb, rgbToHex: rgbToHex, shade: shade, mix: mix, hsvToHex: hsvToHex, hexToHsv: hexToHsv,
    PARTS: PARTS, DECOS: DECOS, FX: FX, LIB: LIB, RARITIES: RARITIES, PALETTES: PALETTES, ABILITIES: ABILITIES,
    defaultLayer: defaultLayer, defaultDoc: defaultDoc, cloneLayer: cloneLayer, template: template,
    renderDoc: renderDoc, renderArtHTML: renderArtHTML,
    addLayer: addLayer, removeLayer: removeLayer, indexOfLayer: indexOfLayer, moveLayer: moveLayer,
    duplicateLayer: duplicateLayer, mirrorLayer: mirrorLayer, varyLayer: varyLayer, randomizeLayer: randomizeLayer,
    addDeco: addDeco, addFx: addFx, QUALITY: QUALITY, analyze: analyze, autoFix: autoFix, buildBuff: buildBuff
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = ENGINE;
  if (typeof window !== 'undefined') { window.__ForgeStudioEngine = ENGINE; }

  /* ======================================================================
     BROWSER-ONLY: UI + integration. Guarded so Node require() stays pure.
     ====================================================================== */
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  function S() { return window.BCA_SYS; }
  function isAdmin() { var s = S(); return !!(s && s.state && s.state.profile && s.state.profile.isAdmin); }

  // injected animation keyframes (once)
  function ensureStyle() {
    if (document.getElementById('forge-studio-style')) return;
    var st = document.createElement('style'); st.id = 'forge-studio-style';
    st.textContent = '@keyframes fsRise{0%{transform:translateY(4px);opacity:.2}50%{opacity:.9}100%{transform:translateY(-18px);opacity:0}}'
      + '@keyframes fsFlick{0%,100%{opacity:.5;transform:scaleY(.9)}50%{opacity:1;transform:scaleY(1.15)}}'
      + '@keyframes fsPulse{0%,100%{opacity:.5}50%{opacity:1}}@keyframes fsSpin{to{transform:rotate(360deg)}}'
      + '.fs-rise{animation:fsRise 2.2s ease-in infinite}.fs-flick{transform-origin:center bottom;animation:fsFlick 1.1s ease-in-out infinite}'
      + '.fs-pulse{animation:fsPulse 1.8s ease-in-out infinite}.fs-spin{transform-origin:center;animation:fsSpin 8s linear infinite}'
      + '#forge-studio input[type=range]{width:100%}#forge-studio .fs-row{margin:4px 0}#forge-studio .fs-lab{font:700 8px monospace;color:#9aa2b1;text-transform:uppercase;letter-spacing:.08em}'
      + '#forge-studio button{cursor:pointer}#forge-studio .fs-lyr.sel{outline:1px solid #e5b814}';
    document.head.appendChild(st);
  }

  /* -------------------------- persistence + inject ---------------------- */
  var CUSTOM = {};
  var LKEY = 'bca_forge_studio_v1';
  function cloud() { var FS = window.__BCA_FS, DB = window.__BCA_DB; return (FS && DB && FS.doc && FS.setDoc) ? { FS: FS, DB: DB } : null; }
  function loadLocal() { try { var j = localStorage.getItem(LKEY); if (j) CUSTOM = JSON.parse(j) || {}; } catch (e) {} }
  function saveLocal() { try { localStorage.setItem(LKEY, JSON.stringify(CUSTOM)); } catch (e) {} }
  function registerArt(def) {
    try {
      var sh = S().shop; if (!sh || !sh.legendaryArt) return;
      var hasArt = !!(def.doc && (def.doc.origin || (def.doc.layers && def.doc.layers.length)));
      if (!hasArt) {
        // No custom art (a stats/abilities/description-only edit): the item keeps its NORMAL base
        // shop art. Remove any prior custom-art registration so it never renders blank, and bust
        // the caches so the base art shows.
        try { delete sh.legendaryArt[def.id]; } catch (e) {}
        if (sh.artCache) { delete sh.artCache[def.id]; delete sh.artCache['LEG_' + def.id]; ['weapons', 'armor', 'shields', 'food'].forEach(function (c) { delete sh.artCache['EXACT_' + c + '_' + def.id]; }); }
        if (S().exactVisuals) { S().exactVisuals._metaCache = {}; try { S().exactVisuals.clearEquipmentCaches && S().exactVisuals.clearEquipmentCaches(); } catch (e) {} }
        return;
      }
      sh.legendaryArt[def.id] = (function (doc) { return function () { return renderArtHTML(doc); }; })(def.doc);
      if (sh.artCache) { delete sh.artCache[def.id]; delete sh.artCache['LEG_' + def.id]; ['weapons', 'armor', 'shields', 'food'].forEach(function (c) { delete sh.artCache['EXACT_' + c + '_' + def.id]; }); }
      if (S().exactVisuals) { S().exactVisuals._metaCache = {}; try { S().exactVisuals.clearEquipmentCaches && S().exactVisuals.clearEquipmentCaches(); } catch (e) {} }
    } catch (e) {}
  }
  function toItem(def) {
    var it = { id: def.id, name: def.name, sub: def.sub, tier: def.tier || 20, req: def.req || 'BLACKSMITH FORGED', price: +def.price || 0, _forge: true, _studio: true, _blacksmithForged: true, rarity: def.doc && def.doc.rarity };
    // Carry the separated flavor + buff-stats lines so re-opening the item in the editor loads
    // the custom flavor back into the box (not the combined text) and never duplicates on re-save.
    if (def.flavorDesc != null) it.flavorDesc = def.flavorDesc;
    if (def._buffStatsDesc != null) it._buffStatsDesc = def._buffStatsDesc;
    if (def.cat === 'food') { it.buffDesc = def.buffDesc || ''; it.desc = def.buffDesc || ''; if (def.foodBuff) it.foodBuff = def.foodBuff; if (def.price) it.buffPrice = +def.price; }
    else { it.buffData = def.buffData || { t: 'flat', val: 5 }; it.buffDesc = def.buffDesc || ''; }
    return it;
  }
  // CONFLICT RESOLUTION between the two admin item editors. Forge Studio (this file) and the
  // Visual Item Forge (index.html) each keep their own custom-item store, and both re-inject
  // into shop.db + shop.legendaryArt on every shop rebuild. If the SAME item id lives in both,
  // they used to fight over its art/stats on every rebuild — the item's picture flickered
  // between the old and new art and its power kept reverting. Now each store carries a savedAt
  // stamp and defers to whichever editor touched the item MORE RECENTLY (Forge Studio wins ties).
  // Return the OTHER editor's stored def for this id, or null if it doesn't have it. It is
  // essential to check EXISTENCE (not just savedAt): a missing entry reads as savedAt 0, and an
  // unstamped legacy entry is also 0 — so comparing raw savedAt made this store wrongly skip
  // injecting items the other store never had, which blanked pre-existing Item Forge weapons/
  // shields (they fell back to generic art). We only defer when the other store ACTUALLY owns the id.
  function _otherStoreDef(key, id) { try { var o = JSON.parse(localStorage.getItem(key) || '{}'); return (o && o[id]) ? o[id] : null; } catch (e) { return null; } }
  function injectAll() {
    var sh = S() && S().shop; if (!sh || !sh.db) return;
    Object.keys(CUSTOM).forEach(function (id) {
      var def = CUSTOM[id]; if (!def || !def.cat) return;
      if (typeof DESTROYED !== 'undefined' && DESTROYED[id]) { delete CUSTOM[id]; return; } // never re-inject a destroyed item
      // Defer to the Visual Item Forge ONLY if it actually has this id AND edited it more recently.
      var _o = _otherStoreDef('bca_item_forge_v1', id);
      if (_o && (+_o.savedAt || 0) > (+def.savedAt || 0)) return;
      var arr = sh.db[def.cat]; if (!arr) return;
      registerArt(def);
      var built = toItem(def), found = null;
      for (var i = 0; i < arr.length; i++) { if (arr[i] && arr[i].id === id) { found = arr[i]; break; } }
      if (found) { Object.keys(built).forEach(function (k) { found[k] = built[k]; }); } else { arr.unshift(built); }
      // PROPAGATE EDITS TO WEARERS: a player's equipped items are FROZEN SNAPSHOTS taken at equip
      // time (serialized into the profile), NOT live references to shop.db. So an edit to an item
      // someone is already wearing (e.g. Craymore for CRYSTAL) would never show for them until they
      // re-equipped — the picture, description, name and combat buff all stayed stale, which reads
      // as "the edit didn't save / the weapon isn't changing" even after a refresh. Re-sync the
      // equipped snapshot from the latest def on every inject (load, shop rebuild, 6s tick, cloud
      // sync) so the change reaches the wearer everywhere, on this device and every other client.
      try { refreshEquipped(def); } catch (e) {}
    });
    try { if (typeof applyDestroyed === 'function') applyDestroyed(); } catch (e) {} // keep destroyed items gone after any rebuild
  }
  function pushCloud(def) { var c = cloud(); if (!c) return; try { var d = {}; d[def.id] = def; c.FS.setDoc(c.FS.doc(c.DB, 'bca_system', 'forge_studio_v1'), { items: d }, { merge: true }); } catch (e) {} }
  function wireCloud() { var c = cloud(); if (!c || wireCloud._on) return; wireCloud._on = true; try { c.FS.onSnapshot(c.FS.doc(c.DB, 'bca_system', 'forge_studio_v1'), function (snap) { var data = (snap && snap.data) ? snap.data() : null; var items = (data && data.items) || {}; Object.keys(items).forEach(function (k) { var cd = items[k]; if (!cd) return; var ld = CUSTOM[k]; if (ld && (+ld.savedAt || 0) > (+cd.savedAt || 0)) return; /* keep a FRESHER local edit; never let a stale cloud snapshot clobber it (that made saves "revert" on refresh) */ CUSTOM[k] = cd; }); saveLocal(); injectAll(); }); } catch (e) {} }
  // After an upgrade/edit, the player may ALREADY have this exact item equipped (its id is
  // preserved on upgrade). The equipped slot holds a SNAPSHOT taken at equip time, so its
  // stats/name/art metadata are stale until re-equipped. Refresh the equipped object IN PLACE
  // (same reference & id) so the upgrade instantly applies to the gear the player is wearing,
  // and it keeps reading as "equipped" in every shop/inventory grid.
  function refreshEquipped(def) {
    try {
      var pf = S() && S().state && S().state.profile; if (!pf) return;
      var built = toItem(def);
      ['activeWeapon', 'activeHqWeapon', 'activeArmor', 'activeShield'].forEach(function (slot) {
        var cur = pf[slot];
        if (cur && cur.id === def.id) { Object.keys(built).forEach(function (k) { cur[k] = built[k]; }); }
      });
    } catch (e) {}
  }
  // Re-render whatever shop/inventory grid is currently open so an upgraded item's NEW art and
  // stats appear immediately instead of only after leaving and reopening the shop. The avatar /
  // status figures already refresh on their own ~1.5s interval (reading legendaryArt live).
  function refreshViews() {
    try {
      var s = S(); if (!s) return;
      if (s.shop && s.shop.renderGrid && s.shop._ca1aLast) {
        try { s.shop.renderGrid(s.shop._ca1aLast.cat, s.shop._ca1aLast.sub); } catch (e) {}
      }
      // Also refresh the currently-open AREA shop (Royal Armory / Town / Kitchen / Garage) by
      // re-entering it, so an upgraded item's new art (or a destroyed item's removal) shows there
      // immediately instead of only after leaving and reopening the shop.
      try {
        var act = document.querySelector('.rzg-view.active'), vid = act ? act.id : '';
        if (/^rzg-view-(rarmory|rtown|rtshop|rk|rgarage)$/.test(vid) && s.travel && s.travel.enterCurrent && s.state && s.state.currentActivity !== 'travel') {
          s.travel.enterCurrent();
        }
      } catch (e) {}
      try { if (s.ui && s.ui.updateHeader) s.ui.updateHeader(); } catch (e) {}
    } catch (e) {}
  }
  function saveDef(def) {
    def.savedAt = Date.now(); // stamp so the two item editors can resolve "most recent edit wins"
    CUSTOM[def.id] = def;
    // PERSIST FIRST, everything else after: the cloud write MUST happen even if a downstream
    // step throws. Previously injectAll()/refreshEquipped() ran BEFORE pushCloud(), so a single
    // bad/legacy item making injectAll throw silently skipped the cloud write — the edit lived
    // only in this session, reverted on refresh (the cloud copy re-loaded), and never reached
    // other players. Now the local save + cloud push happen up front and are unconditional.
    try { saveLocal(); } catch (e) {}
    try { pushCloud(def); } catch (e) {}
    try { injectAll(); } catch (e) {}
    try { refreshEquipped(def); } catch (e) {}
    try { if (S().adminGear && S().adminGear.fillItems) S().adminGear.fillItems(); } catch (e) {}
    try { if (S().storage && S().storage.save) S().storage.save(); } catch (e) {}
    // Force every live avatar/fighter to re-resolve this item's art NOW so the equipped/worn
    // picture updates instantly instead of flickering between old and new until the next tick.
    try { if (S().exactVisuals && S().exactVisuals.refreshLiveFighters) S().exactVisuals.refreshLiveFighters(); } catch (e) {}
    try { refreshViews(); } catch (e) {}
  }

  /* ------------------- PERMANENT ITEM DESTRUCTION (admin) --------------- */
  // A destroyed item is removed from every shop everywhere and stays gone across shop rebuilds,
  // reloads and cloud sync via a persistent tombstone (local + bca_system/shop_destroyed_v1).
  var DESTROYED = {};
  var DKEY = 'bca_forge_destroyed_v1';
  function loadDestroyed() { try { var j = localStorage.getItem(DKEY); if (j) DESTROYED = JSON.parse(j) || {}; } catch (e) {} }
  function saveDestroyed() { try { localStorage.setItem(DKEY, JSON.stringify(DESTROYED)); } catch (e) {} }
  function pushDestroyedCloud() { var c = cloud(); if (!c) return; try { var d = {}; Object.keys(DESTROYED).forEach(function (k) { d[k] = true; }); c.FS.setDoc(c.FS.doc(c.DB, 'bca_system', 'shop_destroyed_v1'), { ids: d }, { merge: true }); } catch (e) {} }
  function applyDestroyed() {
    var sh = S() && S().shop; if (!sh || !sh.db) return;
    Object.keys(DESTROYED).forEach(function (id) {
      if (!DESTROYED[id]) return;
      ['weapons', 'armor', 'shields', 'food', 'pickaxes'].forEach(function (cat) {
        var arr = sh.db[cat]; if (!Array.isArray(arr)) return;
        for (var i = arr.length - 1; i >= 0; i--) { if (arr[i] && arr[i].id === id) arr.splice(i, 1); }
      });
      if (CUSTOM[id]) { delete CUSTOM[id]; }
      try { if (sh.legendaryArt) delete sh.legendaryArt[id]; } catch (e) {}
      if (sh.artCache) { delete sh.artCache[id]; delete sh.artCache['LEG_' + id]; ['weapons', 'armor', 'shields', 'food'].forEach(function (c) { delete sh.artCache['EXACT_' + c + '_' + id]; }); }
    });
  }
  function wireDestroyedCloud() {
    var c = cloud(); if (!c || wireDestroyedCloud._on) return; wireDestroyedCloud._on = true;
    try { c.FS.onSnapshot(c.FS.doc(c.DB, 'bca_system', 'shop_destroyed_v1'), function (snap) { var data = (snap && snap.data) ? snap.data() : null; var ids = (data && data.ids) || {}; Object.keys(ids).forEach(function (k) { if (ids[k]) DESTROYED[k] = true; }); saveDestroyed(); applyDestroyed(); refreshViews(); }); } catch (e) {}
  }
  function unequipEverywhereLocal(id) {
    try {
      var pf = S() && S().state && S().state.profile; if (!pf) return;
      ['activeWeapon', 'activeHqWeapon', 'activeArmor', 'activeShield'].forEach(function (slot) { if (pf[slot] && pf[slot].id === id) pf[slot] = null; });
      ['ownedWeapons', 'ownedHqWeapons', 'ownedArmor', 'ownedShields'].forEach(function (list) { if (Array.isArray(pf[list])) pf[list] = pf[list].filter(function (x) { return x !== id; }); });
    } catch (e) {}
  }
  function destroyItem(cat, id) {
    if (!isAdmin()) { try { S().ui.notify('ADMIN ONLY.'); } catch (e) {} return; }
    if (!id) return;
    DESTROYED[id] = true; saveDestroyed(); pushDestroyedCloud();
    applyDestroyed(); unequipEverywhereLocal(id);
    try { if (S().exactVisuals && S().exactVisuals.clearEquipmentCaches) S().exactVisuals.clearEquipmentCaches(); } catch (e) {}
    try { if (S().storage && S().storage.save) S().storage.save(); } catch (e) {}
    refreshViews();
    try { S().ui.notify('\u2620 ITEM PERMANENTLY DESTROYED \u2014 removed from every shop.'); } catch (e) {}
  }

  /* ------------------------------- editor state ------------------------- */
  var ED = {
    doc: null, sel: null, mode: 'create', editId: null, clip: null,
    hist: [], hix: -1, name: 'Untitled Relic', price: 5000000, sub: 'X Spam Powered',
    stats: { damage: 20, defense: 10, speed: 20, magic: 0, critChance: 15, critDamage: 40, healing: 0, foodStrength: 0, duration: 60 }, abilities: [],
    // desc = admin-authored description text (blank = auto-generate from stats/abilities).
    // origBuffData/origFoodBuff/origBuffDesc = the edited item's EXISTING combat data, kept so
    // that editing ONLY the art/name/description of an existing item never wipes its abilities.
    // statsDirty flips true the moment the admin touches a stat slider or ability chip.
    // desc = custom FLAVOR text only (kept separate from the auto buff summary so the two never
    // duplicate on re-save). origBuffStatsDesc = the item's existing auto buff-stats line, reused
    // on an art-only edit. The saved buffDesc is ALWAYS [flavor + buff summary], so any buff you
    // add automatically appears on the weapon's description.
    desc: '', origBuffData: null, origFoodBuff: null, origBuffDesc: '', origBuffStatsDesc: '', statsDirty: false,
    view: { rot: 0, zoom: 1, px: 0, py: 0, light: 0 }
  };
  function snapshot() { try { ED.hist = ED.hist.slice(0, ED.hix + 1); ED.hist.push(JSON.stringify(ED.doc)); if (ED.hist.length > 60) ED.hist.shift(); ED.hix = ED.hist.length - 1; } catch (e) {} }
  function undo() { if (ED.hix > 0) { ED.hix--; ED.doc = JSON.parse(ED.hist[ED.hix]); ED.sel = null; renderAll(); } }
  function redo() { if (ED.hix < ED.hist.length - 1) { ED.hix++; ED.doc = JSON.parse(ED.hist[ED.hix]); ED.sel = null; renderAll(); } }

  function selLayer() { return ED.doc.layers.filter(function (l) { return l.id === ED.sel; })[0]; }

  /* --------------------------------- UI --------------------------------- */
  function gv(id) { var e = document.getElementById(id); return e ? e.value : ''; }
  function slider(id, lab, min, max, step, val, oninput) { return '<div class="fs-row"><div class="fs-lab">' + lab + ' <span id="' + id + '-v" style="color:#e5b814">' + val + '</span></div><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" oninput="' + oninput + '"></div>'; }

  function layerPanel() {
    var rows = ED.doc.layers.slice().reverse().map(function (l) {
      var sel = l.id === ED.sel ? ' sel' : '';
      return '<div class="fs-lyr' + sel + '" style="display:flex;align-items:center;gap:3px;padding:3px 4px;border-bottom:1px solid #1c2130;background:' + (l.id === ED.sel ? '#1a1e2b' : 'transparent') + '" onclick="BCA_SYS.forgeStudio.pick(\'' + l.id + '\')">'
        + '<span style="font:700 8px monospace;color:' + (l.kind === 'fx' ? '#67e8f9' : l.kind === 'deco' ? '#c4b5fd' : '#fde68a') + ';width:26px">' + l.kind.toUpperCase().slice(0, 3) + '</span>'
        + '<span style="flex:1;font:600 10px monospace;color:#cbd5e1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(l.name) + '</span>'
        + '<button title="hide" onclick="event.stopPropagation();BCA_SYS.forgeStudio.toggle(\'' + l.id + '\',\'hidden\')" style="background:none;border:0;color:' + (l.hidden ? '#7f1d1d' : '#4ade80') + '">' + (l.hidden ? '\u25CB' : '\u25CF') + '</button>'
        + '<button title="lock" onclick="event.stopPropagation();BCA_SYS.forgeStudio.toggle(\'' + l.id + '\',\'locked\')" style="background:none;border:0;color:' + (l.locked ? '#e5b814' : '#555') + '">' + (l.locked ? '\uD83D\uDD12' : '\uD83D\uDD13') + '</button>'
        + '<button title="up" onclick="event.stopPropagation();BCA_SYS.forgeStudio.move(\'' + l.id + '\',1)" style="background:none;border:0;color:#9aa2b1">\u25B2</button>'
        + '<button title="down" onclick="event.stopPropagation();BCA_SYS.forgeStudio.move(\'' + l.id + '\',-1)" style="background:none;border:0;color:#9aa2b1">\u25BC</button>'
        + '</div>';
    }).join('');
    return '<div style="font:800 10px monospace;color:#e5b814;padding:4px;letter-spacing:.1em">LAYERS (' + ED.doc.layers.length + ')</div>'
      + '<div style="max-height:230px;overflow:auto;border:1px solid #222;border-radius:5px">' + (rows || '<div style="padding:8px;color:#666;font:600 9px monospace">No layers. Add parts below.</div>') + '</div>'
      + '<div style="display:flex;gap:3px;margin-top:5px;flex-wrap:wrap">'
      + fsBtn('dup', '\u29C9 Dup', 'duplicate') + fsBtn('del', '\uD83D\uDDD1 Del', 'del') + fsBtn('mx', 'Mirror H', 'mirrorX') + fsBtn('my', 'Mirror V', 'mirrorY') + fsBtn('rnd', '\uD83C\uDFB2 Vary', 'randomize') + fsBtn('cp', 'Copy', 'copy') + fsBtn('pa', 'Paste', 'paste')
      + '</div>';
  }
  function fsBtn(id, label, method) { return '<button onclick="BCA_SYS.forgeStudio.' + method + '()" style="flex:1;min-width:52px;font:700 8px monospace;padding:5px 3px;background:#151a26;border:1px solid #2a3142;color:#cbd5e1;border-radius:4px">' + label + '</button>'; }

  function libraryPanel() {
    function cat(title, kind, list) {
      return '<div style="margin-top:6px"><div class="fs-lab">' + title + '</div><div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:2px">'
        + list.map(function (t) { return '<button onclick="BCA_SYS.forgeStudio.add(\'' + kind + '\',\'' + t + '\')" style="font:600 8px monospace;padding:3px 5px;background:#111726;border:1px solid #2a3142;color:#9aa2b1;border-radius:3px">' + t.replace(/_/g, ' ') + '</button>'; }).join('') + '</div></div>';
    }
    return '<input id="fs-lib-search" placeholder="search parts..." oninput="BCA_SYS.forgeStudio.search()" style="width:100%;margin-top:6px;background:#0a0e18;border:1px solid #2a3142;color:#cbd5e1;font:600 10px monospace;padding:5px;border-radius:4px">'
      + '<div id="fs-lib-cats">' + cat('PARTS', 'part', LIB.part) + cat('DECORATIONS', 'deco', LIB.deco) + cat('EFFECTS', 'fx', LIB.fx) + '</div>';
  }

  function colorField(id, lab, val, method) { return '<div style="flex:1;min-width:64px"><div class="fs-lab">' + lab + '</div><input type="color" id="' + id + '" value="' + val + '" oninput="BCA_SYS.forgeStudio.' + method + '()" style="width:100%;height:24px;border:1px solid #2a3142;background:none;border-radius:3px"></div>'; }

  function propsPanel() {
    var l = selLayer();
    if (!l) return '<div style="color:#666;font:600 9px monospace;padding:8px">Select a layer to edit its parts, material, color and effects.</div>';
    var m = 'BCA_SYS.forgeStudio.upd()';
    var out = '<div style="font:800 10px monospace;color:#e5b814;padding:2px 0">EDIT: ' + esc(l.name) + ' <span style="color:#666">(' + l.kind + '/' + l.type + ')</span></div>';
    out += '<input id="fs-lname" value="' + esc(l.name) + '" oninput="' + m + '" style="width:100%;background:#0a0e18;border:1px solid #2a3142;color:#cbd5e1;font:600 10px monospace;padding:4px;border-radius:3px;margin-bottom:4px">';
    // transform
    out += '<div class="fs-lab" style="color:#e5b814;margin-top:4px">TRANSFORM</div>';
    out += slider('fs-x', 'X', 0, 100, 0.5, l.x, m) + slider('fs-y', 'Y', 0, 120, 0.5, l.y, m);
    out += slider('fs-sx', 'Width / stretch', 0.2, 4, 0.05, l.sx, m) + slider('fs-sy', 'Height / stretch', 0.2, 4, 0.05, l.sy, m);
    out += slider('fs-rot', 'Rotation', -180, 180, 1, l.rot, m) + slider('fs-op', 'Opacity', 0, 1, 0.02, l.opacity, m);
    if (l.kind !== 'fx') {
      out += '<div class="fs-lab" style="color:#e5b814;margin-top:4px">SHAPE</div>';
      out += slider('fs-pw', 'Thickness/width', -1, 2, 0.05, l.params.width || 0, m) + slider('fs-ph', 'Length/height', -1, 2, 0.05, l.params.height || 0, m);
      out += slider('fs-pt', 'Taper', 0, 1, 0.05, l.params.taper || 0, m) + slider('fs-pc', 'Curvature/bend', -1, 1, 0.05, l.params.curvature || 0, m);
      out += '<div class="fs-lab" style="color:#e5b814;margin-top:4px">MATERIAL &amp; LIGHTING</div>';
      out += '<div style="display:flex;gap:4px">' + colorField('fs-c1', 'Main', l.fill, 'upd') + colorField('fs-c2', 'Shade', l.fill2, 'upd') + colorField('fs-ce', 'Edge', l.stroke, 'upd') + '</div>';
      out += slider('fs-metal', 'Metalness / shine', 0, 1, 0.02, l.metal, m) + slider('fs-tex', 'Texture / wear', 0, 1, 0.02, l.texture, m);
      out += slider('fs-shadow', 'Shadow depth', 0, 1, 0.02, l.shadow, m) + slider('fs-strokeW', 'Edge width', 0, 4, 0.1, l.strokeW, m);
      out += '<div style="display:flex;gap:4px;align-items:center;margin-top:2px">' + colorField('fs-gc', 'Glow', l.glowColor, 'upd') + '<div style="flex:2">' + slider('fs-glow', 'Glow intensity', 0, 1, 0.02, l.glow, m) + '</div></div>';
      out += '<label style="font:600 9px monospace;color:#cbd5e1;display:block;margin-top:3px"><input type="checkbox" id="fs-grad" ' + (l.gradient ? 'checked' : '') + ' onchange="' + m + '"> gradient</label>';
      out += '<label style="font:600 9px monospace;color:#cbd5e1;display:block"><input type="checkbox" id="fs-clip" ' + (l.clipToBody ? 'checked' : '') + ' onchange="' + m + '"> blend into item (clip to body)</label>';
    } else {
      out += '<div class="fs-lab" style="color:#67e8f9;margin-top:4px">EFFECT</div>';
      out += '<div style="display:flex;gap:4px">' + colorField('fs-fxc', 'Color', l.fx.color, 'upd') + colorField('fs-fxc2', 'Color 2', l.fx.color2, 'upd') + '</div>';
      out += slider('fs-fxcount', 'Particle count', 1, 40, 1, l.fx.count, m) + slider('fs-fxsize', 'Particle size', 0.3, 3, 0.1, l.fx.size, m);
      out += slider('fs-fxop', 'Opacity/brightness', 0.1, 1, 0.02, l.fx.opacity, m);
    }
    return out;
  }

  function qualityPanel() {
    var ops = [['realistic', 'Realistic'], ['premium', 'Premium'], ['ancient', 'Ancient'], ['elegant', 'Elegant'], ['brutal', 'Brutal'], ['luxurious', 'Luxurious'], ['magical', 'Magical'], ['detail', '+Detail'], ['texture', '+Texture'], ['material', '+Material'], ['lighting', '+Lighting'], ['silhouette', '+Silhouette'], ['blend', 'Blend Deco'], ['removeCheap', 'De-cheap'], ['symmetry', 'Symmetry'], ['balance', 'Balance'], ['professionalize', 'Professionalize'], ['masterpiece', 'Random Masterpiece'], ['maximum', 'MAX Quality']];
    var originBtn = (ED.doc && ED.doc.origin)
      ? '<button onclick="BCA_SYS.forgeStudio.clearOrigin()" style="width:100%;font:700 8px monospace;padding:5px;margin-top:4px;background:#2a0000;border:1px solid #ef4444;color:#fca5a5;border-radius:3px">\u2716 REMOVE ORIGINAL ART \u2014 REDESIGN FROM SCRATCH</button>'
      : '';
    return '<div class="fs-lab" style="color:#e5b814">ONE-CLICK QUALITY</div><div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:2px">'
      + ops.map(function (o) { return '<button onclick="BCA_SYS.forgeStudio.quality(\'' + o[0] + '\')" style="font:700 8px monospace;padding:4px 5px;background:#1a1400;border:1px solid #5a4500;color:#fde68a;border-radius:3px">' + o[1] + '</button>'; }).join('') + '</div>' + originBtn;
  }
  function analysisPanel() {
    var a = analyze(ED.doc);
    var col = a.score >= 80 ? '#4ade80' : a.score >= 55 ? '#e5b814' : '#f87171';
    var out = '<div class="fs-lab">QUALITY SCORE <span style="color:' + col + ';font-size:12px">' + a.score + '/100</span> <button onclick="BCA_SYS.forgeStudio.autofix()" style="font:700 8px monospace;padding:2px 6px;background:#052e16;border:1px solid #16a34a;color:#4ade80;border-radius:3px">AUTO-FIX</button></div>';
    out += a.issues.length ? a.issues.map(function (i) { return '<div style="font:600 8px monospace;color:#f8b4b4;padding:1px 0">\u2022 ' + esc(i.m) + '</div>'; }).join('') : '<div style="font:600 8px monospace;color:#4ade80">No issues detected.</div>';
    return out;
  }
  function statsPanel() {
    if (ED.doc.cat === 'food') {
      return '<div class="fs-lab" style="color:#e5b814">FOOD BUFF</div>' + slider('fs-st-healing', 'Healing/strength', 0, 200, 1, ED.stats.healing, 'BCA_SYS.forgeStudio.stat()') + slider('fs-st-duration', 'Duration (min)', 5, 600, 5, ED.stats.duration, 'BCA_SYS.forgeStudio.stat()');
    }
    var s = '<div class="fs-lab" style="color:#e5b814">STATS</div>';
    s += slider('fs-st-damage', 'Damage', 0, 400, 1, ED.stats.damage, 'BCA_SYS.forgeStudio.stat()') + slider('fs-st-defense', 'Defense', 0, 400, 1, ED.stats.defense, 'BCA_SYS.forgeStudio.stat()');
    s += slider('fs-st-speed', 'Speed', 0, 200, 1, ED.stats.speed, 'BCA_SYS.forgeStudio.stat()') + slider('fs-st-critChance', 'Crit %', 0, 100, 1, ED.stats.critChance, 'BCA_SYS.forgeStudio.stat()');
    s += '<div class="fs-lab" style="margin-top:4px">ABILITIES</div><div style="display:flex;flex-wrap:wrap;gap:3px">'
      + ABILITIES.map(function (a) { var on = ED.abilities.indexOf(a[0]) > -1; return '<button onclick="BCA_SYS.forgeStudio.ability(\'' + a[0] + '\')" style="font:600 8px monospace;padding:3px 5px;border-radius:3px;border:1px solid ' + (on ? '#e5b814' : '#2a3142') + ';background:' + (on ? '#2a2000' : '#111726') + ';color:' + (on ? '#e5b814' : '#9aa2b1') + '">' + a[1] + '</button>'; }).join('') + '</div>';
    return s;
  }

  function previewPanel() {
    var r = renderDoc(ED.doc, { light: ED.view.rot });
    var tf = 'transform:rotate(' + n2(ED.view.rot) + 'deg) scale(' + n2(ED.view.zoom) + ') translate(' + n2(ED.view.px) + 'px,' + n2(ED.view.py) + 'px);transition:transform .05s';
    var originNote = ED.doc && ED.doc.origin ? '<div style="position:absolute;top:4px;left:6px;z-index:3;font:700 8px monospace;color:#4ade80;background:rgba(0,0,0,.5);padding:1px 5px;border-radius:3px">ORIGINAL ART PRESERVED \u2014 UPGRADES STACK ON TOP</div>' : '';
    return '<div style="position:relative;background:radial-gradient(circle at 50% 40%,#12131c,#050507);border:1px solid #222;border-radius:8px;height:280px;display:flex;align-items:center;justify-content:center;overflow:hidden">'
      + originNote
      + '<div style="position:relative;width:220px;height:260px;' + tf + '">' + originLayerHTML(ED.doc) + '<div style="position:absolute;inset:0;z-index:1">' + r.svg + '</div></div></div>'
      + '<div style="display:flex;gap:6px;margin-top:5px">'
      + '<div style="flex:1">' + slider('fs-v-rot', 'Rotate/Light', -180, 180, 1, ED.view.rot, 'BCA_SYS.forgeStudio.view()') + '</div>'
      + '<div style="flex:1">' + slider('fs-v-zoom', 'Zoom', 0.4, 2.5, 0.05, ED.view.zoom, 'BCA_SYS.forgeStudio.view()') + '</div></div>';
  }

  function renderAll() {
    var host = document.getElementById('forge-studio'); if (!host) return;
    var left = document.getElementById('fs-left'), mid = document.getElementById('fs-mid'), right = document.getElementById('fs-right');
    if (left) left.innerHTML = layerPanel() + libraryPanel();
    if (mid) mid.innerHTML = previewPanel() + '<div style="margin-top:6px">' + qualityPanel() + '</div><div style="margin-top:6px">' + analysisPanel() + '</div>';
    if (right) right.innerHTML = propsPanel() + '<div style="margin-top:8px;border-top:1px solid #222;padding-top:6px">' + statsPanel() + '</div>';
  }
  function renderPreviewOnly() { var mid = document.getElementById('fs-mid'); if (mid) { var p = document.getElementById('fs-preview-wrap'); } renderAll(); }

  function openStudio(mode, doc, editId) {
    if (!isAdmin()) { try { S().ui.notify('ADMIN ONLY.'); } catch (e) {} return; }
    ensureStyle();
    ED.mode = mode || 'create'; ED.editId = editId || null; ED.sel = null;
    ED.doc = doc || template('sword');
    ED.name = (doc && doc.name) || ED.doc.name || 'Untitled Relic';
    ED.hist = []; ED.hix = -1; snapshot();
    var ov = document.getElementById('forge-studio');
    if (!ov) { ov = document.createElement('div'); ov.id = 'forge-studio'; document.body.appendChild(ov); }
    ov.style.cssText = 'position:fixed;inset:0;z-index:100060;background:rgba(3,4,8,.96);padding:10px;overflow:auto;font-family:Rajdhani,monospace';
    var typeOpts = ['weapons', 'shields', 'armor', 'food'].map(function (c) { return '<option value="' + c + '"' + (c === ED.doc.cat ? ' selected' : '') + '>' + c.toUpperCase() + '</option>'; }).join('');
    var subOpts = ['X Spam Powered', 'Call of Duty Powered', 'Minecraft Powered', 'Dead Trigger Powered', 'Consumables'].map(function (x) { return '<option' + (x === ED.sub ? ' selected' : '') + '>' + x + '</option>'; }).join('');
    var rarOpts = RARITIES.map(function (r) { return '<option value="' + r + '"' + (r === ED.doc.rarity ? ' selected' : '') + '>' + r + '</option>'; }).join('');
    ov.innerHTML = '<div style="max-width:1180px;margin:0 auto;background:#0a0c12;border:1px solid #2a2f3a;border-radius:10px;padding:10px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #222;padding-bottom:7px;margin-bottom:8px;flex-wrap:wrap;gap:6px">'
      + '<div style="font:800 15px monospace;letter-spacing:.12em;color:#e5b814">\uD83C\uDFA8 FORGE STUDIO <span style="font-size:9px;color:#666">' + (ED.mode === 'upgrade' ? 'UPGRADE / EDIT' : 'CREATE') + '</span></div>'
      + '<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center">'
      + '<button onclick="BCA_SYS.forgeStudio.undo()" style="font:700 10px monospace;padding:5px 8px;background:#151a26;border:1px solid #2a3142;color:#cbd5e1;border-radius:4px">\u21B6 Undo</button>'
      + '<button onclick="BCA_SYS.forgeStudio.redo()" style="font:700 10px monospace;padding:5px 8px;background:#151a26;border:1px solid #2a3142;color:#cbd5e1;border-radius:4px">\u21B7 Redo</button>'
      + '<button onclick="BCA_SYS.forgeStudio.exportItem()" style="font:700 10px monospace;padding:5px 8px;background:#111726;border:1px solid #2a3142;color:#cbd5e1;border-radius:4px">Export</button>'
      + '<button onclick="BCA_SYS.forgeStudio.importItem()" style="font:700 10px monospace;padding:5px 8px;background:#111726;border:1px solid #2a3142;color:#cbd5e1;border-radius:4px">Import</button>'
      + '<button onclick="BCA_SYS.forgeStudio.close()" style="font:800 11px monospace;padding:5px 11px;background:#2a0000;border:1px solid #7f1d1d;color:#fca5a5;border-radius:4px">\u2715 Close</button></div></div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px">'
      + '<input id="fs-name" value="' + esc(ED.name) + '" placeholder="Item name" oninput="BCA_SYS.forgeStudio.meta()" style="flex:2;min-width:150px;background:#0a0e18;border:1px solid #2a3142;color:#fff;font:700 11px monospace;padding:6px;border-radius:4px">'
      + '<select id="fs-cat" onchange="BCA_SYS.forgeStudio.meta()" style="background:#0a0e18;border:1px solid #2a3142;color:#cbd5e1;padding:5px;border-radius:4px"' + (ED.mode === 'upgrade' ? ' disabled' : '') + '>' + typeOpts + '</select>'
      + '<select id="fs-sub" onchange="BCA_SYS.forgeStudio.meta()" style="background:#0a0e18;border:1px solid #2a3142;color:#cbd5e1;padding:5px;border-radius:4px">' + subOpts + '</select>'
      + '<select id="fs-rar" onchange="BCA_SYS.forgeStudio.meta()" style="background:#0a0e18;border:1px solid #2a3142;color:#cbd5e1;padding:5px;border-radius:4px">' + rarOpts + '</select>'
      + '<input id="fs-price" type="number" value="' + ED.price + '" oninput="BCA_SYS.forgeStudio.meta()" style="width:120px;background:#0a0e18;border:1px solid #2a3142;color:#cbd5e1;font:600 11px monospace;padding:6px;border-radius:4px" placeholder="price">'
      + '<button onclick="BCA_SYS.forgeStudio.save()" style="font:800 12px monospace;padding:7px 16px;background:#052e16;border:1px solid #16a34a;color:#4ade80;border-radius:5px">\uD83D\uDCBE SAVE ITEM</button></div>'
      + '<div style="margin-bottom:8px"><div class="fs-lab" style="color:#e5b814;margin-bottom:2px">DESCRIPTION (shown in shops &amp; tooltips \u2014 leave blank to auto-generate from stats)</div>'
      + '<textarea id="fs-desc" oninput="BCA_SYS.forgeStudio.meta()" rows="2" placeholder="e.g. A cursed blade wreathed in violet flame \u2014 +4 dmg per hit, 12% chance to double." style="width:100%;background:#0a0e18;border:1px solid #2a3142;color:#cbd5e1;font:600 10px monospace;padding:6px;border-radius:4px;resize:vertical">' + esc(ED.desc || '') + '</textarea></div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start">'
      + '<div id="fs-left" style="flex:1;min-width:230px;max-width:290px"></div>'
      + '<div id="fs-mid" style="flex:1.2;min-width:250px"></div>'
      + '<div id="fs-right" style="flex:1;min-width:250px;max-height:80vh;overflow:auto"></div></div></div>';
    ov.style.display = 'block';
    renderAll();
  }

  /* --------------------------- upgrade: load item ----------------------- */
  function docFromItem(item, cat) {
    // Studio-made items with REAL custom art (layers, or a stored origin) reload their editable doc.
    var cd = CUSTOM[item.id] && CUSTOM[item.id].doc;
    if (cd && (cd.origin || (cd.layers && cd.layers.length))) return JSON.parse(JSON.stringify(cd));
    // ORIGINAL ART PRESERVATION: for a fresh item OR a slimmed stats-only edit (no custom art
    // stored), capture the item's REAL current base art fresh so the editor shows the true image
    // to build on. Upgrades then stack ON TOP of the original instead of a generic base template.
    var d = template(cat === 'shields' ? 'shield' : cat === 'armor' ? 'armor' : cat === 'food' ? 'food' : 'sword');
    d.cat = cat; d.name = item.name || 'Item'; d.rarity = (cd && cd.rarity) || item.rarity || 'legendary';
    try {
      var html = (S() && S().shop && S().shop.getArt) ? S().shop.getArt(item, cat) : '';
      if (html && typeof html === 'string') { d.origin = html; d.layers = []; } // build on the real art; no template body
    } catch (e) {}
    return d;
  }

  /* ------------------------------- API ---------------------------------- */
  var API = {
    open: function () { ED.desc = ''; ED.origBuffData = null; ED.origFoodBuff = null; ED.origBuffDesc = ''; ED.origBuffStatsDesc = ''; ED.statsDirty = false; ED.abilities = []; openStudio('create', template('sword')); },
    openUpgrade: function () { openUpgradePicker(); },
    close: function () { var ov = document.getElementById('forge-studio'); if (ov) ov.style.display = 'none'; },
    pick: function (id) { ED.sel = id; renderAll(); },
    add: function (kind, type) { var l = addLayer(ED.doc, kind, type); if (kind !== 'part') varyLayer(l, rng(uid())); ED.sel = l.id; snapshot(); renderAll(); },
    del: function () { if (ED.sel) { removeLayer(ED.doc, ED.sel); ED.sel = null; snapshot(); renderAll(); } },
    duplicate: function () { if (ED.sel) { var n = duplicateLayer(ED.doc, ED.sel); if (n) ED.sel = n.id; snapshot(); renderAll(); } },
    mirrorX: function () { if (ED.sel) { mirrorLayer(ED.doc, ED.sel, 'x'); snapshot(); renderAll(); } },
    mirrorY: function () { if (ED.sel) { mirrorLayer(ED.doc, ED.sel, 'y'); snapshot(); renderAll(); } },
    randomize: function () { if (ED.sel) { randomizeLayer(ED.doc, ED.sel); snapshot(); renderAll(); } },
    move: function (id, dir) { moveLayer(ED.doc, id, dir); snapshot(); renderAll(); },
    toggle: function (id, prop) { var l = ED.doc.layers.filter(function (x) { return x.id === id; })[0]; if (l) { l[prop] = !l[prop]; snapshot(); renderAll(); } },
    copy: function () { var l = selLayer(); if (l) { ED.clip = JSON.parse(JSON.stringify(l)); try { S().ui.notify('Layer copied.'); } catch (e) {} } },
    paste: function () { if (ED.clip) { var n = cloneLayer(ED.clip); n.x += 5; n.y += 5; ED.doc.layers.push(n); ED.sel = n.id; snapshot(); renderAll(); } },
    upd: function () {
      var l = selLayer(); if (!l || l.locked) { if (l && l.locked) { try { S().ui.notify('Layer locked.'); } catch (e) {} } return; }
      l.name = gv('fs-lname') || l.name;
      l.x = +gv('fs-x'); l.y = +gv('fs-y'); l.sx = +gv('fs-sx'); l.sy = +gv('fs-sy'); l.rot = +gv('fs-rot'); l.opacity = +gv('fs-op');
      if (l.kind !== 'fx') {
        l.params.width = +gv('fs-pw'); l.params.height = +gv('fs-ph'); l.params.taper = +gv('fs-pt'); l.params.curvature = +gv('fs-pc');
        l.fill = gv('fs-c1'); l.fill2 = gv('fs-c2'); l.stroke = gv('fs-ce');
        l.metal = +gv('fs-metal'); l.texture = +gv('fs-tex'); l.shadow = +gv('fs-shadow'); l.strokeW = +gv('fs-strokeW');
        l.glowColor = gv('fs-gc'); l.glow = +gv('fs-glow');
        var g = document.getElementById('fs-grad'); if (g) l.gradient = g.checked;
        var cl = document.getElementById('fs-clip'); if (cl) l.clipToBody = cl.checked;
      } else {
        l.fx.color = gv('fs-fxc'); l.fx.color2 = gv('fs-fxc2'); l.fx.count = +gv('fs-fxcount'); l.fx.size = +gv('fs-fxsize'); l.fx.opacity = +gv('fs-fxop');
      }
      ['fs-x', 'fs-y', 'fs-sx', 'fs-sy', 'fs-rot', 'fs-op', 'fs-pw', 'fs-ph', 'fs-pt', 'fs-pc', 'fs-metal', 'fs-tex', 'fs-shadow', 'fs-strokeW', 'fs-glow', 'fs-fxcount', 'fs-fxsize', 'fs-fxop'].forEach(function (id) { var e = document.getElementById(id + '-v'), s = document.getElementById(id); if (e && s) e.textContent = s.value; });
      var mid = document.getElementById('fs-mid'); if (mid) mid.innerHTML = previewPanel() + '<div style="margin-top:6px">' + qualityPanel() + '</div><div style="margin-top:6px">' + analysisPanel() + '</div>';
      clearTimeout(API._snapT); API._snapT = setTimeout(snapshot, 400);
    },
    view: function () { ED.view.rot = +gv('fs-v-rot'); ED.view.zoom = +gv('fs-v-zoom'); var e = document.getElementById('fs-v-rot-v'); if (e) e.textContent = ED.view.rot; var z = document.getElementById('fs-v-zoom-v'); if (z) z.textContent = ED.view.zoom; var mid = document.getElementById('fs-mid'); if (mid) mid.innerHTML = previewPanel() + '<div style="margin-top:6px">' + qualityPanel() + '</div><div style="margin-top:6px">' + analysisPanel() + '</div>'; },
    quality: function (op) { if (QUALITY[op]) { var msg = QUALITY[op](ED.doc); snapshot(); renderAll(); try { S().ui.notify(msg); } catch (e) {} } },
    clearOrigin: function () { if (ED.doc && ED.doc.origin) { delete ED.doc.origin; snapshot(); renderAll(); try { S().ui.notify('Original art removed \u2014 the item is now built purely from your layers, so your redesign fully replaces it.'); } catch (e) {} } },
    autofix: function () { autoFix(ED.doc); snapshot(); renderAll(); try { S().ui.notify('Auto-fixed detected issues.'); } catch (e) {} },
    search: function () { var q = (gv('fs-lib-search') || '').toLowerCase(); var cats = document.getElementById('fs-lib-cats'); if (!cats) return; cats.querySelectorAll('button').forEach(function (b) { b.style.display = b.textContent.indexOf(q) > -1 ? '' : 'none'; }); },
    stat: function () { ED.statsDirty = true; ['damage', 'defense', 'speed', 'critChance', 'healing', 'duration'].forEach(function (k) { var e = document.getElementById('fs-st-' + k); if (e) { ED.stats[k] = +e.value; var v = document.getElementById('fs-st-' + k + '-v'); if (v) v.textContent = e.value; } }); },
    ability: function (k) { ED.statsDirty = true; var i = ED.abilities.indexOf(k); if (i > -1) ED.abilities.splice(i, 1); else ED.abilities.push(k); var right = document.getElementById('fs-right'); if (right) right.innerHTML = propsPanel() + '<div style="margin-top:8px;border-top:1px solid #222;padding-top:6px">' + statsPanel() + '</div>'; },
    meta: function () { ED.name = gv('fs-name') || ED.name; ED.doc.name = ED.name; if (ED.mode !== 'upgrade') ED.doc.cat = gv('fs-cat') || ED.doc.cat; ED.sub = gv('fs-sub') || ED.sub; ED.doc.rarity = gv('fs-rar') || ED.doc.rarity; ED.price = +gv('fs-price') || ED.price; var de = document.getElementById('fs-desc'); if (de) ED.desc = de.value; },
    undo: undo, redo: redo,
    exportItem: function () { try { window.prompt('COPY ITEM CODE:', JSON.stringify({ name: ED.name, cat: ED.doc.cat, sub: ED.sub, price: ED.price, rarity: ED.doc.rarity, stats: ED.stats, abilities: ED.abilities, doc: ED.doc })); } catch (e) {} },
    importItem: function () { var j = window.prompt('PASTE ITEM CODE:'); if (!j) return; try { var d = JSON.parse(j); if (d.doc) { ED.doc = d.doc; ED.name = d.name || ED.name; ED.sub = d.sub || ED.sub; ED.price = d.price || ED.price; ED.stats = d.stats || ED.stats; ED.abilities = d.abilities || []; ED.sel = null; snapshot(); openStudio(ED.mode, ED.doc, ED.editId); } } catch (e) { try { S().ui.notify('Bad code.'); } catch (e2) {} } },
    save: function () {
      API.meta();
      var id = (ED.mode === 'upgrade' && ED.editId) ? ED.editId : ('studio_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36));
      var bb = buildBuff(ED.doc.cat, ED.stats, ED.abilities);
      // SIZE / PERSISTENCE: only persist the (large, ~3KB) captured art when the admin actually
      // gave the item CUSTOM art (layers). A stats/abilities/description edit does NOT change the
      // picture, so storing the redundant origin-art copy just bloats the forge store — and once
      // that one localStorage key / one cloud doc gets big enough, saves silently fail (quota /
      // payload limit), which is exactly "edit shows now but is gone on refresh and others never
      // see it". A no-custom-art item simply keeps its normal base shop art (see registerArt).
      var hasCustomArt = !!(ED.doc && ED.doc.layers && ED.doc.layers.length);
      var docToStore = hasCustomArt ? JSON.parse(JSON.stringify(ED.doc)) : { cat: ED.doc.cat, rarity: ED.doc.rarity };
      var def = { id: id, cat: ED.doc.cat, name: ED.name, sub: (ED.doc.cat === 'food' ? 'Consumables' : ED.sub), tier: 20, req: 'BLACKSMITH FORGED', price: ED.price, doc: docToStore };
      // KEEP EXISTING ABILITIES when editing an existing item's art/name/description only: if the
      // admin never touched a stat/ability, re-use the item's ORIGINAL combat data instead of
      // regenerating defaults (this is why "I only changed the image and its abilities got wiped").
      var keepOrig = (ED.mode === 'upgrade' && !ED.statsDirty);
      // AUTO BUFF DESCRIPTION: the buff summary ALWAYS appears on the weapon. When you add/change
      // buffs it is freshly generated from those buffs (bb.buffDesc); on an art-only edit the
      // item's existing buff line is reused verbatim. Any custom flavor text you type is shown ON
      // TOP of the buff summary (never instead of it), and flavor is stored separately so the two
      // can't duplicate across repeated saves.
      var buffStats = (keepOrig && ED.origBuffStatsDesc) ? ED.origBuffStatsDesc : bb.buffDesc;
      var flavor = (ED.desc && ED.desc.trim()) ? ED.desc.trim() : '';
      var composed = [flavor, buffStats].filter(Boolean).join('<br>');
      if (ED.doc.cat === 'food') {
        def.foodBuff = (keepOrig && ED.origFoodBuff) ? ED.origFoodBuff : bb.foodBuff;
      } else {
        def.buffData = (keepOrig && ED.origBuffData) ? ED.origBuffData : bb.buffData;
      }
      def.flavorDesc = flavor; def._buffStatsDesc = buffStats; def.buffDesc = composed;
      try { saveDef(def); } catch (e) { try { S().ui.notify('SAVE ERROR: ' + e.message); } catch (e2) {} return; }
      try { S().ui.notify((ED.mode === 'upgrade' ? 'UPDATED' : 'SAVED') + ': ' + def.name + ' \u2014 live in ' + def.cat + ' shop + equipped.'); } catch (e) {}
      // After the first save the item exists; keep editing it (preserving its now-current data).
      ED.mode = 'upgrade'; ED.editId = id;
      ED.origBuffData = def.buffData || null; ED.origFoodBuff = def.foodBuff || null; ED.origBuffDesc = def.buffDesc || ''; ED.origBuffStatsDesc = buffStats; ED.statsDirty = false;
    }
  };
  // Best-effort reflect an existing item's combat data into the editor sliders so the UI shows
  // roughly what the item does when you open it to edit. The authoritative preservation is
  // ED.origBuffData (used on save); this is only to populate the visible controls.
  function hydrateFromBuff(item, cat) {
    if (cat === 'food') {
      var fb = item.foodBuff || {};
      if (fb.val != null) ED.stats.healing = +fb.val || ED.stats.healing;
      if (fb.mins != null) ED.stats.duration = clamp(fb.mins, 5, 600);
      return;
    }
    var b = item.buffData; if (!b) return;
    if (b.t === 'flat' && b.val != null) ED.stats.damage = Math.max(0, Math.round((+b.val) * 2));
    else if (b.t === 'qm') {
      if (b.flat != null) ED.stats.damage = Math.max(0, Math.round((+b.flat) * 2));
      if (b.critChance != null) ED.stats.critChance = clamp(b.critChance, 0, 100);
      if (b.critVal != null) ED.stats.critDamage = +b.critVal;
      if (b.burst != null) ED.stats.speed = Math.max(0, Math.round((+b.burst) * 25));
    } else if (b.t === 'crit' && b.ch != null) { ED.stats.critChance = clamp(b.ch, 0, 100); }
  }

  function openUpgradePicker() {
    if (!isAdmin()) { try { S().ui.notify('ADMIN ONLY.'); } catch (e) {} return; }
    ensureStyle();
    var ov = document.getElementById('forge-studio-pick');
    if (!ov) { ov = document.createElement('div'); ov.id = 'forge-studio-pick'; document.body.appendChild(ov); }
    ov.style.cssText = 'position:fixed;inset:0;z-index:100061;background:rgba(3,4,8,.95);padding:16px;overflow:auto;font-family:Rajdhani,monospace';
    var sh = S().shop, cats = ['weapons', 'shields', 'armor', 'food'];
    var catSel = cats.map(function (c) { return '<option value="' + c + '">' + c.toUpperCase() + '</option>'; }).join('');
    function itemOpts(cat) { return ((sh.db[cat] || []).slice(0, 600)).map(function (it) { return '<option value="' + esc(it.id) + '">' + esc(it.name) + '</option>'; }).join(''); }
    ov.innerHTML = '<div style="max-width:520px;margin:40px auto;background:#0a0c12;border:1px solid #2a2f3a;border-radius:10px;padding:16px">'
      + '<div style="font:800 14px monospace;color:#e5b814;margin-bottom:10px">\u2B06 UPGRADE / EDIT EXISTING ITEM</div>'
      + '<div class="fs-lab">CATEGORY</div><select id="fsu-cat" onchange="BCA_SYS.forgeStudio._fillPick()" style="width:100%;background:#0a0e18;border:1px solid #2a3142;color:#cbd5e1;padding:6px;border-radius:4px;margin-bottom:8px">' + catSel + '</select>'
      + '<div class="fs-lab">ITEM</div><select id="fsu-item" style="width:100%;background:#0a0e18;border:1px solid #2a3142;color:#cbd5e1;padding:6px;border-radius:4px">' + itemOpts('weapons') + '</select>'
      + '<div style="display:flex;gap:6px;margin-top:12px"><button onclick="BCA_SYS.forgeStudio._openPick()" style="flex:1;font:800 12px monospace;padding:8px;background:#052e16;border:1px solid #16a34a;color:#4ade80;border-radius:5px">OPEN IN STUDIO</button>'
      + '<button onclick="document.getElementById(\'forge-studio-pick\').style.display=\'none\'" style="font:700 11px monospace;padding:8px 12px;background:#2a0000;border:1px solid #7f1d1d;color:#fca5a5;border-radius:5px">Cancel</button></div>'
      + '<div style="font:600 9px monospace;color:#666;margin-top:8px">Studio-made items load with all their layers. Other items open as an editable starter you can redesign while keeping the same id, name and stats.</div></div>';
    ov.style.display = 'block';
  }
  API._fillPick = function () { var cat = gv('fsu-cat'); var sel = document.getElementById('fsu-item'); if (sel) sel.innerHTML = ((S().shop.db[cat] || []).slice(0, 600)).map(function (it) { return '<option value="' + esc(it.id) + '">' + esc(it.name) + '</option>'; }).join(''); };
  API._openPick = function () {
    var cat = gv('fsu-cat'), id = gv('fsu-item'); var arr = S().shop.db[cat] || []; var item = null;
    for (var i = 0; i < arr.length; i++) if (arr[i] && arr[i].id === id) { item = arr[i]; break; }
    if (!item) return;
    var pk = document.getElementById('forge-studio-pick'); if (pk) pk.style.display = 'none';
    var d = docFromItem(item, cat);
    ED.stats = { damage: 20, defense: 10, speed: 20, magic: 0, critChance: 15, critDamage: 40, healing: 0, foodStrength: 0, duration: 60 };
    ED.abilities = [];
    // PRESERVE THE ITEM'S EXISTING COMBAT DATA + DESCRIPTION so that editing ONLY the art (or
    // name/price) never silently wipes a weapon's abilities. buildBuff is only used again if the
    // admin actually touches a stat/ability (ED.statsDirty). Best-effort hydrate the ability
    // chips + stat sliders from the existing buffData so the UI reflects the real item.
    ED.origBuffData = item.buffData ? JSON.parse(JSON.stringify(item.buffData)) : null;
    ED.origFoodBuff = item.foodBuff ? JSON.parse(JSON.stringify(item.foodBuff)) : null;
    ED.origBuffDesc = item.buffDesc || item.desc || '';
    // Load ONLY the custom flavor into the editable box (blank for items that never had one),
    // and remember the existing auto buff-stats line separately so it is reused verbatim on an
    // art-only edit. Older items store just a combined buffDesc → treat it as the buff line.
    ED.origBuffStatsDesc = item._buffStatsDesc || item.buffDesc || item.desc || '';
    ED.desc = (item.flavorDesc != null) ? item.flavorDesc : '';
    ED.statsDirty = false;
    try { hydrateFromBuff(item, cat); } catch (e) {}
    ED.price = item.price || ED.price; ED.sub = item.sub || ED.sub;
    openStudio('upgrade', d, id);
    ED.doc.name = item.name; ED.name = item.name; var nm = document.getElementById('fs-name'); if (nm) nm.value = item.name;
    var de = document.getElementById('fs-desc'); if (de) de.value = ED.desc || '';
  };

  /* ----------------------- destroy-item picker UI ---------------------- */
  function destroyOpts(cat) { return ((S().shop.db[cat] || []).slice(0, 800)).map(function (it) { return '<option value="' + esc(it.id) + '">' + esc(it.name) + '</option>'; }).join(''); }
  function openDestroyPicker() {
    if (!isAdmin()) { try { S().ui.notify('ADMIN ONLY.'); } catch (e) {} return; }
    ensureStyle();
    var ov = document.getElementById('forge-studio-destroy');
    if (!ov) { ov = document.createElement('div'); ov.id = 'forge-studio-destroy'; document.body.appendChild(ov); }
    ov.style.cssText = 'position:fixed;inset:0;z-index:100061;background:rgba(3,4,8,.95);padding:16px;overflow:auto;font-family:Rajdhani,monospace';
    var cats = ['weapons', 'shields', 'armor', 'food'];
    var catSel = cats.map(function (c) { return '<option value="' + c + '">' + c.toUpperCase() + '</option>'; }).join('');
    ov.innerHTML = '<div style="max-width:520px;margin:40px auto;background:#0a0c12;border:1px solid #7f1d1d;border-radius:10px;padding:16px">'
      + '<div style="font:800 14px monospace;color:#fca5a5;margin-bottom:4px">\u2620 DESTROY ITEM PERMANENTLY</div>'
      + '<div style="font:600 9px monospace;color:#888;margin-bottom:10px">Removes the item from EVERY shop, for everyone, forever (kept gone across reloads + rebuilds). This cannot be undone.</div>'
      + '<div class="fs-lab">CATEGORY</div><select id="fsd-cat" onchange="BCA_SYS.forgeStudio._fillDestroy()" style="width:100%;background:#0a0e18;border:1px solid #2a3142;color:#cbd5e1;padding:6px;border-radius:4px;margin-bottom:8px">' + catSel + '</select>'
      + '<div class="fs-lab">ITEM</div><select id="fsd-item" style="width:100%;background:#0a0e18;border:1px solid #2a3142;color:#cbd5e1;padding:6px;border-radius:4px">' + destroyOpts('weapons') + '</select>'
      + '<div style="display:flex;gap:6px;margin-top:12px"><button onclick="BCA_SYS.forgeStudio._doDestroy()" style="flex:1;font:800 12px monospace;padding:8px;background:#2a0000;border:1px solid #ef4444;color:#fca5a5;border-radius:5px">\u2620 DESTROY PERMANENTLY</button>'
      + '<button onclick="document.getElementById(\'forge-studio-destroy\').style.display=\'none\'" style="font:700 11px monospace;padding:8px 12px;background:#0a0c12;border:1px solid #2a3142;color:#9aa2b1;border-radius:5px">Cancel</button></div></div>';
    ov.style.display = 'block';
  }
  API.destroyItem = destroyItem;
  API.isDestroyed = function (id) { return !!DESTROYED[id]; };
  API.openDestroy = function () { openDestroyPicker(); };
  API._fillDestroy = function () { var cat = gv('fsd-cat'); var sel = document.getElementById('fsd-item'); if (sel) sel.innerHTML = destroyOpts(cat); };
  API._doDestroy = function () {
    var cat = gv('fsd-cat'), id = gv('fsd-item'); if (!id) return;
    var nm = id; try { var arr = S().shop.db[cat] || []; for (var i = 0; i < arr.length; i++) if (arr[i] && arr[i].id === id) { nm = arr[i].name; break; } } catch (e) {}
    if (!window.confirm('Permanently destroy "' + nm + '"? It will be removed from every shop for everyone, forever.')) return;
    API.destroyItem(cat, id);
    var sel = document.getElementById('fsd-item'); if (sel) sel.innerHTML = destroyOpts(cat);
  };

  /* --------------------------- admin menu button ------------------------ */
  function injectButton() {
    var menu = document.getElementById('admin-mini-menu'); if (!menu || document.getElementById('forge-studio-btn')) return;
    var box = document.createElement('div'); box.id = 'forge-studio-btn'; box.style.cssText = 'margin:6px 0';
    box.innerHTML = '<button onclick="BCA_SYS.forgeStudio.open()" style="width:100%;font:800 11px monospace;letter-spacing:.08em;padding:9px;background:linear-gradient(90deg,#1a0033,#003a2c);border:1px solid #7c3aed;color:#e9d5ff;border-radius:6px">\uD83C\uDFA8 FORGE STUDIO (PRO EDITOR)</button>'
      + '<button onclick="BCA_SYS.forgeStudio.openUpgrade()" style="width:100%;margin-top:6px;font:800 11px monospace;letter-spacing:.08em;padding:9px;background:linear-gradient(90deg,#003a2c,#1a0033);border:1px solid #16a34a;color:#86efac;border-radius:6px">\u2B06 STUDIO UPGRADE / EDIT ITEM</button>'
      + '<button onclick="BCA_SYS.forgeStudio.openDestroy()" style="width:100%;margin-top:6px;font:800 11px monospace;letter-spacing:.08em;padding:9px;background:linear-gradient(90deg,#2a0000,#1a0033);border:1px solid #ef4444;color:#fca5a5;border-radius:6px">\u2620 DESTROY ITEM (PERMANENT)</button>';
    var anchor = document.getElementById('admin-item-forge-btn') || document.getElementById('admin-create-item-ca1a');
    if (anchor) anchor.insertAdjacentElement('afterend', box); else menu.appendChild(box);
  }

  function install() {
    var s = S();
    if (s.shop && typeof s.shop.generateDB === 'function' && !s.shop.generateDB._studio) { var og = s.shop.generateDB.bind(s.shop); s.shop.generateDB = function () { var r = og.apply(this, arguments); try { injectAll(); } catch (e) {} return r; }; s.shop.generateDB._studio = true; }
    if (s.adminBoost && s.adminBoost.toggleMenu && !s.adminBoost.toggleMenu._studio) { var ot = s.adminBoost.toggleMenu.bind(s.adminBoost); s.adminBoost.toggleMenu = function () { var r = ot.apply(this, arguments); setTimeout(injectButton, 60); return r; }; s.adminBoost.toggleMenu._studio = true; }
    s.forgeStudio = API;
    wireCloud(); wireDestroyedCloud(); injectAll(); applyDestroyed(); injectButton();
  }
  function boot() {
    var s = S();
    if (!s || !s.shop || !s.shop.db || !s.ui || !s.state || !s.adminBoost || !document.getElementById('admin-mini-menu')) return setTimeout(boot, 700);
    loadLocal(); loadDestroyed();
    try { install(); } catch (e) {}
    [900, 2200, 5000].forEach(function (t) { setTimeout(function () { try { install(); } catch (e) {} }, t); });
    setInterval(function () { try { injectAll(); injectButton(); } catch (e) {} }, 6000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
