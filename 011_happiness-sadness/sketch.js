/* global Marpan25D, MoodMotion, createCanvas, pixelDensity, resizeCanvas, width, height,
 background, stroke, strokeWeight, line, push, pop, translate, scale, drawingContext,
 userStartAudio, getAudioContext */
'use strict';
const mood = new MoodMotion();
let marpan, previous = performance.now(), time = 0, held = null, nextRepeat = 0;
let audioEnabled = true, audioContext, lastTone = -Infinity, voice = null;
function setup() {
  const canvas = createCanvas(window.innerWidth, document.querySelector('main').clientHeight);
  canvas.parent('stage'); pixelDensity(Math.min(devicePixelRatio || 1, 2));
  marpan = new Marpan25D({bodyColor:'#e4bea0', autoBlink:false});
  marpan.setExpressionState('normal');
  for (const [id, direction] of [['happy', -1], ['sad', 1]]) {
    const button = document.getElementById(id);
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault(); clearHeld();
      held = {button, direction, pointer:event.pointerId};
      button.setPointerCapture(event.pointerId); button.classList.add('active');
      stimulate(direction); nextRepeat = performance.now() + 180;
    });
    for (const name of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(name, event => {
      if (held?.button === button && held.pointer === event.pointerId) clearHeld();
    });
    button.addEventListener('keydown', event => {
      if (![' ', 'Enter'].includes(event.key)) return;
      event.preventDefault(); if (event.repeat) return;
      clearHeld(); held = {button, direction, key:event.key};
      button.classList.add('active'); stimulate(direction); nextRepeat = performance.now() + 180;
    });
    button.addEventListener('keyup', event => { if (held?.button === button && held.key === event.key) { event.preventDefault(); clearHeld(); } });
    button.addEventListener('blur', () => { if (held?.button === button) clearHeld(); });
    // Assistive technology activates a button through a synthetic click.
    button.addEventListener('click', event => { if (event.detail === 0 && !held) stimulate(direction); });
  }
  window.addEventListener('blur', () => { clearHeld(); mood.release(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearHeld(); mood.release(); } });
  document.getElementById('sound').onclick = () => {
    audioEnabled = !audioEnabled;
    document.getElementById('sound').textContent = audioEnabled ? '音 ON' : '音 OFF';
    document.getElementById('sound').setAttribute('aria-pressed', String(audioEnabled));
    if (!audioEnabled && voice) voice.gain.gain.setTargetAtTime(0, audioContext.currentTime, 0.01);
    if (audioEnabled) userStartAudio().catch(() => {});
  };
  document.getElementById('export').onclick = exportPNG;
}
function clearHeld() { if (held) held.button.classList.remove('active'); held = null; }
function stimulate(direction) {
  mood.press(direction);
  if (audioEnabled) userStartAudio().then(() => { audioContext = getAudioContext(); tone(direction); }).catch(() => {});
}
function tone(direction) {
  if (!audioEnabled || document.hidden) return;
  const now = audioContext.currentTime;
  if (now - lastTone < 0.16) return;
  lastTone = now;
  if (voice) voice.gain.gain.setTargetAtTime(0, now, 0.012);
  const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
  oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(direction < 0 ? 660 : 196, now);
  oscillator.frequency.exponentialRampToValueAtTime(direction < 0 ? 880 : 174.6, now + 0.16);
  gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.045, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
  oscillator.connect(gain); gain.connect(audioContext.destination);
  voice = {gain}; oscillator.start(now); oscillator.stop(now + 0.26);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}
function draw() {
  const now = performance.now(), dt = Math.max(0, (now - previous) / 1000); previous = now;
  // Advance elapsed time before refreshing held input, including after a suspended tab.
  mood.step(dt); time += dt;
  if (held && !document.hidden && now >= nextRepeat) { stimulate(held.direction); nextRepeat = now + 180; }
  renderScene();
}
function renderScene(printScale = 1) {
  background('#f6f3ed'); stroke('#dfded6'); strokeWeight(1);
  for (let i = 0; i < 28; i++) {
    const x = ((i * 0.61803398875 * width - time * 9) % width + width) % width;
    const y = ((i * 0.38196601125) % 1) * height;
    line(x, y, x + (i % 3 === 0 ? 7 : 2), y);
  }
  const bodyW = Math.min(width * 0.43, height * 0.28, 250 * printScale), bodyH = bodyW * 0.68;
  push(); translate(width / 2, height / 2 + mood.y * bodyH); scale(bodyW / 1000);
  marpan.drawBody(0, 0, 1000, 680, 0, '#e4bea0');
  marpan.beginClip(0, 0, 1000, 680, 0); marpan.drawEyes(0, 0, 1000, 680, 0, 0, 0); drawingContext.restore(); pop();
}
function windowResized() { resizeCanvas(window.innerWidth, document.querySelector('main').clientHeight); }
function exportPNG() {
  const oldW = width, oldH = height, density = window.pixelDensity();
  pixelDensity(1); resizeCanvas(3200, 2400, true); renderScene(3200 / oldW);
  const snapshot = document.createElement('canvas'); snapshot.width = 3200; snapshot.height = 2400;
  snapshot.getContext('2d').drawImage(document.querySelector('#stage canvas'), 0, 0);
  pixelDensity(density); resizeCanvas(oldW, oldH, true); renderScene();
  snapshot.toBlob(blob => {
    if (!blob) { document.getElementById('status').textContent = '保存できませんでした。'; return; }
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `lifesketch-011-${Date.now()}.png`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    document.getElementById('status').textContent = 'PNGを書き出しました。';
  }, 'image/png');
}
