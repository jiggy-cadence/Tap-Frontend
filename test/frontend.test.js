// Offline tests for the guards and the frame decoder. Run: node --test test/*.test.js
// The pages are loaded into node:vm with a stub DOM; no browser, no network, no audio.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function load(...files) {
  const ctx = { URL, URLSearchParams, crypto: globalThis.crypto, TextEncoder, setTimeout, console };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(read(f), ctx, { filename: f });
  return ctx;
}

// ---- ?api= -----------------------------------------------------------------

test('?api= cannot point the page (and its initData) at another host', () => {
  const { TapSafe } = load('safe.js');
  for (const q of ['?api=https://evil.example', '?api=//evil.example', '?api=https://localhost.evil.example',
    '?api=https://evil.example/?x=localhost', '?api=javascript:alert(1)', '?api=https://user@evil.example', '?api=', ''])
    assert.equal(TapSafe.apiBase(q), '', q);
});

test('?api= still works for a local dev server', () => {
  const { TapSafe } = load('safe.js');
  assert.equal(TapSafe.apiBase('?api=http://localhost:8787'), 'http://localhost:8787');
  assert.equal(TapSafe.apiBase('?api=http://127.0.0.1:8787/some/path'), 'http://127.0.0.1:8787');
});

test('both pages take the API base from TapSafe, not straight from the query', () => {
  for (const f of ['index.html', 'ceremony.html']) {
    const html = read(f);
    assert.ok(!/qs\.get\('api'\)/.test(html), f);
    assert.ok(/const API = TapSafe\.apiBase\(location\.search\)/.test(html), f);
    assert.ok(html.indexOf('src="safe.js"') < html.indexOf('const API ='), f);
  }
});

// ---- escaping --------------------------------------------------------------

test('esc and isToken', () => {
  const { TapSafe } = load('safe.js');
  assert.equal(TapSafe.esc(`<img src=x onerror="a('b')">&`), '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;');
  assert.equal(TapSafe.esc(null), '');
  assert.equal(TapSafe.esc(42), '42');
  assert.ok(TapSafe.isToken('abc_DEF-123'));
  for (const bad of ["x');alert(1);//", 'a b', '', null, 'a&role=x']) assert.ok(!TapSafe.isToken(bad));
});

