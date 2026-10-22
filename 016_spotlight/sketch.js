/* global Marpan25D, createCanvas, pixelDensity, resizeCanvas, width, height,
   background, drawingContext, deltaTime */
'use strict';
let marpans, light, target;

function setup() {
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = createCanvas(window.innerWidth, window.innerHeight);
  canvas.parent('stage');
  canvas.elt.tabIndex = 0;
  canvas.elt.setAttribute('aria-label', 'マウスや指で光を動かす。矢印キーでも操作できます。');
  marpans = ['happy', 'pupil', 'crying'].map(expression =>
    new Marpan25D({ expression, bodyColor: '#e4bea0', autoBlink: false }));
  light = { x: width / 2, y: height / 2 };
  target = { ...light };

  const move = event => {
    if (!event.isPrimary) return;
    const bounds = canvas.elt.getBoundingClientRect();
    target.x = Math.max(0, Math.min(width, (event.clientX - bounds.left) * width / bounds.width));
    target.y = Math.max(0, Math.min(height, (event.clientY - bounds.top) * height / bounds.height));
  };
  canvas.elt.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    canvas.elt.setPointerCapture(event.pointerId);
    move(event);
  });
  canvas.elt.addEventListener('pointermove', move);
  canvas.elt.addEventListener('keydown', event => {
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction) return;
    event.preventDefault();
    const step = Math.min(width, height) * 0.045;
    target.x = Math.max(0, Math.min(width, target.x + direction[0] * step));
    target.y = Math.max(0, Math.min(height, target.y + direction[1] * step));
  });
}

function draw() {
  // Time-based easing keeps the same quiet response at different frame rates.
  const ease = 1 - Math.exp(-Math.min(deltaTime, 50) / 48);
  light.x += (target.x - light.x) * ease;
  light.y += (target.y - light.y) * ease;
  background('#050507');
  const bodyW = Math.min(width * 0.225, height * 0.34, 260);
  for (let i = 0; i < 3; i++) {
    const x = width * (0.2 + i * 0.3), y = height / 2;
    marpans[i].drawAt(x, y, { bodyWidth: bodyW, lookX: x, lookY: y });
    if (i === 2) drawTears(x, y, bodyW);
  }
  // A single spatial mask reveals only the area the visitor is illuminating.
  const ctx = drawingContext;
  const radius = bodyW * 0.76;
  const shade = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, radius);
  shade.addColorStop(0, 'rgba(5,5,7,0)');
  shade.addColorStop(0.42, 'rgba(5,5,7,0.04)');
  shade.addColorStop(0.72, 'rgba(5,5,7,0.55)');
  shade.addColorStop(1, 'rgba(5,5,7,0.986)');
  ctx.save();
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawTears(x, y, bodyW) {
  // Static tears accompany the shared crying eyes; the character never reacts.
  const ctx = drawingContext;
  ctx.save();
  ctx.fillStyle = '#9acbdc';
  for (const side of [-1, 1]) {
    const tx = x + side * Math.sin(0.44) * bodyW * 0.47;
    const ty = y + bodyW * 0.075;
    const r = bodyW * 0.018;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.bezierCurveTo(tx + r * 0.4, ty + r, tx + r * 1.6, ty + r * 2.8, tx, ty + r * 3);
    ctx.bezierCurveTo(tx - r * 1.6, ty + r * 2.8, tx - r * 0.4, ty + r, tx, ty);
    ctx.fill();
  }
  ctx.restore();
}

function windowResized() {
  const oldWidth = width, oldHeight = height;
  resizeCanvas(window.innerWidth, window.innerHeight);
  // Preserve the chosen location across rotation instead of choosing a face again.
  for (const point of [light, target]) {
    point.x *= width / oldWidth;
    point.y *= height / oldHeight;
  }
}
