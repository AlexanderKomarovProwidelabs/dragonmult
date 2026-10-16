'use strict';
// Original cartoon dragons. Each pose is redrawn as a whole drawing: the spine,
// head, wings and legs are construction, the visible marks are continuous
// contours rebuilt for that pose. Load after core.js, studio.js, cels.js, materials.js.
const DR = (() => {
  const INK = '#2e2823';
  const GREEN = {body: '#5ea84e', shade: '#2e6a33', belly: '#ecd57c', wing: '#a6d06f', horn: '#f1e6c4', blush: '#e5797c', mouth: '#a8463c'};
  const BLUE = {body: '#5d8fcb', shade: '#2f4f86', belly: '#d9e4f2', wing: '#9dbde3', horn: '#f1e6c4', blush: '#e5797c', mouth: '#a8463c'};
  const RED = {body: '#de7a4d', shade: '#94402a', belly: '#f2d48a', wing: '#f0a777', horn: '#f1e6c4', blush: '#d65a5a', mouth: '#a8463c'};
  const BASE = {
    age: 0, lean: 0, crouch: 0, lift: 0, puff: 0,
    neck: 0, neckLen: 1, head: 0, jaw: 0, mouth: 'smile', eye: 'open', lid: 0, brow: 0, look: [0.3, 0], blush: 0,
    tail: 0, tailCurl: 0, tailWave: 0,
    wing: 0, flap: 0,
    backFoot: [-48, 0], backFoot2: [-24, 0], frontFoot: [44, 0], frontFoot2: [62, 0],
    fly: false,
  };
  const rot = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
  const L = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const len = a => Math.hypot(a[0], a[1]), norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
  // Catmull-Rom through joints; radii follow the same parameter.
  function spine(J, R, per = 6) {
    const pts = [], rad = [];
    for (let s = 0; s < J.length - 1; s++) for (let k = 0; k < per; k++) {
      const t = k / per, p0 = J[Math.max(0, s - 1)], p1 = J[s], p2 = J[s + 1], p3 = J[Math.min(J.length - 1, s + 2)], t2 = t * t, t3 = t2 * t;
      const f = i => .5 * (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3);
      pts.push([f(0), f(1)]); rad.push(lerp(R[s], R[s + 1], t * t * (3 - 2 * t)));
    }
    pts.push(J[J.length - 1].slice()); rad.push(R[R.length - 1]);
    const up = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], t = norm(sub(b, a)); return [t[1], -t[0]]; });
    return {pts, rad, up, dorsal: pts.map((p, i) => add(p, mul(up[i], rad[i]))), ventral: pts.map((p, i) => sub(p, mul(up[i], rad[i])))};
  }
  const bbox = q => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of q) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0 - 6, y0 - 6, x1 - x0 + 12, y1 - y0 + 12]; };
  const poly = (pts, close = true) => { const q = smoothPts(pts, close, 3, Math.PI), p = new Path2D(); q.forEach((v, i) => i ? p.lineTo(...v) : p.moveTo(...v)); if (close) p.closePath(); p.box = bbox(q); return p; };
  const arcPts = (c, rx, ry, a0, a1, n, ang = 0) => Array.from({length: n}, (_, i) => { const a = lerp(a0, a1, i / (n - 1)); return add(c, rot([Math.cos(a) * rx, Math.sin(a) * ry], ang)); });
  const limb = (a, b, wa, wb) => { const d = norm(sub(b, a)), n = [d[1], -d[0]]; return {l: [add(a, mul(n, wa)), add(b, mul(n, wb))], r: [sub(a, mul(n, wa)), sub(b, mul(n, wb))]}; };

  function build(pose) {
    const P = {...BASE, ...pose}, g = P.age, strokes = [], fills = [], fx = {};
    const S = (id, points, width = 1.7, opacity = 1, extra = {}) => strokes.push({id, points, width, opacity, ...extra});
    const F = (layer, path, color, opts = {}) => fills.push({layer, path, color, ...opts});
    const k = lerp(1, 1.18, g);            // body proportions grow, the head grows less
    const hs = lerp(1, .9, g), ws = lerp(.5, 1.35, g), legK = lerp(1, 1.25, g), tailK = lerp(1, 1.35, g), neckK = P.neckLen * lerp(1, 1.5, g);
    // ---- body frame: hip pivot, lean, crouch and lift
    const pivot = [-55 * k, -60 * k];
    const T = p => { const q = add(rot(sub(p, pivot), P.lean), pivot); return [q[0], q[1] + P.crouch * 26 - P.lift]; };
    const hip = [-55 * k, -60 * k], belly = [-5 * k, (-66 - P.puff * 6) * k], chest = [40 * k, (-80 - P.puff * 4) * k];
    const nl = P.neck, neckBase = add(chest, mul(rot([14, -22], nl), neckK * k)), neckTop = add(neckBase, mul(rot([10, -24], nl), neckK * k));
    // tail as a bending chain from the hip
    let a = Math.PI + .35 + P.tail, tp = hip.slice(); const tailJ = [];
    [70, 62, 52].forEach((s, i) => { a += (P.tailCurl * .55 + P.tailWave * Math.sin(i * 1.7 + .5) * .35) * (i ? 1 : .4); tp = add(tp, mul([Math.cos(a), Math.sin(a)], s * tailK)); tailJ.unshift(tp); });
    const puffR = 1 + P.puff * .14;
    const J = [...tailJ, hip, belly, chest, neckBase, neckTop].map(T);
    const R = [1.5, 8, 17 * k, 37 * k, 47 * k * puffR, 41 * k * puffR, 27 * k, 23 * k];
    const sp = spine(J, R, 6), n = sp.pts.length, iHip = 18, iBelly = 24, iChest = 30, iNeck = 36;
    const bodyPath = poly([...sp.dorsal, ...sp.ventral.slice().reverse()]);
    // ---- legs (far ones first, drawn lighter, then body, then near ones)
    const leg = (side, far) => {
      const back = side === 'back', op = far ? .6 : 1, tag = (far ? 'far-' : '') + side;
      let foot = back ? (far ? P.backFoot2 : P.backFoot) : (far ? P.frontFoot2 : P.frontFoot);
      if (P.fly) foot = T(foot.map((v, i) => v * k + (i ? 26 * 0 : 0)));
      const root = back ? add(sp.pts[iHip], [6 * k + (far ? 18 : 0), 10 * k]) : add(sp.pts[iChest], mul(sp.up[iChest], -sp.rad[iChest] * .45 + 0)).map((v, i) => v + (far ? [14, -4][i] : 0));
      const A = back ? 24 * legK : 24 * legK, B = back ? 23 * legK : 24 * legK;
      const ankleT = back ? add(foot, [-10 * legK, -15 * legK]) : add(foot, [-4 * legK, -11 * legK]);
      const s = solveLimb(root, ankleT, A, B, back ? -1 : 1), knee = s.joint, ankle = s.end, fdir = 1;
      const wA = back ? 18 * legK : 13 * legK, wB = back ? 13 * legK : 11 * legK, wC = back ? 10 * legK : 9 * legK;
      const up1 = limb(root, knee, wA, wB), lo = limb(knee, ankle, wB, wC);
      // haunch: one continuous arc around the thigh
      if (back) {
        const mid = L(root, knee, .45), ang = Math.atan2(knee[1] - root[1], knee[0] - root[0]);
        const h = arcPts(mid, A * .85, 24 * legK, -2.6, 1.6, 12, ang);
        S(tag + '/haunch', h, 2.6, op);
        F(far ? 'far' : 'near', poly(arcPts(mid, A * .85, 24 * legK, 0, TAU, 18, ang)), 'body', {op});
      }
      const f0 = foot, toe = add(f0, [22 * legK * fdir, 0]);
      const footPts = back
        ? [add(ankle, [-wC, 2]), [f0[0] - 16 * legK, f0[1] - 3], [f0[0] + 6, f0[1]], [toe[0], toe[1] - 1], [toe[0] + 5, toe[1] - 7], [toe[0] - 2, toe[1] - 13], [f0[0] + 2, f0[1] - 12 * legK], add(ankle, [wC, -2])]
        : [add(ankle, [-wC, 2]), [f0[0] - 8 * legK, f0[1] - 2], [f0[0] + 8, f0[1]], [f0[0] + 16 * legK, f0[1] - 4], [f0[0] + 14 * legK, f0[1] - 12 * legK], add(ankle, [wC, -3])];
      S(tag + '/front', [up1.l[0], up1.l[1], lo.l[1]], 2.4, op);
      S(tag + '/rear', [up1.r[0], up1.r[1], lo.r[1]], 2.4, op);
      S(tag + '/foot', footPts, 2.4, op, {corner: 1.2});
      for (let i = 0; i < 3; i++) { const x = back ? toe[0] - 2 - i * 8 * legK : f0[0] + 14 * legK - i * 6 * legK, y = f0[1] - (back ? 1 : 2); S(tag + '/claw' + i, [[x, y - 5], [x + 4, y - 1], [x + 6, y + 1]], 1.1, op * .9); }
      F(far ? 'far' : 'near', poly([up1.l[0], up1.l[1], lo.l[1], ...footPts.slice(1, -1), lo.r[1], up1.r[1], up1.r[0]]), 'body', {op});
    };
    // ---- wings
    const wing = far => {
      const op = far ? .55 : 1, tag = far ? 'wing-far' : 'wing';
      const root = add(sub(sp.dorsal[iChest - 2], mul(sp.up[iChest - 2], 8)), far ? [16, -8] : [0, 0]);
      const open = {elbow: [-25, -75], wrist: [-5, -155], f1: [-150, -118], f2: [-145, -48], f3: [-98, 2]};
      const fold = {elbow: [-22, -16], wrist: [-50, -30], f1: [-104, -22], f2: [-90, -8], f3: [-66, 0]};
      const ang = -(1 - P.flap) * 1.05 + (far ? .12 : 0), sz = ws * (far ? .9 : 1);
      const at = key => { const v = L(fold[key], rot(open[key], ang * P.wing), P.wing); return add(root, mul(rot(v, P.lean), sz)); };
      const E = at('elbow'), Wr = at('wrist'), f1 = at('f1'), f2 = at('f2'), f3 = at('f3');
      const attach = add(sp.dorsal[iHip + 2], mul(sp.up[iHip + 2], -10));
      const scallop = (p, q, depth) => { const m = L(p, q, .5), toward = norm(sub(Wr, m)); return [p, add(L(p, q, .3), mul(toward, depth * .7)), add(m, mul(toward, depth)), add(L(p, q, .7), mul(toward, depth * .7)), q]; };
      const d = 18 * sz * P.wing + 4;
      const e1 = scallop(f1, f2, d), e2 = scallop(f2, f3, d), e3 = scallop(f3, attach, d * .8);
      F(far ? 'farwing' : 'wing', poly([root, E, Wr, ...e1, ...e2.slice(1), ...e3.slice(1)]), 'wing', {op});
      S(tag + '/arm', [root, E, Wr], 3, op);
      S(tag + '/arm2', [add(root, [4, 6]), add(E, [5, 4]), add(Wr, [3, 6])], 1, op * .6);
      S(tag + '/f1', [Wr, L(Wr, f1, .5), f1], 2.2, op); S(tag + '/f2', [Wr, L(Wr, f2, .55), f2], 1, op * .8); S(tag + '/f3', [Wr, L(Wr, f3, .5), f3], 1, op * .8);
      S(tag + '/e1', e1, 2, op); S(tag + '/e2', e2, 2, op); S(tag + '/e3', e3, 2, op);
      S(tag + '/thumb', [Wr, add(Wr, mul(norm(sub(Wr, E)), 10 * sz)), add(Wr, add(mul(norm(sub(Wr, E)), 12 * sz), [6, 2]))], 1.4, op, {corner: 1});
    };
    // ---- head
    const head = () => {
      const o = add(sp.pts[n - 1], [4, 4]), ang = P.head + P.lean * .6, sc = hs * k * 1.12;
      const X = pts => pts.map(p => add(o, rot(mul(p, sc), ang)));
      const jawA = P.jaw * .5, hinge = [42, 4], J2 = p => add(hinge, rot(sub(p, hinge), jawA));
      const top = [[-26, 20], [-44, -8], [-38, -48], [-12, -72], [22, -70], [46, -54], [62, -38], [90, -33], [110, -25], [118, -9], [112, 7]];
      const smile = P.mouth === 'smile' ? 8 : P.mouth === 'frown' ? -6 : P.mouth === 'grin' ? 12 : 0;
      const upperLip = [[112, 7], [88, 10], [66, 9 - smile * .2], [50, 6 - smile * .6], [44, 1 - smile]];
      const jaw = [[108, 10], [98, 20], [70, 26], [40, 27], [12, 26], [-12, 22]].map((p, i) => i < 4 ? J2(p) : p);
      S('head/top', X(top), 3, 1);
      S('head/jaw', X(jaw), 2.8, 1);
      const headFill = [...top, ...jaw.slice().reverse()];
      F('head', poly(X(headFill)), 'body');
      if (P.jaw > .05) {
        const lower = [[106, 12], [84, 16], [62, 16], [44, 6]].map(J2);
        S('head/lip', X(upperLip.slice(0, 4).concat([[44, 4]])), 1.5, 1);
        S('head/lowlip', X(lower), 1.4, 1);
        F('mouth', poly(X([...upperLip.slice(0, 4), [44, 4], ...lower.slice().reverse()])), 'mouth');
        S('head/tooth', X([[96, 9], [92, 15], [88, 9]]), .9, .9);
        fx.mouth = X([[110, 12]])[0]; fx.mouthDir = ang + jawA * .4;
      } else {
        S('head/lip', X(upperLip), 1.5, 1);
        if (P.mouth === 'grin') S('head/tooth', X([[92, 9], [89, 15], [85, 9]]), .9, .9);
        fx.mouth = X([[114, 6]])[0]; fx.mouthDir = ang;
      }
      fx.headAng = ang; fx.nose = X([[118, -10]])[0];
      S('head/nostril', X([[100, -20], [105, -24], [110, -20]]), 1.2, .9);
      S('head/frill', X([[-36, -30], [-62, -40], [-54, -26], [-68, -16], [-40, -12]]), 1.4, 1, {corner: .9});
      F('head', poly(X([[-36, -30], [-62, -40], [-54, -26], [-68, -16], [-40, -12]])), 'wing');
      const hornL = 1 + g * .22;
      const horn = (id, dx, dy, op) => { const h = [[-14 + dx, -64 + dy], [-30 + dx, -82 * hornL + dy], [-50 * hornL + dx, -96 * hornL + dy], [-40 + dx, -78 + dy], [-30 + dx, -58 + dy]]; S(id, X(h), 2.2, op, {corner: .8}); F(id.includes('far') ? 'hornfar' : 'horn', poly(X(h)), 'horn', {op}); };
      horn('horn-far', 16, -2, .6); horn('horn', 0, 0, 1);
      // face
      const ec = [16, -30], er = (P.eye === 'wide' ? 21 : 18);
      const browY = -56, b = P.brow;
      S('head/brow', X([[-4, browY + b * -2], [16, browY - 5 + b * 1], [34, browY + b * 9]]), 3, .95);
      if (P.eye === 'open' || P.eye === 'wide' || P.eye === 'sad') {
        S('eye', X(arcPts(ec, er, er * 1.05, -Math.PI, Math.PI, 18)), 2.6, 1, {close: true});
        fx.eyes = [{c: X([ec])[0], r: er * sc, pupil: X([[ec[0] + P.look[0] * 7, ec[1] + P.look[1] * 7]])[0], pr: (P.eye === 'wide' ? 8 : 10) * sc, lid: P.eye === 'sad' ? Math.max(.45, P.lid) : P.lid, ang, slant: P.eye === 'sad' ? -1 : P.brow > .3 ? 1 : 0, er}];
      } else if (P.eye === 'closed') S('eye', X([[-2, -30], [8, -22], [24, -21], [34, -28]]), 4, 1);
      else if (P.eye === 'happy') S('eye', X([[-2, -24], [8, -36], [24, -37], [34, -26]]), 4.2, 1);
      else if (P.eye === 'squeeze') S('eye', X([[0, -40], [24, -30], [2, -20]]), 4.2, 1, {corner: .8});
      if (P.blush > 0) for (let i = 0; i < 5; i++) S('blush' + i, X([[50 + i * 6, -4], [57 + i * 6, -16]]), 3.4, P.blush, {color: '#d9545c'});
      fx.blush = P.blush > 0;
    };
    // ---- body contour, belly plates and dorsal spikes
    const body = () => {
      S('body/back', sp.dorsal.slice(0, n - 1), 3, 1);
      S('body/belly', sp.ventral.slice(0, n - 1), 2.8, 1);
      const inner = sp.pts.map((p, i) => sub(p, mul(sp.up[i], sp.rad[i] * .42)));
      const b0 = 12, b1 = iNeck + 2;
      S('belly/inner', inner.slice(b0, b1), 1.1, .7);
      F('belly', poly([...inner.slice(b0, b1), ...sp.ventral.slice(b0, b1).reverse()]), 'belly');
      for (let i = b0 + 2; i < b1; i += 2) S('belly/plate' + i, [inner[i], L(inner[i], sp.ventral[i], .5), sp.ventral[i]], .9, .55);
      for (let i = 5; i < n - 3; i += 2) {
        const s = sp.rad[i] < 12 ? .5 : 1, h = (8 + Math.min(16, sp.rad[i] * .3)) * s, pA = sp.dorsal[i - 1], pB = sp.dorsal[i + 1], pT = add(add(sp.dorsal[i], mul(sp.up[i], h)), mul(norm(sub(pA, pB)), h * .35));
        S('spike' + i, [pA, pT, pB], 2, .95, {corner: .7});
        F('spikes', poly([pA, pT, pB]), 'shade', {op: .9});
      }
      // tail spade
      const tip = sp.pts[0], dir = norm(sub(sp.pts[0], sp.pts[2])), nn = [dir[1], -dir[0]], sz = 16 * tailK;
      const spade = [add(tip, mul(nn, 2)), add(add(tip, mul(nn, sz * .8)), mul(dir, -2)), add(tip, mul(dir, sz * 1.3)), add(add(tip, mul(nn, -sz * .8)), mul(dir, -2)), add(tip, mul(nn, -2))];
      S('tail/spade', spade, 2.4, 1, {corner: .9});
      F('spikes', poly(spade), 'shade', {op: .9});
      F('body', bodyPath, 'body');
      fx.chest = sp.pts[iChest]; fx.belly = sp.pts[iBelly]; fx.top = sp.dorsal[iBelly];
    };
    const order = [];
    const mark = name => order.push([name, strokes.length]);
    mark('far'); wing(true); leg('back', true); leg('front', true);
    mark('body'); body();
    mark('near'); leg('back', false);
    mark('head'); head();
    mark('arm'); leg('front', false);
    mark('wing'); if (P.wing > .02 || true) wing(false);
    return {strokes, fills, fx, order};
  }

  // ---- drawing: coloured-pencil fills under graphite contours
  const HATCH_BOX = [-480, -620, 960, 700];
  function fillPencil(c, f, pal, seed) {
    const col = f.color === 'far' ? mix(pal.body, pal.shade, .3) : pal[f.color] || f.color, op = f.op ?? 1;
    c.save(); c.globalAlpha *= op;
    if (f.color === 'mouth') { c.fillStyle = col; c.globalAlpha *= .85; c.fill(f.path); c.restore(); return; }
    c.fillStyle = mix('#f5f0e5', col, .42); c.fill(f.path);
    formHatch(c, f.path, f.path.box || HATCH_BOX, {seed, color: col, spacing: 3.6, length: 15, width: 1.25, opacity: .55, tone: () => .9, direction: () => -1.0});
    if (f.color === 'body') formHatch(c, f.path, f.path.box || HATCH_BOX, {seed: seed + 5, color: pal.shade, spacing: 5, length: 12, width: .9, opacity: .32, tone: (x, y) => clamp((y + 60) / 90, 0, .8), direction: () => -.35});
    c.restore();
  }
  const cache = new Map();
  function get(pose, name) {
    const ck = name + JSON.stringify(pose, (k, v) => typeof v === 'number' ? Math.round(v * 100) / 100 : v);
    if (cache.has(ck)) return cache.get(ck);
    const b = build(pose);
    const cel = compileCel({strokes: b.strokes}, {id: name});
    const v = {...b, cel};
    cache.set(ck, v); if (cache.size > 400) cache.delete(cache.keys().next().value);
    return v;
  }
  const FILL_ORDER = {far: ['farwing', 'far'], body: ['body', 'belly', 'spikes'], near: ['near'], head: ['hornfar', 'head', 'horn', 'mouth'], arm: [], wing: ['wing']};
  // draw(c, pose, {x, y, scale, flip, pal, name, alpha})
  function draw(c, pose, {x = 0, y = 0, scale = 1, flip = 1, pal = GREEN, name = 'tisha', alpha = 1, rotate = 0} = {}) {
    const d = get(pose, name);
    c.save(); c.translate(x, y); c.rotate(rotate); c.scale(scale * flip, scale); c.globalAlpha *= alpha;
    const strokesFor = (from, to) => ({id: d.cel.id, strokes: d.cel.strokes.slice(from, to)});
    d.order.forEach(([group, start], gi) => {
      const end = gi + 1 < d.order.length ? d.order[gi + 1][1] : d.cel.strokes.length;
      for (const layer of FILL_ORDER[group] || []) d.fills.filter(f => f.layer === layer).forEach((f, j) => fillPencil(c, f.op !== undefined && f.op < 1 ? {...f, op: 1, color: f.color === 'body' ? 'far' : f.color} : f, pal, strokeSeed(name + layer + j) % 997));
      if (group === 'head' && d.fx.eyes) {
        // eyes: drawn after the head fill, before its contour
      }
      drawCel(c, strokesFor(start, end), {material: 'pencil', color: INK});
      if (group === 'head' && d.fx.eyes) for (const e of d.fx.eyes) eye(c, e, pal);
    });
    c.restore();
    return d.fx;
  }
  function eye(c, e, pal) {
    c.save();
    c.beginPath(); c.arc(e.c[0], e.c[1], e.r * .93, 0, TAU); c.fillStyle = '#fffaf0'; c.fill(); c.clip();
    c.beginPath(); c.arc(e.pupil[0], e.pupil[1], e.pr, 0, TAU); c.fillStyle = '#2a2420'; c.fill();
    c.beginPath(); c.arc(e.pupil[0] + e.pr * .35, e.pupil[1] - e.pr * .4, e.pr * .33, 0, TAU); c.fillStyle = '#fffaf0'; c.fill();
    if (e.lid > 0) {
      c.translate(...e.c); c.rotate(e.ang + e.slant * -.35);
      c.fillStyle = mix('#f5f0e5', pal.body, .75); c.fillRect(-e.r * 1.2, -e.r * 1.2, e.r * 2.4, e.r * 2.4 * e.lid * .5);
      c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(-e.r * 1.1, -e.r * 1.2 + e.r * 2.4 * e.lid * .5); c.lineTo(e.r * 1.1, -e.r * 1.2 + e.r * 2.4 * e.lid * .5); c.stroke();
    }
    c.restore();
  }
  return {build, draw, get, GREEN, BLUE, RED, INK, BASE};
})();
