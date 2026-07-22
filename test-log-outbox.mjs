/* Regression test for the durable Command-Log outbox (fixes X-SPAM runs / events silently
 * missing from Command Logs). Part 1 replicates the flush/drain logic and verifies delivery,
 * retry-on-failure, and de-dupe-by-text+time. Part 2 asserts the real index.html wiring. */
import fs from 'fs';
import assert from 'assert';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let pass = 0; const ok = (n) => { console.log('  PASS', n); pass++; };

// ---- Part 1: outbox drain semantics ----
function makeStore() {
  let s = '[]';
  return {
    read: () => { try { return JSON.parse(s) || []; } catch(e){ return []; } },
    write: (a) => { s = JSON.stringify(a.slice(-800)); }
  };
}
// mirrors flushLogOutbox: send each, remove on success, STOP on first failure (keep rest queued)
async function flush(store, addDoc) {
  const box = store.read();
  for (let i = 0; i < box.length; i++) {
    const e = box[i];
    try { await addDoc({ text: e.text, time: e.time, cid: e.cid }); }
    catch (err) { break; }
    let cur = store.read().filter(x => x.cid !== e.cid);
    store.write(cur);
  }
}
function enqueue(store, text, time) {
  const cid = time.toString(36) + '_' + Math.random().toString(36).slice(2,9);
  const box = store.read(); box.push({ text, time, cid }); store.write(box);
}

// A: offline enqueue survives (nothing sent), then a working cloud drains it fully
(async () => {
  const store = makeStore();
  enqueue(store, '[X-SPAM PROTOCOL] CRYSTAL secured 5,000 - 42 spams.', 1000);
  enqueue(store, '[X-SPAM PROTOCOL] CRYSTAL secured 9,000 - 80 spams.', 2000);
  // cloud DOWN
  const down = async () => { throw new Error('offline'); };
  await flush(store, down);
  assert.strictEqual(store.read().length, 2, 'A: both entries retained while offline');
  ok('A offline logs are retained in the outbox (never lost)');
  // cloud UP
  const sent = [];
  await flush(store, async (d) => { sent.push(d); });
  assert.strictEqual(store.read().length, 0, 'A: outbox drained when cloud returns');
  assert.strictEqual(sent.length, 2, 'A: both delivered');
  ok('A queued logs deliver once the cloud is reachable again');

  // B: partial failure - first succeeds, second fails -> second stays queued, retried later
  const store2 = makeStore();
  enqueue(store2, '[X-SPAM PROTOCOL] A 1', 10);
  enqueue(store2, '[X-SPAM PROTOCOL] B 2', 20);
  let n = 0; const flaky = async () => { n++; if (n === 2) throw new Error('blip'); };
  await flush(store2, flaky);
  assert.strictEqual(store2.read().length, 1, 'B: the failed one stays queued');
  assert.strictEqual(store2.read()[0].text, '[X-SPAM PROTOCOL] B 2', 'B: correct entry retained');
  ok('B a mid-batch failure keeps the undelivered entry queued for retry');
  const sent2 = [];
  await flush(store2, async (d) => { sent2.push(d); });
  assert.strictEqual(store2.read().length, 0, 'B: retry drains it');
  ok('B the retry then delivers the remaining entry');

  // C: retry duplicate has SAME text+time -> reader de-dupe (text|time) collapses it
  const a = { text: '[X-SPAM PROTOCOL] X', time: 55 };
  const dupSent = [a, { ...a }];
  const unique = Array.from(new Map(dupSent.map(it => [it.text + '|' + it.time, it])).values());
  assert.strictEqual(unique.length, 1, 'C: duplicate collapsed by text|time');
  ok('C retried duplicates (same text+time) are collapsed by the reader de-dupe');

  // ---- Part 2: real code wiring ----
  assert.ok(/_readLogOutbox:/.test(html) && /_writeLogOutbox:/.test(html) && /flushLogOutbox:/.test(html), 'outbox helpers present');
  ok('index.html: outbox helpers (_readLogOutbox/_writeLogOutbox/flushLogOutbox) exist');
  assert.ok(/bca_log_outbox/.test(html), 'outbox localStorage key present');
  ok('index.html: uses the bca_log_outbox localStorage queue');
  assert.ok(/_box\.push\(\{ text: logStr, time: Date\.now\(\), cat: _cat, player: _player, cid: _cid \}\)/.test(html), 'logEvent enqueues to outbox');
  ok('index.html: logEvent queues every kept log to the outbox before the cloud write');
  assert.ok(/await BCA_SYS\.utils\.flushLogOutbox\(\)/.test(html), 'logEvent flushes');
  ok('index.html: logEvent flushes the outbox after enqueue');
  assert.ok(/addEventListener\('online', _flushLogs\)/.test(html) && /setInterval\(_flushLogs/.test(html), 'flush triggers present');
  ok('index.html: outbox is retried on online/focus/visibility + a timer');
  // the old silent fire-and-forget single write must be gone
  assert.ok(!/try \{ await addDoc\(collection\(db, "bca_global_logs"\), \{ text: logStr, time: Date\.now\(\), cat: _cat, player: _player \}\); \}\s*\n\s*catch\(e\) \{\}/.test(html), 'old fire-and-forget write removed');
  ok('index.html: old fire-and-forget (no-retry) cloud write removed');

  console.log('\nAll ' + pass + ' checks passed.');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
