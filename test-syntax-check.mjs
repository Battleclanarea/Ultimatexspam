// Extracts every classic (non-module, non-src) inline <script> from index.html and
// compiles it with vm.Script to catch syntax errors introduced by edits.
import fs from 'fs';
import vm from 'vm';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let m, idx = 0, fails = 0, checked = 0;
while ((m = re.exec(html))) {
  const attrs = m[1] || '';
  const body = m[2] || '';
  idx++;
  if (/\bsrc\s*=/.test(attrs)) continue;             // external
  if (/type\s*=\s*["']?module/.test(attrs)) continue; // ES module (may use import)
  if (!body.trim()) continue;
  checked++;
  try { new vm.Script(body, { filename: 'script#' + idx }); }
  catch (e) {
    fails++;
    // find approximate line within the file
    const before = html.slice(0, m.index).split('\n').length;
    console.log('SYNTAX ERROR in inline <script> starting near file line ' + before + ': ' + e.message);
  }
}
console.log('\nChecked ' + checked + ' classic inline scripts; ' + fails + ' with syntax errors.');
process.exit(fails ? 1 : 0);
