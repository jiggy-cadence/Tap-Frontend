/* VOID.LIFE v9 — deterministic generative knot art.
 * Eight MATH CORES (seed picks one): warped FLOW fields · STRANGE ATTRACTORS
 * (Clifford / de Jong / Hopalong) · HARMONOGRAPHS · CHLADNI nodal figures ·
 * MAGNETIC dipole fields (iron-filing LIC + traced streamlines — the lodestone
 * core) · REACTION-DIFFUSION (Gray-Scott chemistry: mitosis / coral / maze /
 * drifters — genuinely alive, it keeps growing) · RENDEZVOUS (two phones, one
 * knot: opposed dipole constellations approach, X-point found by Newton solve,
 * reconnection-style flash, Kuramoto-inspired pulse locking, L-system filigree
 * grown from the merge) · CHIMERA (spiral-wave chimera, heterogeneity-induced:
 * an incoherent core churns inside phase-locked spiral arms — the brain that
 * sleeps with half itself).
 * v9: the YURU layer becomes ORGANISMS whose bodies ARE the field's
 * handwriting — each creature is a head integrated (RK2) through the same
 * vector field that draws the base layer; its body is the trail it swam, with
 * a genome-driven wiggle. v8's spring-held parametric bodies read as stickers
 * on top; v9 kills the independent path. Creatures feed near the poles, lay
 * mutated eggs, fade when starved: generations, not loops.
 * (v7: living-layer trail fade fixed to destination-in — the old source-over
 * black fill accumulated to opaque and would bury the baked base.)
 * Math symbology only (∫∑φπ∞√∂); the source-DNA ring is code texture, kept honest.
 * Same knot → same art. Usage: KnotArt.render(canvas, seedString, opts) ·
 * KnotArt.renderAnimated(...) → {stop}
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
    const core = coreRoll < 0.18 ? 'flow' : coreRoll < 0.31 ? 'attractor' : coreRoll < 0.43 ? 'harmonograph'
      : coreRoll < 0.54 ? 'chladni' : coreRoll < 0.65 ? 'magnetic' : coreRoll < 0.76 ? 'reaction'
      : coreRoll < 0.88 ? 'rendezvous' : 'chimera';
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
      // rendezvous core — two phones, one knot. each phone's constellation is a
      // CHILD of the parent seed (hash(seed+"::A") / ("::B")): recursive lineage,
      // not a quine — it descends from the seed, it doesn't reproduce the program.
      rvDmin: 0.14, rvDmax: 0.66,
      rvA: null, rvB: null, // filled below
      rvRules: pick([
        { ax: 'X', r: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' }, ang: 25 * Math.PI / 180, it: 3 },   // fractal plant (delicate)
        { ax: 'F', r: { F: 'F[+F]F[-F]F' }, ang: 22 * Math.PI / 180, it: 4 },                    // tendril
        { ax: 'X', r: { X: 'F-[[X]+X]+F[+FX]-X', F: 'FF' }, ang: 23 * Math.PI / 180, it: 3 },    // sister plant (delicate)
      ]),
      // chimera core — spiral wave chimera, heterogeneity-induced. the brain
      // that sleeps with half itself: an incoherent core churns inside
      // phase-locked spiral arms (Kuramoto–Shima / Martens flavor, seeded).
      chimPitch: 0.28 + rand() * 0.25, // spiral arm pitch
      chimCoreR: 9 + rand() * 4,       // incoherent-core radius (lattice units)
      chimSpread: 1.2 + rand() * 0.8,  // core natural-frequency spread (Hz-ish)
      chimSteps: 150,                  // settle steps for the static bake
      // shared
      ribbons: core === 'flow' ? 2 + ((rand() * 3) | 0) : 0,
      bigSym: pick(SYMBOLS), symInk: pick(pal.inks),
      grainAmt: 14 + rand() * 14,
    };
    if (P.chN === P.chM) P.chM = (P.chM % 7) + 1;
    // seed lineage: each phone's poles grow from the parent seed's own hash
    function mkPhone(side, stream) {
      const n = 2 + ((stream() * 2) | 0), ps = [];
      const baseAng = side < 0 ? 0 : Math.PI; // north poles face each other
      for (let i = 0; i < n; i++) {
        let ox = 0, oy = 0, ok = false;
        for (let t = 0; t < 20 && !ok; t++) {
          const a = stream() * TAU, rr = 0.05 + stream() * 0.09;
          ox = Math.cos(a) * rr; oy = Math.sin(a) * rr * 0.8;
          ok = ps.every(p => Math.hypot(p.ox - ox, p.oy - oy) > 0.09);
        }
        const ang = baseAng + (stream() - 0.5) * 1.0, str = 0.8 + stream() * 0.6;
        ps.push({ ox, oy, mx: Math.cos(ang) * str, my: Math.sin(ang) * str, str, side });
      }
      return ps;
    }
    P.rvA = mkPhone(-1, mulberry32(xmur3(String(seedStr) + '::A')()));
    P.rvB = mkPhone(1, mulberry32(xmur3(String(seedStr) + '::B')()));
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
    P.flowField = field; // stashed for the living overlay (organisms swim it)
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
        // trail fade: destination-in keeps the layer transparent (a source-over
        // black fill would accumulate to opaque and bury the baked base)
        pctx.globalCompositeOperation = 'destination-in';
        pctx.fillStyle = 'rgba(0,0,0,0.94)'; pctx.fillRect(0, 0, W, H);
        pctx.globalCompositeOperation = 'source-over';
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

  // yuru v8: organisms, not ornaments. Each creature is a genome — a harmonic
  // coefficient set — embodied as a closed chain of body vertices. Every frame
  // each vertex is advected by the core's vector field and sprung back toward
  // its rest shape, so the body is sculpted BY the field math, never merely
  // translated through it. Morphology follows field strength: stretched sleek
  // near the poles, round and drifting far away. Creatures feed where the
  // field runs strong, lay mutated eggs when fed, fade when starved:
  // generations, not loops — always unique, always building. One shared
  // heartbeat keeps the layer in rhythm with the back; trails etch the
  // streamlines they swam. After @yuruyurau's one-liner organisms.
  // yuru v9: the body IS the field's handwriting. Each creature is a head that
  // swims the core's vector field (RK2 midpoint integration through the SAME
  // field function that draws the base layer); its body is the trail of where
  // the head has been — a streamline with a genome. No independent parametric
  // path anymore: the v8 spring held bodies rigid and they read as stickers.
  // The genome now sets trail length, swim speed, wiggle amplitude/frequency —
  // the yuruyurau hairline character survives as a swimming wiggle that grows
  // toward the tail, pulsing with the shared heartbeat. Creatures feed where
  // the field runs strong, lay mutated eggs when fed, fade when starved:
  // generations, not loops. After @yuruyurau's one-liner organisms.
  function yuruLiveLayer(ctx, W, H, P) {
    const cvs = ctx.canvas;
    const rand = P.rand, inks = P.pal.inks;
    const magF = P.magField || null, flowF = P.flowField || null;
    const asp = P.magAsp || W / H;
    const KIND = magF ? 'mag' : (flowF ? 'flow' : 'drift');
    let S = cvs._yuru9;
    if (!S || S.P !== P) S = cvs._yuru9 = initOrganisms();

    const toNx = (x, y) => [(x / W - 0.5) * 2 * asp, (y / H - 0.5) * 2];
    // unit direction + normalized strength of the core's vector field at (x,y)
    function vecAt(x, y, t) {
      const n = toNx(x, y);
      if (KIND === 'mag') {
        const f = magF(n[0], n[1], t), m = Math.hypot(f[0], f[1]) + 1e-9;
        const px = f[0] / m * (W / (2 * asp)), py = f[1] / m * (H / 2);
        const L = Math.hypot(px, py) + 1e-9;
        return { dx: px / L, dy: py / L, mag: Math.min(1, Math.log10(1 + m) / 2.2) };
      }
      if (KIND === 'flow') {
        const a = flowF(n[0], n[1]);
        return { dx: Math.cos(a), dy: Math.sin(a), mag: 0.45 + 0.25 * Math.sin(a * 2) };
      }
      // drift fallback (no core field stashed — should not happen in renderAnimated)
      const da = Math.sin(n[0] * 1.7 + t * 0.2) + Math.cos(n[1] * 1.3 - t * 0.15);
      return { dx: Math.cos(da), dy: Math.sin(da), mag: 0.3 };
    }

    function newGenome() {
      return {
        trail: 70 + ((rand() * 70) | 0),      // body length in trail points
        speed: 0.7 + rand() * 0.7,            // swim speed multiplier
        wigAmp: 2 + rand() * 7,               // lateral wiggle amplitude (px)
        wigFreq: 2 + rand() * 4,              // wiggle temporal frequency
        ph: rand() * TAU,
        hue: inks[(rand() * inks.length) | 0],
        headR: 1.4 + rand() * 1.8,
      };
    }
    // recursive lineage: offspring is the parent genome, mutated
    function mutate(g) {
      const j = (s) => (rand() + rand() + rand() - 1.5) * s;
      return {
        trail: Math.max(40, Math.min(160, g.trail + ((j(30)) | 0))),
        speed: Math.max(0.4, Math.min(1.8, g.speed + j(0.25))),
        wigAmp: Math.max(0.5, Math.min(12, g.wigAmp + j(2.5))),
        wigFreq: Math.max(1, Math.min(8, g.wigFreq + j(1.2))),
        ph: rand() * TAU,
        hue: rand() < 0.35 ? inks[(rand() * inks.length) | 0] : g.hue,
        headR: Math.max(1, Math.min(4, g.headR + j(0.6))),
      };
    }
    function spawn(g, x, y, gen) {
      const trail = [];
      for (let i = 0; i < g.trail; i++) trail.push({ x, y });
      return { g, trail, x, y, heading: rand() * TAU, energy: 0.55 + rand() * 0.3,
               age: 0, gen: gen || 0, alpha: 0, deadBurst: false };
    }
    function initOrganisms() {
      const pc = document.createElement('canvas'); pc.width = W; pc.height = H;
      const st = { P, pc, pctx: pc.getContext('2d'), creatures: [], eggs: [], spores: [], last: 0 };
      for (let i = 0; i < 3; i++) {
        const g = newGenome();
        if (i === 0) g.hue = '#ffffff'; // one ghost-leader
        st.creatures.push(spawn(g, W * (0.25 + rand() * 0.5), H * (0.25 + rand() * 0.5), 0));
      }
      return st;
    }

    function stepCreature(cr, dt, t) {
      cr.age += dt;
      const v0 = vecAt(cr.x, cr.y, t);
      // behavior: hungry creatures bias their heading toward the strongest
      // nearby field (magnetic); the sated drift with the current
      let want = Math.atan2(v0.dy, v0.dx);
      if (cr.energy < 0.35 && KIND === 'mag') {
        let best = -1;
        for (const off of [-0.7, 0, 0.7]) {
          const a = cr.heading + off;
          const q = vecAt(cr.x + Math.cos(a) * 70, cr.y + Math.sin(a) * 70, t);
          if (q.mag > best) { best = q.mag; want = a; }
        }
      }
      let d = want - cr.heading;
      while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
      cr.heading += d * Math.min(1, dt * 3);
      // head: RK2 midpoint integration through the field, blended with heading
      const stepLen = (14 + v0.mag * 46) * cr.g.speed; // px per second
      const hx = Math.cos(cr.heading), hy = Math.sin(cr.heading);
      const k1x = v0.dx * 0.9 + hx * 0.5, k1y = v0.dy * 0.9 + hy * 0.5;
      const mx = cr.x + k1x * stepLen * dt * 0.5, my = cr.y + k1y * stepLen * dt * 0.5;
      const k2 = vecAt(mx, my, t);
      let dx = k2.dx * 0.9 + hx * 0.5, dy = k2.dy * 0.9 + hy * 0.5;
      const dl = Math.hypot(dx, dy) + 1e-9; dx /= dl; dy /= dl;
      cr.x += dx * stepLen * dt; cr.y += dy * stepLen * dt;
      if (cr.x < -80) cr.x = W + 80; else if (cr.x > W + 80) cr.x = -80;
      if (cr.y < -80) cr.y = H + 80; else if (cr.y > H + 80) cr.y = -80;
      // the body is the trail: record the head, keep the genome's length
      // (starving creatures shorten — you can see hunger)
      const keep = Math.max(24, (cr.g.trail * (0.45 + 0.55 * cr.energy)) | 0);
      cr.trail.unshift({ x: cr.x, y: cr.y });
      while (cr.trail.length > keep) cr.trail.pop();
      // feed where the field runs strong, starve elsewhere, age slowly
      cr.energy += (v0.mag > 0.5 ? dt * 0.055 : -dt * 0.014) - (cr.age > 90 ? dt * 0.01 : 0);
      cr.energy = Math.max(0, Math.min(1, cr.energy));
      if (cr.energy > 0.88 && cr.age > 10 && S.creatures.length + S.eggs.length < 6) {
        S.eggs.push({ x: cr.x, y: cr.y, g: mutate(cr.g), t: 0, gen: cr.gen + 1 });
        cr.energy = 0.45;
      }
      if (cr.energy <= 0) cr.deathBurst = true;
      const target = cr.energy <= 0 ? 0 : 0.75;
      cr.alpha += (target - cr.alpha) * Math.min(1, dt * 2);
    }

    return {
      draw(t) {
        const dt = Math.min(0.05, Math.max(0.001, t - (S.last || t))); S.last = t;
        const pctx = S.pctx, hb = 0.5 + 0.5 * Math.sin(t * 0.85); // shared heartbeat
        // trail fade: destination-in keeps the layer transparent
        pctx.globalCompositeOperation = 'destination-in';
        pctx.fillStyle = 'rgba(0,0,0,0.95)'; pctx.fillRect(0, 0, W, H);
        pctx.globalCompositeOperation = 'lighter';
        pctx.lineWidth = 1;
        for (const cr of S.creatures) stepCreature(cr, dt, t);
        for (const e of S.eggs) {
          e.t += dt;
          if (e.t > 3.5) { S.creatures.push(spawn(e.g, e.x, e.y, e.gen)); e.hatched = true; }
        }
        S.eggs = S.eggs.filter(e => !e.hatched);
        const kept = [];
        for (const cr of S.creatures) {
          if (cr.energy <= 0 && cr.deadBurst) {
            cr.deathBurst = false;
            for (let i = 0; i < 10; i++) {
              const a = rand() * TAU, sp = 20 + rand() * 50;
              S.spores.push({ x: cr.x, y: cr.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.6 });
            }
          }
          if (cr.energy <= 0 && cr.alpha < 0.02) continue;
          kept.push(cr);
        }
        S.creatures = kept;
        if (S.creatures.length === 0 && S.eggs.length === 0) {
          const g = newGenome();
          S.eggs.push({ x: W * (0.3 + rand() * 0.4), y: H * (0.3 + rand() * 0.4), g, t: 2.5, gen: 0 });
        }
        for (const s of S.spores) {
          s.life -= dt;
          const q = vecAt(s.x, s.y, t);
          s.x += (s.vx * 0.4 + q.dx * 22) * dt; s.y += (s.vy * 0.4 + q.dy * 22) * dt;
          s.vx *= 0.98; s.vy *= 0.98;
        }
        S.spores = S.spores.filter(s => s.life > 0);
        // render bodies: per-segment tapered hairlines along the trail, with a
        // lateral swimming wiggle that grows toward the tail and breathes with
        // the heartbeat — the path underneath is pure field streamline
        const glow = 0.62 + 0.25 * Math.sin(t * 0.85);
        for (const cr of S.creatures) {
          if (cr.alpha <= 0.01 || cr.trail.length < 4) continue;
          const n = cr.trail.length;
          const amp = cr.g.wigAmp * (0.7 + 0.5 * hb);
          const px = new Float32Array(n), py = new Float32Array(n);
          for (let i = 0; i < n; i++) {
            const p0 = cr.trail[Math.max(0, i - 1)], p1 = cr.trail[Math.min(n - 1, i + 1)];
            let nx = -(p1.y - p0.y), ny = p1.x - p0.x;
            const nl = Math.hypot(nx, ny) + 1e-9; nx /= nl; ny /= nl;
            const w = Math.sin(i * 0.32 - t * cr.g.wigFreq + cr.g.ph) * amp * Math.pow(i / n, 1.2);
            px[i] = cr.trail[i].x + nx * w; py[i] = cr.trail[i].y + ny * w;
          }
          pctx.strokeStyle = cr.g.hue;
          for (let i = 1; i < n; i++) {
            pctx.globalAlpha = cr.alpha * glow * Math.pow(1 - i / n, 1.4);
            pctx.beginPath(); pctx.moveTo(px[i - 1], py[i - 1]); pctx.lineTo(px[i], py[i]); pctx.stroke();
          }
          // the mouth: bright head-dot, reads as alive and gives direction
          pctx.globalAlpha = Math.min(1, cr.alpha + 0.25);
          pctx.fillStyle = '#ffffff';
          pctx.beginPath(); pctx.arc(px[0], py[0], cr.g.headR * 0.6, 0, TAU); pctx.fill();
          pctx.globalAlpha = cr.alpha * 0.5;
          pctx.fillStyle = cr.g.hue;
          pctx.beginPath(); pctx.arc(px[0], py[0], cr.g.headR * 1.6, 0, TAU); pctx.fill();
        }
        for (const e of S.eggs) {
          const p = Math.min(1, e.t / 3.5);
          pctx.globalAlpha = 0.45 + 0.3 * Math.sin(t * 6 + p * 9);
          pctx.strokeStyle = '#ffffff';
          pctx.beginPath(); pctx.arc(e.x, e.y, 3 + p * 10, 0, TAU); pctx.stroke();
          pctx.globalAlpha = 0.8;
          pctx.fillStyle = e.g.hue;
          pctx.fillRect(e.x - 1, e.y - 1, 2, 2);
        }
        for (const s of S.spores) {
          pctx.globalAlpha = Math.max(0, s.life / 1.6) * 0.7;
          pctx.fillStyle = '#ffffff';
          pctx.fillRect(s.x, s.y, 1.5, 1.5);
        }
        pctx.globalAlpha = 1;
        ctx.drawImage(S.pc, 0, 0);
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

  // CORE 7 · rendezvous — two phones, one knot. Phone A (copper) and phone B
  // (teal) hold dipole constellations with north poles facing each other across
  // a gap d. Opposed fields → an X-point null nearby (Newton-solved, not assumed
  // at the midpoint — the constellations are independent), separatrix arms,
  // reconnection-style flash as d → dmin. This is reconnection-INSPIRED art,
  // not a plasma simulation: no topology change is modeled. Kuramoto-INSPIRED
  // layer: pole-hearts pulse with phase difference Δφ ∝ d — incoherent when far,
  // phase-locked at the tap (order parameter r(d) → 1, drawn as the sync ring);
  // it maps distance to coherence, it doesn't integrate the Kuramoto equations.
  // L-system layer: a parallel string-rewriting grammar (code making code)
  // grows golden filigree OUT of the X-point — the knot grows from the merge.
  // mode: 'both' | 'A' | 'B' (single-phone panels for the approach demo).
  function rvField(x, y, P, d, mode) {
    let bx = 0, by = 0;
    const list = mode === 'A' ? [[-1, P.rvA]] : mode === 'B' ? [[1, P.rvB]] : [[-1, P.rvA], [1, P.rvB]];
    for (let k = 0; k < list.length; k++) {
      const cx = list[k][0] * d / 2, ps = list[k][1];
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        const dx = x - (cx + p.ox), dy = y - p.oy;
        const r2 = dx * dx + dy * dy + 0.0009, r = Math.sqrt(r2);
        const mdotr = (p.mx * dx + p.my * dy) / r, s = p.str / (r2 * r);
        bx += s * (3 * mdotr * dx / r - p.mx);
        by += s * (3 * mdotr * dy / r - p.my);
      }
    }
    return [bx, by];
  }
  function rvOrder(d) { return 1 / (1 + Math.exp((d - 0.30) * 14)); } // Kuramoto r(d)

  // the true X-point: Newton-solve B(x,y)=0 from the midpoint. opposed
  // constellations guarantee a null nearby by continuity; the flash, separatrix,
  // sync ring and L-system all anchor to THIS point, not to (0,0).
  function rvNull(P, d) {
    let x = 0, y = 0;
    for (let it = 0; it < 14; it++) {
      const f = rvField(x, y, P, d, 'both'), m = Math.hypot(f[0], f[1]);
      if (m < 1e-7) break;
      const e = 1e-4;
      const fx = rvField(x + e, y, P, d, 'both'), fy = rvField(x, y + e, P, d, 'both');
      const j00 = (fx[0] - f[0]) / e, j01 = (fy[0] - f[0]) / e;
      const j10 = (fx[1] - f[1]) / e, j11 = (fy[1] - f[1]) / e;
      const det = j00 * j11 - j01 * j10;
      if (Math.abs(det) < 1e-9) break;
      x -= (j11 * f[0] - j01 * f[1]) / det;
      y -= (-j10 * f[0] + j00 * f[1]) / det;
      if (Math.abs(x) > 0.5 || Math.abs(y) > 0.5) { x = 0; y = 0; break; }
    }
    return [x, y];
  }

  // L-system: parallel string rewriting. the string rewrites ITSELF, then the
  // turtle draws the final string. code making code, literally.
  function lsysGrow(rs, iters) {
    let s = rs.ax;
    for (let n = 0; n < iters; n++) {
      let o = '';
      for (let i = 0; i < s.length; i++) { const c = s[i]; o += rs.r[c] || c; }
      s = o;
      if (s.length > 60000) break;
    }
    return s;
  }
  function drawLSystem(ctx, str, ang, X, Y, fitR, ink, ox, oy) {
    ox = ox || 0; oy = oy || 0;
    // two-pass turtle: pass 1 measures, pass 2 draws scaled to fit
    const step = 1;
    function trace() {
      let x = 0, y = 0, a = -Math.PI / 2;
      const st = [], pts = [[0, 0]];
      let minx = 0, maxx = 0, miny = 0, maxy = 0;
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === 'F') {
          x += Math.cos(a) * step; y += Math.sin(a) * step;
          pts.push([x, y]);
          if (x < minx) minx = x; if (x > maxx) maxx = x;
          if (y < miny) miny = y; if (y > maxy) maxy = y;
        }
        else if (c === '+') a += ang;
        else if (c === '-') a -= ang;
        else if (c === '[') st.push([x, y, a]);
        else if (c === ']') { const s2 = st.pop(); x = s2[0]; y = s2[1]; a = s2[2]; pts.push(null); pts.push([x, y]); }
      }
      return { pts, sc: fitR / Math.max(1e-6, Math.max(maxx - minx, maxy - miny)), cx: (minx + maxx) / 2, cy: (miny + maxy) / 2 };
    }
    const t = trace();
    ctx.save();
    ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    let pen = false;
    for (const p of t.pts) {
      if (!p) { pen = false; continue; }
      const px = X(ox + (p[0] - t.cx) * t.sc), py = Y(oy + (p[1] - t.cy) * t.sc);
      if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  function coreRendezvous(ctx, W, H, P, d, mode) {
    d = (d === undefined) ? P.rvDmin : d; mode = mode || 'both';
    const S = Math.min(W, H), FE = 0.55, k = S / (2 * FE); // field window ±0.55
    const X = x => W / 2 + x * k, Y = y => H / 2 + y * k;
    const rand = P.rand;
    const COPPER = [255, 140, 26], TEAL = [53, 224, 255];
    const both = mode === 'both';
    const nl = both ? rvNull(P, d) : [0, 0]; // the true X-point
    // -- LIC grain on the combined field (iron-filing shimmer)
    const gw = 130, gh2 = 130, A = makeAccum(gw, gh2);
    const dots = 1400;
    for (let i = 0; i < dots; i++) {
      let x = rand() * 2 * FE - FE, y = rand() * 2 * FE - FE;
      for (let pass = 0; pass < 2; pass++) {
        for (let s2 = 0; s2 < 12; s2++) {
          const f = rvField(x, y, P, d, mode), m = Math.hypot(f[0], f[1]) + 1e-9;
          const st = 0.006 / (1 + m * 0.15);
          x += f[0] / m * st * (pass ? 1 : -1); y += f[1] / m * st * (pass ? 1 : -1);
          if (Math.abs(x) > FE || Math.abs(y) > FE) break;
          A.plot((x + FE) / (2 * FE) * gw, (y + FE) / (2 * FE) * gh2, 1, 1, 1, 0.035);
        }
      }
    }
    blit(ctx, A.toCanvas(2.0), W, H);
    // -- streamlines, colored by parent phone; whitened near the null.
    // seeds cluster near the poles so dipole loops read, with a uniform
    // background population for context.
    const w2 = W >> 1, h2 = H >> 1, A2 = makeAccum(w2, h2);
    const NSL = 240;
    for (let i = 0; i < NSL; i++) {
      let x, y;
      if (rand() < 0.6) {
        const side = mode === 'A' ? -1 : mode === 'B' ? 1 : (rand() < 0.5 ? -1 : 1);
        const a = rand() * TAU, rr = 0.04 + Math.sqrt(rand()) * 0.22;
        x = side * d / 2 + Math.cos(a) * rr; y = Math.sin(a) * rr;
      } else {
        const a = rand() * TAU, rr = 0.06 + Math.sqrt(rand()) * 0.46;
        x = Math.cos(a) * rr; y = Math.sin(a) * rr * 0.9;
      }
      const nearA = Math.hypot(x + d / 2, y) < Math.hypot(x - d / 2, y);
      const col = mode === 'A' || (both && nearA) ? COPPER : TEAL;
      const rC = col[0], gC = col[1], bC = col[2];
      let px = x, py = y;
      for (let s2 = 0; s2 < 85; s2++) {
        const f = rvField(px, py, P, d, mode), m = Math.hypot(f[0], f[1]);
        if (m < 1e-7) break;
        const st = 0.007 / (1 + m * 0.4);
        // RK2 midpoint
        const mx = px + f[0] / m * st / 2, my = py + f[1] / m * st / 2;
        const f2 = rvField(mx, my, P, d, mode), m2 = Math.hypot(f2[0], f2[1]) + 1e-9;
        px += f2[0] / m2 * st; py += f2[1] / m2 * st;
        if (Math.abs(px) > FE || Math.abs(py) > FE) break;
        const whiten = 1 - Math.min(1, m * 14); // null region burns white-hot, tightly
        const al = (0.10 + 0.25 * Math.min(1, Math.log10(1 + m) / 2)) * (0.25 + 0.75 * Math.min(1, m * 2));
        A2.plot(X(px) / 2, Y(py) / 2,
          (rC + (255 - rC) * whiten) / 255, (gC + (255 - gC) * whiten) / 255, (bC + (255 - bC) * whiten) / 255, al);
      }
    }
    blit(ctx, A2.toCanvas(2.0), W, H);
    // -- X-point: reconnection-style flash + separatrix arms + Kuramoto-inspired sync ring
    const ox = X(nl[0]), oy = Y(nl[1]);
    if (both) {
      const merge = Math.max(0, Math.min(1, (0.34 - d) / 0.34));
      if (merge > 0.01) {
        const fr = 0.10 * k * (0.4 + 0.6 * merge);
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, fr);
        g.addColorStop(0, `rgba(255,255,255,${0.6 * merge})`);
        g.addColorStop(0.4, `rgba(255,240,220,${0.25 * merge})`);
        g.addColorStop(1, 'rgba(255,240,220,0)');
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g;
        ctx.fillRect(ox - fr, oy - fr, fr * 2, fr * 2); ctx.restore();
        // separatrix arms through the null
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,255,255,${0.45 * merge})`; ctx.lineWidth = 1.5;
        const L = 0.13 * k;
        ctx.beginPath();
        ctx.moveTo(ox - L, oy); ctx.lineTo(ox + L, oy);
        ctx.moveTo(ox, oy - L); ctx.lineTo(ox, oy + L);
        ctx.stroke(); ctx.restore();
      }
      const rO = rvOrder(d), rr2 = 0.06 * k;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,255,255,${0.15 + 0.7 * rO})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ox, oy, rr2, -Math.PI / 2, -Math.PI / 2 + rO * TAU); ctx.stroke();
      ctx.restore();
      // L-system filigree grows OUT of the merge point — drawn wide enough that
      // its branches escape the white-hot zone into the dark, where gold reads.
      const str = lsysGrow(P.rvRules, P.rvRules.it);
      drawLSystem(ctx, str, P.rvRules.ang, X, Y, 0.44, 'rgba(255,205,135,0.20)', nl[0], nl[1]);
    }
    // -- pole hearts
    const hearts = both ? [[-1, P.rvA, COPPER], [1, P.rvB, TEAL]]
      : mode === 'A' ? [[-1, P.rvA, COPPER]] : [[1, P.rvB, TEAL]];
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [side, ps, col] of hearts) {
      for (const p of ps) {
        const px = X(side * d / 2 + p.ox), py = Y(p.oy), pr = 9;
        const g = ctx.createRadialGradient(px, py, 0, px, py, pr);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(0.35, `rgba(${col[0]},${col[1]},${col[2]},0.55)`);
        g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
        ctx.fillStyle = g; ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
      }
    }
    ctx.restore();
  }

  // rendezvous live: the approach breathes — d(t) loops far→near, dust rides the
  // live field, pole-hearts Kuramoto-inspired pulse (Δφ ∝ d), reconnection-style flickers at merge
  function rendezvousLiveLayer(ctx, W, H, P) {
    const S = Math.min(W, H), FE = 0.55, k = S / (2 * FE);
    const X = x => W / 2 + x * k, Y = y => H / 2 + y * k;
    const rand = P.rand;
    const COPPER = 'rgb(255,140,26)', TEAL = 'rgb(53,224,255)';
    const pc = document.createElement('canvas'); pc.width = W; pc.height = H;
    const pctx = pc.getContext('2d');
    const NP = 380, parts = [];
    const spawn = q => {
      const a = rand() * TAU, rr = Math.sqrt(rand()) * 0.52;
      q.x = Math.cos(a) * rr; q.y = Math.sin(a) * rr; q.age = 0;
      q.col = rand() < 0.5 ? COPPER : TEAL;
      return q;
    };
    for (let i = 0; i < NP; i++) { const q = spawn({}); q.age = (rand() * 500) | 0; parts.push(q); }
    const dOf = t => P.rvDmin + (P.rvDmax - P.rvDmin) * (0.5 - 0.5 * Math.cos(TAU * t / 9));
    function heart(p, side, d, col, b) {
      const px = X(side * d / 2 + p.ox), py = Y(p.oy), pr = 8;
      const g = pctx.createRadialGradient(px, py, 0, px, py, pr);
      g.addColorStop(0, `rgba(255,255,255,${0.9 * b})`);
      g.addColorStop(1, col.replace('rgb', 'rgba').replace(')', `,${0.55 * b})`));
      pctx.fillStyle = g; pctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    }
    return {
      draw(t) {
        const d = dOf(t), nl = rvNull(P, d), nx = X(nl[0]), ny = Y(nl[1]);
        pctx.save();
        pctx.globalCompositeOperation = 'destination-out';
        pctx.fillStyle = 'rgba(0,0,0,0.07)'; pctx.fillRect(0, 0, W, H);
        pctx.restore();
        pctx.save(); pctx.globalCompositeOperation = 'lighter';
        for (const q of parts) {
          const f = rvField(q.x, q.y, P, d, 'both'), m = Math.hypot(f[0], f[1]) + 1e-9;
          const sp = 0.003 + Math.min(0.008, Math.log10(1 + m) * 0.0022);
          q.x += f[0] / m * sp; q.y += f[1] / m * sp; q.age++;
          if (Math.abs(q.x) > FE || Math.abs(q.y) > FE || q.age > 500) spawn(q);
          else { pctx.globalAlpha = 0.5; pctx.fillStyle = q.col; pctx.fillRect(X(q.x), Y(q.y), 1.6, 1.6); }
        }
        pctx.globalAlpha = 1;
        // Kuramoto-inspired: Δφ shrinks as the phones close → pulses lock at the tap
        const dphi = Math.PI * (d - P.rvDmin) / (P.rvDmax - P.rvDmin);
        const thA = 2.4 * t, bA = 0.55 + 0.45 * Math.sin(thA), bB = 0.55 + 0.45 * Math.sin(thA + dphi);
        for (const p of P.rvA) heart(p, -1, d, COPPER, bA);
        for (const p of P.rvB) heart(p, 1, d, TEAL, bB);
        // reconnection-style flicker rings at the X-point
        const merge = Math.max(0, Math.min(1, (0.34 - d) / 0.34));
        if (merge > 0.01) {
          for (let i = 0; i < 3; i++) {
            const fr = (((t * 0.45 + i / 3) % 1) + 1) % 1, rr = fr * 0.13 * k;
            pctx.strokeStyle = `rgba(255,255,255,${(1 - fr) * 0.5 * merge})`;
            pctx.lineWidth = 1.5;
            pctx.beginPath(); pctx.arc(nx, ny, rr, 0, TAU); pctx.stroke();
          }
        }
        // live sync ring
        const rO = rvOrder(d);
        pctx.strokeStyle = `rgba(255,255,255,${0.15 + 0.7 * rO})`; pctx.lineWidth = 2;
        pctx.beginPath(); pctx.arc(nx, ny, 0.06 * k, -Math.PI / 2, -Math.PI / 2 + rO * TAU); pctx.stroke();
        pctx.restore();
        ctx.drawImage(pc, 0, 0);
      },
      stop() {}
    };
  }

  // CORE 8 · CHIMERA — the brain that sleeps with half itself.
  // Spiral-wave chimera, heterogeneity-induced (Kuramoto–Shima / Martens et al.
  // flavor): a 2-D lattice of phase oscillators with nonlocal Gaussian coupling
  // and phase lag α. Oscillators inside the core radius carry a spread of
  // natural frequencies too wide for the coupling to entrain, so the core
  // churns incoherent while the spiral arms phase-lock around it.
  // Chimera-INSPIRED art, not a physics claim: the homogeneous
  // identical-oscillator route does not settle on this lattice; the
  // heterogeneous route is the documented, reproducible one.
  function chimeraSim(P) {
    const N = 56, R = 5, ALPHA = 0.22, DT = 0.06, SIG = R / 2.2;
    const rand = P.rand;
    const ox = [], oy = [], w0 = [];
    let norm = 0;
    for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) {
      const d2 = dx * dx + dy * dy;
      if (d2 > R * R || (dx === 0 && dy === 0)) continue;
      const wt = Math.exp(-d2 / (2 * SIG * SIG));
      ox.push(dx); oy.push(dy); w0.push(wt); norm += wt;
    }
    const K = ox.length, w = new Float64Array(K);
    for (let k = 0; k < K; k++) w[k] = w0[k] / norm;
    const nbr = new Int32Array(N * N * K);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, base = i * K;
      for (let k = 0; k < K; k++) {
        const xx = (x + ox[k] + N) % N, yy = (y + oy[k] + N) % N;
        nbr[base + k] = yy * N + xx;
      }
    }
    const phi = new Float64Array(N * N), om = new Float64Array(N * N);
    const cx = (N - 1) / 2, cy = (N - 1) / 2;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, dx = x - cx, dy = y - cy;
      const r = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
      phi[i] = th - r * P.chimPitch + (rand() - 0.5) * 0.3;
      if (r < P.chimCoreR) {
        phi[i] = rand() * TAU;
        om[i] = (rand() + rand() + rand() - 1.5) * 2 * P.chimSpread;
      }
    }
    const next = new Float64Array(N * N);
    function step() {
      for (let i = 0; i < N * N; i++) {
        const base = i * K, ph = phi[i];
        let s = 0;
        for (let k = 0; k < K; k++) s += w[k] * Math.sin(ph - phi[nbr[base + k]] + ALPHA);
        next[i] = ph + DT * (om[i] - s);
      }
      phi.set(next);
    }
    // local coherence (3×3 neighborhood) — the sleep/wake diagnostic
    function coherence() {
      const c = new Float32Array(N * N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let sr = 0, si = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
          sr += Math.cos(phi[yy * N + xx]); si += Math.sin(phi[yy * N + xx]); n++;
        }
        c[y * N + x] = Math.hypot(sr, si) / n;
      }
      return c;
    }
    // regional split for the honesty receipt: inside vs outside the core radius
    function stats() {
      const c = coherence();
      let ci = 0, ni = 0, co = 0, no = 0;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const r = Math.hypot(x - cx, y - cy), v = c[y * N + x];
        if (r < P.chimCoreR) { ci += v; ni++; } else if (r < N * 0.45) { co += v; no++; }
      }
      return { core: ci / ni, arms: co / no };
    }
    // phase → palette color, brightness ← coherence. returns an ImageData.
    function paint(lut) {
      const c = coherence();
      const img = new ImageData(N, N), d = img.data;
      for (let i = 0; i < N * N; i++) {
        const col = lut[((((phi[i] % TAU) + TAU) % TAU) / TAU * 255) | 0];
        const b = 0.22 + 0.78 * c[i];
        d[i * 4] = col[0] * 255 * b; d[i * 4 + 1] = col[1] * 255 * b;
        d[i * 4 + 2] = col[2] * 255 * b; d[i * 4 + 3] = 255;
      }
      return img;
    }
    return { step, paint, stats, N, coreR: P.chimCoreR };
  }

  function chimeraLUT(P) {
    const inks = P.pal.inks.map(hexRGB), LUT = [];
    for (let i = 0; i < 256; i++) {
      const t = i / 255 * (inks.length - 1), j = Math.min(inks.length - 2, t | 0), f = t - j;
      LUT.push([0, 1, 2].map(c => (inks[j][c] + (inks[j + 1][c] - inks[j][c]) * f) / 255));
    }
    return LUT;
  }

  function coreChimera(ctx, W, H, P) {
    const sim = chimeraSim(P);
    for (let s = 0; s < P.chimSteps; s++) sim.step();
    const small = document.createElement('canvas'); small.width = sim.N; small.height = sim.N;
    small.getContext('2d').putImageData(sim.paint(chimeraLUT(P)), 0, 0);
    blit(ctx, small, W, H);
    // faint dashed ring at the sleep boundary — here the brain sleeps
    const S = Math.min(W, H), k = S / (sim.N + 2);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 9]);
    ctx.beginPath(); ctx.arc(W / 2, H / 2, sim.coreR * k, 0, TAU); ctx.stroke();
    ctx.restore(); ctx.setLineDash([]);
    return true;
  }

  // chimera live: the core keeps churning, the arms keep dreaming — the sim
  // keeps stepping under the baked piece, two steps per frame.
  function chimeraLiveLayer(ctx, W, H, P) {
    const sim = chimeraSim(P);
    for (let s = 0; s < P.chimSteps; s++) sim.step();
    const lut = chimeraLUT(P);
    const small = document.createElement('canvas'); small.width = sim.N; small.height = sim.N;
    const sctx = small.getContext('2d');
    return {
      draw() {
        sim.step(); sim.step();
        sctx.putImageData(sim.paint(lut), 0, 0);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(small, 0, 0, W, H);
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
    else if (P.core === 'rendezvous') coreRendezvous(ctx, W, H, P);
    else if (P.core === 'chimera') coreChimera(ctx, W, H, P);
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
    else if (P.core === 'rendezvous') coreRendezvous(bctx, W, H, P); // base baked at the tap
    else if (P.core === 'chimera') coreChimera(bctx, W, H, P); // base baked at the tap
    else coreChladni(bctx, W, H, P);
    drawRibbons(bctx, W, H, P);
    drawDNA(bctx, W, H, P);
    drawGrade(bctx, W, H, P);
    const sym = document.createElement('canvas'); sym.width = W; sym.height = H;
    drawSymbols(sym.getContext('2d'), W, H, P);
    // living layers slot between the baked base and the rotating symbols
    if (coreUsed === 'magnetic') {
      const dust = magneticLiveLayer(ctx, W, H, P), org = yuruLiveLayer(ctx, W, H, P);
      live = { draw(t) { dust.draw(t); org.draw(t); }, stop() {} };
    }
    else if (coreUsed === 'flow') live = yuruLiveLayer(ctx, W, H, P);
    else if (coreUsed === 'reaction') live = reactionLiveLayer(ctx, W, H, P);
    else if (coreUsed === 'rendezvous') live = rendezvousLiveLayer(ctx, W, H, P);
    else if (coreUsed === 'chimera') live = chimeraLiveLayer(ctx, W, H, P);
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
    _diag: { buildParams, drawVoid, drawNebula, drawSymbols, coreFlow, coreAttractor, coreHarmonograph, coreChladni, coreMagnetic, coreReaction, coreRendezvous, coreChimera, chimeraSim, chimeraLiveLayer, rendezvousLiveLayer, yuruLiveLayer, rvField, rvNull, rvOrder, lsysGrow, grayScott, makeLUT }
  };
})(typeof window !== 'undefined' ? window : globalThis);
