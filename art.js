/* VOID.LIFE v4 — deterministic generative knot art.
 * Six MATH CORES (seed picks one): warped FLOW fields · STRANGE ATTRACTORS
 * (Clifford / de Jong / Hopalong) · HARMONOGRAPHS · CHLADNI nodal figures ·
 * MAGNETIC dipole fields (iron-filing LIC + traced streamlines — the lodestone
 * core) · REACTION-DIFFUSION (Gray-Scott chemistry: mitosis / coral / maze /
 * worms — genuinely alive, it keeps growing).
 * No letters, no numbers — only math symbology (∫∑φπ∞√∂). Same knot → same art.
 * Usage: KnotArt.render(canvas, seedString, opts) · KnotArt.renderAnimated(...) → {stop}
 */
(function (global) {
  'use strict';

  // ---- deterministic PRNG ----
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hexRGB(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

  const TAU = Math.PI * 2;
  const PALETTES = [
    { name: 'Neon Rain', bg: '#050508', inks: ['#00f0ff', '#ff00e5', '#a6ff00', '#7df9ff'] },
    { name: 'Acid', bg: '#060604', inks: ['#a6ff00', '#ffcf00', '#00f0ff', '#e8ff47'] },
    { name: 'Ghost', bg: '#040405', inks: ['#ffffff', '#00f0ff', '#9be8ff', '#e0e0e0'] },
    { name: 'Ember', bg: '#080304', inks: ['#ff00e5', '#ff5a00', '#ffcf00', '#ff2e88'] },
    { name: 'Volt', bg: '#030608', inks: ['#00f0ff', '#a6ff00', '#ffffff', '#00ffa6'] },
    { name: 'Ultraviolet', bg: '#060310', inks: ['#b26bff', '#ff00e5', '#00f0ff', '#f0e6ff'] },
    { name: 'Copper', bg: '#0a0503', inks: ['#ff7a1a', '#ffb347', '#ff3d00', '#ffe6c0'] },
  ];
  const SYMBOLS = ['∫', '∑', '∏', 'φ', 'π', 'λ', '∞', '√', '∂', '∆', 'Ω', 'ψ', '∇', '∮'];
  const DNA = 'a=(y,d=hypot(k=(4+cos(y))*sin(x/7)+1e-4,e=y/6-9)-3)=>pt((q=99+3*sin(k*3)-d*d*sin(t-d)+y/13*k*(e+sin(d*d-t*3)))*sin(c=d/3-t/4+x%2*9+k*k/59)+200,q*cos(c)+200)';

  // ---- accumulation buffer (additive light) ----
  function makeAccum(w, h) {
    const buf = new Float32Array(w * h * 3);
    return {
      plot(px, py, r, g, b, a) {
        px |= 0; py |= 0;
        if (px < 0 || py < 0 || px >= w || py >= h) return;
        const o = (py * w + px) * 3;
        buf[o] += r * a; buf[o + 1] += g * a; buf[o + 2] += b * a;
      },
      toCanvas(exp) {
        const img = new ImageData(w, h), d = img.data;
        for (let i = 0, j = 0; i < buf.length; i += 3, j += 4) {
          d[j] = 255 * (1 - Math.exp(-buf[i] * exp));
          d[j + 1] = 255 * (1 - Math.exp(-buf[i + 1] * exp));
          d[j + 2] = 255 * (1 - Math.exp(-buf[i + 2] * exp));
          d[j + 3] = 255;
        }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').putImageData(img, 0, 0);
        return c;
      }
    };
  }

  function buildParams(seedStr) {
    const rand = mulberry32(xmur3(String(seedStr))());
    const pal = PALETTES[(rand() * PALETTES.length) | 0];
    const pick = arr => arr[(rand() * arr.length) | 0];
    const coreRoll = rand();
    const core = coreRoll < 0.24 ? 'flow' : coreRoll < 0.42 ? 'attractor' : coreRoll < 0.58 ? 'harmonograph'
      : coreRoll < 0.72 ? 'chladni' : coreRoll < 0.88 ? 'magnetic' : 'reaction';
    const P = {
      rand, pal, pick, core,
      // flow core
      sA: 2 + rand() * 4, sB: 2 + rand() * 4, sC: 2 + rand() * 4,
      p1: rand() * TAU, p2: rand() * TAU, p3: rand() * TAU,
      warp: 1.5 + rand() * 3.5, turns: 0.8 + rand() * 2.4,
      warpAmt: 0.4 + rand() * 0.8, warpFreq: 1.5 + rand() * 2.5,
      lifeN: 12000 + ((rand() * 8000) | 0), lifeSteps: 24 + ((rand() * 16) | 0),
      // attractor core
      attrKind: rand() < 0.55 ? 'clifford' : rand() < 0.6 ? 'dejong' : 'hopalong',
      aa: -2 + rand() * 4, ab: -2 + rand() * 4, ac: -2 + rand() * 4, ad: -2 + rand() * 4,
      attrN: 90000 + ((rand() * 60000) | 0),
      // harmonograph core
      harmF: [1 + ((rand() * 5) | 0), 1 + ((rand() * 5) | 0), 1 + ((rand() * 5) | 0), 1 + ((rand() * 5) | 0)],
      harmA: [0.5 + rand() * 0.5, 0.5 + rand() * 0.5, 0.5 + rand() * 0.5, 0.5 + rand() * 0.5],
      harmD: [0.01 + rand() * 0.04, 0.01 + rand() * 0.04, 0.01 + rand() * 0.04, 0.01 + rand() * 0.04],
      harmP: [rand() * TAU, rand() * TAU, rand() * TAU, rand() * TAU],
      harmT: 30 + rand() * 25, harmN: 50000 + ((rand() * 30000) | 0),
      // chladni core
      chN: 1 + ((rand() * 7) | 0), chM: 1 + ((rand() * 7) | 0),
      chWarp: 0.2 + rand() * 0.35,
      // magnetic core — seeded dipole constellation (the lodestone core)
      magPoles: (() => {
        const n = 2 + ((rand() * 3) | 0), ps = [];
        for (let i = 0; i < n; i++) {
          let x = 0, y = 0, ok = false;
          for (let t = 0; t < 24 && !ok; t++) {
            x = rand() * 1.3 - 0.65; y = rand() * 1.3 - 0.65;
            ok = ps.every(p => Math.hypot(p.x - x, p.y - y) > 0.5);
          }
          ps.push({ x, y, ang: rand() * TAU, str: 0.7 + rand() * 0.9, prec: (rand() - 0.5) * 0.9, ph: rand() * TAU });
        }
        return ps;
      })(),
      // reaction core — Gray-Scott regime (seed picks the chemistry)
      reactRegime: pick([['mitosis', 0.035, 0.065], ['coral', 0.018, 0.051], ['maze', 0.029, 0.057],
                          ['drifters', 0.014, 0.054]]),
      reactN: 120, reactIters: 1800,
      // shared
      ribbons: core === 'flow' ? 2 + ((rand() * 3) | 0) : 0,
      bigSym: pick(SYMBOLS), symInk: pick(pal.inks),
      grainAmt: 14 + rand() * 14,
    };
    if (P.chN === P.chM) P.chM = (P.chM % 7) + 1;
    return P;
  }

  // ================= CORES =================

  // CORE 1 · domain-warped flow field — the alive one
  function coreFlow(ctx, W, H, P) {
    const w2 = W >> 1, h2 = H >> 1, A = makeAccum(w2, h2);
    const inks = P.pal.inks.map(hexRGB), rand = P.rand, asp = W / H;
    const field = (nx, ny) => {
      // domain warp: look up the field through a second field
      const wx = Math.sin(ny * P.warpFreq + P.p2) * P.warpAmt;
      const wy = Math.cos(nx * P.warpFreq + P.p3) * P.warpAmt;
      const x = nx + wx, y = ny + wy;
      const k = (2 + Math.cos(y * P.sB + P.p1)) * Math.sin(x * P.sC + P.p2);
      const w = Math.sin(k * k) * P.warp * 0.5;
      const flow = Math.sin(x * P.sA + P.p1) + Math.sin(y * 2.1 + P.p2)
                 + Math.sin((x + y) * 1.7 + P.p3) + Math.sin(Math.hypot(x, y) * 2.5 + P.p1) * 0.7;
      return (flow + w) * P.turns;
    };
    for (let i = 0; i < P.lifeN; i++) {
      let x = rand() * W, y = rand() * H;
      const col = inks[(rand() * inks.length) | 0], alpha = 0.05 + rand() * 0.08;
      const step = 2.2 + rand() * 1.2;
      for (let s = 0; s < P.lifeSteps; s++) {
        const a = field((x / W - 0.5) * 2 * asp, (y / H - 0.5) * 2);
        x += Math.cos(a) * step; y += Math.sin(a) * step;
        if (x < 0 || x >= W || y < 0 || y >= H) break;
        A.plot(x * 0.5, y * 0.5, col[0] / 255, col[1] / 255, col[2] / 255, alpha);
      }
    }
    blit(ctx, A.toCanvas(1.9), W, H);
  }

  // CORE 2 · strange attractor — the mathy one
  function coreAttractor(ctx, W, H, P) {
    const w2 = W >> 1, h2 = H >> 1, A = makeAccum(w2, h2);
    const inks = P.pal.inks.map(hexRGB), rand = P.rand;
    // color LUT through the palette
    const LUT = [];
    for (let i = 0; i < 256; i++) {
      const t = i / 255 * (inks.length - 1), j = Math.min(inks.length - 2, t | 0), f = t - j;
      LUT.push([0, 1, 2].map(c => (inks[j][c] + (inks[j + 1][c] - inks[j][c]) * f) / 255));
    }
    const stepFn = P.attrKind === 'clifford'
      ? (x, y) => [Math.sin(P.aa * y) + P.ac * Math.cos(P.aa * x), Math.sin(P.ab * x) + P.ad * Math.cos(P.ab * y)]
      : P.attrKind === 'dejong'
      ? (x, y) => [Math.sin(P.aa * y) - Math.cos(P.ab * x), Math.sin(P.ac * x) - Math.cos(P.ad * y)]
      : (x, y) => [y - Math.sign(x) * Math.sqrt(Math.abs(P.ab * x - P.ac)), P.aa - x];
    // bounded retry: some param sets escape — deterministic reseed via rand
    let pts = null;
    for (let attempt = 0; attempt < 10 && !pts; attempt++) {
      let x = rand() * 2 - 1, y = rand() * 2 - 1;
      if (attempt > 0) { P.aa = -2 + rand() * 4; P.ab = -2 + rand() * 4; P.ac = -2 + rand() * 4; P.ad = -2 + rand() * 4; }
      const raw = [];
      let ok = true;
      const WARM = 6000, N = 4000;
      for (let i = 0; i < WARM + N; i++) {
        [x, y] = stepFn(x, y);
        if (!isFinite(x) || !isFinite(y) || Math.abs(x) > 1e4 || Math.abs(y) > 1e4) { ok = false; break; }
        if (i >= WARM) raw.push(x, y);
      }
      if (!ok || raw.length < N) continue;
      // robust bounds from the settled tail (last 2500) — transients can't inflate it
      const half = (a, b) => {
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (let i = a; i < b; i += 2) {
          const px = raw[i], py = raw[i + 1];
          if (px < x0) x0 = px; if (px > x1) x1 = px;
          if (py < y0) y0 = py; if (py > y1) y1 = py;
        }
        return { x0, x1, y0, y1 };
      };
      const h1 = half(raw.length - 2500, raw.length - 1250);
      const h2 = half(raw.length - 1250, raw.length);
      // transient check: a settled attractor revisits — halves must share a center
      const span = Math.max(h1.x1 - h1.x0, h1.y1 - h1.y0, h2.x1 - h2.x0, h2.y1 - h2.y0, 1e-6);
      const drift = Math.hypot((h1.x0 + h1.x1) / 2 - (h2.x0 + h2.x1) / 2,
                               (h1.y0 + h1.y1) / 2 - (h2.y0 + h2.y1) / 2);
      if (drift > span * 0.25) continue; // still wandering — not an attractor yet
      let minX = Math.min(h1.x0, h2.x0), maxX = Math.max(h1.x1, h2.x1);
      let minY = Math.min(h1.y0, h2.y0), maxY = Math.max(h1.y1, h2.y1);
      const bwx = Math.max(maxX - minX, 1e-6), bwy = Math.max(maxY - minY, 1e-6);
      // fractal-dimension check: a real strange attractor fills space (dim→2);
      // a limit cycle is just a curve (dim→1). box-count at two scales.
      const boxcount = (G) => {
        const seen = new Uint8Array(G * G);
        for (let i = raw.length - 2500; i < raw.length; i += 2) {
          const gx = Math.min(G - 1, ((raw[i] - minX) / bwx * G) | 0);
          const gy = Math.min(G - 1, ((raw[i + 1] - minY) / bwy * G) | 0);
          seen[gy * G + gx] = 1;
        }
        let c = 0; for (let i = 0; i < seen.length; i++) c += seen[i];
        return c;
      };
      const c1 = boxcount(24), c2 = boxcount(48);
      const fdim = Math.log2(Math.max(c2, 1) / Math.max(c1, 1));
      // measured: good clifford/dejong lace has c1 in 90..420, fdim in 0.9..1.3;
      // fixed points and clean cycles have c1 < 40. keep the lace.
      if (c1 < 90 || fdim < 0.85) continue; // degenerate or curve-like — reseed
      // settling verification: run 3000 more steps — a slow transient converging
      // onto a small cycle would shrink or escape the probe bbox. reject it.
      let vx0 = 1e9, vx1 = -1e9, vy0 = 1e9, vy1 = -1e9;
      for (let i = 0; i < 3000; i++) {
        [x, y] = stepFn(x, y);
        if (!isFinite(x) || !isFinite(y)) { ok = false; break; }
        if (x < vx0) vx0 = x; if (x > vx1) vx1 = x;
        if (y < vy0) vy0 = y; if (y > vy1) vy1 = y;
      }
      if (!ok) continue;
      const probeArea = bwx * bwy, verArea = Math.max(vx1 - vx0, 1e-6) * Math.max(vy1 - vy0, 1e-6);
      const escapes = vx0 < minX - bwx * 0.2 || vx1 > maxX + bwx * 0.2 ||
                      vy0 < minY - bwy * 0.2 || vy1 > maxY + bwy * 0.2;
      if (escapes || verArea < probeArea * 0.35) continue; // still settling — reseed
      pts = { x, y, minX, maxX, minY, maxY };
    }
    if (!pts) { coreFlow(ctx, W, H, P); return false; } // degenerate params → fall back to flow
    const { minX, maxX, minY, maxY } = pts;
    const sc = Math.min(W / (maxX - minX), H / (maxY - minY)) * 0.44;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    // continue the SAME orbit for the full plot (no restart — one living trajectory)
    let x = pts.x, y = pts.y;
    const N = P.attrN;
    for (let i = 0; i < N; i++) {
      [x, y] = stepFn(x, y);
      if (!isFinite(x) || !isFinite(y)) break;
      const px = W / 2 + (x - cx) * sc, py = H / 2 + (y - cy) * sc;
      const c = LUT[(i / N * 255) | 0];
      A.plot(px * 0.5, py * 0.5, c[0], c[1], c[2], 0.10);
    }
    blit(ctx, A.toCanvas(1.5), W, H);
    return true;
  }

  // CORE 3 · harmonograph — decaying pendulums, sacred spirograph
  function coreHarmonograph(ctx, W, H, P) {
    const w2 = W >> 1, h2 = H >> 1, A = makeAccum(w2, h2);
    const inks = P.pal.inks.map(hexRGB);
    const [f1, f2, f3, f4] = P.harmF, [A1, A2, A3, A4] = P.harmA,
          [d1, d2, d3, d4] = P.harmD, [p1, p2, p3, p4] = P.harmP;
    // normalize amplitude per axis
    let mxX = 1e-6, mxY = 1e-6;
    const X = t => A1 * Math.sin(f1 * t + p1) * Math.exp(-d1 * t) + A2 * Math.sin(f2 * t + p2) * Math.exp(-d2 * t);
    const Y = t => A3 * Math.sin(f3 * t + p3) * Math.exp(-d3 * t) + A4 * Math.sin(f4 * t + p4) * Math.exp(-d4 * t);
    for (let t = 0; t < P.harmT; t += 0.05) {
      const ax = Math.abs(X(t)), ay = Math.abs(Y(t));
      if (ax > mxX) mxX = ax; if (ay > mxY) mxY = ay;
    }
    const sc = Math.min(W, H) * 0.44 / Math.max(mxX, mxY);
    const N = P.harmN;
    for (let i = 0; i < N; i++) {
      const t = i / N * P.harmT;
      const px = W / 2 + X(t) * sc, py = H / 2 + Y(t) * sc;
      const col = inks[i % inks.length];
      const fade = 0.25 + 0.75 * (i / N); // young = bright
      A.plot(px * 0.5, py * 0.5, col[0] / 255, col[1] / 255, col[2] / 255, 0.10 * fade + 0.04);
    }
    blit(ctx, A.toCanvas(1.8), W, H);
  }

  // CORE 4 · chladni — nodal lines of superposed waves, domain-warped
  function coreChladni(ctx, W, H, P) {
    const w2 = W >> 1, h2 = H >> 1, A = makeAccum(w2, h2);
    const inks = P.pal.inks.map(hexRGB);
    const n = P.chN, m = P.chM, wA = P.chWarp, p1 = P.p1, p2 = P.p2;
    const ink = inks[0], ink2 = inks[1 % inks.length];
    for (let py = 0; py < h2; py++) {
      const v = (py / h2 - 0.5) * 2;
      for (let px = 0; px < w2; px++) {
        const u = (px / w2 - 0.5) * 2;
        const uu = u + wA * Math.sin(3 * v + p1), vv = v + wA * Math.sin(3 * u + p2);
        const val = Math.cos(n * Math.PI * uu) * Math.cos(m * Math.PI * vv)
                  - Math.cos(m * Math.PI * uu) * Math.cos(n * Math.PI * vv);
        const b = Math.exp(-Math.pow(val / 0.09, 2));
        if (b > 0.02) {
          const edge = Math.hypot(u, v); // rim glow
          const c = edge > 0.92 ? ink2 : ink;
          A.plot(px, py, c[0] / 255, c[1] / 255, c[2] / 255, b * 0.5);
        }
      }
    }
    blit(ctx, A.toCanvas(2.2), W, H);
  }

  // shared palette LUT (256 steps through the inks)
  function makeLUT(inks) {
    const L = [];
    for (let i = 0; i < 256; i++) {
      const t = i / 255 * (inks.length - 1), j = Math.min(inks.length - 2, t | 0), f = t - j;
      L.push([0, 1, 2].map(c => (inks[j][c] + (inks[j + 1][c] - inks[j][c]) * f) / 255));
    }
    return L;
  }

  // CORE 5 · magnetic — iron filings around a seeded dipole constellation.
  // the lodestone core: superposition of 2D dipole fields B = [3(m·r̂)r̂ − m]/r³,
  // rendered as a true line-integral-convolution grain + traced streamlines.
  function coreMagnetic(ctx, W, H, P) {
    const w2 = W >> 1, h2 = H >> 1, A = makeAccum(w2, h2);
    const inks = P.pal.inks.map(hexRGB), LUT = makeLUT(inks), rand = P.rand, asp = W / H;
    const field = (nx, ny, t) => {
      let bx = 0, by = 0;
      for (const p of P.magPoles) {
        const a = p.ang + p.ph + (t || 0) * p.prec;
        const mx = Math.cos(a) * p.str, my = Math.sin(a) * p.str;
        const rx = nx - p.x, ry = ny - p.y;
        const r2 = rx * rx + ry * ry + 2e-4, r = Math.sqrt(r2), k = 1 / (r2 * r);
        const mdotr = (mx * rx + my * ry) / r;
        bx += k * (3 * mdotr * rx / r - mx);
        by += k * (3 * mdotr * ry / r - my);
      }
      return [bx, by];
    };
    P.magField = field; P.magAsp = asp; // stashed for the living overlay
    // --- LIC grain pass (low-res): smear seeded noise along the streamlines ---
    const lw = 150, lh = Math.max(60, Math.round(150 * H / W));
    const noise = new Float32Array(lw * lh);
    for (let i = 0; i < noise.length; i++) noise[i] = rand();
    const licV = new Float32Array(lw * lh);
    const STEPS = 12, DS = 0.014;
    let mn = 1e9, mx = -1e9;
    for (let py = 0; py < lh; py++) {
      const ny = (py / lh - 0.5) * 2;
      for (let px = 0; px < lw; px++) {
        const nx = (px / lw - 0.5) * 2 * asp;
        let acc = 0, cnt = 0;
        for (let dir = -1; dir <= 1; dir += 2) {
          let x = nx, y = ny;
          for (let s = 0; s < STEPS; s++) {
            const f = field(x, y, 0), m = Math.hypot(f[0], f[1]) + 1e-9;
            x += dir * f[0] / m * DS; y += dir * f[1] / m * DS;
            const fx = (x / (2 * asp) + 0.5) * lw, fy = (y / 2 + 0.5) * lh;
            const ix = fx | 0, iy = fy | 0;
            if (ix < 0 || iy < 0 || ix >= lw - 1 || iy >= lh - 1) break;
            const tx = fx - ix, ty = fy - iy, o = iy * lw + ix;
            acc += noise[o] * (1 - tx) * (1 - ty) + noise[o + 1] * tx * (1 - ty)
                 + noise[o + lw] * (1 - tx) * ty + noise[o + lw + 1] * tx * ty;
            cnt++;
          }
        }
        const v = acc / Math.max(cnt, 1);
        licV[py * lw + px] = v;
        if (v < mn) mn = v; if (v > mx) mx = v;
      }
    }
    const licC = document.createElement('canvas'); licC.width = lw; licC.height = lh;
    const lctx = licC.getContext('2d'), limg = lctx.createImageData(lw, lh), ld = limg.data;
    const span = Math.max(mx - mn, 1e-6);
    for (let i = 0; i < licV.length; i++) {
      let t = (licV[i] - mn) / span; t = t * t * (3 - 2 * t); // smoothstep contrast
      const c = LUT[(t * 255) | 0], o = i * 4;
      ld[o] = c[0] * 255 * t; ld[o + 1] = c[1] * 255 * t; ld[o + 2] = c[2] * 255 * t; ld[o + 3] = 255;
    }
    lctx.putImageData(limg, 0, 0);
    // --- explicit streamlines: crisp field lines over the grain, heat-colored ---
    const NL = 380;
    for (let i = 0; i < NL; i++) {
      const x = (rand() * 2 - 1) * asp, y = rand() * 2 - 1;
      for (let dir = -1; dir <= 1; dir += 2) {
        let px = x, py = y;
        for (let s = 0; s < 64; s++) {
          const f = field(px, py, 0), m = Math.hypot(f[0], f[1]);
          if (m < 1e-7) break;
          px += dir * f[0] / m * 0.022; py += dir * f[1] / m * 0.022;
          if (Math.abs(px) > asp * 1.02 || Math.abs(py) > 1.02) break;
          const heat = Math.min(1, Math.log10(1 + m) / 2.6);
          const c = LUT[(heat * 255) | 0];
          A.plot((px / (2 * asp) + 0.5) * w2, (py / 2 + 0.5) * h2, c[0], c[1], c[2], 0.15);
        }
      }
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(licC, 0, 0, W, H);
    ctx.restore();
    blit(ctx, A.toCanvas(1.6), W, H);
    // pole hearts — white-hot seeds where the field is born
    for (const p of P.magPoles) {
      const px = (p.x / (2 * asp) + 0.5) * W, py = (p.y / 2 + 0.5) * H, r = Math.min(W, H) * 0.035;
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, 'rgba(255,255,255,0.85)');
      g.addColorStop(0.4, P.pal.inks[0] + 'aa'); g.addColorStop(1, P.pal.inks[0] + '00');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill(); ctx.restore();
    }
    return true;
  }

  // Gray-Scott reaction-diffusion sim factory — deterministic, toroidal grid
  function grayScott(N, f, k, rand) {
    const Du = 0.16, Dv = 0.08;
    let U = new Float32Array(N * N), V = new Float32Array(N * N);
    let U2 = new Float32Array(N * N), V2 = new Float32Array(N * N);
    const seedBlobs = () => {
      U.fill(1); V.fill(0);
      const nB = 3 + ((rand() * 4) | 0);
      for (let b = 0; b < nB; b++) {
        const cx = (rand() * N) | 0, cy = (rand() * N) | 0, r = 2 + ((rand() * 4) | 0);
        for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++)
          if (x * x + y * y <= r * r) V[(((cy + y + N) % N) * N) + (((cx + x + N) % N))] = 1;
      }
      for (let i = 0; i < V.length; i++) if (rand() < 0.003) V[i] = 0.5 + rand() * 0.5;
    };
    const step = (n) => {
      for (let it = 0; it < n; it++) {
        for (let y = 0; y < N; y++) {
          const ym = (y - 1 + N) % N, yp = (y + 1) % N;
          for (let x = 0; x < N; x++) {
            const xm = (x - 1 + N) % N, xp = (x + 1) % N, i = y * N + x;
            const u = U[i], v = V[i];
            const lu = 0.05 * (U[ym * N + xm] + U[ym * N + xp] + U[yp * N + xm] + U[yp * N + xp])
                     + 0.2 * (U[ym * N + x] + U[yp * N + x] + U[y * N + xm] + U[y * N + xp]) - u;
            const lv = 0.05 * (V[ym * N + xm] + V[ym * N + xp] + V[yp * N + xm] + V[yp * N + xp])
                     + 0.2 * (V[ym * N + x] + V[yp * N + x] + V[y * N + xm] + V[y * N + xp]) - v;
            const uvv = u * v * v;
            U2[i] = u + Du * lu - uvv + f * (1 - u);
            V2[i] = v + Dv * lv + uvv - (f + k) * v;
          }
        }
        const tU = U; U = U2; U2 = tU;
        const tV = V; V = V2; V2 = tV;
      }
    };
    const meanV = () => { let s = 0; for (let i = 0; i < V.length; i++) s += V[i]; return s / V.length; };
    return { seedBlobs, step, meanV, get V() { return V; }, N };
  }

  // reaction sim init with the living-chemistry quality gate (null = dead twice)
  function reactionSimOrNull(P) {
    const [rname, f, k] = P.reactRegime, rand = P.rand;
    for (let attempt = 0; attempt < 2; attempt++) {
      const s = grayScott(P.reactN, f, k, rand);
      s.seedBlobs(); s.step(P.reactIters);
      const mv = s.meanV();
      if (mv > 0.004 && mv < 0.6) { P.reactSim = s; P.reactName = rname; return s; }
    }
    return null;
  }

  // CORE 6 · reaction-diffusion — Gray-Scott chemistry: mitosis / coral / maze.
  // genuinely alive: the pattern is a simulation mid-growth, not a drawing.
  function coreReaction(ctx, W, H, P) {
    const w2 = W >> 1, h2 = H >> 1;
    const sim = reactionSimOrNull(P);
    if (!sim) { coreFlow(ctx, W, H, P); return false; } // chemistry died twice → fall back to flow
    paintReaction(sim, makeLUT(P.pal.inks.map(hexRGB)), w2, h2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(sim.rc, 0, 0, W, H);
    ctx.restore();
    return true;
  }

  function paintReaction(sim, LUT, w2, h2) {
    const N = sim.N, V = sim.V;
    if (!sim.rc) {
      sim.rc = document.createElement('canvas'); sim.rc.width = w2; sim.rc.height = h2;
      sim.rctx = sim.rc.getContext('2d'); sim.rimg = sim.rctx.createImageData(w2, h2);
    }
    let mx = 1e-6;
    for (let i = 0; i < V.length; i++) if (V[i] > mx) mx = V[i];
    const d = sim.rimg.data;
    for (let py = 0; py < h2; py++) {
      const gy = Math.min(N - 1.001, Math.max(0, py / h2 * N));
      const y0 = gy | 0, fy = gy - y0, y1 = (y0 + 1) % N;
      for (let px = 0; px < w2; px++) {
        const gx = Math.min(N - 1.001, Math.max(0, px / w2 * N));
        const x0 = gx | 0, fx = gx - x0, x1 = (x0 + 1) % N;
        const v00 = V[y0 * N + x0], v10 = V[y0 * N + x1];
        const v01 = V[y1 * N + x0], v11 = V[y1 * N + x1];
        let t = ((v00 * (1 - fx) + v10 * fx) * (1 - fy) + (v01 * (1 - fx) + v11 * fx) * fy) / mx;
        t = Math.pow(t, 0.65);
        const c = LUT[Math.min(255, (t * 255) | 0)], o = (py * w2 + px) * 4;
        d[o] = c[0] * 255 * t; d[o + 1] = c[1] * 255 * t; d[o + 2] = c[2] * 255 * t;
        d[o + 3] = 255 * Math.min(1, t * 1.7);
      }
    }
    sim.rctx.putImageData(sim.rimg, 0, 0);
  }

  // ---- living layers for renderAnimated (drawn between base and symbols) ----

  // magnetic: charged dust advected along the breathing (precessing) field.
  // draw(t) advances one frame and composites onto ctx. stop() is a no-op
  // (the outer rAF owns the loop); kept for symmetry.
  function magneticLiveLayer(ctx, W, H, P) {
    const field = P.magField, asp = P.magAsp, rand = P.rand;
    const inks = P.pal.inks;
    const pc = document.createElement('canvas'); pc.width = W; pc.height = H;
    const pctx = pc.getContext('2d');
    const NP = 650, parts = [];
    const spawn = (q) => {
      q.x = rand() * W; q.y = rand() * H;
      q.col = inks[(rand() * inks.length) | 0];
      return q;
    };
    for (let i = 0; i < NP; i++) parts.push(spawn({}));
    return {
      draw(t) {
        pctx.fillStyle = 'rgba(0,0,0,0.06)'; pctx.fillRect(0, 0, W, H); // trail fade
        for (const q of parts) {
          const nx = (q.x / W - 0.5) * 2 * asp, ny = (q.y / H - 0.5) * 2;
          const f = field(nx, ny, t), m = Math.hypot(f[0], f[1]) + 1e-9;
          const sp = 1.4 + Math.min(3.2, Math.log10(1 + m) * 0.9);
          q.x += f[0] / m * sp; q.y += f[1] / m * sp;
          if (q.x < 0 || q.x >= W || q.y < 0 || q.y >= H || rand() < 0.004) spawn(q);
          else { pctx.globalAlpha = 0.55; pctx.fillStyle = q.col; pctx.fillRect(q.x, q.y, 1.7, 1.7); }
        }
        pctx.globalAlpha = 1;
        ctx.drawImage(pc, 0, 0);
      },
      stop() {}
    };
  }

  // reaction: the chemistry keeps stepping — the pattern never stops growing
  function reactionLiveLayer(ctx, W, H, P) {
    const sim = P.reactSim, LUT = makeLUT(P.pal.inks.map(hexRGB));
    paintReaction(sim, LUT, W >> 1, H >> 1); // ensure sim.rc exists
    const w2 = sim.rc.width, h2 = sim.rc.height;
    return {
      draw() {
        sim.step(6);
        paintReaction(sim, LUT, w2, h2);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true;
        ctx.drawImage(sim.rc, 0, 0, W, H);
        ctx.restore();
      },
      stop() {}
    };
  }

  function blit(ctx, small, W, H) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(small, 0, 0, W, H);
    ctx.restore();
  }

  // ================= SHARED LAYERS =================

  function drawVoid(ctx, W, H, P) {
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, '#0b0b14'); g.addColorStop(0.55, P.pal.bg); g.addColorStop(1, '#000000');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  function drawNebula(ctx, W, H, P) {
    const rand = P.rand;
    for (let i = 0; i < 4; i++) {
      const x = rand() * W, y = rand() * H, r = Math.min(W, H) * (0.3 + rand() * 0.5);
      const ink = P.pick(P.pal.inks);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, ink + '2e'); g.addColorStop(1, ink + '00');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  }

  // math symbology — one large faint glyph + scattered small ones. no alphanumeric.
  function drawSymbols(ctx, W, H, P) {
    const rand = P.rand;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.13; ctx.fillStyle = P.symInk;
    ctx.font = `${H * 0.52}px "Courier New", monospace`;
    ctx.fillText(P.bigSym, W * (0.3 + rand() * 0.4), H * (0.32 + rand() * 0.36));
    const m = 10 + ((rand() * 14) | 0);
    for (let i = 0; i < m; i++) {
      ctx.globalAlpha = 0.10 + rand() * 0.22;
      ctx.font = `${12 + rand() * 40}px "Courier New", monospace`;
      ctx.fillStyle = P.pick(P.pal.inks);
      ctx.fillText(P.pick(SYMBOLS), rand() * W, rand() * H);
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  function drawRibbons(ctx, W, H, P) {
    const rand = P.rand;
    for (let r = 0; r < P.ribbons; r++) {
      const yBase = H * (0.15 + rand() * 0.7);
      const amp = H * (0.05 + rand() * 0.15);
      const freq = 1.5 + rand() * 3.5, phase = rand() * TAU;
      const N = 140, pts = [];
      for (let i = 0; i <= N; i++) {
        const x = (i / N) * W;
        pts.push([x, yBase + Math.sin((i / N) * freq * TAU + phase) * amp
          + Math.sin((i / N) * freq * 2.7 * TAU + phase * 2) * amp * 0.35]);
      }
      const ink = P.pick(P.pal.inks), ink2 = P.pick(P.pal.inks);
      const wBase = 4 + rand() * 16;
      ctx.save();
      ctx.shadowColor = ink; ctx.shadowBlur = 20;
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        const w = wBase * (0.5 + 0.5 * Math.sin((i / N) * Math.PI + phase));
        i ? ctx.lineTo(x, y - w / 2) : ctx.moveTo(x, y - w / 2);
      });
      for (let i = N; i >= 0; i--) {
        const [x, y] = pts[i];
        const w = wBase * (0.5 + 0.5 * Math.sin((i / N) * Math.PI + phase));
        ctx.lineTo(x, y + w / 2);
      }
      ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, ink + '00'); g.addColorStop(0.3, ink);
      g.addColorStop(0.7, ink2); g.addColorStop(1, ink + '00');
      ctx.globalAlpha = 0.35 + rand() * 0.25; ctx.fillStyle = g; ctx.fill();
      ctx.shadowBlur = 0; ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.1;
      ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // source-DNA ring — the algorithm written into the piece, kept as texture
  function drawDNA(ctx, W, H, P) {
    const cx = W / 2, cy = H / 2;
    ctx.save();
    ctx.font = `${Math.max(7, H * 0.010)}px "Courier New", monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const dnaR = Math.min(W, H) * 0.44, n = DNA.length;
    for (let ring = 0; ring < 2; ring++) {
      const rr = dnaR - ring * H * 0.026, off = P.p1 + ring * 0.7;
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * TAU;
        ctx.save();
        ctx.translate(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        ctx.rotate(a + Math.PI / 2);
        ctx.globalAlpha = 0.30 - ring * 0.1;
        ctx.fillStyle = P.pal.inks[(i + ring) % P.pal.inks.length];
        ctx.fillText(DNA[i], 0, 0);
        ctx.restore();
      }
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  function drawGrade(ctx, W, H, P) {
    ctx.save();
    ctx.globalAlpha = 0.09; ctx.fillStyle = '#000';
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.6);
    ctx.restore();
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.36, W / 2, H / 2, Math.max(W, H) * 0.74);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    const id = ctx.getImageData(0, 0, W, H), d = id.data, amt = P.grainAmt, rand = P.rand;
    for (let i = 0; i < d.length; i += 4) {
      const g = (rand() - 0.5) * amt;
      d[i] += g; d[i + 1] += g; d[i + 2] += g;
    }
    ctx.putImageData(id, 0, 0);
  }

  // ================= COMPOSE =================

  function render(canvas, seed, opts) {
    opts = opts || {};
    const W = canvas.width = opts.w || 720;
    const H = canvas.height = opts.h || 720;
    const ctx = canvas.getContext('2d');
    const P = buildParams(seed);
    drawVoid(ctx, W, H, P);
    drawNebula(ctx, W, H, P);
    let coreUsed = P.core;
    if (P.core === 'flow') coreFlow(ctx, W, H, P);
    else if (P.core === 'attractor') { if (!coreAttractor(ctx, W, H, P)) coreUsed = 'flow'; }
    else if (P.core === 'harmonograph') coreHarmonograph(ctx, W, H, P);
    else if (P.core === 'magnetic') coreMagnetic(ctx, W, H, P);
    else if (P.core === 'reaction') { if (!coreReaction(ctx, W, H, P)) coreUsed = 'flow'; }
    else coreChladni(ctx, W, H, P);
    drawRibbons(ctx, W, H, P);
    drawSymbols(ctx, W, H, P);
    drawDNA(ctx, W, H, P);
    drawGrade(ctx, W, H, P);
    return { palette: P.pal.name, seed: String(seed), core: coreUsed, regime: P.reactName || null, poles: P.magPoles ? P.magPoles.length : null };
  }

  function renderAnimated(canvas, seed, opts) {
    opts = opts || {};
    const W = canvas.width = opts.w || 720;
    const H = canvas.height = opts.h || 720;
    const ctx = canvas.getContext('2d');
    const P = buildParams(seed);
    const base = document.createElement('canvas'); base.width = W; base.height = H;
    const bctx = base.getContext('2d');
    drawVoid(bctx, W, H, P);
    drawNebula(bctx, W, H, P);
    let coreUsed = P.core, live = null;
    if (P.core === 'flow') coreFlow(bctx, W, H, P);
    else if (P.core === 'attractor') { if (!coreAttractor(bctx, W, H, P)) coreUsed = 'flow'; }
    else if (P.core === 'harmonograph') coreHarmonograph(bctx, W, H, P);
    else if (P.core === 'magnetic') coreMagnetic(bctx, W, H, P);
    else if (P.core === 'reaction') {
      // pattern stays live — base keeps void/nebula only, chemistry paints per frame
      if (!reactionSimOrNull(P)) { coreUsed = 'flow'; coreFlow(bctx, W, H, P); }
    }
    else coreChladni(bctx, W, H, P);
    drawRibbons(bctx, W, H, P);
    drawDNA(bctx, W, H, P);
    drawGrade(bctx, W, H, P);
    const sym = document.createElement('canvas'); sym.width = W; sym.height = H;
    drawSymbols(sym.getContext('2d'), W, H, P);
    // living layers slot between the baked base and the rotating symbols
    if (coreUsed === 'magnetic') live = magneticLiveLayer(ctx, W, H, P);
    else if (coreUsed === 'reaction') live = reactionLiveLayer(ctx, W, H, P);
    let raf = 0; const t0 = performance.now();
    const speed = 0.02 + P.rand() * 0.03, phase = P.p1;
    function frame(now) {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(base, 0, 0);
      if (live) live.draw(t);
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.rotate(phase + t * speed); ctx.translate(-W / 2, -H / 2);
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 0.9 + phase);
      ctx.drawImage(sym, 0, 0);
      ctx.restore();
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.min(W, H) * 0.5);
      const pulse = 0.05 + 0.035 * Math.sin(t * 1.7 + phase);
      g.addColorStop(0, `rgba(255,255,255,${pulse * 0.4})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H); ctx.restore();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return { stop() { cancelAnimationFrame(raf); }, palette: P.pal.name, seed: String(seed), core: coreUsed };
  }

  global.KnotArt = {
    render, renderAnimated, PALETTES,
    _diag: { buildParams, drawVoid, drawNebula, drawSymbols, coreFlow, coreAttractor, coreHarmonograph, coreChladni, coreMagnetic, coreReaction, grayScott, makeLUT }
  };
})(typeof window !== 'undefined' ? window : globalThis);
