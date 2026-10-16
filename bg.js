'use strict';
// Pencil sets for "Дракончик". Every set is drawn once into a cached layer.
const BG = (() => {
  const INK = '#2e2823', PAPER = '#f5f0e5';
  const C = {sky: '#8fbde0', skyDeep: '#5f93c9', mount: '#a7a2cc', mountFar: '#c4c7e0', grass: '#8cc06a', grassDark: '#4f8f42', rock: '#a59b8e', rockDark: '#6f655a',
    cliff: '#b8a68c', cliffDark: '#7c6a55', night: '#24305e', nightDeep: '#18204a', moon: '#f4e3a0', sunsetA: '#ffd27a', sunsetB: '#f6a15f', sunsetC: '#e9777d', sunsetD: '#a77cb8', wood: '#a0714a', bush: '#6aa957', cloud: '#ffffff'};
  // ---- primitives
  function pen(c, id, list, {color = INK, opacity = 1} = {}) {
    if (!list.length) return;
    drawCel(c, compileCel({strokes: list}, {id}), {material: 'pencil', color, opacity});
  }
  const poly = (pts, close = true) => { const q = smoothPts(pts, close, 3, Math.PI), p = new Path2D(); q.forEach((v, i) => i ? p.lineTo(...v) : p.moveTo(...v)); if (close) p.closePath(); return p; };
  const rectP = (x, y, w, h) => { const p = new Path2D(); p.rect(x, y, w, h); return p; };
  function shade(c, path, color, {base = .3, spacing = 4.5, length = 18, width = 1.3, opacity = .5, tone = () => .85, dir = -1.0, seed = 1, box = [-100, -100, 2200, 2400]} = {}) {
    c.save();
    if (base > 0) { c.fillStyle = mix(PAPER, color, base); c.fill(path); }
    formHatch(c, path, box, {seed, color, spacing, length, width, opacity, tone, direction: typeof dir === 'function' ? dir : () => dir});
    c.restore();
  }
  // lumpy cloud: bumps over a flat base
  function cloudPts(cx, cy, w, h, seed) {
    const r = rng(seed), n = 3 + (r() * 2 | 0), bw = w / n, pts = [[cx - w / 2, cy]];
    for (let i = 0; i < n; i++) {
      const mid = 1 - Math.abs(i - (n - 1) / 2) / n, hh = Math.min(h * (.75 + mid * .6), bw * .62) * (.85 + r() * .25), x0 = cx - w / 2 + bw * i;
      for (let k = 1; k <= 7; k++) { const a = Math.PI - Math.PI * k / 8; pts.push([x0 + bw / 2 + Math.cos(a) * bw * .58, cy - h * .1 - Math.sin(a) * hh]); }
    }
    pts.push([cx + w / 2, cy]);
    return pts;
  }
  function cloud(c, id, cx, cy, w, h, seed, {tint: tc = C.cloud, alpha = 1} = {}) {
    const pts = cloudPts(cx, cy, w, h, seed), path = poly(pts);
    c.save(); c.globalAlpha *= alpha;
    c.fillStyle = mix(PAPER, tc, .7); c.fill(path);
    shade(c, path, '#9fb0cf', {base: 0, opacity: .35, spacing: 5, tone: (x, y) => clamp((y - (cy - h * .6)) / (h * 1.1), 0, .9), seed});
    pen(c, id, [{id: 'top', points: pts, width: 2, opacity: .55}, {id: 'base', points: [[cx - w / 2 + 10, cy + 2], [cx, cy + 4], [cx + w / 2 - 10, cy + 1]], width: 1.4, opacity: .3}]);
    c.restore();
  }
  function rockPts(cx, by, w, h, seed) {
    const r = rng(seed), pts = [];
    for (let i = 0; i <= 9; i++) { const u = i / 9, a = Math.PI * (1 - u); pts.push([cx + Math.cos(a) * w / 2 * (.92 + r() * .12), by - Math.sin(a) * h * (.85 + r() * .2) * (u > .2 && u < .8 ? 1 : .9)]); }
    return pts;
  }
  function rock(c, id, cx, by, w, h, seed, color = C.rock) {
    const pts = rockPts(cx, by, w, h, seed), path = poly([...pts, [cx + w / 2, by + 8], [cx - w / 2, by + 8]]);
    shade(c, path, color, {base: .45, opacity: .55, tone: (x, y) => .55 + .4 * clamp((x - cx) / w + .3, 0, 1), seed});
    const L = [{id: 'outline', points: pts, width: 2.6}];
    for (let i = 0; i < 4; i++) { const x = cx - w * .3 + i * w * .2, y = by - h * (.3 + (i % 2) * .25); L.push({id: 'crack' + i, points: [[x, y], [x + 10, y + 12], [x + 6, y + 26]], width: 1.2, opacity: .5}); }
    L.push({id: 'ground', points: [[cx - w / 2 - 30, by + 2], [cx + w / 2 + 40, by + 3]], width: 1.6, opacity: .6});
    pen(c, id, L);
  }
  function tufts(c, id, x0, x1, yf, n, seed, color = C.grassDark) {
    const r = rng(seed), L = [];
    for (let i = 0; i < n; i++) { const x = lerp(x0, x1, r()), y = yf(x) + r() * 6, h = 10 + r() * 14;
      L.push({id: 't' + i, points: [[x - 6, y - h * .8], [x - 1, y]], width: 1.4, opacity: .8}, {id: 'u' + i, points: [[x + 1, y], [x + 4, y - h]], width: 1.4, opacity: .8}, {id: 'v' + i, points: [[x + 3, y], [x + 11, y - h * .7]], width: 1.2, opacity: .7}); }
    pen(c, id, L, {color});
  }
  // sky: an opaque wash fading to paper at the horizon, then light coloured-pencil strokes near the top only
  function sky(c, color, {top = 0, bottom = 700, seed = 3, strength = .55, w = W} = {}) {
    const g = c.createLinearGradient(0, top, 0, bottom); g.addColorStop(0, mix(PAPER, color, .38 * strength / .5)); g.addColorStop(1, PAPER);
    c.save(); c.fillStyle = g; c.fillRect(-20, top, w + 40, bottom - top); c.restore();
    shade(c, rectP(-20, top - 20, w + 40, bottom - top + 20), color, {base: 0, spacing: 7, length: 15, width: 1.1, opacity: .28, seed, tone: (x, y) => strength * 1.1 * clamp(1 - (y - top) / (bottom - top) * 1.25, 0, 1), box: [-40, top - 40, w + 80, bottom - top + 80]});
  }
  // mountains: overlapping peaks of different heights, rounded tops, a few snow caps
  function mountains(c, id, baseY, color, seed, amp = 160, w = W) {
    const r = rng(seed), peaks = [];
    for (let x = -120; x < w + 240; x += 190 + r() * 240) peaks.push([x + r() * 80, amp * (.4 + r() * .65), .5 + r() * .45]);
    const hAt = x => Math.max(0, ...peaks.map(([px, ph, sl]) => ph - Math.abs(x - px) * sl * (1 + .12 * Math.sin((x - px) / 31))));
    const pts = []; for (let x = -40; x <= w + 40; x += 12) pts.push([x, baseY - hAt(x)]);
    const path = poly([...pts, [w + 40, baseY + 700], [-40, baseY + 700]]);
    shade(c, path, color, {base: .4, opacity: .4, seed, spacing: 5, tone: (x, y) => .45 + .35 * clamp((y - baseY + amp) / (amp * 1.6), 0, 1)});
    const L = [{id: 'ridge', points: pts, width: 2, opacity: .5}];
    peaks.forEach(([px, ph, sl], k) => {
      if (ph < amp * .78 || px < -40 || px > w + 40) return;
      const top = baseY - hAt(px), d = 46, cap = [[px - d, top + d * sl], [px - d * .45, top + d * sl * .7], [px - d * .15, top + d * sl * 1.05], [px + d * .25, top + d * sl * .75], [px + d * .55, top + d * sl * 1.0], [px + d, top + d * sl], [px, top]];
      c.save(); c.fillStyle = mix(PAPER, '#ffffff', .6); c.fill(poly(cap)); c.restore();
      L.push({id: 'snow' + k, points: cap.slice(0, 6), width: 1.2, opacity: .45});
      L.push({id: 'face' + k, points: [[px + 4, top + 10], [px + 18, top + 60], [px + 30, top + 120]], width: 1, opacity: .3});
    });
    pen(c, id, L);
  }
  function groundPath(yf, x0 = -40, x1 = W + 40, bottom = H + 60) { const pts = []; for (let x = x0; x <= x1; x += 40) pts.push([x, yf(x)]); return {pts, path: poly([...pts, [x1, bottom], [x0, bottom]])}; }
  function grassField(c, id, yf, seed, {x0 = -40, x1 = W + 40, bottom = H + 60} = {}) {
    const g = groundPath(yf, x0, x1, bottom);
    shade(c, g.path, C.grass, {base: .4, opacity: .5, seed, tone: (x, y) => .6 + .35 * clamp((y - yf(x)) / 260, 0, 1)});
    pen(c, id, [{id: 'line', points: g.pts, width: 2.4, opacity: .8}]);
    tufts(c, id + '/tufts', x0 + 40, x1 - 40, x => yf(x) + 30 + hash(Math.floor(x), seed) * 120, 70, seed);
  }
  const layers = new Map();
  function cached(name, w, h, draw) {
    const k = name + '@' + S;
    if (!layers.has(k)) { const L = layer(w, h), g = L.getContext('2d'); g.setTransform(S, 0, 0, S, 0, 0); draw(g); layers.set(k, {L, w, h}); }
    return layers.get(k);
  }
  const put = (c, name, w, h, draw, x = 0, y = 0) => { const {L} = cached(name, w, h, draw); c.drawImage(L, x, y, w, h); };
  function paperFill(g, w, h) { g.fillStyle = PAPER; g.fillRect(0, 0, w, h); grain(g, rectP(0, 0, w, h), [0, 0, w, h], Math.round(1400 * w * h / (W * H)), '#b9ad97', .06, 87, 1.6); }

  // ---- sets
  const titleGround = x => 900 + Math.sin(x / 420) * 18 - (x > 1300 ? (x - 1300) * .05 : 0);
  function title(c) {
    put(c, 'title', W, H, g => {
      paperFill(g, W, H);
      sky(g, C.sky, {bottom: 760, seed: 11, strength: .5});
      cloud(g, 'c1', 360, 250, 300, 80, 4); cloud(g, 'c2', 1500, 190, 360, 90, 7); cloud(g, 'c3', 1130, 360, 200, 50, 9, {alpha: .8});
      mountains(g, 'mfar', 700, C.mountFar, 21, 220); mountains(g, 'mnear', 780, C.mount, 23, 150);
      grassField(g, 'meadow', titleGround, 31);
      rock(g, 'rock', 470, titleGround(470) + 30, 300, 120, 5);
    });
  }
  // meadow: young dragons on a boulder at right, flat ground for the attempt
  const MEADOW_Y = 860;
  const meadowGround = x => MEADOW_Y + Math.sin(x / 300) * 6 + (x < 200 ? (200 - x) * .08 : 0);
  function meadow(c) {
    put(c, 'meadow', W, H, g => {
      paperFill(g, W, H);
      sky(g, C.sky, {bottom: 700, seed: 41, strength: .48});
      cloud(g, 'c1', 300, 200, 280, 70, 14); cloud(g, 'c2', 980, 140, 330, 80, 17, {alpha: .9}); cloud(g, 'c3', 1650, 260, 240, 60, 19);
      mountains(g, 'mfar', 640, C.mountFar, 42, 190); mountains(g, 'mnear', 720, C.mount, 43, 110);
      grassField(g, 'meadow', meadowGround, 44);
      rock(g, 'boulder', 1640, MEADOW_Y + 6, 470, 190, 8);
    });
  }
  function closeMeadow(c) {
    put(c, 'closeMeadow', W, H, g => {
      paperFill(g, W, H);
      sky(g, C.sky, {bottom: 640, seed: 51, strength: .45});
      cloud(g, 'c1', 520, 180, 320, 80, 24); cloud(g, 'c2', 1500, 240, 260, 64, 27);
      mountains(g, 'mnear', 620, C.mountFar, 52, 130);
      grassField(g, 'meadow', x => 900 + Math.sin(x / 500) * 10, 54);
    });
  }
  // night: dark blue coloured pencil, a moon and a hill
  const NIGHT_HILL = x => 820 + Math.pow((x - 760) / 520, 2) * 160;
  function night(c) {
    put(c, 'night', W, H, g => {
      paperFill(g, W, H);
      const all = rectP(-20, -20, W + 40, H + 40);
      shade(g, all, C.night, {base: .82, spacing: 4, length: 24, width: 1.6, opacity: .55, seed: 61, tone: () => .95, box: [-40, -40, W + 80, H + 80]});
      shade(g, all, C.nightDeep, {base: 0, spacing: 6, length: 20, width: 1.2, opacity: .35, seed: 62, dir: -.4, tone: (x, y) => clamp(1 - y / 900, 0, .8), box: [-40, -40, W + 80, H + 80]});
      // moon with a halo of paper showing through
      g.save(); g.globalAlpha = .18; g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(1460, 250, 170, 0, TAU); g.fill(); g.restore();
      const mp = new Path2D(); mp.arc(1460, 250, 92, 0, TAU);
      g.fillStyle = mix(PAPER, C.moon, .9); g.fill(mp);
      shade(g, mp, '#d9c27a', {base: 0, opacity: .35, seed: 63, tone: (x, y) => clamp((x - 1420) / 140, 0, .8)});
      const ring = Array.from({length: 25}, (_, i) => [1460 + Math.cos(i / 24 * TAU) * 92, 250 + Math.sin(i / 24 * TAU) * 92]);
      pen(g, 'moon', [{id: 'rim', points: ring, width: 2.2, opacity: .7}, {id: 'cr1', points: [[1430, 220], [1445, 214], [1452, 228], [1438, 236], [1430, 220]], width: 1.2, opacity: .5}, {id: 'cr2', points: [[1480, 280], [1496, 276], [1500, 292], [1484, 296], [1480, 280]], width: 1.1, opacity: .45}]);
      // stars
      const r = rng(64);
      for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * 640, s = 2 + r() * 5; if (Math.hypot(x - 1460, y - 250) < 200) continue;
        g.save(); g.strokeStyle = '#fff4cf'; g.globalAlpha = .55 + r() * .45; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.moveTo(x, y - s); g.lineTo(x, y + s); g.stroke();
        g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); g.restore(); }
      mountains(g, 'mnight', 760, '#3a3f78', 65, 120);
      const hill = groundPath(NIGHT_HILL);
      shade(g, hill.path, '#2f4a4a', {base: .75, spacing: 4, opacity: .55, seed: 66, tone: () => .95});
      pen(g, 'hill', [{id: 'line', points: hill.pts, width: 2.4, opacity: .7}], {color: '#c9d4e8'});
      tufts(g, 'ht', 300, 1250, x => NIGHT_HILL(x) + 4, 30, 67, '#7d9a8a');
    });
  }
  // sketchbook pages for the training days
  const PAGE_Y = 840;
  function page(c, day) {
    put(c, 'page' + day, W, H, g => {
      paperFill(g, W, H);
      g.save(); g.globalAlpha = .5; g.strokeStyle = '#c9c0ad'; g.lineWidth = 1;
      for (let y = 140; y < H; y += 46) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.strokeStyle = '#e3a2a2'; g.beginPath(); g.moveTo(150, 0); g.lineTo(150, H); g.stroke(); g.restore();
      const gy = x => PAGE_Y + Math.sin(x / 260 + day) * 6;
      sky(g, C.sky, {bottom: 560, seed: 70 + day, strength: .25});
      grassField(g, 'pg' + day, gy, 71 + day);
      if (day === 1) { rock(g, 'stone', 520, PAGE_Y + 4, 230, 110, 12); bush(g, 'bush', 1380, PAGE_Y + 6, 77); }
      if (day === 2) { stump(g, 'stump', 1240, PAGE_Y + 4); }
      if (day === 3) { log(g, 'log', 960, PAGE_Y + 2); }
    });
  }
  function bush(g, id, cx, by, seed) {
    const pts = [];
    for (let i = 0; i <= 14; i++) { const a = Math.PI * (1 - i / 14), rr = 1 + .12 * Math.sin(i * 2.7 + seed); pts.push([cx + Math.cos(a) * 170 * rr, by - Math.sin(a) * 120 * rr]); }
    const path = poly([...pts, [cx + 170, by + 6], [cx - 170, by + 6]]);
    shade(g, path, C.bush, {base: .5, opacity: .6, seed, tone: (x, y) => .6 + .35 * clamp((y - by + 120) / 140, 0, 1)});
    const L = [{id: 'outline', points: pts, width: 2.4}];
    for (let i = 0; i < 12; i++) { const a = Math.PI * (.15 + .7 * hash(i, seed)), x = cx + Math.cos(a) * 110 * hash(i + 3, seed), y = by - 30 - Math.sin(a) * 70 * hash(i + 5, seed); L.push({id: 'leaf' + i, points: [[x - 8, y + 4], [x, y - 6], [x + 9, y + 3]], width: 1.3, opacity: .6}); }
    pen(g, id, L, {color: '#2c4a26'});
  }
  function stump(g, id, cx, by) {
    const top = by - 110, path = poly([[cx - 90, by], [cx - 80, top + 8], [cx + 80, top + 8], [cx + 92, by]]);
    shade(g, path, C.wood, {base: .5, opacity: .6, seed: 81, dir: -1.45});
    const ring = Array.from({length: 21}, (_, i) => [cx + Math.cos(i / 20 * TAU) * 80, top + 8 + Math.sin(i / 20 * TAU) * 20]);
    const tp = poly(ring); g.fillStyle = mix(PAPER, '#e0bf8a', .7); g.fill(tp);
    pen(g, id, [{id: 'l', points: [[cx - 80, top + 8], [cx - 86, by - 40], [cx - 96, by + 2]], width: 2.4}, {id: 'r', points: [[cx + 80, top + 8], [cx + 84, by - 40], [cx + 98, by + 2]], width: 2.4},
      {id: 'top', points: ring, width: 2.2}, {id: 'ring', points: ring.map(([x, y]) => [cx + (x - cx) * .5, top + 8 + (y - top - 8) * .5]), width: 1.2, opacity: .6},
      {id: 'b1', points: [[cx - 40, top + 40], [cx - 44, by - 10]], width: 1.1, opacity: .5}, {id: 'b2', points: [[cx + 30, top + 36], [cx + 34, by - 14]], width: 1.1, opacity: .5}]);
  }
  function log(g, id, cx, by) {
    const path = poly([[cx - 200, by], [cx - 200, by - 80], [cx + 200, by - 80], [cx + 200, by]]);
    shade(g, path, C.wood, {base: .5, opacity: .6, seed: 91, dir: -.1});
    const end = Array.from({length: 17}, (_, i) => [cx + 200 + Math.cos(i / 16 * TAU) * 24, by - 40 + Math.sin(i / 16 * TAU) * 40]);
    g.fillStyle = mix(PAPER, '#e0bf8a', .7); g.fill(poly(end));
    pen(g, id, [{id: 'top', points: [[cx - 200, by - 80], [cx, by - 84], [cx + 200, by - 80]], width: 2.4}, {id: 'bot', points: [[cx - 200, by], [cx + 200, by]], width: 2.4},
      {id: 'end', points: end, width: 2.2}, {id: 'lend', points: [[cx - 200, by - 80], [cx - 222, by - 40], [cx - 200, by]], width: 2.2},
      {id: 'g1', points: [[cx - 150, by - 55], [cx - 40, by - 52]], width: 1, opacity: .5}, {id: 'g2', points: [[cx - 20, by - 30], [cx + 120, by - 26]], width: 1, opacity: .5}]);
  }
  // the high cliff: two screens tall so the camera can tilt from the clouds to the sky
  const CLIFF_TOP = 1840, CLIFF_EDGE = 1180, CLIFF_H = 2160 + 400;
  function cliff(c, y0 = 0) {
    put(c, 'cliff', W, CLIFF_H, g => {
      paperFill(g, W, CLIFF_H);
      sky(g, C.skyDeep, {top: 0, bottom: CLIFF_H - 300, seed: 101, strength: .42});
      cloud(g, 'hi1', 400, 420, 340, 90, 31); cloud(g, 'hi2', 1500, 760, 380, 90, 33); cloud(g, 'hi3', 900, 1150, 260, 60, 35, {alpha: .9});
      mountains(g, 'mfar', 2040, C.mountFar, 103, 230);
      for (let i = 0; i < 6; i++) cloud(g, 'sea' + i, 1150 + i * 180 - (i % 2) * 60, 2250 + (i % 3) * 50, 320, 90, 40 + i);
      // cliff mass
      const top = [[-40, CLIFF_TOP + 6], [300, CLIFF_TOP - 4], [700, CLIFF_TOP + 4], [1000, CLIFF_TOP - 2], [CLIFF_EDGE, CLIFF_TOP + 2]];
      const face = [[CLIFF_EDGE, CLIFF_TOP + 2], [CLIFF_EDGE + 20, CLIFF_TOP + 80], [CLIFF_EDGE - 20, CLIFF_TOP + 170], [CLIFF_EDGE + 10, CLIFF_TOP + 300], [CLIFF_EDGE - 40, CLIFF_TOP + 420], [CLIFF_EDGE - 10, CLIFF_H + 20]];
      const path = poly([...top, ...face.slice(1), [-40, CLIFF_H + 20]], true);
      shade(g, path, C.cliff, {base: .45, opacity: .55, seed: 104, tone: (x, y) => .6 + .35 * clamp((x - 700) / 500, 0, 1)});
      shade(g, path, C.cliffDark, {base: 0, opacity: .3, spacing: 6, seed: 105, dir: -.3, tone: (x, y) => clamp((x - 900) / 300, 0, .8)});
      const grassTop = poly([...top, ...top.slice().reverse().map(([x, y]) => [x, y + 26])]);
      shade(g, grassTop, C.grass, {base: .55, opacity: .6, seed: 106});
      const L = [{id: 'top', points: top, width: 2.6}, {id: 'face', points: face, width: 2.6, corner: 1.2}];
      for (let i = 0; i < 8; i++) { const y = CLIFF_TOP + 80 + i * 60, x0 = 100 + hash(i, 3) * 200; L.push({id: 'strata' + i, points: [[x0, y], [x0 + 300, y + 6], [x0 + 650, y - 4], [CLIFF_EDGE - 40 - hash(i, 4) * 60, y + 4]], width: 1.2, opacity: .35}); }
      pen(g, 'cliff', L);
      tufts(g, 'ct', 0, CLIFF_EDGE - 30, () => CLIFF_TOP + 4, 40, 107);
    }, 0, y0);
  }
  // sunset sky for the flight and the finale
  function sunset(c, y0 = 0, withCliff = false) {
    const name = withCliff ? 'sunsetCliff' : 'sunset';
    put(c, name, W, H + 200, g => {
      const h = H + 200; paperFill(g, W, h);
      const all = rectP(-20, -20, W + 40, h + 40), box = [-40, -40, W + 80, h + 80];
      shade(g, all, C.sunsetD, {base: .25, spacing: 5, length: 24, opacity: .45, seed: 111, tone: (x, y) => clamp(1 - y / 500, 0, .9), box});
      shade(g, all, C.sunsetC, {base: 0, spacing: 5, length: 24, opacity: .45, seed: 112, dir: -.8, tone: (x, y) => clamp(1 - Math.abs(y - 520) / 380, 0, .9), box});
      shade(g, all, C.sunsetA, {base: 0, spacing: 4.5, length: 24, opacity: .55, seed: 113, dir: -1.2, tone: (x, y) => clamp(1 - Math.abs(y - 860) / 360, 0, .95), box});
      // sun
      g.save(); g.globalAlpha = .35; g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(1500, 880, 230, 0, TAU); g.fill(); g.restore();
      const sp = new Path2D(); sp.arc(1500, 880, 120, 0, TAU); g.fillStyle = mix(PAPER, '#ffd56b', .85); g.fill(sp);
      pen(g, 'sun', [{id: 'rim', points: Array.from({length: 25}, (_, i) => [1500 + Math.cos(i / 24 * TAU) * 120, 880 + Math.sin(i / 24 * TAU) * 120]), width: 2, opacity: .5}], {color: '#9a5a2a'});
      cloud(g, 'c1', 380, 300, 360, 70, 51, {tint: '#ffe3d6'}); cloud(g, 'c2', 1150, 420, 300, 60, 53, {tint: '#ffd9cf'}); cloud(g, 'c3', 650, 700, 420, 80, 55, {tint: '#ffe9d0'});
      mountains(g, 'msun', 1020, '#9c79a8', 114, 160);
      if (withCliff) {
        const top = [[-40, 860], [400, 850], [800, 858], [1100, 852], [1260, 860]];
        const face = [[1260, 860], [1290, 960], [1250, 1080], [1280, h + 20]];
        const path = poly([...top, ...face.slice(1), [-40, h + 20]]);
        shade(g, path, '#8d6f6a', {base: .5, opacity: .55, seed: 115});
        const grassTop = poly([...top, ...top.slice().reverse().map(([x, y]) => [x, y + 24])]);
        shade(g, grassTop, '#7aa45e', {base: .55, opacity: .6, seed: 116});
        pen(g, 'scliff', [{id: 'top', points: top, width: 2.6}, {id: 'face', points: face, width: 2.6}]);
        tufts(g, 'st', 0, 1220, () => 860, 30, 117, '#3f6a35');
      }
    }, 0, y0);
  }
  return {C, INK, PAPER, pen, shade, poly, cloud, title, titleGround, meadow, meadowGround, MEADOW_Y, closeMeadow, night, NIGHT_HILL, page, PAGE_Y, cliff, CLIFF_TOP, CLIFF_EDGE, sunset};
})();
