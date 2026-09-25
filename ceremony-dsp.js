/* TAP ceremony DSP — extracted from tap-ceremony.html (proven band 18–19.75 kHz).
 * Exposes window.TapDSP: { runInitiator(onStatus), runJoiner(onStatus), micCheck(onMeter,onStatus) }
 * Each returns { challenge, response, verify } — the 8-hex verify code both phones must match.
 */
(function (global) {
  'use strict';
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const FREQS = [18000, 18250, 18500, 18750, 19000, 19250, 19500, 19750]; // 3 bits/tone
  const SYM = 0.25;
  const PRE = [0, 7, 0, 7, 0, 7, 0, 7];
  const POST = [0, 7, 0, 7];
  const HEXN = 12; // 48-bit challenge/response

  function randHex(n) {
    const b = crypto.getRandomValues(new Uint8Array(Math.ceil(n / 2)));
    return [...b].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, n);
  }
  function hexToBits(h) { return [...h].map(c => parseInt(c, 16).toString(2).padStart(4, '0')).join(''); }
  function bitsToHex(b) { let s = ''; for (let i = 0; i < b.length; i += 4) s += parseInt(b.substr(i, 4), 2).toString(16); return s; }
  function crc8(bytes) { let c = 0; for (const b of bytes) { c ^= b; for (let i = 0; i < 8; i++) c = (c & 0x80) ? ((c << 1) ^ 0x07) & 0xFF : (c << 1) & 0xFF; } return c; }
  function hexToBytes(h) { const o = []; for (let i = 0; i < h.length; i += 2) o.push(parseInt(h.substr(i, 2), 16)); return o; }
  async function sha256hex(s) {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  function frameTones(hex12) {
    const crc = crc8(hexToBytes(hex12));
    const bits = hexToBits(hex12) + crc.toString(2).padStart(8, '0') + '0';
    const tones = [];
    for (const p of PRE) tones.push(FREQS[p]);
    for (let i = 0; i < bits.length; i += 3) tones.push(FREQS[parseInt(bits.substr(i, 3), 2)]);
    for (const p of POST) tones.push(FREQS[p]);
    return tones;
  }

  let actx = null;
  async function ensureCtx() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') await actx.resume();
    return actx;
  }
  async function playTones(tones, onTick) {
    const ctx = await ensureCtx();
    const beep = ctx.createOscillator(), bg = ctx.createGain();
    beep.type = 'sine'; beep.frequency.value = 880; bg.gain.value = 0.2;
    beep.connect(bg); bg.connect(ctx.destination);
    const bt = ctx.currentTime + 0.05; beep.start(bt); beep.stop(bt + 0.15);
    const t0 = ctx.currentTime + 0.35;
    tones.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f; g.gain.value = 0.5;
      o.connect(g); g.connect(ctx.destination);
      o.start(t0 + i * SYM); o.stop(t0 + (i + 1) * SYM);
    });
    for (let i = 0; i < tones.length; i++) { if (onTick) onTick(i + 1, tones.length); await sleep(SYM * 1000); }
    await sleep(300);
  }

  const WORKLET = `
class Cap extends AudioWorkletProcessor{
  constructor(){ super(); this.buf=[]; }
  process(inputs){
    const ch=inputs[0];
    if(ch&&ch[0]){ this.buf.push(...ch[0]);
      while(this.buf.length>=12000){ this.port.postMessage(this.buf.slice(0,12000)); this.buf=this.buf.slice(12000); } }
    return true;
  }
}
registerProcessor('tap-cap',Cap);`;
  let micStream = null, capNode = null, chunks = [];
  async function ensureMic() {
    await ensureCtx();
    if (micStream) return;
    micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const blob = new Blob([WORKLET], { type: 'application/javascript' });
    await actx.audioWorklet.addModule(URL.createObjectURL(blob));
    capNode = new AudioWorkletNode(actx, 'tap-cap');
    const src = actx.createMediaStreamSource(micStream);
    src.connect(capNode);
    chunks = [];
    capNode.port.onmessage = e => { chunks.push(e.data); if (chunks.length > 400) chunks.shift(); };
  }
  function goertzelMag(samples, freq, sr) {
    const N = samples.length, w = 2 * Math.PI * freq / sr, c = 2 * Math.cos(w);
    let s0 = 0, s1 = 0, s2 = 0;
    for (let i = 0; i < N; i++) { s0 = samples[i] + c * s1 - s2; s2 = s1; s1 = s0; }
    return Math.sqrt(s1 * s1 + s2 * s2 - c * s1 * s2);
  }
  function slotTone() {
    if (!chunks.length) return -1;
    const s = chunks[chunks.length - 1], sr = actx.sampleRate;
    const mags = FREQS.map(f => goertzelMag(s, f, sr));
    const med = [...mags].sort((a, b) => a - b)[4];
    let bi = 0; for (let i = 1; i < 8; i++) if (mags[i] > mags[bi]) bi = i;
    return (mags[bi] > 3 * med && mags[bi] > 1e-6) ? bi : -1;
  }
  async function listenForFrame(timeoutMs) {
    const t0 = Date.now();
    const slots = [];
    let lastSlot = 0;
    while (Date.now() - t0 < timeoutMs) {
      const now = Date.now();
      if (now - lastSlot >= 100) { lastSlot = now; slots.push(slotTone()); if (slots.length > 700) slots.shift(); }
      const runs = [];
      for (const s of slots) { const l = runs[runs.length - 1]; if (l && l.v === s) l.n++; else runs.push({ v: s, n: 1 }); }
      for (let i = 0; i + 8 <= runs.length; i++) {
        let ok = true;
        for (let k = 0; k < 8; k++) { if (runs[i + k].v !== PRE[k] || runs[i + k].n < 1 || runs[i + k].n > 5) { ok = false; break; } }
        if (!ok) continue;
        let endSlot = 0; for (let k = 0; k <= i + 7; k++) endSlot += runs[k].n;
        const startSlot = endSlot;
        let bits = '';
        for (let d = 0; d < 19; d++) {
          const w0 = Math.round(startSlot + d * 2.5), w1 = Math.round(startSlot + (d + 1) * 2.5);
          const votes = {};
          for (let s = w0; s < w1 && s < slots.length; s++) { const v = slots[s]; if (v >= 0) votes[v] = (votes[v] || 0) + 1; }
          let best = -1, bn = 0; for (const k in votes) if (votes[k] > bn) { bn = votes[k]; best = +k; }
          if (best < 0) return { ok: false, why: 'symbol ' + d + ' unreadable — move phones closer, volume MAX, retry' };
          bits += best.toString(2).padStart(3, '0');
        }
        const body = bits.slice(0, 56);
        const dataHex = bitsToHex(body.slice(0, 48)), crcRx = parseInt(bitsToHex(body.slice(48, 56)), 16);
        if (crc8(hexToBytes(dataHex)) !== crcRx)
          return { ok: false, why: 'CRC mismatch — frame garbled in the air. Move phones closer, volume MAX, retry.' };
        return { ok: true, hex: dataHex };
      }
      await sleep(50);
    }
    return { ok: false, why: 'timeout — no preamble heard' };
  }

  async function runInitiator(onStatus) {
    const C = randHex(HEXN);
    onStatus('Playing challenge… hold phones close, speakers facing.');
    await playTones(frameTones(C), (i, n) => { if (i % 7 === 0) onStatus('Playing challenge… tone ' + i + '/' + n); });
    onStatus('Challenge sent. Listening for response…');
    await ensureMic();
    const r = await listenForFrame(40000);
    if (!r.ok) throw new Error('Response not decoded: ' + r.why);
    return await finish(C, r.hex);
  }
  async function runJoiner(onStatus) {
    onStatus('Listening for challenge… (initiator: press START now)');
    await ensureMic();
    const c = await listenForFrame(60000);
    if (!c.ok) throw new Error('Challenge not decoded: ' + c.why);
    const R = randHex(HEXN);
    onStatus('Challenge heard. Playing response…');
    await playTones(frameTones(R), (i, n) => { if (i % 7 === 0) onStatus('Playing response… tone ' + i + '/' + n); });
    return await finish(c.hex, R);
  }
  async function finish(C, R) {
    const verify = (await sha256hex(C + R)).slice(0, 8).toUpperCase();
    return { challenge: C, response: R, verify, band: '18-19.75kHz' };
  }
  async function micCheck(onMeter, secs) {
    await ensureMic();
    const t0 = Date.now(), dur = (secs || 4) * 1000;
    while (Date.now() - t0 < dur) {
      if (chunks.length) {
        const s = chunks[chunks.length - 1], sr = actx.sampleRate;
        onMeter(FREQS.map(f => goertzelMag(s, f, sr)));
      }
      await sleep(200);
    }
  }

  global.TapDSP = { runInitiator, runJoiner, micCheck, FREQS };
})(window);
