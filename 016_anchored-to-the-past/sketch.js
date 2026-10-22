/* global Marpan25D */
'use strict';

const FLOW_SPEED = 36; // CSS pixels / second, shared by every particle and stake.
const THREAD_COLOR = 'rgba(183,170,145,0.65)';
let marpan;
let bodySize;
let elapsedDistance = 0;
let previousTime;
let stakes = [];
// Only a normalized edge endpoint is needed once a stake leaves the scene.
// Every connection survives; there is no cap, expiry, or reset.
const pastThreads = [];
let pastLayer;
let particles = [];

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('stage');
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  bodySize = Math.min(136, width * 0.24, height * 0.25);
  marpan = new Marpan25D({ bodyColor: '#eeeae0', yaw: 1.05, autoBlink: false });
  previousTime = performance.now();
  rebuildPastLayer();
  particles = Array.from({ length: 100 }, () => ({
    x: random(), y: random(), size: random(0.8, 1.8), alpha: random(35, 100)
  }));
  // One input path for mouse, touch, and pen: no synthetic click duplication.
  canvas.elt.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    advanceTime(performance.now());
    const bounds = canvas.elt.getBoundingClientRect();
    stakes.push({
      worldX: (event.clientX - bounds.left) * width / bounds.width + elapsedDistance,
      y: (event.clientY - bounds.top) / bounds.height
    });
  });
}

function advanceTime(now) {
  // Do not clamp slow frames: elapsed wall time, including a background tab,
  // always produces the same displacement, regardless of frame rate or count.
  elapsedDistance += (now - previousTime) * FLOW_SPEED / 1000;
  previousTime = now;
}

function attachment() {
  return { x: width / 2, y: height / 2 };
}

function drawThread(context, x, y) {
  const origin = attachment();
  context.save();
  context.lineCap = 'round';
  context.strokeStyle = THREAD_COLOR;
  context.lineWidth = 2.2;
  context.beginPath();
  context.moveTo(origin.x, origin.y);
  context.lineTo(x, y);
  context.stroke();
  // A fine, broken highlight gives the cord a quiet twisted texture.
  context.strokeStyle = 'rgba(235,224,201,0.5)';
  context.lineWidth = 0.65;
  context.setLineDash([2, 4]);
  context.stroke();
  context.restore();
}

function rebuildPastLayer() {
  // One cached bitmap: old threads cost one image composite each frame.
  if (pastLayer) pastLayer.remove();
  pastLayer = createGraphics(width, height);
  pastLayer.pixelDensity(1);
  const context = pastLayer.drawingContext;
  for (const y of pastThreads) drawThread(context, 0, y * height);
}

function draw() {
  advanceTime(performance.now());
  background('#111820');
  noStroke();
  for (const particle of particles) {
    const x = ((particle.x * width - elapsedDistance) % width + width) % width;
    const y = particle.y * height;
    const trailLength = 28 + particle.size * 14;
    // Repeat the fading tail across the wrap boundary, without a bright seam.
    for (const headX of [x, x - width]) {
      const trail = drawingContext.createLinearGradient(headX, y, headX + trailLength, y);
      trail.addColorStop(0, `rgba(201,213,224,${particle.alpha / 255})`);
      trail.addColorStop(1, 'rgba(201,213,224,0)');
      drawingContext.strokeStyle = trail;
      drawingContext.lineWidth = particle.size * 0.65;
      drawingContext.beginPath();
      drawingContext.moveTo(headX, y);
      drawingContext.lineTo(headX + trailLength, y);
      drawingContext.stroke();
    }
    noStroke();
    fill(201, 213, 224, particle.alpha);
    circle(x, y, particle.size);
  }

  // Compact the active array in place, avoiding splice/filter allocation.
  let remaining = 0;
  for (const stake of stakes) {
    if (stake.worldX - elapsedDistance < 0) {
      pastThreads.push(stake.y);
      drawThread(pastLayer.drawingContext, 0, stake.y * height);
    } else {
      stakes[remaining++] = stake;
    }
  }
  stakes.length = remaining;
  marpan.drawAt(width / 2, height / 2, {
    bodyWidth: bodySize, bodyHeight: bodySize * 0.92,
    yaw: 1.05, lookX: width / 2 + bodySize, lookY: height / 2,
    pulse: 0, expression: 'pupil'
  });
  // Draw cords over the body so the central attachment remains visible.
  image(pastLayer, 0, 0);

  const context = drawingContext;
  context.save();
  for (const stake of stakes) {
    drawThread(context, stake.worldX - elapsedDistance, stake.y * height);
  }
  context.restore();

  stroke('#b1b7b9');
  strokeWeight(1.2);
  for (const stake of stakes) {
    const x = stake.worldX - elapsedDistance;
    const y = stake.y * height;
    line(x, y - 4, x, y + 5);
    line(x - 3, y - 4, x + 3, y - 4);
  }

}

function windowResized() {
  advanceTime(performance.now());
  const ratio = windowWidth / width;
  for (const stake of stakes) {
    stake.worldX = (stake.worldX - elapsedDistance) * ratio + elapsedDistance;
  }
  resizeCanvas(windowWidth, windowHeight);
  // Responsive sizing only; adding stakes never changes the body size.
  bodySize = Math.min(136, width * 0.24, height * 0.25);
  rebuildPastLayer();
}
