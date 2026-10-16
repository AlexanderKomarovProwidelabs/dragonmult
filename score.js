'use strict';
// Original 60-second score for "Дракончик", synthesized with Web Audio.
// Scene cues: 0 title · 5 first flight · 14 fire · 21 night · 28 days · 40 cliff · 49 flame · 54 finale.
function SCORE(ac, t0, destination) {
  const END = 60, master = ac.createGain();
  master.gain.setValueAtTime(1.4, t0); master.gain.setValueAtTime(1.4, t0 + END - 2.2); master.gain.linearRampToValueAtTime(0, t0 + END - .05);
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 2.5; comp.attack.value = .01; comp.release.value = .25;
  master.connect(comp); comp.connect(destination);
  const verb = ac.createConvolver(), ir = ac.createBuffer(2, Math.floor(ac.sampleRate * 2.2), ac.sampleRate), R = rng(808);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (R() * 2 - 1) * Math.exp(-i / ac.sampleRate * 3.2); }
  verb.buffer = ir; const wet = ac.createGain(); wet.gain.value = .22; verb.connect(wet); wet.connect(master);
  const out = (node, rev = .3, pan = 0) => { const p = ac.createStereoPanner(); p.pan.value = pan; node.connect(p); p.connect(master); const s = ac.createGain(); s.gain.value = rev; p.connect(s); s.connect(verb); };
  const hz = n => 440 * 2 ** ((n - 69) / 12), at = t => t0 + t, ok = t => t >= 0 && t < END - .3;
  function env(t, a, peak, d, node) { const g = ac.createGain(); g.gain.setValueAtTime(0, at(t)); g.gain.linearRampToValueAtTime(peak, at(t + a)); g.gain.exponentialRampToValueAtTime(.0001, at(t + a + d)); node.connect(g); return g; }
  function piano(n, t, d = 1.8, v = .16, pan = 0) {
    if (!ok(t)) return; const sum = ac.createGain(), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2800; sum.connect(f);
    for (const [r, g] of [[1, 1], [2.003, .32], [3.01, .1], [4.02, .05]]) { const o = ac.createOscillator(), a = ac.createGain(); o.type = 'sine'; o.frequency.value = hz(n) * r; a.gain.value = g; o.connect(a); a.connect(sum); o.start(at(t)); o.stop(at(t + d + .1)); }
    out(env(t, .006, v, d, f), .35, pan);
  }
  function pluck(n, t, v = .12, pan = 0) {
    if (!ok(t)) return; const o = ac.createOscillator(), f = ac.createBiquadFilter(); o.type = 'triangle'; o.frequency.value = hz(n); f.type = 'lowpass'; f.frequency.setValueAtTime(3000, at(t)); f.frequency.exponentialRampToValueAtTime(500, at(t + .25)); o.connect(f);
    out(env(t, .004, v, .28, f), .15, pan); o.start(at(t)); o.stop(at(t + .4));
  }
  function pad(notes, t, d, v = .03, cutoff = 1200) {
    if (!ok(t)) return; for (let j = 0; j < notes.length; j++) {
      const g = ac.createGain(), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; g.gain.setValueAtTime(0, at(t)); g.gain.linearRampToValueAtTime(v, at(t + d * .35)); g.gain.linearRampToValueAtTime(v * .8, at(t + d * .8)); g.gain.linearRampToValueAtTime(0, at(t + d + .6));
      g.connect(f); out(f, .6, (j / Math.max(1, notes.length - 1) - .5) * .7);
      for (const det of [-6, 5]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(notes[j]); o.detune.value = det; o.connect(g); o.start(at(t)); o.stop(at(t + d + .7)); }
    }
  }
  function bell(n, t, v = .08, pan = .3) {
    if (!ok(t)) return; const sum = ac.createGain();
    for (const [r, g] of [[1, .7], [2.76, .2], [5.4, .08]]) { const o = ac.createOscillator(), a = ac.createGain(); o.frequency.value = hz(n) * r; a.gain.value = g; o.connect(a); a.connect(sum); o.start(at(t)); o.stop(at(t + 2.6)); }
    out(env(t, .003, v, 2.4, sum), .7, pan);
  }
  function kick(t, v = .2) { if (!ok(t)) return; const o = ac.createOscillator(); o.frequency.setValueAtTime(110, at(t)); o.frequency.exponentialRampToValueAtTime(42, at(t + .18)); out(env(t, .003, v, .35, o), .05); o.start(at(t)); o.stop(at(t + .45)); }
  function noise(t, d, v, f0 = 1200, f1 = f0, q = .8, type = 'bandpass', seed = 1, pan = 0) {
    if (!ok(t)) return; const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * d), ac.sampleRate), data = buf.getChannelData(0), r = rng(seed);
    for (let i = 0; i < data.length; i++) data[i] = (r() * 2 - 1) * Math.sin(Math.PI * i / data.length);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = buf; f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, at(t)); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), at(t + d)); g.gain.value = v; s.connect(f); f.connect(g); out(g, .2, pan); s.start(at(t));
  }
  function glide(f0, f1, t, d, v = .06, type = 'sine') { if (!ok(t)) return; const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, at(t)); o.frequency.exponentialRampToValueAtTime(f1, at(t + d)); out(env(t, .02, v, d, o), .3); o.start(at(t)); o.stop(at(t + d + .1)); }
  function wah(n, t, d, v = .07) {   // muted-brass "wah"
    if (!ok(t)) return; const o = ac.createOscillator(), f = ac.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.setValueAtTime(hz(n), at(t)); o.frequency.linearRampToValueAtTime(hz(n) * .97, at(t + d));
    f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(400, at(t)); f.frequency.linearRampToValueAtTime(1400, at(t + d * .3)); f.frequency.linearRampToValueAtTime(350, at(t + d)); o.connect(f);
    const g = ac.createGain(); g.gain.setValueAtTime(0, at(t)); g.gain.linearRampToValueAtTime(v, at(t + .05)); g.gain.setValueAtTime(v, at(t + d - .08)); g.gain.linearRampToValueAtTime(0, at(t + d)); f.connect(g); out(g, .25); o.start(at(t)); o.stop(at(t + d + .05));
  }
  const C = [48, 55, 60, 64, 67], G = [43, 50, 55, 59, 62], Am = [45, 52, 57, 60, 64], F = [41, 48, 53, 57, 60], Dm = [50, 57, 62, 65, 69], E = [40, 47, 52, 56, 59];
  const arp = (ch, t, beat, v = .12, pan = .1) => [0, 1, 2, 3, 4, 3].forEach((k, i) => piano(ch[k] + 12, t + i * beat, 1.4, v, pan));

  // 0-5 title: gentle arpeggios, a little bell motif
  [C, F, C, G].forEach((ch, i) => { piano(ch[0], i * 1.25, 2.5, .13, -.2); arp(ch, i * 1.25, .2, .07); });
  [[.4, 79], [1.65, 76], [2.9, 77], [3.5, 79], [4.1, 84]].forEach(([t, n]) => bell(n, t, .06));
  // 5-14 first flight: playful plucks, footsteps, flaps, fall, thud, laughter
  for (let b = 0; b < 12; b++) { const t = 5 + b * .5, ch = [C, G, Am, F][(b >> 1) % 4]; pluck(ch[0] + 12, t, .1, -.2); pluck(ch[2] + 12, t + .25, .07, .2); }
  for (let t = 6.6; t < 7.9; t += .2) kick(t, .05);
  for (let t = 7.9; t < 9.0; t += .18) noise(t, .12, .12, 900, 500, 1.2, 'bandpass', Math.round(t * 50));
  glide(1200, 260, 9.0, .55, .05, 'triangle');
  kick(9.5, .32); noise(9.5, .5, .25, 500, 120, .7, 'lowpass', 9);
  [88, 91, 88, 93].forEach((n, i) => bell(n, 9.8 + i * .22, .035, -.3));
  // "ха-ха-ха" as bouncy staccato and a sad brass answer
  [[11.3, 76], [11.5, 74], [11.7, 76], [11.9, 72], [12.2, 79], [12.38, 77], [12.56, 79]].forEach(([t, n]) => pluck(n, t, .09, .4));
  wah(55, 12.9, .38); wah(54, 13.3, .38); wah(53, 13.7, .7);
  // 14-21 fire: hesitant pad, breath, puff, cough, giggles, sad steps
  pad([45, 52, 57, 60], 14, 7, .022, 900);
  noise(14.8, 1.4, .07, 400, 1800, .9, 'bandpass', 21);
  noise(16.4, .3, .16, 1800, 300, .8, 'bandpass', 22); glide(500, 180, 16.45, .3, .04);
  noise(17.6, .12, .14, 900, 600, 1, 'bandpass', 23); noise(17.78, .14, .12, 900, 500, 1, 'bandpass', 24);
  [[18.25, 86], [18.38, 84], [18.51, 86], [18.64, 84]].forEach(([t, n]) => pluck(n, t, .05, .5));
  [[19.0, 64], [19.6, 62], [20.2, 60], [20.7, 57]].forEach(([t, n]) => piano(n + 12, t, 1.4, .1, -.1));
  // 21-28 night: slow minor, a shooting star, then the decision turns to major
  [Am, F, Am, F].forEach((ch, i) => { const t = 21 + i * 1.25; piano(ch[0], t, 2.6, .12, -.2); arp(ch, t, .21, .055, .15); });
  pad([45, 52, 57, 60, 64], 21, 4.6, .016, 800);
  [84, 88, 91, 96].forEach((n, i) => bell(n, 23.4 + i * .09, .04, .5));
  [[26, C], [27, G]].forEach(([t, ch]) => { piano(ch[0], t, 2, .14, -.2); arp(ch, t, .16, .07, .15); });
  [[25.9, 72], [26.4, 76], [26.9, 79], [27.4, 84]].forEach(([t, n]) => piano(n, t, 1.6, .13));
  pad([48, 55, 60, 64], 25.9, 2.1, .02, 1100);
  // 28-40 the days: upbeat, a beat that grows each day, page turns
  const prog = [C, G, Am, F];
  for (let b = 0; b < 24; b++) { const t = 28 + b * .5, ch = prog[(b >> 1) % 4], day = Math.floor((t - 28) / 4);
    kick(t, .1 + day * .03); if (day > 0) noise(t + .25, .06, .05 + day * .02, 6000, 5000, 1, 'highpass', 30 + b);
    piano(ch[0], t, .9, .1, -.25); pluck(ch[2] + 12, t + .25, .07, .25); if (day === 2) pluck(ch[4] + 12, t + .125, .05, .1); }
  const motif = [[0, 72], [.5, 76], [1, 79], [1.5, 76], [2, 77], [2.5, 76], [3, 74]];
  [28, 32, 36].forEach((t, d) => motif.forEach(([dt, n]) => piano(n + (d === 2 ? 2 : 0), t + dt, .9, .11 + d * .02, .1)));
  noise(30.0, .5, .12, 2500, 800, .8, 'bandpass', 41); [32, 36].forEach((t, i) => noise(t - .05, .3, .1, 3000, 900, .6, 'bandpass', 42 + i));
  noise(33.4, .7, .1, 300, 1600, .7, 'bandpass', 44); [86, 91].forEach((n, i) => bell(n, 34.1 + i * .15, .05));
  noise(36.9, 1.4, .08, 500, 1500, .6, 'bandpass', 45);
  // 40-49 the cliff: confident walk, a held breath, the fall, then the climb
  pad([48, 55, 60, 64], 40, 3.4, .02, 1000);
  for (let b = 0; b < 4; b++) pluck([60, 64, 67, 64][b] + 12, 40 + b * .5, .07);
  pad([50, 57, 62, 65], 42.4, 1.5, .024, 900); for (let t = 42.6; t < 43.8; t += .6) { kick(t, .12); kick(t + .18, .07); }
  noise(43.8, .9, .16, 600, 2400, .7, 'bandpass', 51); glide(900, 300, 43.8, .8, .03);
  noise(44.6, 1.0, .05, 400, 300, .5, 'lowpass', 52);
  kick(45.6, .35); noise(45.6, 1.2, .14, 300, 3000, .6, 'bandpass', 53);
  pad([48, 55, 60, 64, 67, 72], 45.6, 3.4, .032, 1800);
  [[45.6, C], [46.6, F], [47.6, G], [48.4, C]].forEach(([t, ch]) => { piano(ch[0] - 12, t, 2, .16); arp(ch, t, .14, .07); kick(t, .2); });
  [[45.7, 72], [46.0, 76], [46.3, 79], [46.7, 84], [47.6, 83], [48.0, 79], [48.4, 84]].forEach(([t, n]) => piano(n, t, 1.5, .16, .05));
  for (let t = 45.7; t < 48.9; t += .55) noise(t, .25, .08, 700, 1300, .9, 'bandpass', Math.round(t * 10));
  // 49-54 his own flame
  pad([48, 55, 60, 64, 67], 49, 5, .026, 1500);
  noise(49.5, .8, .07, 400, 1700, .8, 'bandpass', 61);
  noise(50.45, 2.2, .2, 220, 900, .6, 'lowpass', 62); noise(50.5, 2.0, .08, 1500, 3500, .5, 'bandpass', 63);
  [84, 88, 91, 96, 100].forEach((n, i) => bell(n, 51.1 + i * .12, .06, (i - 2) * .2));
  [[52.3, 72], [52.6, 76], [52.9, 79], [53.3, 84]].forEach(([t, n]) => piano(n, t, 1.6, .14));
  [[52.25, 79], [52.45, 79], [52.7, 84]].forEach(([t, n]) => pluck(n, t, .08, -.4));
  // 54-60 finale: the motif completes and rests on C
  [[54, F], [55.2, G], [56.4, C], [57.6, C]].forEach(([t, ch], i) => { piano(ch[0] - 12, t, 2.6, .14, -.2); arp(ch, t, .2, .06); });
  [[54.2, 72], [54.7, 76], [55.2, 79], [55.7, 77], [56.4, 76], [56.9, 74], [57.6, 72]].forEach(([t, n]) => piano(n, t, t > 57 ? 2.4 : 1.4, .14, .05));
  pad([48, 55, 60, 64, 67], 56.4, 3, .024, 1300);
  bell(84, 56.6, .05); bell(88, 57.65, .05); bell(91, 58.3, .04);
}
