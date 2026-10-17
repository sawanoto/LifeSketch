/* global Marpan25D, createCanvas, resizeCanvas, pixelDensity, noLoop, redraw,
   width, height, background, push, pop, translate, scale, drawingContext,
   userStartAudio, getAudioContext */
'use strict';
const SKIN = '#e4bea0';
const PAPER = '#f6f2ec';
const LAYER_SIZE = 1600;
let marpan, makeup, brush, selected = 'foundation', activePointer = null;
let previousPoint = null, audioEnabled = true, lastSound = -Infinity;
let audioContext, noiseBuffer;

function setup() {
  const host = document.getElementById('scene');
  const canvas = createCanvas(host.clientWidth, host.clientHeight);
  canvas.parent(host);
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  marpan = new Marpan25D({ bodyColor: SKIN, autoBlink: false });
  marpan.setExpressionState('normal');
  makeup = document.createElement('canvas');
  makeup.width = makeup.height = LAYER_SIZE;
  makeBrush();
  noLoop();
  const element = canvas.elt;
  element.addEventListener('pointerdown', event => {
    if (activePointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    startAudio();
    activePointer = event.pointerId;
    element.setPointerCapture(event.pointerId);
    previousPoint = pointFromEvent(event);
    dab(previousPoint);
    redraw();
  });
  element.addEventListener('pointermove', event => {
    if (event.pointerId !== activePointer) return;
    event.preventDefault();
    for (const sample of event.getCoalescedEvents?.() || [event]) {
      const point = pointFromEvent(sample);
      paintSegment(previousPoint, point);
      previousPoint = point;
    }
    redraw();
  });
  const finish = event => {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    previousPoint = null;
  };
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) element.addEventListener(name, finish);
  for (const name of ['foundation', 'pink']) document.getElementById(name).onclick = () => {
    selected = name;
    makeBrush();
    for (const tool of ['foundation', 'pink']) {
      const button = document.getElementById(tool);
      button.classList.toggle('selected', tool === name);
      button.setAttribute('aria-pressed', String(tool === name));
    }
    startAudio();
    userStartAudio().then(() => { audioContext = getAudioContext(); sound('select'); }).catch(() => {});
  };
  document.getElementById('sound').onclick = () => {
    audioEnabled = !audioEnabled;
    document.getElementById('sound').textContent = audioEnabled ? '音 オン' : '音 オフ';
    document.getElementById('sound').setAttribute('aria-pressed', String(audioEnabled));
    if (audioEnabled) startAudio();
  };
  document.getElementById('reset').onclick = () => {
    makeup.getContext('2d').clearRect(0, 0, LAYER_SIZE, LAYER_SIZE);
    redraw();
  };
  document.getElementById('export').onclick = exportPNG;
  new ResizeObserver(() => {
    activePointer = null;
    previousPoint = null;
    resizeCanvas(host.clientWidth, host.clientHeight);
    redraw();
  }).observe(host);
}

function layout() {
  const bodyW = Math.min(width * 0.91, height * 1.24, 660);
  return { x: width / 2, y: height / 2, w: bodyW };
}

function draw() {
  background(PAPER);
  const face = layout();
  renderFace(face.x, face.y, face.w);
}

// Reuse the shared outline, exact clipping path, and unchanged eyes.
// All dimensions are expressed in a fixed 1000-unit face coordinate system.
function renderFace(x, y, bodyW) {
  push();
  translate(x, y);
  scale(bodyW / 1000);
  marpan.drawBody(0, 0, 1000, 680, 0, SKIN);
  marpan.beginClip(0, 0, 1000, 680, 0);
  drawingContext.drawImage(makeup, -500, -500, 1000, 1000);
  drawingContext.restore();
  marpan.drawBody(0, 0, 1000, 680, 0, null);
  marpan.beginClip(0, 0, 1000, 680, 0);
  marpan.drawEyes(0, 0, 1000, 680, 0, 0, 0);
  drawingContext.restore();
  pop();
}

function pointFromEvent(event) {
  const rect = document.querySelector('#scene canvas').getBoundingClientRect();
  const face = layout();
  return {
    x: ((event.clientX - rect.left) * width / rect.width - face.x) / face.w * 1000,
    y: ((event.clientY - rect.top) * height / rect.height - face.y) / face.w * 1000
  };
}

function makeBrush() {
  brush = document.createElement('canvas');
  brush.width = brush.height = 160;
  const ctx = brush.getContext('2d');
  const color = selected === 'foundation' ? '255,253,248' : '231,114,152';
  const gradient = ctx.createRadialGradient(80, 80, 0, 80, 80, 80);
  gradient.addColorStop(0, `rgba(${color},0.19)`);
  gradient.addColorStop(0.55, `rgba(${color},0.13)`);
  gradient.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 160, 160);
}

function dab(point) {
  // Reject outside centers using the shared path, rather than an approximate oval.
  drawingContext.save();
  drawingContext.setTransform(1, 0, 0, 1, 0, 0);
  marpan.beginClip(0, 0, 1000, 680, 0);
  const inside = drawingContext.isPointInPath(point.x, point.y);
  drawingContext.restore();
  drawingContext.restore();
  if (!inside) return;
  const size = LAYER_SIZE * 0.16;
  makeup.getContext('2d').drawImage(brush,
    (point.x / 1000 + 0.5) * LAYER_SIZE - size / 2,
    (point.y / 1000 + 0.5) * LAYER_SIZE - size / 2, size, size);
  sound(selected);
}

function paintSegment(a, b) {
  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  if (distance < 0.5) return;
  const steps = Math.ceil(distance / 12);
  for (let i = 1; i <= steps; i++) dab({
    x: a.x + (b.x - a.x) * i / steps,
    y: a.y + (b.y - a.y) * i / steps
  });
}

function startAudio() {
  if (!audioEnabled) return;
  userStartAudio().then(() => { audioContext = getAudioContext(); }).catch(() => {});
}

function sound(kind) {
  if (!audioEnabled || !audioContext || audioContext.state !== 'running') return;
  const now = audioContext.currentTime;
  if (kind !== 'select' && now - lastSound < 0.15) return;
  lastSound = now;
  if (!noiseBuffer) {
    noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.2, audioContext.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const source = audioContext.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = audioContext.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = kind === 'select' ? 620 : kind === 'pink' ? 3400 : 650;
  filter.Q.value = kind === 'select' ? 3 : 0.6;
  const gain = audioContext.createGain();
  const duration = kind === 'select' ? 0.045 : 0.11;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(kind === 'select' ? 0.06 : 0.045, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);
  source.start(now);
  source.stop(now + duration);
  source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
}

function exportPNG() {
  // Render with the same p5/shared renderer at print resolution, then restore
  // the display canvas synchronously. DOM controls never enter the image.
  const displayWidth = width, displayHeight = height;
  const density = window.pixelDensity();
  pixelDensity(1);
  resizeCanvas(3200, 2400, true);
  background(PAPER);
  renderFace(1600, 1200, 2600);
  const snapshot = document.createElement('canvas');
  snapshot.width = 3200; snapshot.height = 2400;
  snapshot.getContext('2d').drawImage(document.querySelector('#scene canvas'), 0, 0);
  pixelDensity(density);
  resizeCanvas(displayWidth, displayHeight, true);
  redraw();
  snapshot.toBlob(blob => {
    if (!blob) { document.getElementById('status').textContent = 'PNGを保存できませんでした。'; return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lifesketch-005-${Date.now()}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    document.getElementById('status').textContent = 'PNGを書き出しました。';
  }, 'image/png');
}
