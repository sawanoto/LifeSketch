/* global TimeBalance, Marpan25D */
'use strict';
const plates = TimeBalance.labels.map((label, i) => ({ label, i, mass: 0n, y: 0, v: 0, placed: -99, exchanged: -99, trails: [] }));
const motes = Array.from({ length: 30 }, () => ({ x: Math.random(), y: Math.random(), r: 0.5 + Math.random(), speed: 0.008 + Math.random() * 0.009 }));
let epoch, previous, lastSample = -1, marpan, view, projected = [];
function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('stage');
  pixelDensity(Math.min(devicePixelRatio || 1, 2));
  marpan = new Marpan25D({ bodyColor: '#e6e1d5', autoBlink: false, yaw: 0 });
  epoch = previous = performance.now();
  layout();
  canvas.elt.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    const rect = canvas.elt.getBoundingClientRect();
    const x = ((event.clientX - rect.left) * width / rect.width - view.cx) / view.s;
    const y = ((event.clientY - rect.top) * height / rect.height - view.cy) / view.s;
    // Reverse the actual painter order: the visible front surface wins overlaps.
    const hit = [...projected].reverse().find(p => ((x - p.x) / (43 * p.s)) ** 2 + ((y - p.y + 4 * p.s) / (24 * p.s)) ** 2 <= 1);
    if (hit) place(hit.i, (performance.now() - epoch) / 1000);
  });
}
function layout() { view = { cx: width / 2, cy: height * 0.44, s: Math.min((width - 24) / 440, (height - 100) / 440, 1.75) }; }
function place(i, now) {
  const p = plates[i];
  p.mass += 1n;
  p.placed = now;
  if (p.mass % 10n === 0n) p.exchanged = now;
  for (const q of plates) q.v += 45 * Math.cos((q.i - i) * Math.PI / 4);
}
function positions(t) {
  return plates.map(p => {
    const a = TimeBalance.angle(t) + p.i * Math.PI / 4;
    const z = Math.sin(a), s = 0.85 + 0.15 * z;
    return { ...p, x: Math.cos(a) * 165 * s, y: z * 85 + p.y * s, s, z };
  }).sort((a, b) => a.z - b.z);
}
function ellipsePath(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); }
function strokeLine(c, x, y, xx, yy) { c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.stroke(); }
function draw() {
  const now = performance.now(), t = (now - epoch) / 1000;
  let dt = Math.min((now - previous) / 1000, 0.1); previous = now;
  const target = TimeBalance.targets(plates.map(p => p.mass));
  // Fixed small substeps keep interrupted frames and rapid taps stable.
  while (dt > 0) {
    const h = Math.min(dt, 1 / 120); dt -= h;
    for (const p of plates) {
      p.v += (170 * (target[p.i] - p.y) - 17 * p.v) * h;
      p.y = Math.max(-64, Math.min(64, p.y + p.v * h));
    }
  }
  projected = positions(t);
  if (t - lastSample >= 1 / 24) {
    for (const p of projected) plates[p.i].trails.push({ x: p.x, y: p.y, t });
    lastSample = t;
  }
  for (const p of plates) {
    let expired = 0;
    while (expired < p.trails.length && t - p.trails[expired].t >= 24) expired++;
    if (expired) p.trails.splice(0, expired);
  }
  background('#10171e');
  const c = drawingContext;
  for (const m of motes) {
    c.fillStyle = 'rgba(197,210,218,.25)';
    ellipsePath(c, m.x * width, ((m.y + t * m.speed) % 1) * height, m.r, m.r); c.fill();
  }
  c.save(); c.translate(view.cx, view.cy); c.scale(view.s, view.s);
  for (const p of plates) {
    for (let i = 1; i < p.trails.length; i++) {
      const a = p.trails[i - 1], b = p.trails[i];
      if (b.t - a.t > .2) continue;
      c.strokeStyle = `rgba(171,193,201,${0.095 * (1 - (t - a.t) / 24)})`;
      c.lineWidth = .65; strokeLine(c, a.x, a.y, b.x, b.y);
    }
  }
  // Back half, upright spindle, then front half, all in the same depth order.
  for (const p of projected.filter(p => p.z < 0)) drawPlate(c, p, t);
  const metal = c.createLinearGradient(-6, 0, 6, 0);
  metal.addColorStop(0, '#434c50'); metal.addColorStop(.45, '#b0b8b5'); metal.addColorStop(1, '#414a4c');
  c.fillStyle = metal; c.fillRect(-4, -74, 8, 239);
  c.fillStyle = '#87918d'; ellipsePath(c, 0, -74, 5, 3); c.fill();
  for (const p of projected.filter(p => p.z >= 0)) drawPlate(c, p, t);
  c.fillStyle = '#414b4e'; ellipsePath(c, 0, 171, 31, 8); c.fill();
  c.restore();
  marpan.drawAt(view.cx, view.cy + 208 * view.s, { bodyWidth: 66 * view.s, bodyHeight: 76 * view.s, yaw: 0, lookX: view.cx, lookY: view.cy + 208 * view.s, pulse: 0 });
}
function drawPlate(c, p, t) {
  const s = p.s;
  c.strokeStyle = '#768382'; c.lineWidth = 2 * s;
  strokeLine(c, 0, -57, p.x, p.y - 42 * s);
  c.strokeStyle = '#6f7b7a'; c.lineWidth = .9 * s;
  strokeLine(c, p.x, p.y - 42 * s, p.x - 37 * s, p.y);
  strokeLine(c, p.x, p.y - 42 * s, p.x + 37 * s, p.y);
  c.save(); c.translate(p.x, p.y); c.scale(s, s);
  c.fillStyle = '#586466'; ellipsePath(c, 0, 5, 43, 17); c.fill();
  const g = c.createLinearGradient(0, -13, 0, 17); g.addColorStop(0, '#a0aaa3'); g.addColorStop(1, '#626f6e');
  c.fillStyle = g; ellipsePath(c, 0, 0, 43, 16); c.fill();
  c.strokeStyle = '#c0c5b4'; c.lineWidth = .8; c.stroke();
  const tokens = TimeBalance.tokens(p.mass);
  const exchange = Math.max(0, 1 - (t - p.exchanged) / .38);
  // During a carry, the previous small weights converge into the new bundle.
  if (exchange > 0) {
    c.save(); c.globalAlpha = exchange * .6;
    const old = TimeBalance.tokens(p.mass - 1n);
    for (let row = 0; row < old.length; row++) {
      for (let k = 0; k < old[row].count; k++) {
        weight(c, (k - (old[row].count - 1) / 2) * 7 * exchange,
          -4 - row * 13 * exchange, .6 * exchange, old[row]);
      }
    }
    c.restore();
  }
  // Decimal denominations use engraved bundles; at most four rows, nine per row.
  for (let row = 0; row < tokens.length; row++) {
    const token = tokens[row];
    for (let k = 0; k < token.count; k++) {
      const size = 0.60 + Math.min(token.power, 5) * .07;
      let x = (k - (token.count - 1) / 2) * 7;
      x *= 1 + exchange * .3;
      const drop = row === 0 && k === token.count - 1 ? 19 * Math.max(0, 1 - (t - p.placed) / .23) ** 2 : 0;
      weight(c, x, -4 - row * 13 - drop, size, token);
    }
  }
  c.fillStyle = '#f3edda'; c.font = '600 15px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(p.label, 0, 11);
  c.restore();
}
function weight(c, x, y, s, token) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const g = c.createLinearGradient(-5, 0, 5, 0);
  g.addColorStop(0, '#666351'); g.addColorStop(.4, '#c6bb94'); g.addColorStop(1, '#7c765e');
  c.fillStyle = g; c.strokeStyle = '#d1c6a2'; c.lineWidth = .7;
  c.beginPath(); c.moveTo(-7, 0); c.lineTo(-5, -11); c.quadraticCurveTo(0, -15, 5, -11); c.lineTo(7, 0); c.closePath(); c.fill(); c.stroke();
  ellipsePath(c, 0, -15, 2.8, 2.4); c.stroke();
  c.fillStyle = '#292f2d'; c.font = '6px system-ui'; c.textAlign = 'center';
  const mark = token.total ? `Σ10^${token.power}` : token.power < 4 ? String(10 ** token.power) : `10^${token.power}`;
  c.fillText(mark, 0, -4);
  c.restore();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }
