/* Shared Marpan25D provides every body and all three eyes; only pupils move. */
let plane, buildings = [], residents = [];
let engine, air, engineGain, soundReady = false, soundEnabled = true;
const scene = document.getElementById('scene');
const soundButton = document.getElementById('sound');

function setup() {
  const canvas = createCanvas(scene.clientWidth, scene.clientHeight);
  canvas.parent(scene);
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  plane = { x: width * 0.27, target: width * 0.27, direction: 1, moving: false };
  makeCity();
  scene.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button > 0) return;
    event.preventDefault();
    scene.focus({ preventScroll: true });
    startSound();
    movePlane(event.clientX - scene.getBoundingClientRect().left);
  });
  scene.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    startSound();
    movePlane(event.key === 'ArrowLeft' ? 0 : width);
  });
  soundButton.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundButton.textContent = soundEnabled ? '音 オン' : '音 オフ';
    soundButton.setAttribute('aria-pressed', String(soundEnabled));
    if (soundEnabled) startSound();
    updateSound();
  });
  document.addEventListener('visibilitychange', () => updateSound());
  new ResizeObserver(() => {
    if (width !== scene.clientWidth || height !== scene.clientHeight) windowResized();
  }).observe(scene);
}

function planeMargin() { return Math.min(64, width * 0.15); }
function movePlane(x) { plane.target = constrain(x, planeMargin(), width - planeMargin()); }

function makeCity() {
  buildings = []; residents = [];
  randomSeed(404);
  const palette = ['#c6d3bd', '#e2c5b5', '#c5c9d9', '#e4d7b6', '#b5cfc9', '#d8bfbd'];
  // Fixed seed keeps the neighborhood still across visits and resizes.
  const count = Math.max(5, Math.ceil(width / 132));
  const unit = width / count;
  const face = constrain(unit * 0.29, 24, 37);
  const floor = height - 15;
  for (let i = 0; i < count; i++) {
    const x = i * unit + 3;
    const w = unit - 6;
    const top = height * random(0.60, 0.72);
    const columns = w > 100 ? 3 : 2;
    const rows = Math.max(2, Math.floor((floor - top - 30) / (face * 1.25)));
    const building = { x, w, top, color: palette[i % palette.length], windows: [] };
    buildings.push(building);
    for (let col = 0; col < columns; col++) {
      const cx = x + (col + 0.5) * w / columns;
      addResident(cx, top - face * 0.16, face, true, building);
      for (let row = 0; row < rows; row++) {
        const cy = top + 30 + row * (floor - top - 30) / rows;
        addResident(cx, cy, face, false, building);
      }
    }
  }
}
function addResident(x, y, size, roof, building) {
  const marpan = new Marpan25D({ x, y, maxSize: size, expression: 'pupil' });
  const resident = { x, y, size, roof, marpan, gaze: 0 };
  residents.push(resident);
  building.windows.push(resident);
}

