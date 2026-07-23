/* =====================================================================
   FOOD STUDIO  -  a pro admin tool for FOOD items (sibling module).
   ---------------------------------------------------------------------
   For any food (existing OR brand-new) an admin can:
     1) PLUG IN LARGE INFO that is networked to ONLY that food: paste a big
        body of text and choose how many total "files" (fragments) it splits
        into. Eating the food reveals the next unique file (sequential, never
        repeats), stored per-food + per-player so it can be re-read forever.
     2) EDIT the SHORT-TERM and LONG-TERM buffs the food grants on every eat
        (type / value / chance / cadence / duration / how many at a time).
     3) EDIT the ART: 30+ hand-built base food arts PLUS several appearance
        modifiers (serving plate, aura, garnish, glow colour, backdrop tint,
        steam, size, rarity tag) so every food can look completely unique.
   Saved configs persist to localStorage ('bca_food_studio_v1') + the cloud
   ('bca_system/food_studio') and apply live (inject/register/repaint), the
   same pipeline the Shop Item Editor + Forge Studio use.
   ===================================================================== */
(function () {
  var LS_KEY = 'bca_food_studio_v1';
  var CLOUD_DOC = 'food_studio';
  var STORE = {};              // foodId -> config
  var cloudWired = false;

  function S() { return window.BCA_SYS; }
  function cloud() { var FS = window.__BCA_FS, DB = window.__BCA_DB; return (FS && DB && FS.doc && FS.setDoc && FS.onSnapshot) ? { FS: FS, DB: DB } : null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function isAdmin() { var s = S(); return !!(s && s.state && s.state.profile && s.state.profile.isAdmin); }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  function setVal(id, v) { var el = document.getElementById(id); if (el) el.value = (v == null ? '' : v); }
  function chk(id) { var el = document.getElementById(id); return !!(el && el.checked); }
  function setChk(id, v) { var el = document.getElementById(id); if (el) el.checked = !!v; }
  function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }
  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'food'; }

  /* =====================================================================
     ART LIBRARY  -  32 hand-built base foods (solid-fill 100x100 SVGs) that
     compose with modifiers. Each base returns SVG inner markup centred so the
     serving plate sits beneath it.
     ===================================================================== */
  var BASES = {
    roast:      { name: 'Roast',        art: function () { return '<ellipse cx="50" cy="58" rx="27" ry="20" fill="#b06a24"/><ellipse cx="50" cy="53" rx="21" ry="12" fill="#d98b3a"/><ellipse cx="43" cy="49" rx="7" ry="3" fill="#ffe0b0" opacity=".6"/><path d="M27,60 q-9,-2 -11,4 q7,5 13,1z" fill="#b06a24"/><path d="M73,60 q9,-2 11,4 q-7,5 -13,1z" fill="#b06a24"/><rect x="12" y="61" width="9" height="4" rx="2" fill="#f2d59a"/><rect x="79" y="61" width="9" height="4" rx="2" fill="#f2d59a"/>'; } },
    drumstick:  { name: 'Drumstick',    art: function () { return '<path d="M40,70 C28,60 33,40 49,38 C64,36 70,52 61,62 C55,70 48,74 40,70z" fill="#c47a2e"/><ellipse cx="53" cy="48" rx="8" ry="4" fill="#e6a35a" opacity=".7"/><rect x="26" y="64" width="16" height="7" rx="3.5" fill="#f2e3c0" transform="rotate(28 34 67)"/>'; } },
    steak:      { name: 'Steak',        art: function () { return '<path d="M28,50 Q30,36 50,36 Q74,36 74,54 Q74,70 50,70 Q30,70 28,50z" fill="#8a3520"/><path d="M34,50 Q36,44 50,44 Q66,44 66,54 Q66,64 50,64 Q36,64 34,50z" fill="#b84a30"/><path d="M40,48 L60,58 M44,44 L64,54 M38,54 L58,62" stroke="#5a2015" stroke-width="1.6"/><path d="M28,50 Q22,48 22,54 Q26,58 30,54z" fill="#f0e0c0"/>'; } },
    burger:     { name: 'Burger',       art: function () { return '<path d="M28,44 Q50,26 72,44 Z" fill="#e0a52f"/><path d="M28,44 Q50,26 72,44 Z" fill="#d9982f"/><circle cx="42" cy="38" r="1.3" fill="#fff"/><circle cx="52" cy="35" r="1.3" fill="#fff"/><circle cx="60" cy="39" r="1.3" fill="#fff"/><rect x="27" y="44" width="46" height="5" rx="2" fill="#6cbf3a"/><rect x="27" y="49" width="46" height="7" rx="2" fill="#7a3b1a"/><rect x="28" y="55" width="44" height="4" fill="#ffcf3f"/><path d="M27,59 Q50,72 73,59 Z" fill="#e0a52f"/>'; } },
    pizza:      { name: 'Pizza Slice',  art: function () { return '<path d="M50,30 L74,72 L26,72 Z" fill="#f2c14e"/><path d="M50,36 L69,70 L31,70 Z" fill="#e8442e" opacity=".85"/><circle cx="46" cy="56" r="4" fill="#b3241a"/><circle cx="58" cy="60" r="4" fill="#b3241a"/><circle cx="52" cy="46" r="3.4" fill="#b3241a"/><path d="M26,72 L74,72 L72,76 L28,76 Z" fill="#d99a3a"/>'; } },
    cakeSlice:  { name: 'Cake Slice',   art: function () { return '<path d="M30,72 L70,72 L64,40 L36,40 Z" fill="#ffe1ec"/><path d="M36,40 L64,40 L62,48 L38,48 Z" fill="#7a3b2a"/><path d="M38,54 L62,54 L61,60 L39,60 Z" fill="#7a3b2a"/><path d="M36,38 Q50,30 64,38 L64,42 L36,42 Z" fill="#fff"/><circle cx="50" cy="34" r="4" fill="#e0324a"/>'; } },
    cupcake:    { name: 'Cupcake',      art: function () { return '<path d="M36,58 L64,58 L60,74 L40,74 Z" fill="#c46a3a"/><path d="M38,58 L40,74 M44,58 L45,74 M50,58 L50,74 M56,58 L55,74 M62,58 L60,74" stroke="#8a4a26" stroke-width="1"/><path d="M34,58 Q34,40 50,40 Q66,40 66,58 Z" fill="#ff9ec2"/><circle cx="50" cy="36" r="4" fill="#e0324a"/>'; } },
    donut:      { name: 'Donut',        art: function () { return '<circle cx="50" cy="54" r="22" fill="#c98a4a"/><circle cx="50" cy="54" r="8" fill="#1a1206"/><path d="M50,32 A22,22 0 0,1 72,54 A22,22 0 0,1 50,54 A8,8 0 0,0 50,40 Z" fill="#ff6fae"/><path d="M50,32 a22,22 0 0,1 22,22" fill="none"/><circle cx="42" cy="40" r="1.4" fill="#5ad1ff"/><circle cx="58" cy="40" r="1.4" fill="#ffe14a"/><circle cx="64" cy="52" r="1.4" fill="#7bff8a"/><circle cx="40" cy="66" r="1.4" fill="#ffe14a"/>'; } },
    pie:        { name: 'Pie',          art: function () { return '<path d="M26,62 A24,24 0 0,1 74,62 Z" fill="#e8b45a"/><path d="M26,62 A24,24 0 0,1 74,62" fill="none" stroke="#c98a3a" stroke-width="2"/><path d="M34,50 L44,62 M50,44 L50,62 M66,50 L56,62" stroke="#b06a24" stroke-width="2"/><rect x="24" y="62" width="52" height="6" rx="3" fill="#c98a3a"/>'; } },
    bread:      { name: 'Bread Loaf',   art: function () { return '<path d="M26,62 Q26,42 50,42 Q74,42 74,62 Q74,68 50,68 Q26,68 26,62z" fill="#c98a4a"/><ellipse cx="50" cy="46" rx="20" ry="5" fill="#e0a52f"/><ellipse cx="50" cy="46" rx="20" ry="5" fill="#e6b36a"/><path d="M38,46 L34,58 M50,46 L48,58 M62,46 L66,58" stroke="#9a6a2a" stroke-width="1.6"/>'; } },
    cheese:     { name: 'Cheese Wedge', art: function () { return '<path d="M28,66 L72,44 L72,66 Z" fill="#ffcf3f"/><path d="M28,66 L72,44 L72,50 L34,66 Z" fill="#ffe07a"/><circle cx="56" cy="58" r="3" fill="#e0a52f"/><circle cx="64" cy="52" r="2.2" fill="#e0a52f"/><circle cx="50" cy="62" r="2" fill="#e0a52f"/>'; } },
    sushi:      { name: 'Sushi',        art: function () { return '<rect x="30" y="52" width="16" height="16" rx="3" fill="#f7f3e8"/><rect x="30" y="52" width="16" height="16" rx="3" fill="none" stroke="#2a2a2a" stroke-width="2.4"/><ellipse cx="38" cy="52" rx="9" ry="4" fill="#ff7a5c"/><rect x="52" y="52" width="16" height="16" rx="3" fill="#f7f3e8"/><rect x="52" y="52" width="3" height="16" fill="#2a3a1a"/><ellipse cx="60" cy="52" rx="9" ry="4" fill="#ffb14a"/>'; } },
    ramen:      { name: 'Ramen Bowl',   art: function () { return '<path d="M26,52 Q50,74 74,52 Z" fill="#c0392b"/><path d="M26,52 Q50,58 74,52" fill="none" stroke="#ffd" stroke-width="1"/><ellipse cx="50" cy="52" rx="24" ry="6" fill="#e8c98a"/><path d="M36,50 q4,-4 8,0 q4,-4 8,0 q4,-4 8,0" stroke="#f2e3b0" stroke-width="2" fill="none"/><circle cx="44" cy="51" r="4" fill="#fff"/><circle cx="44" cy="51" r="2" fill="#ffbf3f"/><rect x="40" y="30" width="30" height="2.4" rx="1" fill="#a86" transform="rotate(18 55 31)"/>'; } },
    stew:       { name: 'Stew Pot',     art: function () { return '<rect x="30" y="52" width="40" height="18" rx="4" fill="#3a3a44"/><ellipse cx="50" cy="52" rx="20" ry="5" fill="#7a3b1a"/><circle cx="44" cy="51" r="2.4" fill="#e0a52f"/><circle cx="54" cy="52" r="2.4" fill="#6cbf3a"/><rect x="34" y="44" width="32" height="4" rx="2" fill="#55555f"/><rect x="47" y="40" width="6" height="5" rx="2" fill="#55555f"/><rect x="24" y="56" width="8" height="4" rx="2" fill="#55555f"/><rect x="68" y="56" width="8" height="4" rx="2" fill="#55555f"/>'; } },
    soup:       { name: 'Soup Bowl',    art: function () { return '<path d="M28,54 Q50,72 72,54 Z" fill="#eee"/><ellipse cx="50" cy="54" rx="23" ry="6" fill="#e8a53a"/><ellipse cx="50" cy="54" rx="23" ry="6" fill="#e2953a"/><circle cx="44" cy="53" r="2.2" fill="#c46a2a"/><circle cx="56" cy="54" r="2.2" fill="#6cbf3a"/><path d="M27,58 L73,58 L71,62 L29,62 Z" fill="#ccc"/>'; } },
    fish:       { name: 'Grilled Fish', art: function () { return '<path d="M30,54 Q46,40 66,54 Q46,68 30,54z" fill="#9aa7b0"/><path d="M66,54 L78,46 L78,62 Z" fill="#9aa7b0"/><circle cx="38" cy="52" r="2.2" fill="#1a1a1a"/><path d="M44,54 q8,-3 16,0 M44,54 q8,3 16,0" stroke="#6a7680" stroke-width="1.4" fill="none"/><path d="M40,48 L44,42 M50,46 L54,40" stroke="#3a2a1a" stroke-width="1.6"/>'; } },
    apple:      { name: 'Apple',        art: function () { return '<path d="M50,42 C40,36 30,44 32,56 C34,68 44,72 50,68 C56,72 66,68 68,56 C70,44 60,36 50,42z" fill="#e0324a"/><ellipse cx="42" cy="50" rx="4" ry="6" fill="#ff8a9a" opacity=".6"/><rect x="49" y="34" width="2.4" height="8" rx="1" fill="#6a4a2a"/><path d="M52,36 q8,-4 10,2 q-8,3 -10,-2z" fill="#4a9a3a"/>'; } },
    grapes:     { name: 'Grapes',       art: function () { return '<g fill="#7a3ba0"><circle cx="50" cy="44" r="6"/><circle cx="42" cy="52" r="6"/><circle cx="58" cy="52" r="6"/><circle cx="50" cy="56" r="6"/><circle cx="44" cy="64" r="6"/><circle cx="56" cy="64" r="6"/><circle cx="50" cy="70" r="6"/></g><path d="M50,38 q6,-6 12,-4" stroke="#4a9a3a" stroke-width="2" fill="none"/><path d="M60,32 q6,0 8,4 q-6,2 -8,-4z" fill="#4a9a3a"/>'; } },
    banana:     { name: 'Banana',       art: function () { return '<path d="M30,44 Q34,70 62,72 Q76,72 78,64 Q60,68 46,56 Q36,46 38,42 Z" fill="#ffd23f"/><path d="M30,44 Q34,70 62,72" fill="none" stroke="#e0a52f" stroke-width="2"/><rect x="34" y="40" width="4" height="6" rx="2" fill="#6a4a2a"/>'; } },
    cherry:     { name: 'Cherries',     art: function () { return '<circle cx="40" cy="62" r="9" fill="#c0132b"/><circle cx="60" cy="64" r="9" fill="#c0132b"/><ellipse cx="37" cy="59" rx="3" ry="2" fill="#ff6a7a" opacity=".7"/><path d="M40,53 Q46,34 54,34 Q62,34 60,55" stroke="#4a7a2a" stroke-width="2" fill="none"/><path d="M54,34 q6,-3 10,0 q-4,4 -10,0z" fill="#5aaa3a"/>'; } },
    egg:        { name: 'Fried Egg',    art: function () { return '<path d="M30,54 Q28,42 40,42 Q46,34 56,40 Q70,40 70,52 Q74,64 60,66 Q50,72 40,66 Q28,64 30,54z" fill="#fff8ec"/><circle cx="50" cy="54" r="9" fill="#ffbf3f"/><circle cx="46" cy="50" r="3" fill="#ffe08a" opacity=".8"/>'; } },
    bacon:      { name: 'Bacon',        art: function () { return '<path d="M28,46 q10,-6 20,0 q10,6 24,0 l0,7 q-14,6 -24,0 q-10,-6 -20,0z" fill="#a83a2a"/><path d="M28,54 q10,-6 20,0 q10,6 24,0 l0,7 q-14,6 -24,0 q-10,-6 -20,0z" fill="#c0522f"/><path d="M28,46 q10,-6 20,0 q10,6 24,0" fill="none" stroke="#f2d0b0" stroke-width="2"/><path d="M28,54 q10,-6 20,0 q10,6 24,0" fill="none" stroke="#f2d0b0" stroke-width="2"/>'; } },
    taco:       { name: 'Taco',         art: function () { return '<path d="M26,64 Q50,30 74,64 Z" fill="#f2c14e"/><path d="M30,60 Q50,38 70,60 Z" fill="#8a3b1a"/><rect x="34" y="56" width="32" height="5" fill="#6cbf3a"/><circle cx="42" cy="60" r="2.4" fill="#e0324a"/><circle cx="58" cy="60" r="2.4" fill="#e0324a"/><circle cx="50" cy="62" r="2.4" fill="#fff"/>'; } },
    dumpling:   { name: 'Dumpling',     art: function () { return '<path d="M30,60 Q34,46 50,46 Q66,46 70,60 Q60,66 50,66 Q40,66 30,60z" fill="#f2ead2"/><path d="M34,52 q3,-5 6,0 q3,-5 6,0 q3,-5 6,0 q3,-5 6,0 q3,-5 6,0" stroke="#d9c99a" stroke-width="1.8" fill="none"/><ellipse cx="50" cy="60" rx="16" ry="4" fill="#e0d0a0" opacity=".6"/>'; } },
    kebab:      { name: 'Kebab',        art: function () { return '<rect x="20" y="52" width="60" height="3" rx="1.5" fill="#b0b0b8" transform="rotate(-18 50 53)"/><rect x="32" y="44" width="12" height="12" rx="3" fill="#8a3520" transform="rotate(-18 38 50)"/><rect x="44" y="42" width="12" height="12" rx="3" fill="#6cbf3a" transform="rotate(-18 50 48)"/><rect x="56" y="40" width="12" height="12" rx="3" fill="#e0a52f" transform="rotate(-18 62 46)"/>'; } },
    iceCream:   { name: 'Ice Cream',    art: function () { return '<path d="M40,54 L60,54 L50,76 Z" fill="#e0a52f"/><path d="M40,54 L60,54 L50,76 Z" fill="#d99a3a"/><path d="M42,56 L58,56 M45,62 L55,62" stroke="#b06a24" stroke-width="1"/><circle cx="44" cy="48" r="8" fill="#ff9ec2"/><circle cx="56" cy="48" r="8" fill="#8ad0ff"/><circle cx="50" cy="40" r="8" fill="#fff2a0"/><circle cx="50" cy="34" r="2.4" fill="#e0324a"/>'; } },
    chocolate:  { name: 'Chocolate',    art: function () { return '<rect x="32" y="40" width="36" height="28" rx="3" fill="#5a2f1a"/><path d="M32,49 L68,49 M32,58 L68,58 M41,40 L41,68 M50,40 L50,68 M59,40 L59,68" stroke="#3a1f10" stroke-width="2"/><rect x="34" y="42" width="14" height="5" fill="#7a4a2a" opacity=".6"/>'; } },
    honey:      { name: 'Honey Jar',    art: function () { return '<rect x="36" y="48" width="28" height="22" rx="4" fill="#ffbf3f" opacity=".92"/><rect x="34" y="44" width="32" height="6" rx="3" fill="#c98a3a"/><rect x="40" y="52" width="20" height="10" rx="2" fill="#fff2cc" opacity=".8"/><rect x="49" y="30" width="2.4" height="16" fill="#a8781a"/><path d="M50,46 q0,6 -3,9" stroke="#e0a52f" stroke-width="2.4" fill="none"/>'; } },
    potion:     { name: 'Potion',       art: function () { return '<path d="M44,36 L56,36 L56,46 L64,64 Q64,72 50,72 Q36,72 36,64 L44,46 Z" fill="#7a3ba0" opacity=".55"/><path d="M40,58 Q50,54 60,58 L62,64 Q62,70 50,70 Q38,70 38,64 Z" fill="#a24aff" opacity=".8"/><rect x="43" y="30" width="14" height="6" rx="2" fill="#c98a3a"/><circle cx="46" cy="60" r="1.6" fill="#fff" opacity=".8"/><circle cx="54" cy="63" r="1.2" fill="#fff" opacity=".8"/>'; } },
    goblet:     { name: 'Goblet',       art: function () { return '<path d="M38,40 L62,40 Q62,56 50,58 Q38,56 38,40 Z" fill="#c0132b" opacity=".8"/><path d="M38,40 L62,40 L61,44 L39,44 Z" fill="#7a0a1a"/><rect x="48" y="58" width="4" height="10" fill="#e5b814"/><ellipse cx="50" cy="70" rx="10" ry="3" fill="#e5b814"/><path d="M36,38 L64,38 Q64,42 50,44 Q36,42 36,38z" fill="#d4af37"/>'; } },
    pancakes:   { name: 'Pancakes',     art: function () { return '<ellipse cx="50" cy="62" rx="22" ry="6" fill="#d99a3a"/><ellipse cx="50" cy="56" rx="22" ry="6" fill="#e6b36a"/><ellipse cx="50" cy="50" rx="22" ry="6" fill="#d99a3a"/><ellipse cx="50" cy="44" rx="22" ry="6" fill="#e6b36a"/><path d="M32,44 Q40,52 34,58 Q30,50 32,44z" fill="#ffbf3f"/><rect x="44" y="38" width="12" height="6" rx="2" fill="#fff2a0"/>'; } },
    cookie:     { name: 'Cookie',       art: function () { return '<circle cx="50" cy="54" r="20" fill="#d99a4a"/><circle cx="50" cy="54" r="20" fill="#d99a4a"/><circle cx="43" cy="48" r="2.6" fill="#4a2a1a"/><circle cx="57" cy="50" r="2.6" fill="#4a2a1a"/><circle cx="50" cy="60" r="2.6" fill="#4a2a1a"/><circle cx="42" cy="60" r="2" fill="#4a2a1a"/><circle cx="58" cy="60" r="2" fill="#4a2a1a"/>'; } },
    noodles:    { name: 'Noodle Box',   art: function () { return '<path d="M36,46 L64,46 L60,72 L40,72 Z" fill="#e8e2d0"/><path d="M40,46 L44,72 M50,46 L50,72 M60,46 L56,72" stroke="#c0b89a" stroke-width="1"/><path d="M40,44 q6,-6 10,0 q6,-6 10,0 q4,-4 6,0" stroke="#e2953a" stroke-width="2.4" fill="none"/><rect x="52" y="30" width="26" height="2.2" rx="1" fill="#a86" transform="rotate(24 65 31)"/>'; } },
    berryTart:  { name: 'Berry Tart',   art: function () { return '<ellipse cx="50" cy="60" rx="22" ry="8" fill="#c98a3a"/><ellipse cx="50" cy="56" rx="20" ry="7" fill="#5a1030"/><circle cx="42" cy="55" r="3" fill="#7a1a4a"/><circle cx="50" cy="53" r="3" fill="#2a2a7a"/><circle cx="58" cy="55" r="3" fill="#7a1a4a"/><circle cx="46" cy="58" r="3" fill="#2a2a7a"/><circle cx="54" cy="58" r="3" fill="#7a1a4a"/>'; } },
    skull:      { name: 'Skull Feast',  art: function () { return '<path d="M34,46 Q34,32 50,32 Q66,32 66,46 Q66,56 60,60 L60,66 L40,66 L40,60 Q34,56 34,46z" fill="#eee6d8"/><circle cx="43" cy="48" r="4.4" fill="#1a1a1a"/><circle cx="57" cy="48" r="4.4" fill="#1a1a1a"/><path d="M50,52 L46,58 L54,58 Z" fill="#1a1a1a"/><path d="M42,66 L42,70 M46,66 L46,70 M50,66 L50,70 M54,66 L54,70 M58,66 L58,70" stroke="#eee6d8" stroke-width="2.4"/>'; } }
  };
  var DEFAULT_BASE = 'roast';

  // ---- serving plates (each returns SVG for the plate under the food) ----
  var PLATES = {
    none:     function () { return ''; },
    obsidian: function () { return '<ellipse cx="50" cy="80" rx="40" ry="10" fill="#150b28" stroke="#a97bff" stroke-width="1.2"/><ellipse cx="50" cy="78" rx="31" ry="6" fill="#2a1a44" opacity=".7"/>'; },
    gold:     function () { return '<ellipse cx="50" cy="80" rx="40" ry="10" fill="#3a2a06" stroke="#f2c14e" stroke-width="1.6"/><ellipse cx="50" cy="78" rx="31" ry="6" fill="#7a5a12" opacity=".7"/>'; },
    silver:   function () { return '<ellipse cx="50" cy="80" rx="40" ry="10" fill="#20242a" stroke="#c8d0d8" stroke-width="1.4"/><ellipse cx="50" cy="78" rx="31" ry="6" fill="#3a424a" opacity=".7"/>'; },
    crystal:  function () { return '<ellipse cx="50" cy="80" rx="40" ry="10" fill="#0a2030" stroke="#7fe3ff" stroke-width="1.2" opacity=".85"/><ellipse cx="50" cy="78" rx="31" ry="6" fill="#134a63" opacity=".55"/>'; },
    wood:     function () { return '<ellipse cx="50" cy="80" rx="40" ry="10" fill="#3a2410" stroke="#6a4522" stroke-width="1.4"/><ellipse cx="50" cy="78" rx="31" ry="6" fill="#5a3a18" opacity=".7"/>'; }
  };

  // ---- auras / particle fields around the food ----
  var AURAS = {
    none:  function () { return ''; },
    soul:  function () { return '<g fill="#d9c2ff"><circle cx="30" cy="34" r="1.6"/><circle cx="70" cy="32" r="1.8"/><circle cx="50" cy="20" r="1.8"/><circle cx="24" cy="52" r="1.3"/><circle cx="78" cy="50" r="1.3"/></g>'; },
    ember: function () { return '<g fill="#ff9a3c"><circle cx="32" cy="34" r="1.6"/><circle cx="68" cy="30" r="1.8"/><circle cx="50" cy="22" r="1.6"/><circle cx="26" cy="48" r="1.3"/><circle cx="76" cy="48" r="1.3"/></g>'; },
    frost: function () { return '<g stroke="#bfeeff" stroke-width="1.4"><path d="M30,30 l4,0 M32,28 l0,4"/><path d="M70,28 l4,0 M72,26 l0,4"/><path d="M50,18 l4,0 M52,16 l0,4"/></g>'; },
    holy:  function () { return '<g stroke="#ffe38a" stroke-width="1.2" opacity=".8"><path d="M50,14 L50,24 M30,20 L36,28 M70,20 L64,28 M20,40 L28,42 M80,40 L72,42"/></g>'; },
    toxic: function () { return '<g fill="#7bff8a"><circle cx="34" cy="36" r="1.8"/><circle cx="66" cy="34" r="2"/><circle cx="50" cy="24" r="1.6"/><circle cx="72" cy="52" r="1.4"/></g>'; }
  };

  // ---- garnishes on top of the food ----
  var GARNISHES = {
    none:      function () { return ''; },
    herbs:     function () { return '<path d="M40,44 q4,-6 9,-5" stroke="#3aa03a" stroke-width="2" fill="none"/><path d="M58,46 q-4,-6 -9,-5" stroke="#3aa03a" stroke-width="2" fill="none"/>'; },
    berries:   function () { return '<circle cx="43" cy="46" r="3" fill="#e0324a" stroke="#ffb3bd" stroke-width="1"/><circle cx="57" cy="44" r="2.6" fill="#7a1a6a" stroke="#d9a3d0" stroke-width="1"/>'; },
    goldflecks:function () { return '<g fill="#ffd35a"><circle cx="42" cy="47" r="1.5"/><circle cx="56" cy="44" r="1.3"/><circle cx="50" cy="50" r="1.4"/><circle cx="60" cy="52" r="1.1"/></g>'; },
    crown:     function () { return '<path d="M44,40 L47,32 L50,38 L53,32 L56,40 Z" fill="#f2c14e" stroke="#7a5a12" stroke-width="0.6"/>'; },
    candle:    function () { return '<rect x="49" y="30" width="2.4" height="10" fill="#fff2cc"/><path d="M50,26 q3,3 0,5 q-3,-2 0,-5z" fill="#ffb03a"/>'; }
  };

  var STEAM = '<path class="uhf-steam" d="M40,40 C34,30 46,26 40,16 M52,38 C46,28 58,24 52,14 M64,40 C58,30 70,26 64,16" stroke="#ffd9c0" stroke-width="2" fill="none" opacity=".7"/>';

  function defaultArt() {
    return { base: DEFAULT_BASE, plate: 'gold', aura: 'soul', garnish: 'goldflecks', glow: '#e5b814', bg: '#1a1206', size: 1, steam: true, tag: 'DELICACY', tagColor: '#ffe9a8' };
  }

  // ---- compose a full art-stage card from a config ----
  function composeArt(a, sfx) {
    a = a || defaultArt();
    sfx = String(sfx || 'x').replace(/[^a-zA-Z0-9_]/g, '');
    var baseKey = BASES[a.base] ? a.base : DEFAULT_BASE;
    var glow = a.glow || '#e5b814';
    var bg = a.bg || '#1a1206';
    var size = Math.max(0.55, Math.min(1.6, num(a.size, 1)));
    var plate = (PLATES[a.plate] || PLATES.gold);
    var aura = (AURAS[a.aura] || AURAS.none);
    var garnish = (GARNISHES[a.garnish] || GARNISHES.none);
    var steam = a.steam ? STEAM : '';
    var tag = a.tag || 'DELICACY';
    var tagCol = a.tagColor || '#ffe9a8';
    var svg = '<svg viewBox="0 0 100 100" class="w-24 h-24 drop-shadow-2xl art-float" role="img" aria-label="' + esc(tag) + '">'
      + '<defs><radialGradient id="fsbg_' + sfx + '" cx="50%" cy="42%" r="66%"><stop offset="0%" stop-color="' + glow + '" stop-opacity=".5"/><stop offset="66%" stop-color="' + bg + '" stop-opacity=".18"/><stop offset="100%" stop-color="' + bg + '" stop-opacity="0"/></radialGradient></defs>'
      + '<rect x="0" y="0" width="100" height="100" fill="url(#fsbg_' + sfx + ')"/>'
      + plate(sfx)
      + '<g transform="translate(50,54) scale(' + size + ') translate(-50,-54)">' + BASES[baseKey].art(sfx) + '</g>'
      + garnish(sfx) + steam + aura(sfx)
      + '</svg>';
    return '<div class="art-stage w-full h-32 flex items-center justify-center relative z-10" style="filter:drop-shadow(0 0 22px ' + glow + '88);">'
      + '<span class="art-corner art-tl"></span><span class="art-corner art-tr"></span><span class="art-corner art-bl"></span><span class="art-corner art-br"></span>'
      + '<span class="rarity-tag" style="color:' + tagCol + ';border-color:' + glow + ';background:linear-gradient(180deg,rgba(10,6,2,.82),rgba(0,0,0,.5));">' + esc(tag) + '</span>'
      + svg + '</div>';
  }

  /* =====================================================================
     INFO / CODEX  -  split a big body of text into exactly N ordered files.
     ===================================================================== */
  function splitInfo(text, count) {
    text = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    if (!text) return [];
    var n = Math.max(1, Math.min(100000, Math.floor(num(count, 1))));
    var sents = text.split(/(?<=[.!?])\s+/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
    var units, sep;
    if (sents.length >= n) { units = sents; sep = ' '; }
    else { var words = text.split(' '); if (words.length >= n) { units = words; sep = ' '; } else { units = text.split(''); sep = ''; } }
    var m = units.length, groups = Math.min(n, m), out = [];
    for (var g = 0; g < groups; g++) {
      var a = Math.floor(g * m / groups), b = Math.floor((g + 1) * m / groups);
      if (b <= a) b = a + 1;
      out.push(units.slice(a, b).join(sep));
    }
    return out;
  }
  function buildFacts(cfg) {
    if (!cfg || !cfg.codex || !cfg.codex.text) return [];
    var key = (cfg.codex.count || 0) + '|' + cfg.codex.text.length;
    if (cfg._facts && cfg._factsKey === key) return cfg._facts;
    cfg._facts = splitInfo(cfg.codex.text, cfg.codex.count);
    cfg._factsKey = key;
    return cfg._facts;
  }

  /* =====================================================================
     BUFFS  -  grant a food's configured short + long buffs on every eat.
     ===================================================================== */
  function buffDescOf(b) {
    if (b.t === 'crit') return (b.ch || 25) + '% CHANCE +' + b.val + ' PTS';
    if (b.t === 'combo') return '+' + b.val + ' PTS EVERY ' + (b.req || 10) + ' STRIKES';
    if (b.t === 'burst') return '+' + b.val + ' PTS PER RECENT STRIKE';
    return '+' + b.val + ' PTS/STRIKE';
  }
  function buffsConfigured(cfg) {
    var s = cfg && cfg.buffs; if (!s) return false;
    return (s.short && s.short.on && +s.short.count > 0 && +s.short.val > 0) || (s.long && s.long.on && +s.long.count > 0 && +s.long.val > 0);
  }
  function makeBuff(spec, expireAt) {
    var t = (spec.t === 'crit' || spec.t === 'combo' || spec.t === 'burst') ? spec.t : 'flat';
    var b = { t: t, val: (t === 'burst' ? num(spec.val, 0) : Math.round(num(spec.val, 0))), expireAt: expireAt, _fsFood: true };
    if (t === 'crit') b.ch = Math.max(1, Math.min(100, Math.round(num(spec.ch, 25))));
    if (t === 'combo') b.req = Math.max(1, Math.round(num(spec.req, 10)));
    b.desc = buffDescOf(b);
    return b;
  }
  function grantBuffs(cfg) {
    var s = S(); var p = s && s.state && s.state.profile; if (!p || !cfg || !cfg.buffs) return [];
    if (!p.foodShort) p.foodShort = []; if (!p.foodLong) p.foodLong = [];
    try { if (s.food && s.food.prune) s.food.prune(); } catch (e) {}
    var now = Date.now(); var gained = [];
    var sh = cfg.buffs.short, lo = cfg.buffs.long;
    if (sh && sh.on && +sh.val > 0) {
      var mins = Math.max(1, Math.round(num(sh.mins, 60)));
      var cnt = Math.max(0, Math.min(6, Math.round(num(sh.count, 1))));
      for (var i = 0; i < cnt; i++) {
        if (p.foodShort.length >= 6) break;
        var b = makeBuff(sh, now + mins * 60000); b.wearLeft = 250000;
        p.foodShort.push(b); gained.push('SHORT \u00B7 ' + b.desc);
      }
    }
    if (lo && lo.on && +lo.val > 0) {
      var lcnt = Math.max(0, Math.min(10, Math.round(num(lo.count, 1))));
      for (var j = 0; j < lcnt; j++) {
        if (p.foodLong.length >= 10) p.foodLong.shift();
        var lb = makeBuff(lo, now + 99 * 3600000); lb.longTerm = true;
        p.foodLong.push(lb); gained.push('LONG \u00B7 ' + lb.desc + ' (~99 HR)');
      }
    }
    try { if (s.food && s.food.updateBar) s.food.updateBar(); } catch (e) {}
    return gained;
  }

  /* =====================================================================
     EAT  -  serve buffs + reveal the next per-food file, show the modal.
     ===================================================================== */
  function onEat(item) {
    var s = S(); var p = s && s.state && s.state.profile; var cfg = STORE[item && item.id]; if (!p || !cfg) return false;
    var gained = grantBuffs(cfg);
    var facts = buildFacts(cfg), total = facts.length, idx = -1, done = false, frag = '';
    if (total > 0) {
      p.foodCodex = p.foodCodex || {};
      var rec = p.foodCodex[item.id] = p.foodCodex[item.id] || { progress: 0 };
      rec.progress = Math.max(0, rec.progress || 0);
      if (rec.progress >= total) { idx = total - 1; done = true; }
      else { idx = rec.progress; rec.progress = idx + 1; }
      frag = facts[idx] || '';
    }
    if (!gained.length && total === 0) return false; // nothing configured -> let default consume run
    showModal(item, cfg, frag, idx, total, gained, done);
    try { s.storage.lastSavedDataStr = ''; s.ui.updateHeader(); s.storage.save(true); } catch (e) {}
    try { s.utils.logEvent('[FOOD] ' + p.id + ' ate ' + item.name + (total ? (' \u2014 file ' + (idx + 1) + '/' + total) : '') + (gained.length ? (' (' + gained.length + ' buff' + (gained.length > 1 ? 's' : '') + ')') : '') + '.'); } catch (e) {}
    return true;
  }

  // ---- modal (per-food, reused) ----
  function ensureModal() {
    var m = document.getElementById('food-studio-modal'); if (m) return m;
    m = document.createElement('div');
    m.id = 'food-studio-modal';
    m.className = 'hidden fixed inset-0 z-[660] items-center justify-center p-4';
    m.style.cssText += 'background:rgba(4,4,8,0.92);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);';
    m.innerHTML =
      '<div class="panel-lux p-6 md:p-8 border-2 border-amber-600 max-w-2xl w-full relative overflow-hidden shadow-[0_0_60px_rgba(229,184,20,0.35)] max-h-[88vh] flex flex-col" style="background:linear-gradient(160deg,#1a1206,#08060f);">'
      + '<div id="fsm-eaten" class="text-amber-300 text-[10px] font-black uppercase tracking-[0.4em] text-center mb-2 animate-pulse">\u2726 FEAST CONSUMED \u2726</div>'
      + '<h2 id="fsm-title" class="cinzel text-xl md:text-2xl text-amber-300 text-center mb-1">FOOD</h2>'
      + '<div id="fsm-prog" class="text-[10px] text-center text-[#e5b814] font-black uppercase tracking-[0.3em] mb-3"></div>'
      + '<div id="fsm-fragwrap" class="text-[12px] md:text-base text-amber-50 leading-relaxed overflow-y-auto scrollbar-hide bg-[#0c0a06] border border-amber-900 p-4 rounded" style="min-height:60px;max-height:34vh;">'
      + '<div class="text-[9px] text-amber-600 uppercase tracking-widest mb-2 font-bold">FILE</div><p id="fsm-frag" style="font-style:italic;"></p></div>'
      + '<div id="fsm-buffs" class="mt-3" style="display:none;"></div>'
      + '<div id="fsm-archive" class="mt-3 overflow-y-auto scrollbar-hide" style="display:none;max-height:24vh;"></div>'
      + '<button id="fsm-archbtn" class="btn-military py-2 w-full text-[11px] mt-3" style="display:none;">\uD83D\uDCC1 VIEW ALL UNLOCKED FILES</button>'
      + '<button class="btn-military py-3 w-full text-sm mt-3" onclick="var m=document.getElementById(\'food-studio-modal\');m.classList.remove(\'flex\');m.classList.add(\'hidden\');">CLOSE</button>'
      + '</div>';
    document.body.appendChild(m);
    return m;
  }
  function showModal(item, cfg, frag, idx, total, gained, done) {
    var m = ensureModal();
    m.querySelector('#fsm-title').innerText = (item.name || 'FOOD').toUpperCase();
    var fw = m.querySelector('#fsm-fragwrap'), fb = m.querySelector('#fsm-frag'), pr = m.querySelector('#fsm-prog');
    if (total > 0) {
      fw.style.display = 'block';
      pr.style.display = 'block';
      pr.innerText = done ? ('ALL FILES ABSORBED \u00B7 ' + total + ' / ' + total) : ('FILE ' + (idx + 1) + ' OF ' + total + '  \u00B7  ' + (idx + 1) + ' / ' + total + ' ABSORBED');
      fb.innerText = frag || '';
    } else { fw.style.display = 'none'; pr.style.display = 'none'; }
    var be = m.querySelector('#fsm-buffs');
    if (gained && gained.length) {
      be.style.display = 'block';
      be.innerHTML = '<div class="text-[9px] text-emerald-400 uppercase tracking-[0.3em] mb-2 font-black text-center">\u2726 BUFFS SERVED \u2726</div>'
        + gained.map(function (g) { return '<div class="bg-[#05130c] border border-emerald-800 px-3 py-2 text-emerald-300 font-black uppercase tracking-widest text-[10px] mb-1 text-center">' + esc(g) + '</div>'; }).join('');
    } else { be.style.display = 'none'; be.innerHTML = ''; }
    // archive
    var ab = m.querySelector('#fsm-archbtn'), arch = m.querySelector('#fsm-archive');
    arch.style.display = 'none'; arch.innerHTML = '';
    if (total > 0) {
      ab.style.display = 'block';
      ab.onclick = function () {
        if (arch.style.display === 'none') {
          var s = S(); var p = s.state.profile || {}; var facts = buildFacts(cfg);
          var prog = Math.max(0, Math.min(facts.length, (p.foodCodex && p.foodCodex[item.id] && p.foodCodex[item.id].progress) || 0));
          var rows = '';
          for (var i = prog - 1; i >= 0; i--) rows += '<div class="px-2 py-2 border-b border-[#2a2410] text-[11px] text-amber-100 leading-snug" style="font-style:italic;"><span class="text-amber-500 font-black">#' + (i + 1) + '</span> ' + esc(facts[i]) + '</div>';
          arch.innerHTML = rows || '<div class="text-gray-500 text-center p-2 text-[10px] uppercase">NO FILES UNLOCKED YET.</div>';
          arch.style.display = 'block'; ab.innerText = '\uD83D\uDCC1 HIDE UNLOCKED FILES';
        } else { arch.style.display = 'none'; ab.innerText = '\uD83D\uDCC1 VIEW ALL UNLOCKED FILES'; }
      };
    } else ab.style.display = 'none';
    m.classList.remove('hidden'); m.classList.add('flex');
  }

  /* =====================================================================
     RUNTIME  -  inject custom foods, register arts, buff descriptions, and
     intercept consume. All idempotent + self-healing.
     ===================================================================== */
  function foodBuffDesc(cfg) {
    var parts = [];
    if (buffsConfigured(cfg)) {
      var b = cfg.buffs;
      if (b.short && b.short.on && +b.short.count > 0) parts.push('<span class="text-emerald-300">' + Math.round(+b.short.count) + 'x SHORT: ' + esc(buffDescOf(makeBuff(b.short, 0))) + '</span>');
      if (b.long && b.long.on && +b.long.count > 0) parts.push('<span class="text-cyan-300">' + Math.round(+b.long.count) + 'x LONG: ' + esc(buffDescOf(makeBuff(b.long, 0))) + '</span>');
    }
    if (cfg.codex && cfg.codex.text) { var t = buildFacts(cfg).length; parts.push('<span class="text-amber-300">Reveals 1 of ' + t + ' unique files per meal</span>'); }
    if (!parts.length) parts.push('<span class="text-gray-400">A fine provision.</span>');
    return parts.join('<br>');
  }
  function findFood(id) {
    var s = S(); if (!s || !s.shop || !s.shop.db || !s.shop.db.food) return null;
    var arr = s.shop.db.food; for (var i = 0; i < arr.length; i++) if (arr[i] && arr[i].id === id) return arr[i];
    return null;
  }
  function apply() {
    var s = S(); if (!s || !s.shop || !s.shop.db || !s.shop.db.food) return;
    s.shop.legendaryArt = s.shop.legendaryArt || {};
    // Advertise every managed food id so the food-art chain (dedicated()) honours our
    // hand-built legendaryArt instead of substituting the generic name-based dish art.
    window.__BCA_foodStudioIds = {};
    Object.keys(STORE).forEach(function (id) {
      var cfg = STORE[id]; if (!cfg) return;
      window.__BCA_foodStudioIds[id] = 1;
      // inject brand-new foods into the Quartermaster food shop
      if (cfg.custom) {
        var ex = findFood(id);
        if (!ex) {
          s.shop.db.food.unshift({ id: id, name: cfg.name || 'CUSTOM FOOD', sub: cfg.sub || 'Consumables', tier: cfg.tier || 12, req: cfg.req || 'FOOD STUDIO', price: cfg.price || 50000, buffDesc: foodBuffDesc(cfg), foodStudio: true });
        } else { ex.name = cfg.name || ex.name; ex.price = cfg.price != null ? cfg.price : ex.price; ex.tier = cfg.tier != null ? cfg.tier : ex.tier; ex.buffDesc = foodBuffDesc(cfg); ex.foodStudio = true; }
      } else {
        var it = findFood(id); if (it) { it.buffDesc = foodBuffDesc(cfg); it.foodStudio = true; }
      }
      // register the studio art for EVERY managed food (existing or custom)
      if (cfg.art) {
        (function (fid, artCfg) { s.shop.legendaryArt[fid] = function () { return composeArt(artCfg, fid); }; })(id, cfg.art);
        try { if (s.shop.artCache) Object.keys(s.shop.artCache).forEach(function (k) { if (k.indexOf(id) !== -1) delete s.shop.artCache[k]; }); } catch (e) {}
      }
    });
  }
  function repaintShop() {
    var s = S(); try {
      var view = document.getElementById('rzg-view-shop-list');
      if (view && view.classList.contains('active') && s.shop._ca1aLast && s.shop.renderGrid) {
        var grid = document.getElementById('shop-grid'); if (grid) grid.removeAttribute('data-bca-shop-sig-059c');
        s.shop.renderGrid(s.shop._ca1aLast.cat, s.shop._ca1aLast.sub);
      }
    } catch (e) {}
  }
  function installGenerate() {
    var s = S(); if (!s || !s.shop || typeof s.shop.generateDB !== 'function' || s.shop.generateDB._foodStudio) return;
    var orig = s.shop.generateDB.bind(s.shop);
    s.shop.generateDB = function () { var r = orig.apply(this, arguments); try { apply(); } catch (e) {} return r; };
    s.shop.generateDB._foodStudio = true;
  }
  function installConsume() {
    var s = S(); if (!s || !s.food || typeof s.food.consume !== 'function' || s.food.consume._foodStudio) return;
    var oc = s.food.consume.bind(s.food);
    s.food.consume = function (item) {
      try { if (item && item.id && STORE[item.id] && (buildFacts(STORE[item.id]).length > 0 || buffsConfigured(STORE[item.id]))) { if (onEat(item)) return true; } } catch (e) {}
      return oc(item);
    };
    s.food.consume._foodStudio = true;
  }

  /* =====================================================================
     PERSISTENCE
     ===================================================================== */
  function stripRuntime(cfg) { var c = JSON.parse(JSON.stringify(cfg)); delete c._facts; delete c._factsKey; return c; }
  function saveLocal() { try { var out = {}; Object.keys(STORE).forEach(function (k) { out[k] = stripRuntime(STORE[k]); }); localStorage.setItem(LS_KEY, JSON.stringify(out)); } catch (e) {} }
  function loadLocal() { try { var raw = localStorage.getItem(LS_KEY); if (raw) { var o = JSON.parse(raw); if (o && typeof o === 'object') STORE = o; } } catch (e) {} }
  function pushCloud(id) {
    var c = cloud(); if (!c) return;
    try { var d = {}; d[id] = STORE[id] ? stripRuntime(STORE[id]) : null; c.FS.setDoc(c.FS.doc(c.DB, 'bca_system', CLOUD_DOC), { foods: d }, { merge: true }); } catch (e) {}
  }
  function wireCloud() {
    var c = cloud(); if (cloudWired || !c) return; cloudWired = true;
    try {
      c.FS.onSnapshot(c.FS.doc(c.DB, 'bca_system', CLOUD_DOC), function (snap) {
        var data = (snap && snap.exists && snap.exists()) ? snap.data() : (snap && snap.data ? snap.data() : null);
        var foods = (data && data.foods) ? data.foods : {};
        var next = {};
        Object.keys(foods).forEach(function (k) { if (foods[k]) next[k] = foods[k]; });
        STORE = next; saveLocal();
        try { installGenerate(); if (S().shop && S().shop.generateDB) S().shop.generateDB(); } catch (e) { try { apply(); } catch (e2) {} }
        repaintShop();
        try { if (document.getElementById('food-studio-panel')) refreshFoodList(); } catch (e) {}
      });
    } catch (e) {}
  }

  // ---- public write ops ----
  function saveConfig(cfg) {
    if (!cfg || !cfg.id) return;
    cfg.savedAt = Date.now();
    STORE[cfg.id] = cfg;
    delete cfg._facts; delete cfg._factsKey;
    saveLocal();
    try { installGenerate(); if (S().shop && S().shop.generateDB) S().shop.generateDB(); } catch (e) { try { apply(); } catch (e2) {} }
    repaintShop();
    pushCloud(cfg.id);
  }
  function removeConfig(id) {
    if (!id || !STORE[id]) return;
    var wasCustom = STORE[id].custom;
    delete STORE[id]; saveLocal();
    try { var s = S(); if (wasCustom && s.shop && s.shop.db && s.shop.db.food) s.shop.db.food = s.shop.db.food.filter(function (f) { return f && f.id !== id; }); } catch (e) {}
    try { var s2 = S(); if (s2.shop && s2.shop.legendaryArt) delete s2.shop.legendaryArt[id]; } catch (e) {}
    try { if (S().shop && S().shop.generateDB) S().shop.generateDB(); } catch (e) {}
    repaintShop(); pushCloud(id);
  }

  /* =====================================================================
     ADMIN UI
     ===================================================================== */
  function status(m) { var el = document.getElementById('fs-status'); if (el) el.textContent = m || ''; }
  var _previewSeq = 0;
  function readForm() {
    var mode = val('fs-mode');
    var id, name;
    if (mode === 'new') { name = (val('fs-new-name') || '').trim() || 'CUSTOM FOOD'; id = 'food_fs_' + slug(name) + '_' + Date.now().toString(36); }
    else { id = val('fs-existing'); var it = findFood(id); name = it ? it.name : id; }
    if (!id) return null;
    var cfg = (STORE[id] ? JSON.parse(JSON.stringify(STORE[id])) : {});
    cfg.id = id; cfg.name = name; cfg.cat = 'food';
    cfg.custom = (mode === 'new') ? true : (STORE[id] ? !!STORE[id].custom : false);
    if (mode === 'new') { cfg.price = Math.max(0, Math.round(num(val('fs-new-price'), 50000))); cfg.tier = Math.max(1, Math.min(99, Math.round(num(val('fs-new-tier'), 12)))); cfg.sub = 'Consumables'; }
    cfg.art = {
      base: val('fs-art-base') || DEFAULT_BASE, plate: val('fs-art-plate') || 'gold', aura: val('fs-art-aura') || 'soul',
      garnish: val('fs-art-garnish') || 'goldflecks', glow: val('fs-art-glow') || '#e5b814', bg: val('fs-art-bg') || '#1a1206',
      size: num(val('fs-art-size'), 1), steam: chk('fs-art-steam'), tag: (val('fs-art-tag') || 'DELICACY').toUpperCase(), tagColor: val('fs-art-tagcol') || '#ffe9a8'
    };
    cfg.codex = { text: val('fs-codex-text') || '', count: Math.max(1, Math.round(num(val('fs-codex-count'), 120))) };
    cfg.buffs = {
      short: { on: chk('fs-sb-on'), t: val('fs-sb-type') || 'flat', val: num(val('fs-sb-val'), 0), ch: num(val('fs-sb-ch'), 25), req: num(val('fs-sb-req'), 10), mins: num(val('fs-sb-mins'), 60), count: Math.round(num(val('fs-sb-count'), 2)) },
      long: { on: chk('fs-lb-on'), t: val('fs-lb-type') || 'flat', val: num(val('fs-lb-val'), 0), ch: num(val('fs-lb-ch'), 25), req: num(val('fs-lb-req'), 10), count: Math.round(num(val('fs-lb-count'), 1)) }
    };
    return cfg;
  }
  function updatePreview() {
    var el = document.getElementById('fs-preview'); if (!el) return;
    var cfg = readForm(); if (!cfg) { el.innerHTML = ''; return; }
    el.innerHTML = composeArt(cfg.art, 'prev' + (++_previewSeq));
  }
  function loadConfigIntoForm(id) {
    var cfg = STORE[id];
    var art = (cfg && cfg.art) || defaultArt();
    setVal('fs-art-base', art.base || DEFAULT_BASE); setVal('fs-art-plate', art.plate || 'gold'); setVal('fs-art-aura', art.aura || 'soul');
    setVal('fs-art-garnish', art.garnish || 'goldflecks'); setVal('fs-art-glow', art.glow || '#e5b814'); setVal('fs-art-bg', art.bg || '#1a1206');
    setVal('fs-art-size', art.size != null ? art.size : 1); setChk('fs-art-steam', art.steam !== false); setVal('fs-art-tag', art.tag || 'DELICACY'); setVal('fs-art-tagcol', art.tagColor || '#ffe9a8');
    setVal('fs-codex-text', (cfg && cfg.codex && cfg.codex.text) || ''); setVal('fs-codex-count', (cfg && cfg.codex && cfg.codex.count) || 120);
    var b = (cfg && cfg.buffs) || {}; var sh = b.short || {}, lo = b.long || {};
    setChk('fs-sb-on', !!sh.on); setVal('fs-sb-type', sh.t || 'flat'); setVal('fs-sb-val', sh.val != null ? sh.val : ''); setVal('fs-sb-ch', sh.ch != null ? sh.ch : 25); setVal('fs-sb-req', sh.req != null ? sh.req : 10); setVal('fs-sb-mins', sh.mins != null ? sh.mins : 60); setVal('fs-sb-count', sh.count != null ? sh.count : 2);
    setChk('fs-lb-on', !!lo.on); setVal('fs-lb-type', lo.t || 'flat'); setVal('fs-lb-val', lo.val != null ? lo.val : ''); setVal('fs-lb-ch', lo.ch != null ? lo.ch : 25); setVal('fs-lb-req', lo.req != null ? lo.req : 10); setVal('fs-lb-count', lo.count != null ? lo.count : 1);
    updatePreview();
  }
  function refreshFoodList() {
    var s = S(); var sel = document.getElementById('fs-existing'); if (!sel || !s || !s.shop || !s.shop.db || !s.shop.db.food) return;
    var q = (val('fs-existing-search') || '').trim().toUpperCase();
    var prev = sel.value;
    sel.innerHTML = (s.shop.db.food || []).filter(function (f) { return f && f.id && (!q || String(f.name || '').toUpperCase().indexOf(q) >= 0 || String(f.id).toUpperCase().indexOf(q) >= 0); })
      .map(function (f) { return '<option value="' + esc(f.id) + '">' + (STORE[f.id] ? '\u270E ' : '') + esc(f.name) + '</option>'; }).join('');
    if (prev && Array.prototype.some.call(sel.options, function (o) { return o.value === prev; })) sel.value = prev;
  }
  function toggleMode() {
    var mode = val('fs-mode');
    var ex = document.getElementById('fs-existing-wrap'), nw = document.getElementById('fs-new-wrap');
    if (ex) ex.style.display = (mode === 'new') ? 'none' : 'block';
    if (nw) nw.style.display = (mode === 'new') ? 'block' : 'none';
    if (mode !== 'new') { var id = val('fs-existing'); if (id && STORE[id]) loadConfigIntoForm(id); else updatePreview(); }
    else updatePreview();
  }
  function doSave() {
    if (!isAdmin()) return status('ADMIN ONLY.');
    var cfg = readForm(); if (!cfg) return status('PICK OR NAME A FOOD FIRST.');
    saveConfig(cfg);
    status('SAVED & LIVE: ' + cfg.name + (cloud() ? ' (SYNCED)' : ' (LOCAL ONLY - OFFLINE)'));
    setVal('fs-mode', 'existing'); toggleMode(); refreshFoodList();
    var sel = document.getElementById('fs-existing'); if (sel) { sel.value = cfg.id; loadConfigIntoForm(cfg.id); }
  }
  function doDelete() {
    if (!isAdmin()) return status('ADMIN ONLY.');
    var id = val('fs-existing'); if (val('fs-mode') === 'new' || !id) return status('SELECT AN EXISTING FOOD TO REMOVE ITS STUDIO CONFIG.');
    if (!STORE[id]) return status('NO STUDIO CONFIG ON THIS FOOD.');
    removeConfig(id); status('STUDIO CONFIG REMOVED: ' + id); refreshFoodList();
  }
  function injectUI() {
    if (!isAdmin()) return;
    var menu = document.getElementById('admin-mini-menu');
    if (!menu || document.getElementById('food-studio-panel')) return;
    var hd = 'text-[9px] text-[#e5b814] font-black uppercase tracking-widest text-center border-b border-[#333] pb-1 mt-2';
    var lb = 'text-[8px] text-gray-400 uppercase';
    var inp = 'bg-[#111] text-white text-[10px] p-1 border border-[#333] outline-none w-full';
    var baseOpts = Object.keys(BASES).map(function (k) { return '<option value="' + k + '">' + esc(BASES[k].name) + '</option>'; }).join('');
    function opts(o) { return o.map(function (x) { return '<option value="' + x[0] + '">' + x[1] + '</option>'; }).join(''); }
    var plateOpts = opts([['gold', 'Gold plate'], ['obsidian', 'Obsidian plate'], ['silver', 'Silver plate'], ['crystal', 'Crystal plate'], ['wood', 'Wood board'], ['none', 'No plate']]);
    var auraOpts = opts([['soul', 'Soul aura'], ['ember', 'Ember aura'], ['frost', 'Frost aura'], ['holy', 'Holy rays'], ['toxic', 'Toxic aura'], ['none', 'No aura']]);
    var garnishOpts = opts([['goldflecks', 'Gold flecks'], ['herbs', 'Herbs'], ['berries', 'Berries'], ['crown', 'Gold crown'], ['candle', 'Candle'], ['none', 'None']]);
    var btOpts = opts([['flat', 'FLAT +pts/strike'], ['crit', 'CRIT % chance'], ['combo', 'COMBO every N'], ['burst', 'BURST per recent strike']]);
    var box = document.createElement('div');
    box.id = 'food-studio-panel';
    box.className = 'flex flex-col gap-1';
    box.innerHTML =
        '<div class="' + hd + '">\uD83C\uDF57 FOOD STUDIO</div>'
      + '<label class="' + lb + '">Target</label>'
      + '<select id="fs-mode" class="' + inp + '"><option value="existing">EDIT EXISTING FOOD</option><option value="new">CREATE NEW FOOD</option></select>'
      + '<div id="fs-existing-wrap">'
        + '<input id="fs-existing-search" class="' + inp + '" placeholder="FILTER FOODS...">'
        + '<select id="fs-existing" class="' + inp + '"></select>'
      + '</div>'
      + '<div id="fs-new-wrap" style="display:none;">'
        + '<label class="' + lb + '">New food name</label><input id="fs-new-name" class="' + inp + '" placeholder="e.g. VOID GATEAU">'
        + '<label class="' + lb + '">Price (gold)</label><input id="fs-new-price" type="number" class="' + inp + '" placeholder="50000">'
        + '<label class="' + lb + '">Tier (1-99)</label><input id="fs-new-tier" type="number" class="' + inp + '" placeholder="12">'
      + '</div>'
      + '<div id="fs-preview" class="my-1"></div>'
      + '<div class="' + hd + '">\uD83C\uDFA8 ART</div>'
      + '<label class="' + lb + '">Base art (30+)</label><select id="fs-art-base" class="' + inp + '">' + baseOpts + '</select>'
      + '<label class="' + lb + '">Serving plate</label><select id="fs-art-plate" class="' + inp + '">' + plateOpts + '</select>'
      + '<label class="' + lb + '">Aura</label><select id="fs-art-aura" class="' + inp + '">' + auraOpts + '</select>'
      + '<label class="' + lb + '">Garnish</label><select id="fs-art-garnish" class="' + inp + '">' + garnishOpts + '</select>'
      + '<div class="flex gap-1"><div class="flex-1"><label class="' + lb + '">Glow</label><input id="fs-art-glow" type="color" value="#e5b814" class="' + inp + ' h-7 p-0"></div><div class="flex-1"><label class="' + lb + '">Backdrop</label><input id="fs-art-bg" type="color" value="#1a1206" class="' + inp + ' h-7 p-0"></div><div class="flex-1"><label class="' + lb + '">Tag colour</label><input id="fs-art-tagcol" type="color" value="#ffe9a8" class="' + inp + ' h-7 p-0"></div></div>'
      + '<label class="' + lb + '">Size</label><input id="fs-art-size" type="range" min="0.6" max="1.5" step="0.05" value="1" class="w-full">'
      + '<label class="' + lb + '">Rarity tag text</label><input id="fs-art-tag" class="' + inp + '" placeholder="DELICACY">'
      + '<label class="flex items-center gap-2 text-[9px] text-gray-300 uppercase"><input id="fs-art-steam" type="checkbox" checked> Rising steam</label>'
      + '<div class="' + hd + '">\uD83D\uDCDA INFO / FILES (networked to THIS food only)</div>'
      + '<label class="' + lb + '">Paste large info (split into files, revealed 1 per eat)</label>'
      + '<textarea id="fs-codex-text" rows="4" class="' + inp + '" placeholder="Paste a large body of text here..."></textarea>'
      + '<label class="' + lb + '">TOTAL files across this food</label><input id="fs-codex-count" type="number" class="' + inp + '" placeholder="120" value="120">'
      + '<div class="' + hd + '">\u26A1 SHORT-TERM BUFFS</div>'
      + '<label class="flex items-center gap-2 text-[9px] text-gray-300 uppercase"><input id="fs-sb-on" type="checkbox"> Grant short buffs</label>'
      + '<select id="fs-sb-type" class="' + inp + '">' + btOpts + '</select>'
      + '<div class="flex gap-1"><div class="flex-1"><label class="' + lb + '">Value</label><input id="fs-sb-val" type="number" class="' + inp + '" placeholder="3000"></div><div class="flex-1"><label class="' + lb + '">How many</label><input id="fs-sb-count" type="number" class="' + inp + '" value="2"></div></div>'
      + '<div class="flex gap-1"><div class="flex-1"><label class="' + lb + '">Crit %</label><input id="fs-sb-ch" type="number" class="' + inp + '" value="25"></div><div class="flex-1"><label class="' + lb + '">Every N</label><input id="fs-sb-req" type="number" class="' + inp + '" value="10"></div><div class="flex-1"><label class="' + lb + '">Mins</label><input id="fs-sb-mins" type="number" class="' + inp + '" value="60"></div></div>'
      + '<div class="' + hd + '">\uD83D\uDD4A LONG-TERM BUFFS (~99 HR)</div>'
      + '<label class="flex items-center gap-2 text-[9px] text-gray-300 uppercase"><input id="fs-lb-on" type="checkbox"> Grant long buffs</label>'
      + '<select id="fs-lb-type" class="' + inp + '">' + btOpts + '</select>'
      + '<div class="flex gap-1"><div class="flex-1"><label class="' + lb + '">Value</label><input id="fs-lb-val" type="number" class="' + inp + '" placeholder="1500"></div><div class="flex-1"><label class="' + lb + '">How many</label><input id="fs-lb-count" type="number" class="' + inp + '" value="1"></div></div>'
      + '<div class="flex gap-1"><div class="flex-1"><label class="' + lb + '">Crit %</label><input id="fs-lb-ch" type="number" class="' + inp + '" value="25"></div><div class="flex-1"><label class="' + lb + '">Every N</label><input id="fs-lb-req" type="number" class="' + inp + '" value="10"></div></div>'
      + '<button id="fs-save" class="w-full bg-amber-950 border border-amber-600 text-amber-300 font-bold text-[11px] py-2 uppercase tracking-wider mt-1">SAVE FOOD (LIVE)</button>'
      + '<button id="fs-delete" class="w-full bg-red-950 border border-red-800 text-red-400 font-bold text-[9px] py-1 uppercase tracking-wider">REMOVE STUDIO CONFIG</button>'
      + '<div id="fs-status" class="text-[8px] text-emerald-400 uppercase break-words"></div>';
    // DISCOVERABILITY: pin Food Studio to the TOP of the admin menu so it is the first
    // panel an admin sees (the menu is a long, narrow, scrollable column - appending it in
    // the middle made it hard to find). Falls back to append if the menu is empty.
    if (menu.firstChild) menu.insertBefore(box, menu.firstChild); else menu.appendChild(box);

    document.getElementById('fs-mode').onchange = toggleMode;
    document.getElementById('fs-existing-search').oninput = refreshFoodList;
    document.getElementById('fs-existing').onchange = function () { var id = val('fs-existing'); if (STORE[id]) loadConfigIntoForm(id); else updatePreview(); };
    ['fs-art-base', 'fs-art-plate', 'fs-art-aura', 'fs-art-garnish', 'fs-art-glow', 'fs-art-bg', 'fs-art-size', 'fs-art-tag', 'fs-art-tagcol'].forEach(function (id) { var el = document.getElementById(id); if (el) { el.oninput = updatePreview; el.onchange = updatePreview; } });
    var st = document.getElementById('fs-art-steam'); if (st) st.onchange = updatePreview;
    document.getElementById('fs-save').onclick = doSave;
    document.getElementById('fs-delete').onclick = doDelete;
    refreshFoodList(); toggleMode(); updatePreview();
  }

  /* =====================================================================
     BOOT + self-heal
     ===================================================================== */
  function install() {
    var s = S(); if (!s || !s.shop) return false;
    installGenerate(); installConsume(); wireCloud();
    try { apply(); } catch (e) {}
    if (s.adminBoost && s.adminBoost.toggleMenu && !s.adminBoost.toggleMenu._foodStudio) {
      var ot = s.adminBoost.toggleMenu.bind(s.adminBoost);
      s.adminBoost.toggleMenu = function () { var r = ot.apply(this, arguments); setTimeout(injectUI, 60); return r; };
      s.adminBoost.toggleMenu._foodStudio = true;
    }
    if (!s.foodStudio) {
      s.foodStudio = {
        composeArt: composeArt, bases: function () { return Object.keys(BASES); }, splitInfo: splitInfo,
        store: function () { return STORE; }, save: saveConfig, remove: removeConfig, onEat: onEat,
        grantBuffs: grantBuffs, buildFacts: buildFacts, apply: apply
      };
    }
    return true;
  }
  function boot() {
    loadLocal();
    var s = S();
    if (!s || !s.shop || !s.food || !s.state) return setTimeout(boot, 400);
    install();
    // self-heal against later modules (bounded, no interval stacking of consume wrappers)
    [800, 2000, 4000, 8000].forEach(function (t) { setTimeout(function () { try { install(); injectUI(); } catch (e) {} }, t); });
    try { console.log('[FOOD STUDIO] ready -', Object.keys(BASES).length, 'base arts'); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
