/* global Marpan25D, createCanvas, pixelDensity, clear, noLoop, userStartAudio, getAudioContext */
'use strict';
const cube = document.getElementById('cube');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const duration = reducedMotion ? 180 : 720;
let turns = 0, rotating = false, ready = false, audio;

function setup() {
  const canvas = createCanvas(512, 512);
  pixelDensity(2);
  const marpan = new Marpan25D({ autoBlink: false, bodyColor: '#fffdf6' });
  const textures = ['pupil', 'angry'].map(expression => {
    clear();
    marpan.drawAt(256, 256, { bodyWidth: 416, bodyHeight: 282.88, lookX: 256, lookY: 256, expression });
    return canvas.elt.toDataURL('image/png');
  });
  // A, B, C, D in positive Y order: a negative quarter turn brings B forward.
  // Top and bottom remain attached to the vertical axis throughout every turn.
  ['normal', 'normal', 'normal', 'angry', 'normal', 'angry'].forEach((expression, index) => {
    const face = document.createElement('div');
    face.className = 'face';
    face.dataset.expression = expression;
    face.dataset.face = ['A', 'B', 'C', 'D', 'top', 'bottom'][index];
    const image = document.createElement('img');
    image.src = textures[expression === 'angry' ? 1 : 0];
    image.alt = ''; image.draggable = false;
    face.append(image); cube.append(face);
  });
  noLoop();
  paint(0);
  ready = true;
  cube.setAttribute('aria-disabled', 'false');
}

function paint(angle) {
  cube.style.transform = `rotateY(${angle}deg)`;
  [...cube.children].forEach((face, index) => {
    const shade = index < 4
      ? 0.07 + 0.15 * (1 - Math.cos((angle + index * 90 - 30) * Math.PI / 180)) / 2
      : index === 4 ? 0.025 : 0.24;
    face.style.setProperty('--shade', shade);
  });
}

function tone(angry) {
  if (!audio || audio.state !== 'running') return;
  const now = audio.currentTime;
  const oscillator = audio.createOscillator(), gain = audio.createGain();
  oscillator.type = angry ? 'sine' : 'triangle';
  oscillator.frequency.setValueAtTime(angry ? 105 : 530, now);
  oscillator.frequency.exponentialRampToValueAtTime(angry ? 48 : 280, now + (angry ? 0.19 : 0.09));
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(angry ? 0.18 : 0.035, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, now + (angry ? 0.25 : 0.13));
  oscillator.connect(gain); gain.connect(audio.destination);
  oscillator.start(now); oscillator.stop(now + 0.3);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}

function turn() {
  if (!ready || rotating) return;
  rotating = true;
  cube.setAttribute('aria-disabled', 'true');
  const start = performance.now(), from = -90 * turns;
  // Unlock sound inside the visitor's gesture; animation never depends on audio.
  userStartAudio().then(() => { audio = getAudioContext(); if (rotating) tone(false); }).catch(() => {});
  turns++;
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = t * t * (3 - 2 * t);
    paint(from - 90 * eased);
    if (t < 1) { requestAnimationFrame(frame); return; }
    const angry = turns % 4 === 3;
    if (angry) {
      tone(true);
      if (navigator.vibrate) navigator.vibrate(25);
      if (!reducedMotion) document.querySelector('.shake').animate([
        { transform: 'translateX(0)' }, { transform: 'translateX(-2px)' },
        { transform: 'translateX(2px)' }, { transform: 'translateX(0)' }
      ], { duration: 160 });
    }
    document.getElementById('status').textContent = `${turns}回目、${angry ? '怒った' : '普通の'}マーパン`;
    cube.dataset.turns = turns;
    cube.dataset.front = ['A', 'B', 'C', 'D'][turns % 4];
    rotating = false;
    cube.setAttribute('aria-disabled', 'false');
  }
  requestAnimationFrame(frame);
}
cube.addEventListener('click', turn);
cube.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!event.repeat) turn(); }
});
