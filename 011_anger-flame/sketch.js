/* global Marpan25D, createCanvas, resizeCanvas, pixelDensity, width, height,
   drawingContext, push, pop, translate, scale, background, noStroke, fill,
   ellipse, stroke, strokeWeight, noFill, arc, PI, textFont, textSize, textAlign,
   CENTER, text, lerpColor, color, millis, userStartAudio, getAudioContext,
   noLoop, loop, saveCanvas */
'use strict';
const WORDS = ['嫉妬', '恨み', '憎悪', '傲慢', '執着', '不満', '怒り'];
const emotions = WORDS.map((word, index) => ({ word, index, state: 'floating', age: 0, x: 0, y: 0 }));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let marpan, heat = 0, visibleHeat = 0, flare = 0, clock = 0, previous = 0;
let audio, master, bed, bedGain, noiseBuffer, enabled = true;
const voices = new Set();
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = t => { t = clamp(t); return t * t * (3 - 2 * t); };

function setup() {
  const host = document.getElementById('stage');
  createCanvas(host.clientWidth, host.clientHeight).parent(host);
  pixelDensity(Math.min(devicePixelRatio || 1, 2));
  marpan = new Marpan25D({ expression: 'angry', autoBlink: false });
  emotions.forEach(e => {
    const b = document.createElement('button'); b.className = 'emotion'; b.textContent = e.word;
    b.setAttribute('aria-label', `${e.word}を投げ込む`); e.button = b;
    b.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse') { event.preventDefault(); feed(e); }
    });
    b.addEventListener('click', event => {
      if (event.pointerType === 'touch' || event.pointerType === 'pen') return;
      feed(e);
    });
    document.getElementById('emotions').append(b);
  });
  new ResizeObserver(() => resizeCanvas(host.clientWidth, host.clientHeight)).observe(host);
  document.getElementById('sound').onclick = () => {
    enabled = !enabled;
    document.getElementById('sound').textContent = enabled ? '音 ON' : '音 OFF';
    document.getElementById('sound').setAttribute('aria-pressed', String(enabled));
    document.getElementById('sound').setAttribute('aria-label', enabled ? '音を消す' : '音を出す');
    if (master) master.gain.setTargetAtTime(enabled ? 0.5 : 0, audio.currentTime, 0.04);
    if (enabled) startAudio();
  };
  document.querySelectorAll('[data-export]').forEach(b => b.onclick = () => exportScene(b.dataset.export));
  document.addEventListener('visibilitychange', () => {
    if (master) master.gain.setTargetAtTime(document.hidden || !enabled ? 0 : 0.5, audio.currentTime, 0.08);
  });
  previous = performance.now();
}
function geometry() {
  const w = Math.min(width * 0.55, height * 0.72, 460 * Math.max(1, width / 1200));
  return { x: width / 2, y: height * 0.51, w, h: w * 0.68 };
}
// Seven separate elliptical sectors leave an empty region around all three eyes.
function floatingPosition(index, time) {
  const angle = -Math.PI / 2 + index * Math.PI * 2 / 7;
  const wobble = reducedMotion ? 0 : Math.sin(time * 0.29 + index * 2.3) * 0.035;
  const rx = Math.min(width * 0.38, 395 * Math.max(1, width / 1200)), ry = height * 0.36;
  return { x: width / 2 + Math.cos(angle + wobble) * rx,
    y: height * 0.51 + Math.sin(angle + wobble) * ry };
}
function feed(e) {
  if (e.state !== 'floating') return;
  e.state = 'flying'; e.age = 0; e.startX = e.x / width; e.startY = e.y / height;
  e.button.disabled = true;
  startAudio().then(() => sound('suction'));
}
function draw() {
  const now = performance.now(), elapsed = Math.max(0, (now - previous) / 1000); previous = now;
  // Decay uses real elapsed time, including time spent in a background tab.
  heat = Math.max(0, heat - elapsed * (0.018 + heat * 0.025));
  const dt = Math.min(elapsed, 0.1); clock += dt;
  visibleHeat += (heat - visibleHeat) * (1 - Math.exp(-dt * 5));
  flare *= Math.exp(-dt * 5);
  emotions.forEach(e => {
    e.age += dt;
    if (e.state === 'flying' && e.age >= 0.66) {
      e.state = 'resting'; e.age = 0;
      heat = clamp(heat + 0.18); flare = Math.min(1, flare + 0.45); sound('fire');
      document.getElementById('status').textContent = `${e.word}が炎に吸い込まれた。`;
    } else if (e.state === 'resting' && e.age >= 1.15) {
      e.state = 'floating'; e.age = 0; e.button.disabled = false;
    }
  });
  renderScene(visibleHeat, flare, clock);
  emotions.forEach(e => {
    const pos = emotionPosition(e, clock), b = e.button;
    e.x = pos.x; e.y = pos.y;
    b.style.transform = `translate(${pos.x}px,${pos.y}px) translate(-50%,-50%) scale(${pos.size})`;
    b.style.opacity = pos.opacity;
    b.style.visibility = e.state === 'resting' ? 'hidden' : 'visible';
  });
  if (bedGain) {
    bedGain.gain.setTargetAtTime(document.hidden ? 0 : Math.pow(visibleHeat, 1.7) * 0.12, audio.currentTime, 0.15);
  }
}
function emotionPosition(e, time) {
  if (e.state === 'flying') {
    const p = ease(e.age / 0.66), g = geometry();
    return { x: e.startX * width * (1 - p) + g.x * p,
      y: e.startY * height * (1 - p) + (g.y + g.h * 0.25) * p,
      size: 1 - p * 0.8, opacity: 1 - ease((p - 0.6) / 0.4) };
  }
  return { ...floatingPosition(e.index, time), size: 1, opacity: e.state === 'resting' ? 0 : 0.8 * ease(e.age / 0.7) };
}
function renderScene(intensity, burst, time, printState = null) {
  background('#f5f2e9');
  const g = geometry();
  noStroke(); fill(93, 65, 39, 12 + intensity * 10);
  ellipse(g.x, g.y + g.h * 0.56, g.w * 0.85, g.h * 0.1);
  push();
  const shake = reducedMotion ? 0 : Math.pow(intensity, 2) * g.w * 0.006;
  translate(g.x + Math.sin(time * 37) * shake, g.y + Math.sin(time * 43) * shake * 0.45);
  marpan.drawBody(0, 0, g.w, g.h, 0, lerpColor(color('#fffaf0'), color('#e44c30'), intensity));
  marpan.beginClip(0, 0, g.w, g.h, 0);
  const ctx = drawingContext;
  const glow = ctx.createRadialGradient(0, g.h * 0.29, 0, 0, g.h * 0.15, g.w * 0.55);
  glow.addColorStop(0, `rgba(255,133,36,${0.15 + intensity * 0.45})`); glow.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = glow; ctx.fillRect(-g.w, -g.h, g.w * 2, g.h * 2);
  drawFlames(g, intensity, burst, time);
  ctx.restore();
  // Shared renderer's opaque white eyes always sit in front of the internal fire.
  marpan.drawEyes(0, 0, g.w, g.h, 0, 0, 0, { expression: 'angry' });
  noFill(); stroke('#703a2e'); strokeWeight(g.w * 0.008);
  arc(0, g.h * 0.24, g.w * 0.1, g.h * 0.085, PI, PI * 2);
  pop();
  if (printState) {
    textFont('serif'); textAlign(CENTER, CENTER); textSize(Math.max(18, width * 0.019)); noStroke(); fill('#857666');
    emotions.forEach(e => {
      let p = floatingPosition(e.index, time);
      if (printState === 'feeding' && e.index === 0) p = { x: g.x - g.w * 0.12, y: g.y + g.h * 0.27 };
      text(e.word, p.x, p.y);
    });
  }
}
function drawFlames(g, intensity, burst, time) {
  const ctx = drawingContext, power = clamp(intensity + burst * 0.16);
  const base = g.h * 0.44;
  const flameH = g.h * (0.14 + power * 0.79);
  const spread = g.w * (0.08 + power * 0.34);
  const motion = reducedMotion ? time * 0.32 : time;
  for (let i = 0; i < 9; i++) {
    const slot = (i - 4) / 4, x = slot * spread * 0.78;
    const tall = flameH * (0.64 + 0.36 * Math.cos(slot * 1.5)) * (0.91 + 0.09 * Math.sin(motion * 4.1 + i * 1.7));
    const sway = Math.sin(motion * (2 + power * 3) + i * 1.9) * spread * 0.16;
    const fw = spread * (0.24 + 0.08 * Math.sin(motion * 2.7 + i));
    const gradient = ctx.createLinearGradient(x, base, x, base - tall);
    gradient.addColorStop(0, '#fabe43'); gradient.addColorStop(0.5, '#f4782c'); gradient.addColorStop(1, '#d94627');
    ctx.fillStyle = gradient; ctx.beginPath();ctx.moveTo(x - fw, base);
    ctx.bezierCurveTo(x - fw * 1.5, base - tall * 0.32, x + sway - fw * 0.3, base - tall * 0.64, x + sway, base - tall);
    ctx.bezierCurveTo(x + sway + fw * 0.12, base - tall * 0.68, x + fw * 1.4, base - tall * 0.28, x + fw, base);
    ctx.closePath();ctx.fill();
    ctx.fillStyle = '#ffe2a0';ctx.beginPath();ctx.moveTo(x - fw * 0.45, base);
    ctx.quadraticCurveTo(x - fw * 0.7, base - tall * 0.17, x + sway * 0.4, base - tall * 0.48);
    ctx.quadraticCurveTo(x + fw * 0.7, base - tall * 0.14, x + fw * 0.45, base);ctx.fill();
  }
}
function startAudio() {
  if (!enabled) return Promise.resolve();
  return userStartAudio().then(() => {
    if (audio) return;
    audio = getAudioContext(); master = audio.createGain(); master.gain.value = enabled ? 0.5 : 0;
    const limiter = audio.createDynamicsCompressor(); limiter.threshold.value = -16; limiter.ratio.value = 8;
    master.connect(limiter); limiter.connect(audio.destination);
    noiseBuffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
    const data = noiseBuffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    bed = audio.createBufferSource(); bed.buffer = noiseBuffer; bed.loop = true;
    const filter = audio.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 530;
    bedGain = audio.createGain(); bedGain.gain.value = 0;
    bed.connect(filter); filter.connect(bedGain); bedGain.connect(master); bed.start();
  }).catch(() => { /* The visual experience remains available if audio is unavailable. */ });
}
function sound(kind) {
  if (!enabled || !audio || audio.state !== 'running' || document.hidden) return;
  const now = audio.currentTime, source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain();
  source.buffer = noiseBuffer; filter.type = 'bandpass'; filter.Q.value = 0.65;
  const fire = kind === 'fire', duration = fire ? 0.48 : 0.24;
  filter.frequency.setValueAtTime(fire ? 340 : 1100, now);
  filter.frequency.exponentialRampToValueAtTime(fire ? 110 : 340, now + duration);
  gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(fire ? 0.2 + heat * 0.15 : 0.055, now + 0.035);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(filter); filter.connect(gain); gain.connect(master); voices.add(source);
  source.start(now); source.stop(now + duration);
  source.onended = () => { voices.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
}
function exportScene(state) {
  const w = width, h = height, density = pixelDensity();
  noLoop();
  try {
    pixelDensity(1); resizeCanvas(3200, 2400, true);
    renderScene(state === 'ember' ? 0 : state === 'feeding' ? 0.43 : 1, state === 'feeding' ? 0.65 : 0, 4.2, state);
    saveCanvas(`lifesketch-011-${state}-3200x2400`, 'png');
  } finally {
    pixelDensity(density); resizeCanvas(w, h, true); previous = performance.now(); loop();
  }
}