function draw() {
  background('#bce4f1');
  const dt = Math.min(deltaTime / 1000, 0.05);
  const distance = plane.target - plane.x;
  const step = constrain(width * 0.14, 65, 180) * dt;
  plane.moving = Math.abs(distance) > 0.1;
  if (plane.moving) {
    plane.direction = Math.sign(distance);
    plane.x += Math.sign(distance) * Math.min(Math.abs(distance), step);
    plane.moving = Math.abs(plane.target - plane.x) > 0.1;
  }
  drawCloud(width * 0.12, height * 0.42, 0.8);
  drawCloud(width * 0.77, height * 0.16, 1.1);
  drawCloud(width * 0.90, height * 0.48, 0.6);
  drawPlane(plane.x, height * 0.34);
  const radius = constrain(width * 0.16, 85, 190);
  for (const person of residents) {
    const d = Math.abs(person.x - plane.x);
    const t = constrain((radius - d) / (radius * 0.4), 0, 1);
    const target = t * t * (3 - 2 * t);
    person.gaze += (target - person.gaze) * (1 - Math.exp(-dt / 0.16));
    for (let eye = 0; eye < 3; eye++) {
      person.marpan.setPupilOffset(eye,
        constrain((plane.x - person.x) / radius, -1, 1) * 0.12 * person.gaze,
        -0.28 * person.gaze);
    }
  }
  for (const building of buildings) drawBuilding(building);
  noStroke(); fill('#a5b4a2'); rect(0, height - 15, width, 15);
  fill('#dfe2d4'); rect(0, height - 10, width, 10);
  updateSound();
}
function drawCloud(x, y, s) {
  push(); translate(x, y); scale(s); noStroke(); fill(255, 80);
  rect(-38, 0, 76, 10, 10); ellipse(-12, 0, 32, 22); ellipse(9, -4, 35, 28); pop();
}
function drawPlane(x, y) {
  push(); translate(x, y); scale(plane.direction * Math.min(1, width / 500), Math.min(1, width / 500));
  stroke('#49636c'); strokeWeight(1.5); strokeJoin(ROUND); fill('#f8f7ef');
  beginShape(); vertex(-53, -5); vertex(-61, -27); vertex(-49, -27); vertex(-32, -8);
  vertex(29, -8); bezierVertex(42, -8, 52, -1, 58, 5);
  bezierVertex(60, 12, 35, 13, 23, 13); vertex(-43, 10); vertex(-60, 0); endShape(CLOSE);
  fill('#799da5'); noStroke(); rect(29, -5, 13, 6, 2);
  for (let i = 0; i < 6; i++) circle(-22 + i * 8, 1, 3);
  fill('#cadbd9'); stroke('#49636c');
  beginShape(); vertex(-4, 6); vertex(-26, 29); vertex(-12, 29); vertex(21, 9); endShape(CLOSE);
  noStroke(); fill('#cb846b'); rect(-53, -23, 7, 4, 1); pop();
}
function drawBuilding(b) {
  noStroke(); fill(b.color); rect(b.x, b.top, b.w, height - 15 - b.top);
  for (const p of b.windows) {
    if (!p.roof) {
      fill('#718581'); rect(p.x - p.size * 0.56, p.y - p.size * 0.48, p.size * 1.12, p.size * 0.91, 3);
    }
    // Scale the shared renderer as a whole, preserving its eye and outline proportions.
    push(); translate(p.x, p.y); scale(p.size / 160);
    p.marpan.drawAt(0, 0, { bodyWidth: 160, bodyHeight: 108.8 }); pop();
    fill(p.roof ? b.color : '#ede9dc');
    rect(p.x - p.size * 0.62, p.y + p.size * 0.18, p.size * 1.24, p.size * 0.16, 1);
    if (p.roof) rect(p.x - p.size * 0.65, p.y + p.size * 0.34, p.size * 1.3, p.size * 0.12);
  }
  fill('#ffffff40'); rect(b.x - 1, b.top, b.w + 2, 5);
}
async function startSound() {
  if (!soundEnabled) return;
  try {
    await userStartAudio();
    if (!engine) {
      engineGain = new p5.Gain(); engineGain.connect(); engineGain.amp(0);
      engine = new p5.Oscillator('sawtooth'); engine.disconnect(); engine.connect(engineGain);
      engine.freq(62); engine.amp(0.12); engine.start();
      air = new p5.Noise('brown'); air.disconnect(); air.connect(engineGain); air.amp(0.18); air.start();
    }
    soundReady = true;
    updateSound();
  } catch (error) {
    // Keep the interaction usable when audio is unavailable; a later gesture retries.
    soundReady = false;
  }
}
let lastSoundLevel = -1;
function updateSound() {
  if (!soundReady) return;
  const level = !soundEnabled || document.hidden ? 0 : plane.moving ? 0.14 : 0.018;
  if (level !== lastSoundLevel) {
    engineGain.amp(level, 0.35); engine.freq(plane.moving ? 78 : 56, 0.4);
    lastSoundLevel = level;
  }
}
function windowResized() {
  const oldWidth = width;
  resizeCanvas(scene.clientWidth, scene.clientHeight);
  plane.x = constrain(plane.x / oldWidth * width, planeMargin(), width - planeMargin());
  plane.target = constrain(plane.target / oldWidth * width, planeMargin(), width - planeMargin());
  makeCity();
}
