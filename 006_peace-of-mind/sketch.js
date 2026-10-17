/* global Marpan25D, createCanvas, resizeCanvas, pixelDensity, width, height,
   push, pop, translate, scale, noStroke, fill, rect, ellipse, stroke,
   strokeWeight, line, noFill, beginShape, vertex, endShape, CLOSE, text,
   textAlign, textSize, CENTER, millis, lerp, userStartAudio, getAudioContext */
'use strict';
const TIMING = { coin: 650, paper: 1300, relief: 1900, end: 2600 };
const sides = [0, 1].map(index => ({ index, count: 0, queued: 0, started: null, paperSound: false, reliefSound: false }));
let enabled = true, context, noise, master, voices = new Set(), revealed = false;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setup() {
  const host = document.getElementById('scene');
  createCanvas(host.clientWidth, host.clientHeight).parent(host);
  pixelDensity(Math.min(devicePixelRatio || 1, 2));
  sides.forEach(side => {
    side.marpan = new Marpan25D({ bodyColor: '#fffdf6', autoBlink: false });
    side.marpan.setExpressionState('normal');
    const button = document.getElementById(side.index ? 'future' : 'past');
    // Handle each touch at contact: multi-touch does not always generate clicks.
    button.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch' || event.pointerType === 'pen') {
        event.preventDefault();
        purchase(side);
      }
    });
    // Native click also supports keyboard and mouse.
    button.addEventListener('click', event => {
      // Touch/pen was already accepted at pointerdown, including multi-touch.
      if (event.pointerType === 'touch' || event.pointerType === 'pen') return;
      purchase(side);
    });
  });
  document.getElementById('sound').onclick = () => {
    enabled = !enabled;
    document.getElementById('sound').textContent = enabled ? '音 オン' : '音 オフ';
    document.getElementById('sound').setAttribute('aria-pressed', String(enabled));
    if (master) master.gain.value = enabled ? 0.65 : 0;
    if (enabled) startAudio();
  };
  document.getElementById('reset').onclick = reset;
  new ResizeObserver(() => resizeCanvas(host.clientWidth, host.clientHeight)).observe(host);
}

function startAudio() {
  if (!enabled) return Promise.resolve();
  return userStartAudio().then(() => {
    context = getAudioContext();
    if (!master) { master = context.createGain(); master.gain.value = enabled ? 0.65 : 0; master.connect(context.destination); }
  }).catch(() => {});
}

function purchase(side) {
  if (side.started !== null) {
    side.queued++;
    startAudio();
    return;
  }
  side.started = millis();
  side.paperSound = side.reliefSound = false;
  const started = side.started;
  startAudio().then(() => { if (side.started === started) sound('coin'); });
}

function reset() {
  for (const voice of voices) { try { voice.stop(); } catch (_) { /* Already ended. */ } }
  voices.clear();
  sides.forEach(side => {
    side.count = 0; side.queued = 0; side.started = null;
    side.paperSound = side.reliefSound = false;
  });
  revealed = false;
  document.getElementById('revelation').classList.remove('visible');
  document.getElementById('status').textContent = 'はじめから。';
}