// Runs index.html's inline script against a stub DOM and a fake backend.
async function runIndex({ responses, startParam = '', search = '' }) {
  const els = {};
  const mk = id => (els[id] ||= {
    id, innerHTML: '', textContent: '', style: {}, className: '', children: [],
    classList: { add() {}, remove() {} }, appendChild(c) { this.children.push(c); },
    querySelector: sel => mk(sel.replace('#', '')),
  });
  const sent = [];
  let backHandlers = 0;
  const ctx = {
    URL, URLSearchParams, console, setTimeout, Date, JSON,
    location: { search, protocol: 'https:', href: '' },
    document: { getElementById: mk, createElement: () => mk('el' + Object.keys(els).length) },
    Telegram: { WebApp: { ready() {}, expand() {}, initData: 'SIGNED', initDataUnsafe: { start_param: startParam },
      BackButton: { show() {}, onClick() { backHandlers++; } }, HapticFeedback: { notificationOccurred() {} } } },
    KnotArt: { render() {}, renderAnimated: () => ({ stop() {} }) },
    navigator: { clipboard: { writeText: async () => {} } },
    confirm: () => true,
    fetch: async (url, opts) => { sent.push({ url, body: JSON.parse(opts.body) }); const p = url.replace(/^.*\/api\//, '/api/'); return { json: async () => responses[p] }; },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('safe.js'), ctx);
  const html = read('index.html');
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  vm.runInContext(inline, ctx);
  await new Promise(r => setTimeout(r, 30));
  return { els, sent, ctx, backHandlers: () => backHandlers };
}

const EVIL = `<img src=x onerror="alert(1)">`;

test('index: a hostile ?api= does not receive initData', async () => {
  const { sent } = await runIndex({ search: '?api=https://evil.example', responses: { '/api/knots': { ok: true, knots: [] } } });
  assert.ok(sent.length >= 1);
  for (const s of sent) { assert.ok(s.url.startsWith('/api/'), s.url); assert.equal(s.body.initData, 'SIGNED'); }
});

test('index: backend strings are escaped in the paired banner, the grid and the detail view', async () => {
  const knot = { id: EVIL, signature: EVIL, revoked: 0, knot: { code: EVIL, userA: 1, userB: 2, timestamp: EVIL, band: EVIL } };
  const { els, ctx } = await runIndex({
    startParam: 'abcdefghijkl',
    responses: { '/api/knots': { ok: true, knots: [knot] }, '/api/meeting/redeem': { ok: true, creator: EVIL } },
  });
  assert.match(els.tokenHint.innerHTML, /paired with user &lt;img/);
  vm.runInContext('detail(knots[0])', ctx);
  const all = Object.values(els).map(e => e.innerHTML).join('\n');
  assert.ok(all.includes('&lt;img'));
  assert.ok(!all.includes('<img'), 'raw markup reached innerHTML');
  assert.ok(!/onclick=/.test(els.tokenHint.innerHTML), 'no handler built from strings');
});

test('index: a malformed token from the backend is refused, not put in a link', async () => {
  const { els } = await runIndex({ responses: { '/api/knots': { ok: true, knots: [] }, '/api/meeting/create': { ok: true, token: "x');alert(1);//" } } });
  await els.tieBtn.onclick();
  assert.match(els.status.textContent, /malformed token/);
  assert.ok(!els.tokenHint || els.tokenHint.innerHTML === '');
});

test('index: a good token yields a link and code-attached handlers', async () => {
  const { els, ctx } = await runIndex({ responses: { '/api/knots': { ok: true, knots: [] }, '/api/meeting/create': { ok: true, token: 'tok_123-ABC' } } });
  await els.tieBtn.onclick();
  assert.match(els.tokenHint.innerHTML, /startapp=tok_123-ABC/);
  assert.ok(!/onclick=/.test(els.tokenHint.innerHTML));
  els.bInit.onclick();
  assert.equal(ctx.location.href, './ceremony.html?token=tok_123-ABC&role=initiate');
});

test('index: the Telegram back button gets one handler however many knots are opened', async () => {
  const knot = { id: 'a1b2c3d4e5f6', signature: 's', revoked: 0, knot: { code: '1234', timestamp: '2026-01-01' } };
  const { ctx, backHandlers } = await runIndex({ responses: { '/api/knots': { ok: true, knots: [knot] } } });
  for (let i = 0; i < 5; i++) vm.runInContext('detail(knots[0])', ctx);
  assert.equal(backHandlers(), 1);
});

// ---- decoder ---------------------------------------------------------------

const dsp = () => load('ceremony-dsp.js').TapDSP;
// What the listener would record for a sequence of tones: 2.5 slots per symbol.
function slotsFor(symbols, offset = 0) {
  const out = [];
  const total = Math.round(symbols.length * 2.5);
  for (let s = 0; s < total; s++) out.push(symbols[Math.min(symbols.length - 1, Math.floor((s + offset) / 2.5))]);
  return out;
}
const silence = n => Array(n).fill(-1);
const HEX = '0123456789ab';

test('decoder: a clean frame decodes', () => {
  const D = dsp();
  const r = D._decodeSlots([...silence(7), ...slotsFor(D._frameSymbols(HEX)), ...silence(3)]);
  assert.deepEqual({ ok: r.ok, hex: r.hex }, { ok: true, hex: HEX });
});

test('decoder: a preamble whose data has not arrived yet is pending, not a failure', () => {
  const D = dsp();
  const full = [...silence(4), ...slotsFor(D._frameSymbols(HEX))];
  const justPreamble = full.slice(0, 4 + 19);  // 8 preamble symbols only
  const r = D._decodeSlots(justPreamble);
  assert.equal(r.ok, false);
  assert.equal(r.pending, true);
  assert.equal(r.why, null);
  const half = D._decodeSlots(full.slice(0, 4 + 20 + 25));
  assert.equal(half.pending, true);
});

test('decoder: a garbled frame does not stop a later good frame from decoding', () => {
  const D = dsp();
  const good = slotsFor(D._frameSymbols(HEX));
  const garbled = good.slice();
  for (let s = 30; s < 36; s++) garbled[s] = (garbled[s] + 3) % 8;  // corrupt two data symbols
  const alone = D._decodeSlots([...silence(5), ...garbled, ...silence(5)]);
  assert.equal(alone.ok, false);
  assert.match(alone.why, /CRC mismatch/);
  const r = D._decodeSlots([...silence(5), ...garbled, ...silence(9), ...good, ...silence(2)]);
  assert.deepEqual({ ok: r.ok, hex: r.hex }, { ok: true, hex: HEX });
});

test('decoder: a frame with a silent symbol is skipped, and the next frame still decodes', () => {
  const D = dsp();
  const good = slotsFor(D._frameSymbols(HEX));
  const holed = good.slice();
  for (let s = 40; s < 46; s++) holed[s] = -1;
  const alone = D._decodeSlots([...holed, ...silence(4)]);
  assert.equal(alone.ok, false);
  assert.match(alone.why, /unreadable/);
  const r = D._decodeSlots([...holed, ...silence(6), ...good]);
  assert.equal(r.hex, HEX);
});

test('decoder: silence and noise give no frame and no reason', () => {
  const D = dsp();
  assert.deepEqual({ ...D._decodeSlots(silence(200)) }, { ok: false, pending: false, why: null });
});

test('worklet chunk is one symbol at the device sample rate, not a fixed 12000', () => {
  const src = dsp()._workletSource;
  assert.ok(!/12000/.test(src));
  for (const sampleRate of [48000, 44100]) {
    const posted = [];
    let Proc;
    const scope = { sampleRate, AudioWorkletProcessor: class { constructor() { this.port = { postMessage: m => posted.push(m.length) }; } },
      registerProcessor: (_, c) => { Proc = c; }, Math };
    vm.runInNewContext(src, scope);
    const p = new Proc();
    for (let i = 0; i < sampleRate / 128 + 2; i++) p.process([[new Float32Array(128)]]);
    assert.ok(posted.length >= 3);
    assert.ok(posted.every(n => n === sampleRate / 4), String(posted[0]));
  }
});

// ---- copy ------------------------------------------------------------------

test('claims the repo cannot back are gone', () => {
  assert.ok(!/No two knots share the same art/.test(read('ceremony.html')));
  assert.ok(!/proven band/.test(read('ceremony-dsp.js')));
  assert.ok(fs.existsSync(path.join(ROOT, 'README.md')));
});
