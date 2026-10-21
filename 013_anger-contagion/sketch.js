/* global Marpan25D, AngerContagion, p5 */
'use strict';
let board, marpan, started = false, clock = 0, previous = 0, announced = false;
let audio, master, bedGain, noiseBuffer, enabled = true;
const voices = new Set(), heard = new Set();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = v => Math.max(0, Math.min(1, v));
const ease = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
function setup() {
  const host = document.getElementById('stage');
  createCanvas(host.clientWidth, host.clientHeight).parent(host);
  pixelDensity(Math.min(devicePixelRatio || 1, 2));
  marpan = new Marpan25D({ autoBlink: false });
  // More neighbours and longer wavefronts, with legible faces on phones.
  const cols = width < 600 ? 7 : width < 1000 ? 13 : 19;
  const rows = Math.max(7, Math.min(17, Math.floor(height / (width / cols)) | 1));
  board = AngerContagion.makeBoard(cols, rows);
  new ResizeObserver(() => { resizeCanvas(host.clientWidth, host.clientHeight); positionTrigger(); }).observe(host);
  document.getElementById('ignite').onclick = () => {
    if (started) return;
    started = true; clock = 0; previous = performance.now(); positionTrigger();
    document.getElementById('status').textContent = '怒りの伝染が始まりました。';
    startAudio().then(() => crackle(true));
  };
  document.getElementById('reset').onclick = reset;
  document.getElementById('sound').onclick = () => {
    enabled = !enabled;
    const button = document.getElementById('sound');
    button.textContent = enabled ? '音 ON' : '音 OFF';
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? '音を消す' : '音を出す');
    if (enabled) startAudio();
    if (master) master.gain.setTargetAtTime(enabled ? 0.42 : 0, audio.currentTime, 0.05);
  };
  document.querySelectorAll('[data-export]').forEach(b => b.onclick = () => exportScene(b.dataset.export));
  document.addEventListener('visibilitychange', () => {
    previous = performance.now();
    if (master) master.gain.setTargetAtTime(document.hidden || !enabled ? 0 : 0.42, audio.currentTime, 0.08);
  });
  positionTrigger(); previous = performance.now();
}
function geometry(w = width, h = height) {
  const step = Math.min((w - 28) / board.cols, (h - 34) / board.rows);
  return { step, size: step * 0.69, x: w / 2 - (board.cols - 1) * step / 2, y: h / 2 - (board.rows - 1) * step / 2 };
}
function cellPosition(cell, g) { return { x: g.x + cell.col * g.step, y: g.y + cell.row * g.step }; }
function positionTrigger() {
  if (!board) return;
  const g = geometry(), p = cellPosition(board.cells[board.center], g), b = document.getElementById('ignite');
  Object.assign(b.style, { left: `${p.x}px`, top: `${p.y}px`, width: `${Math.max(44, g.size)}px`, height: `${Math.max(44, g.size * 0.68)}px` });
  b.disabled = started;
}
function reset() {
  started = false; clock = 0; announced = false; heard.clear();
  voices.forEach(v => { try { v.stop(); } catch (_) { /* Already ended. */ } });
  if (bedGain) bedGain.gain.setTargetAtTime(0, audio.currentTime, 0.04);
  document.getElementById('status').textContent = '初期状態に戻りました。';
  previous = performance.now(); positionTrigger();
}
function draw() {
  const now = performance.now(), dt = Math.min(0.06, (now - previous) / 1000); previous = now;
  if (started && !document.hidden) clock += dt;
  renderScene(started ? clock : -1, millis() / 1000);
  let count = 0;
  if (started) board.cells.forEach(c => {
    if (c.at > clock) return;
    count++;
    if (!heard.has(c.id)) { heard.add(c.id); if (c.id !== board.center) crackle(false); }
  });
  if (bedGain) bedGain.gain.setTargetAtTime(started ? 0.10 * Math.sqrt(count / board.cells.length) : 0, audio.currentTime, 0.3);
  if (started && clock >= board.duration && !announced) {
    announced = true; document.getElementById('status').textContent = '伝染が終わりました。';
  }
}
function renderScene(time, motion) {
  background('#f5f2e9');
  const g = geometry();
  // Smoke travels through the gaps and visibly touches its destination.
  for (const edge of board.edges) {
    if (time < edge.start || time > edge.end + 0.45) continue;
    const a = cellPosition(board.cells[edge.from], g), b = cellPosition(board.cells[edge.to], g);
    const travel = clamp((time - edge.start) / (edge.end - edge.start));
    for (let i = 0; i < 9; i++) {
      const t = clamp(travel - i * 0.045), fade = clamp((edge.end + 0.45 - time) / 0.45);
      const sway = Math.sin(t * Math.PI * 2 + i * 0.7) * g.step * 0.045 * Math.sin(t * Math.PI);
      noStroke(); fill(102, 92, 84, (1 - i / 12) * 48 * fade);
      ellipse(a.x + (b.x - a.x) * t + sway, a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * g.step * 0.16, g.step * (0.13 + i * 0.007));
    }
  }
  for (const c of board.cells) {
    const p = cellPosition(c, g), heat = c.immune ? 0 : ease((time - c.at) / 0.95);
    const ember = c.id === board.center && time < 0;
    push(); translate(p.x, p.y); scale(g.size / 240);
    // Normalize the common renderer's drawing scale to preserve its fine outlines.
    marpan.drawBody(0, 0, 240, 163.2, 0, lerpColor(color('#eeeae0'), color('#d65440'), heat));
    marpan.beginClip(0, 0, 240, 163.2, 0);
    if (heat > 0 || ember) flames(heat, motion + c.id * 0.81, ember);
    drawingContext.restore();
    marpan.drawEyes(0, 0, 240, 163.2, 0, 0, 0, { expression: 'pupil' });
    // Crossfade the shared angry eyes, with no mouth or extra facial marks.
    if (heat > 0) {
      drawingContext.save(); drawingContext.globalAlpha = heat;
      marpan.drawEyes(0, 0, 240, 163.2, 0, 0, 0, { expression: 'angry' }); drawingContext.restore();
    }
    pop();
    if (heat > 0) smoke(p, g, heat, motion + c.id * 0.67);
  }
}
function flames(heat, time, ember) {
  const ctx = drawingContext, motion = time * (reducedMotion ? 0.35 : 1);
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * (ember ? 5 : 19), base = 72;
    const h = (ember ? 23 : 28 + heat * 102) * (0.72 + 0.18 * Math.cos(i * 1.6) + 0.10 * Math.sin(motion * 4 + i));
    const w = ember ? 6 : 11 + heat * 6, sway = Math.sin(motion * 3.2 + i * 1.5) * (ember ? 3 : 11);
    const grad = ctx.createLinearGradient(x, base, x, base - h);
    grad.addColorStop(0, '#ffda78'); grad.addColorStop(0.5, '#f79b39'); grad.addColorStop(1, '#e85c2d');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(x - w, base);
    ctx.bezierCurveTo(x - w * 1.4, base - h * 0.3, x + sway - w * 0.3, base - h * 0.65, x + sway, base - h);
    ctx.bezierCurveTo(x + sway + w * 0.2, base - h * 0.6, x + w * 1.5, base - h * 0.3, x + w, base);
    ctx.closePath(); ctx.fill();
  }
}
function smoke(p, g, heat, time) {
  for (let i = 0; i < 4; i++) {
    const age = (time * 0.35 + i / 4) % 1;
    noStroke(); fill(104, 93, 85, 37 * heat * Math.sin(age * Math.PI));
    ellipse(p.x + Math.sin(time + i * 1.9) * g.size * 0.09 * age,
      p.y - g.size * 0.32 - age * g.step * 0.45,
      g.size * (0.10 + age * 0.24), g.size * (0.12 + age * 0.27));
  }
}
function startAudio() {
  if (!enabled) return Promise.resolve();
  return userStartAudio().then(() => {
    if (audio) return;
    audio = getAudioContext(); master = audio.createGain(); master.gain.value = enabled ? 0.42 : 0;
    const limiter = audio.createDynamicsCompressor(); limiter.threshold.value = -20; limiter.ratio.value = 8;
    master.connect(limiter); limiter.connect(audio.destination);
    noiseBuffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const bed = audio.createBufferSource(), filter = audio.createBiquadFilter();
    bed.buffer = noiseBuffer; bed.loop = true; filter.type = 'lowpass'; filter.frequency.value = 440;
    bedGain = audio.createGain(); bedGain.gain.value = 0;
    bed.connect(filter); filter.connect(bedGain); bedGain.connect(master); bed.start();
  }).catch(() => { /* Visuals work even when the device cannot start audio. */ });
}
function crackle(ignition) {
  if (!enabled || !audio || audio.state !== 'running' || document.hidden || voices.size >= 6) return;
  const now = audio.currentTime, source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain();
  source.buffer = noiseBuffer; filter.type = 'bandpass'; filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(ignition ? 1000 : 360 + Math.random() * 200, now);
  filter.frequency.exponentialRampToValueAtTime(140, now + 0.35);
  gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(ignition ? 0.11 : 0.035, now + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  source.connect(filter); filter.connect(gain); gain.connect(master); voices.add(source);
  source.onended = () => { voices.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
  source.start(); source.stop(now + 0.42);
}
function exportScene(state) {
  const w = width, h = height, density = pixelDensity();
  noLoop();
  try {
    pixelDensity(1); resizeCanvas(3200, 2400, true);
    renderScene(state === 'initial' ? -1 : state === 'middle' ? board.duration * 0.48 : board.duration, 8.2);
    saveCanvas(`lifesketch-013-${state}-3200x2400`, 'png');
  } finally {
    pixelDensity(density); resizeCanvas(w, h, true); previous = performance.now(); positionTrigger(); loop();
  }
}