function ease(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
function cloudOpacity(count) { return 45 + 155 * Math.pow(0.72, count); }

function draw() {
  // Each panel uses the same 400 × 350 coordinate system and timeline.
  drawingContext.clearRect(0, 0, width, height);
  sides.forEach(side => {
    const age = side.started === null ? -1 : millis() - side.started;
    if (age >= TIMING.coin && !side.paperSound) { side.paperSound = true; sound('paper'); }
    if (age >= TIMING.paper && !side.reliefSound) { side.reliefSound = true; sound('relief'); }
    const relief = age < 0 ? 0 : ease((age - TIMING.paper) / (TIMING.relief - TIMING.paper));
    push();
    translate((side.index + 0.5) * width / 2, 0);
    const unit = Math.min(width / 2 / 400, height / 350);
    translate(0, (height - 350 * unit) / 2);
    scale(unit);
    building(side.index);
    noStroke(); fill('#a0a99b'); rect(-155, 284, 310, 1);
    fill(70, 76, 64, 13); ellipse(0, 280, 180, 15);
    const alpha = lerp(cloudOpacity(side.count), cloudOpacity(side.count + 1), relief);
    cloud(0, 158 + (reducedMotion ? 0 : Math.sin(millis() / 1800) * 2), alpha, side.index ? '未来' : '過去');
    side.marpan.drawAt(0, 241, { bodyWidth: 158, bodyHeight: 107.44,
      lookX: 0, lookY: 241, expression: age >= TIMING.paper ? 'happy' : 'pupil' });
    if (age >= 0 && age < TIMING.coin) {
      const t = ease(age / TIMING.coin);
      const x = lerp(0, 80, t), y = lerp(235, 83, t) - (reducedMotion ? 0 : Math.sin(t * Math.PI) * 28);
      coin(x, y);
    } else if (age >= TIMING.coin && age < TIMING.paper) {
      const t = ease((age - TIMING.coin) / (TIMING.paper - TIMING.coin));
      documentSheet(lerp(80, 22, t), lerp(83, 259, t), side.index);
    } else if (age >= TIMING.paper || side.count > 0) documentSheet(22, 259, side.index);
    pop();
    if (age >= TIMING.end) {
      side.count++;
      side.started = null;
      document.getElementById('status').textContent = `${side.index ? '生命保険' : '免罪符'}を受け取りました。`;
      if (side.queued > 0) {
        side.queued--;
        purchase(side);
      }
    }
  });
  if (!revealed && sides.every(side => side.count > 0)) {
    revealed = true;
    document.getElementById('revelation').classList.add('visible');
  }
}

function building(modern) {
  push(); translate(80, 110); stroke('#a5ad9f'); strokeWeight(1.5);
  if (!modern) {
    fill('#d5cdb9'); rect(-49, -26, 94, 66); rect(-20, -63, 36, 103);
    fill('#c4baa2'); beginShape(); vertex(-25,-63); vertex(-2,-88); vertex(21,-63); endShape(CLOSE);
    line(-2,-108,-2,-88); line(-11,-100,7,-100);
    fill('#aaa48e'); rect(-10,15,16,25,8,8,0,0);
    noFill(); rect(-8,-46,12,23,6,6,0,0);
    for (let row=0;row<3;row++) { line(-48,-14+row*17,-21,-14+row*17); line(17,-14+row*17,44,-14+row*17); }
  } else {
    fill('#d7e1df'); rect(-48,-24,30,64); rect(-16,-81,62,121); fill('#edf2ef'); rect(-10,-74,50,21);
    noStroke(); fill('#849c97'); textAlign(CENTER,CENTER); textSize(10); text('保険会社',15,-63);
    stroke('#a5b7b3'); for(let row=0;row<4;row++) for(let col=0;col<3;col++) { fill('#ecf1ed'); rect(-7+col*16,-43+row*18,8,10); }
    fill('#a8bcb5'); rect(6,20,17,20);
  }
  pop();
}

function cloud(x,y,alpha,label) {
  push(); translate(x,y); noStroke(); fill(45,49,48,alpha);
  // One filled silhouette prevents overlapping circles from darkening unevenly.
  const ctx = drawingContext; ctx.beginPath();
  ctx.moveTo(-47,14); ctx.bezierCurveTo(-74,8,-69,-21,-45,-23);
  ctx.bezierCurveTo(-42,-50,-3,-51,9,-30); ctx.bezierCurveTo(28,-44,52,-30,51,-11);
  ctx.bezierCurveTo(76,-10,75,17,51,20); ctx.bezierCurveTo(12,24,-18,22,-47,14); ctx.fill();
  fill('#f7f5ef'); textAlign(CENTER,CENTER); textSize(15); text(label,0,-7); pop();
}
function coin(x,y) {
  push(); translate(x,y); stroke('#b28c40'); strokeWeight(1.5); fill('#e7c873'); ellipse(0,0,18,18);
  noFill(); ellipse(0,0,12,12); line(0,-3,0,3); pop();
}
function documentSheet(x,y,modern) {
  push(); translate(x,y); stroke(modern ? '#9eb5b5' : '#b9a879'); strokeWeight(1);
  fill(modern ? '#fcfdf9' : '#f8edd1'); rect(-12,-17,24,34,1);
  noFill(); if (modern) { beginShape(); vertex(-4,-12);vertex(4,-12);vertex(4,-7);vertex(0,-3);vertex(-4,-7);endShape(CLOSE); }
  else { line(0,-13,0,-3);line(-4,-9,4,-9); }
  for(let i=0;i<3;i++) line(-7,3+i*4,7,3+i*4); pop();
}

// Both panels share these sounds, using the p5.sound AudioContext unlocked by a gesture.
function sound(kind) {
  if (!enabled || !context || context.state !== 'running' || !master) return;
  const now = context.currentTime;
  function route(source, duration, volume, at=now, filter=null) {
    const gain = context.createGain(); gain.gain.setValueAtTime(0,at);
    gain.gain.linearRampToValueAtTime(volume,at+0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001,at+duration);
    if (filter) { source.connect(filter); filter.connect(gain); } else source.connect(gain);
    gain.connect(master); voices.add(source); source.start(at); source.stop(at+duration);
    source.onended = () => { voices.delete(source); source.disconnect(); filter?.disconnect(); gain.disconnect(); };
  }
  if (kind === 'paper') {
    if (!noise) { noise = context.createBuffer(1,context.sampleRate*0.3,context.sampleRate); const data=noise.getChannelData(0); for(let i=0;i<data.length;i++) data[i]=Math.random()*2-1; }
    const source=context.createBufferSource(); source.buffer=noise;
    const filter=context.createBiquadFilter(); filter.type='bandpass';filter.frequency.value=1800;filter.Q.value=0.7;
    route(source,0.26,0.12,now,filter);
  } else {
    const frequencies = kind === 'coin' ? [1680,2460,3350] : [392,493.88,587.33];
    frequencies.forEach((frequency,index) => { const source=context.createOscillator();source.type='sine';source.frequency.value=frequency;route(source,kind==='coin'?0.3:0.48,kind==='coin'?0.055:0.065,now+(kind==='coin'?0:index*0.12)); });
  }
}
