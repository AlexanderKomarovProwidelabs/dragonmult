'use strict';
// Effects, props and lettering for "Дракончик". Pure functions of time and seed.
// Fire and smoke are new drawings on twos: their shape seed is the 12 fps drawing index.
const FX = (() => {
  const INK = '#2e2823', PAPER = '#f5f0e5';
  const drawingIndex = t => Math.floor(t * 12 + 1e-6);
  // ---- lettering (Caveat, write-on from the left)
  function write(c, text, x, y, size, prog = 1, {color = INK, align = 'center', weight = 700, rot = 0, alpha = 1, shadow = '#e8a54a'} = {}) {
    if (prog <= 0) return;
    c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha *= alpha;
    c.font = `${weight} ${size}px Caveat`; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    const w = c.measureText(text).width, x0 = align === 'center' ? -w / 2 : align === 'right' ? -w : 0;
    c.beginPath(); c.rect(x0 - 20, -size * 1.2, (w + 40) * clamp(prog, 0, 1), size * 1.8); c.clip();
    if (shadow) { c.fillStyle = shadow; c.globalAlpha *= .55; c.fillText(text, x0 + size * .04, size * .04); c.globalAlpha /= .55; }
    c.fillStyle = color; c.fillText(text, x0, 0);
    c.restore();
  }
  // ---- small pencil helpers
  function line(c, pts, {w = 2, color = INK, alpha = 1, close = false} = {}) {
    if (pts.length < 2) return;
    c.save(); c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha *= alpha;
    const q = smoothPts(pts, close, 3, Math.PI); c.beginPath(); q.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); if (close) c.closePath(); c.stroke();
    c.globalAlpha *= .45; c.lineWidth = w * .5; c.beginPath(); q.forEach((p, i) => i ? c.lineTo(p[0] + .8, p[1] - .6) : c.moveTo(p[0] + .8, p[1] - .6)); c.stroke();
    c.restore();
  }
  const circlePts = (x, y, rx, ry = rx, n = 16, seed = 0, amp = 0) => Array.from({length: n}, (_, i) => { const a = i / n * TAU, r = 1 + (hash(i, seed) - .5) * amp; return [x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r]; });
  const pathOf = pts => { const q = smoothPts(pts, true, 3, Math.PI), p = new Path2D(); q.forEach((v, i) => i ? p.lineTo(...v) : p.moveTo(...v)); p.closePath();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of q) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    p.box = [x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8]; return p; };
  function hatchFill(c, path, color, {base = .4, opacity = .5, seed = 1, spacing = 4, dir = -1, tone = () => .85, box = path.box || [-200, -200, 2400, 1600]} = {}) {
    c.save(); c.fillStyle = mix(PAPER, color, base); c.fill(path);
    formHatch(c, path, box, {seed, color, spacing, length: 14, width: 1.2, opacity, tone, direction: () => dir}); c.restore();
  }
  // ---- dust puff on impact (t: seconds since impact)
  function dust(c, x, y, t, seed = 1, k = 1) {
    if (t < 0 || t > 1.1) return;
    const u = drawingIndex(t) / 12, fade = 1 - clamp(u / 1.1, 0, 1);
    for (let i = 0; i < 7; i++) {
      const side = i % 2 ? 1 : -1, sp = (.5 + hash(i, seed) * .8), px = x + side * (30 + u * 220 * sp) * k, py = y - (8 + u * 70 * hash(i + 9, seed)) * k, r = (14 + u * 50 * sp) * k;
      const p = circlePts(px, py, r, r * .75, 12, seed + i, .25);
      c.save(); c.globalAlpha *= fade; hatchFill(c, pathOf(p), '#c9b79a', {base: .35, opacity: .35, seed: seed + i}); line(c, p, {w: 1.6, alpha: .6, close: true}); c.restore();
    }
  }
  // ---- stars circling a dazed head
  function star(c, x, y, r, {fill = '#ffd34d', alpha = 1, rot = 0} = {}) {
    const pts = Array.from({length: 10}, (_, i) => { const a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; return [x + Math.cos(a) * rr, y + Math.sin(a) * rr]; });
    c.save(); c.globalAlpha *= alpha; const p = new Path2D(); pts.forEach((v, i) => i ? p.lineTo(...v) : p.moveTo(...v)); p.closePath();
    c.fillStyle = mix(PAPER, fill, .85); c.fill(p); c.strokeStyle = '#8a6420'; c.lineWidth = 1.6; c.lineJoin = 'round'; c.stroke(p); c.restore();
  }
  function dizzy(c, x, y, t, k = 1) {
    const u = drawingIndex(t) / 12;
    for (let i = 0; i < 3; i++) { const a = u * 5 + i * TAU / 3; star(c, x + Math.cos(a) * 60 * k, y + Math.sin(a) * 16 * k, (12 + (Math.sin(a) + 1) * 3) * k, {rot: u * 3}); }
  }
  // ---- smoke puffs
  function smoke(c, x, y, t, {seed = 1, n = 4, k = 1, rise = 90, dir = 0, life = 1.4, color = '#a8a29a'} = {}) {
    if (t < 0 || t > life) return;
    const u = drawingIndex(t) / 12;
    for (let i = 0; i < n; i++) {
      const d = i * .12, v = clamp((u - d) / (life - d), 0, 1); if (u < d) continue;
      const px = x + Math.cos(dir) * v * 80 * k + (hash(i, seed) - .5) * 30 * k, py = y + Math.sin(dir) * v * 80 * k - v * rise * k, r = (8 + v * 26 + i * 3) * k;
      const p = circlePts(px, py, r, r * .85, 12, seed * 7 + i, .3);
      c.save(); c.globalAlpha *= (1 - v) * .9; hatchFill(c, pathOf(p), color, {base: .45, opacity: .4, seed: seed + i}); line(c, p, {w: 1.4, alpha: .5, close: true}); c.restore();
    }
  }
  // ---- flame tongue from a mouth. dir in radians, len in units; new shape every drawing
  function flame(c, x, y, dir, len, t, {width = 40, seed = 1, alpha = 1} = {}) {
    if (len <= 2) return;
    const di = drawingIndex(t), N = 14;
    const shape = (scaleW, s) => {
      const top = [], bot = [];
      for (let i = 0; i <= N; i++) { const u = i / N, wv = width * scaleW * Math.pow(Math.sin(Math.PI * Math.pow(u, .55)), .9) * (1 - u * .25) * (1 + .25 * (hash(i + di * 31, seed + s) - .5)), wave = Math.sin(u * 7 - di * 1.7 + s) * width * .18 * u;
        top.push([u * len, -wv + wave]); bot.push([u * len, wv + wave]); }
      // flickering tips at the far end
      const tip = [[len * 1.06, (hash(di, seed) - .5) * width * .3]];
      return [...top, ...tip, ...bot.reverse()];
    };
    c.save(); c.translate(x, y); c.rotate(dir); c.globalAlpha *= alpha;
    const layers = [[1, '#f07a3a', .9], [.68, '#ffb347', .95], [.38, '#fff0a0', 1]];
    layers.forEach(([sw, col, a], li) => { const p = pathOf(shape(sw, li * 3)); c.save(); c.globalAlpha *= a; c.fillStyle = mix(PAPER, col, .9); c.fill(p);
      formHatch(c, p, p.box, {seed: seed + li + di, color: li ? '#ffd27a' : '#d9532b', spacing: 4, length: 12, width: 1.1, opacity: .45, tone: () => .8, direction: () => -.6}); c.restore(); });
    line(c, shape(1, 0), {w: 1.8, color: '#a8401f', alpha: .75, close: true});
    c.restore();
  }
  function spark(c, x, y, r, alpha = 1) {
    c.save(); c.globalAlpha *= alpha; c.strokeStyle = '#e88a2a'; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; c.moveTo(x + Math.cos(a) * r * .3, y + Math.sin(a) * r * .3); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.moveTo(x - Math.cos(a) * r * .3, y - Math.sin(a) * r * .3); c.lineTo(x - Math.cos(a) * r, y - Math.sin(a) * r); }
    c.stroke(); c.fillStyle = '#ffe07a'; c.beginPath(); c.arc(x, y, r * .25, 0, TAU); c.fill(); c.restore();
  }
  // ---- props
  function sticks(c, x, y, {seed = 4} = {}) {
    const L = [[-70, -8, 60, -40], [-60, -46, 70, -6], [-20, 2, 10, -70], [30, 0, -10, -66], [-80, 2, 80, 4]];
    L.forEach(([a, b, d, e], i) => { const p = [[x + a, y + b], [x + d, y + e]], n = [-(e - b), d - a], l = Math.hypot(...n), o = [n[0] / l * 9, n[1] / l * 9];
      const poly = pathOf([[x + a + o[0], y + b + o[1]], [x + d + o[0], y + e + o[1]], [x + d - o[0], y + e - o[1]], [x + a - o[0], y + b - o[1]]]);
      hatchFill(c, poly, '#a0714a', {seed: seed + i, opacity: .55}); line(c, [[x + a + o[0], y + b + o[1]], [x + d + o[0], y + e + o[1]]], {w: 1.8}); line(c, [[x + a - o[0], y + b - o[1]], [x + d - o[0], y + e - o[1]]], {w: 1.8}); });
    const stones = Array.from({length: 7}, (_, i) => [x - 105 + i * 35, y + 6]);
    stones.forEach(([sx, sy], i) => { const p = circlePts(sx, sy, 18, 12, 10, i + 50, .2); hatchFill(c, pathOf(p), '#9b948b', {seed: 60 + i, opacity: .5}); line(c, p, {w: 1.6, close: true}); });
  }
  function candle(c, x, y, lit, t, {k = 1} = {}) {
    const w = 26 * k, h = 110 * k, body = pathOf([[x - w / 2, y], [x - w / 2, y - h], [x + w / 2, y - h], [x + w / 2, y]]);
    c.save(); c.fillStyle = mix(PAPER, '#f6e7c8', .9); c.fill(body); formHatch(c, body, [x - 40, y - h - 10, 80, h + 20], {seed: 9, color: '#d9b98a', spacing: 4, length: 10, width: 1, opacity: .4, tone: px => clamp((px - x) / w + .4, 0, .9), direction: () => -1.4}); c.restore();
    line(c, [[x - w / 2, y], [x - w / 2, y - h]], {w: 1.8}); line(c, [[x + w / 2, y], [x + w / 2, y - h]], {w: 1.8});
    line(c, circlePts(x, y - h, w / 2, 5 * k, 12), {w: 1.5, close: true});
    line(c, [[x, y - h], [x + 2, y - h - 14 * k]], {w: 1.6});
    if (lit > 0) {
      const di = drawingIndex(t), fl = 1 + .12 * Math.sin(di * 1.9), s = lit * fl;
      c.save(); c.globalAlpha *= .25 * lit; c.fillStyle = '#ffe9a6'; c.beginPath(); c.arc(x, y - h - 24 * k, 70 * k * s, 0, TAU); c.fill(); c.restore();
      flame(c, x + 2, y - h - 10 * k, -Math.PI / 2 + Math.sin(di * 1.3) * .08, 46 * k * s, t, {width: 12 * k * s, seed: 31});
    }
  }
  function heart(c, x, y, s, {alpha = 1, color = '#e5677a'} = {}) {
    const pts = Array.from({length: 24}, (_, i) => { const a = i / 24 * TAU; return [x + 16 * Math.pow(Math.sin(a), 3) * s, y - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * s]; });
    c.save(); c.globalAlpha *= alpha; hatchFill(c, pathOf(pts), color, {base: .6, opacity: .6, seed: 3, box: [x - 40 * s, y - 40 * s, 80 * s, 80 * s]}); line(c, pts, {w: 2, close: true, color: '#8c2c3c'}); c.restore();
  }
  function shootingStar(c, x0, y0, x1, y1, u) {
    if (u <= 0 || u >= 1) return;
    const e = easeOut(u), x = lerp(x0, x1, e), y = lerp(y0, y1, e), tail = .22;
    const tx = lerp(x0, x1, Math.max(0, e - tail)), ty = lerp(y0, y1, Math.max(0, e - tail));
    const g = c.createLinearGradient(tx, ty, x, y); g.addColorStop(0, 'rgba(255,244,200,0)'); g.addColorStop(1, 'rgba(255,248,215,.95)');
    c.save(); c.strokeStyle = g; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(tx, ty); c.lineTo(x, y); c.stroke(); c.restore();
    star(c, x, y, 14, {fill: '#fff3b0', alpha: 1 - Math.max(0, u - .8) * 5});
  }
  function leaves(c, x, y, t, seed = 3) {
    if (t < 0 || t > 1.6) return;
    const u = drawingIndex(t) / 12;
    for (let i = 0; i < 9; i++) {
      const vx = (hash(i, seed) - .3) * 420, vy = -260 - hash(i + 4, seed) * 260, px = x + vx * u, py = y + vy * u + 520 * u * u, a = u * 6 * (hash(i + 7, seed) - .5) + i;
      c.save(); c.translate(px, py); c.rotate(a); c.globalAlpha *= 1 - clamp((u - 1.1) / .5, 0, 1);
      const p = [[-12, 0], [0, -7], [12, 0], [0, 7]]; hatchFill(c, pathOf(p), '#6aa957', {seed: i, opacity: .6, box: [-20, -20, 40, 40]}); line(c, p, {w: 1.4, close: true, color: '#2c4a26'}); c.restore();
    }
  }
  function puffRing(c, x, y, t, k = 1) {   // a small sad "пф"
    if (t < 0 || t > 1.2) return;
    const u = drawingIndex(t) / 12, r = (10 + u * 26) * k;
    c.save(); c.globalAlpha *= 1 - u / 1.2; line(c, circlePts(x + u * 60 * k, y - u * 30 * k, r, r * .7, 14, 5, .2), {w: 2.2, close: true, color: '#8a847c'}); c.restore();
  }
  // ---- the signature flame: a spiral that blooms into a sun-star
  function bloom(c, x, y, u, {k = 1, seed = 7, t = 0} = {}) {
    if (u <= 0) return;
    const di = drawingIndex(t), rays = 12, R = 210 * k * easeOutBack(clamp(u, 0, 1)), fade = 1;
    c.save();
    c.globalAlpha *= .3 * fade; c.fillStyle = '#ffe6a0'; c.beginPath(); c.arc(x, y, R * 1.5, 0, TAU); c.fill(); c.globalAlpha /= .3;
    for (let i = 0; i < rays; i++) { const a = i / rays * TAU + u * .6, l = R * (i % 2 ? .75 : 1) * (1 + .06 * Math.sin(di * 1.3 + i));
      flame(c, x + Math.cos(a) * R * .22, y + Math.sin(a) * R * .22, a, l, t + i * .37, {width: 22 * k, seed: seed + i}); }
    const core = circlePts(x, y, R * .3, R * .3, 18, seed, .1);
    hatchFill(c, pathOf(core), '#ffd04d', {base: .85, opacity: .5, seed, box: [x - R, y - R, 2 * R, 2 * R]}); line(c, core, {w: 2.2, close: true, color: '#b0601f'});
    for (let i = 0; i < 16; i++) { const a = hash(i, seed) * TAU, d = R * (1.15 + .5 * hash(i + 3, seed)) * clamp(u * 1.4, 0, 1); spark(c, x + Math.cos(a) * d, y + Math.sin(a) * d, 9 + 6 * hash(i + 5, seed), .5 + .5 * Math.sin(di * .9 + i)); }
    c.restore();
  }
  return {write, line, circlePts, pathOf, hatchFill, dust, star, dizzy, smoke, flame, spark, sticks, candle, heart, shootingStar, leaves, puffRing, bloom, drawingIndex};
})();
