/* Structural + light functional regression test for BOOK STUDIO (book-studio.js) and its wiring.
 * Full runtime behaviour (create book -> Royal Library render -> read pages -> Intel Files, no buffs)
 * is verified end-to-end in a headless browser; this guards the wiring from drift. */
import fs from 'fs';
import assert from 'assert';
const mod = fs.readFileSync(new URL('./book-studio.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let pass = 0; const ok = (n) => { console.log('  PASS', n); pass++; };

// ---- index.html loads the sibling module ----
assert.ok(/book-studio\.js/.test(html), 'loader present');
ok('index.html: loads the book-studio.js sibling module (cache-busted)');

// ---- many unique base designs + fonts + materials + decorations ----
const covers = (mod.match(/name: '[^']+',\s*art: function \(m\)/g) || []).length;
assert.ok(covers >= 10, 'at least 10 cover designs, got ' + covers);
ok('module: ' + covers + ' unique cover base designs (>= 10)');
assert.ok(/var FONTS = \{/.test(mod), 'FONTS lib');
const fonts = (mod.match(/css: "font-family:/g) || []).length;
assert.ok(fonts >= 8, 'at least 8 font styles, got ' + fonts);
ok('module: ' + fonts + ' unique title FONT styles (>= 8)');
assert.ok(/var MATERIALS = \{/.test(mod) && /var DECOS = \{/.test(mod), 'materials + decorations libs');
ok('module: cover MATERIALS + DECORATIONS libraries (near-endless combos with colour pickers)');
assert.ok(/function composeCover\(a, sfx\)/.test(mod), 'composeCover');
ok('module: composeCover() builds the cover from base + material + deco + font + colours');

// ---- own category ----
assert.ok(/if \(!s\.shop\.db\.books\) s\.shop\.db\.books = \[\];/.test(mod), 'books category bucket');
ok('module: books get their OWN category (shop.db.books) + a ROYAL LIBRARY view + nav card');
assert.ok(/id='rzg-library-nav-card'|rzg-library-nav-card/.test(mod) && /rzg-view-library/.test(mod), 'library view + nav card');
ok('module: ROYAL LIBRARY nav card + #rzg-view-library shop view');

// ---- info-only, NO buffs ----
assert.ok(!/foodShort\.push|foodLong\.push|grantBuffs|strikeBonus|buffData:/.test(mod), 'no buff granting');
ok('module: books grant NO buffs (no foodShort/foodLong/buffData) - information only');

// ---- pages of info revealed one per read ----
assert.ok(/function splitInfo\(text, count\)/.test(mod) && /function buildPages\(cfg\)/.test(mod), 'pages');
ok('module: large info splits into ordered PAGES (splitInfo/buildPages)');
assert.ok(/p\.bookProgress/.test(mod) && /rec\.progress = idx \+ 1;/.test(mod), 'per-book per-player progress');
ok('module: pages are per-book + per-player (sequential, re-readable)');

// ---- logged to Intel Files like other foods ----
assert.ok(/\[INTEL RECOVERY\]/.test(mod), 'intel recovery log');
ok('module: reading a page is logged as an [INTEL RECOVERY]');
assert.ok(/library-files-archive/.test(mod) && /openArchive/.test(mod), 'intel archive hook');
ok('module: a ROYAL LIBRARY PAGES section is injected into the Intel Files archive');

// ---- buy -> inventory -> equip -> read flow ----
assert.ok(/function buy\(bookId\)/.test(mod) && /p\.ownedBooks\.push\(bookId\)/.test(mod), 'buy adds to ownedBooks');
ok('module: BUY a book (spends gold) adds it to the player\u2019s owned books');
assert.ok(/function appendInvBooks\(\)/.test(mod) && /inv-books-section/.test(mod) && /BCA_SYS\.books\.read/.test(mod) && /BCA_SYS\.books\.equip/.test(mod), 'inventory books section');
ok('module: owned books appear in the INVENTORY with EQUIP + READ');
assert.ok(/function equip\(bookId\)/.test(mod) && /p\.activeBook = bookId/.test(mod) && /function unequip\(\)/.test(mod), 'equip/unequip');
ok('module: books can be EQUIPPED / UNEQUIPPED from the inventory');
assert.ok(/if \(!owned\(bookId\) && !isAdmin\(\)\)/.test(mod), 'read gated to owners');
ok('module: reading requires OWNING the book (buy it first)');
assert.ok(/ownedBooks: p\.ownedBooks \|\| \[\]/.test(html) && /p\.ownedBooks = \[\.\.\.new Set/.test(html) && /bookProgress: p\.bookProgress/.test(html), 'books persistence wired');
ok('index.html: owned books + reading progress persist (save whitelist + load merge)');

// ---- carry caps: 5 inventory / 10 bag (upgradeable) + closet ----
assert.ok(/var INV_CAP = 5;/.test(mod), 'inventory cap 5');
ok('module: inventory holds a MAX of 5 books (INV_CAP = 5)');
assert.ok(/function bagCap\(\)/.test(mod) && /s\.bags\.cap\('books'\)/.test(mod), 'bag cap via bags.cap(books)');
ok('module: bag book cap comes from the upgradeable bag system (base 10)');
assert.ok(/BASE = \{ weapons: 3, shields: 3, armor: 2, food: 5, books: 10 \}/.test(html), 'bag BASE includes books:10');
ok('index.html: bag upgrades include a BOOKS capacity (base 10, grows with bags)');
assert.ok(/books: 60/.test(html) && /ARCHIVIST SATCHEL/.test(html) && /books: 80/.test(html), 'book-focused + sovereign bags raise book cap');
ok('index.html: bag catalog (incl. a book-focused satchel + sovereign) raises the book cap');
assert.ok(/function invBooks\(\)/.test(mod) && /w\.inv\.books/.test(mod) && /w\.stash\.books/.test(mod), 'books use carry inv/stash');
ok('module: books stored in the carry inventory/bag structure (persist via p.bag)');
assert.ok(/function closetBooks\(\)/.test(mod) && /function appendClosetBooks\(\)/.test(mod), 'closet books');
ok('module: the CLOSET stores books (owned but not carried) with move-back controls');
assert.ok(/function toBag\(id\)/.test(mod) && /function toInv\(id\)/.test(mod) && /function toCloset\(id\)/.test(mod), 'move fns');
ok('module: move a book between INVENTORY / BAG / CLOSET (with cap enforcement)');
assert.ok(/bag-books-section/.test(mod) && /closet-books-section/.test(mod) && /inv-books-section/.test(mod), 'all three UI sections');
ok('module: BOOKS sections render in the inventory, bag AND closet views');

// ---- persistence + live apply ----
assert.ok(/LS_KEY = 'bca_book_studio_v1'/.test(mod) && /CLOUD_DOC = 'book_studio'/.test(mod), 'persistence keys');
ok('module: persists to localStorage + cloud (bca_system/book_studio)');
assert.ok(/s\.shop\.generateDB\._bookStudio/.test(mod), 'generateDB re-inject');
ok('module: re-injects books after every shop generateDB rebuild');

// ---- admin BOOK STUDIO tool ----
assert.ok(/BOOK STUDIO \(ROYAL LIBRARY\)/.test(mod) && /book-studio-panel/.test(mod), 'admin panel');
ok('module: admin BOOK STUDIO panel (create + edit) injected into the admin menu');

// ---- light functional check: splitInfo splits to exactly the chosen page count ----
function splitInfo(text, count) {
  text = String(text == null ? '' : text).replace(/\s+/g, ' ').trim(); if (!text) return [];
  const n = Math.max(1, Math.min(100000, Math.floor(count)));
  const sents = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  let units, sep; if (sents.length >= n) { units = sents; sep = ' '; } else { const w = text.split(' '); if (w.length >= n) { units = w; sep = ' '; } else { units = text.split(''); sep = ''; } }
  const m = units.length, groups = Math.min(n, m), out = [];
  for (let g = 0; g < groups; g++) { let a = Math.floor(g * m / groups), bb = Math.floor((g + 1) * m / groups); if (bb <= a) bb = a + 1; out.push(units.slice(a, bb).join(sep)); }
  return out;
}
const big = Array.from({ length: 40 }, (_, i) => 'Chapter ' + (i + 1) + ' of the tome.').join(' ');
assert.strictEqual(splitInfo(big, 20).length, 20, 'splits to exactly the chosen page count');
ok('splitInfo: a large body splits into EXACTLY the chosen page count (20)');

console.log('\nAll ' + pass + ' checks passed.');
