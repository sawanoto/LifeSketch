/* Shared-renderer sprites keep the crowd inexpensive, including on phones.
   People stay in fixed depth slots; a departing person is replaced in that slot. */
let crowd = [];
let portraits = [];
let stones = [];
let stillCrowd;
const FLIGHT_MS = 620;
const FALL_MS = 330;
const ABSENT_MS = 90;
const RETURN_MS = 180;
const BACKGROUND = '#f5f2e9';

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('stage');
  pixelDensity(1);
  // Pointer events unify mouse, pen and touch without synthesized double clicks.
  canvas.elt.addEventListener('pointerdown', event => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    const bounds = canvas.elt.getBoundingClientRect();
    throwStone((event.clientX - bounds.left) * width / bounds.width,
      (event.clientY - bounds.top) * height / bounds.height);
  });
  buildCrowd();
}

function buildCrowd() {
  stones = [];
  crowd = [];
  portraits = [];
  randomSeed(2020);
  // Render the actual shared Marpan once per variation, then reuse its pixels.
  for (let i = 0; i < 8; i++) {
    clear();
    const marpan = new Marpan25D({ autoBlink: false, yaw: random(-0.13, 0.13) });
    marpan.setExpressionState('normal');
    marpan.drawAt(84, 62, { bodyWidth: 150, bodyColor: '#fffefa' });
    portraits.push(get(0, 0, 168, 124));
  }
  let y = -8;
  let row = 0;
  while (y < height + 130) {
    const depth = constrain(y / height, 0, 1);
    const size = lerp(23, constrain(width * 0.19, 105, 205), pow(depth, 1.35));
    const step = size * 0.76;
    for (let x = -size; x < width + size; x += step) {
      crowd.push({ x: x + random(-step * 0.17, step * 0.17) + (row % 2) * step * 0.5,
        y: y + random(-size * 0.055, size * 0.055), size,
        portrait: floor(random(portraits.length)), hitAt: null, reserved: false, direction: 1 });
    }
    y += size * 0.30;
    row++;
  }
  crowd.sort((a, b) => a.y - b.y);
  background(BACKGROUND);
  crowd.forEach(person => drawPerson(person, 0));
  stillCrowd = get();
  noLoop();
  redraw();
}

function drawPerson(person, now) {
  const age = person.hitAt === null ? -1 : now - person.hitAt;
  let opacity = 1;
  let tilt = 0;
  let drop = 0;
  if (age >= 0 && age < FALL_MS) {
    const t = age / FALL_MS;
    tilt = person.direction * t * t * 1.35;
    drop = person.size * 0.15 * t;
    opacity = 1 - pow(t, 3);
  } else if (age >= FALL_MS && age < FALL_MS + ABSENT_MS) {
    return;
  } else if (age >= FALL_MS + ABSENT_MS) {
    opacity = constrain((age - FALL_MS - ABSENT_MS) / RETURN_MS, 0, 1);
    if (opacity === 1) {
      person.hitAt = null;
      person.reserved = false;
    }
  }
  push();
  translate(person.x, person.y + person.size * 0.30 + drop);
  rotate(tilt);
  drawingContext.globalAlpha = opacity;
  image(portraits[person.portrait], -person.size * 0.56, -person.size * 0.713,
    person.size * 1.12, person.size * 0.827);
  pop();
}

function throwStone(x, y) {
  // Find an exposed face nearest the gesture, excluding people already in motion.
  let target;
  let best = Infinity;
  for (let i = crowd.length - 1; i >= 0; i--) {
    const person = crowd[i];
    if (person.reserved || person.x < 8 || person.x > width - 8 ||
        person.y < 12 || person.y > height - person.size * 0.12) continue;
    const score = sq(person.x - x) + sq(person.y - person.size * 0.13 - y);
    if (score < best) { best = score; target = person; }
  }
  if (!target) return;
  target.reserved = true;
  target.direction = x < width / 2 ? 1 : -1;
  stones.push({ target, startedAt: millis(), startX: width * 0.5,
    startY: height + 32, endX: target.x, endY: target.y - target.size * 0.13 });
  loop();
}

function draw() {
  const now = millis();
  if (!stones.length && !crowd.some(person => person.reserved)) {
    image(stillCrowd, 0, 0);
    noLoop();
    return;
  }
  // Impact precedes crowd rendering, so the first fall frame shares the contact time.
  for (const stone of stones) {
    if (now - stone.startedAt >= FLIGHT_MS && stone.target.hitAt === null) {
      stone.target.hitAt = stone.startedAt + FLIGHT_MS;
    }
  }
  background(BACKGROUND);
  for (const person of crowd) drawPerson(person, now);
  for (const stone of stones) {
    const t = constrain((now - stone.startedAt) / FLIGHT_MS, 0, 1);
    if (t >= 1) continue;
    const x = lerp(stone.startX, stone.endX, t);
    const y = lerp(stone.startY, stone.endY, t) - sin(PI * t) * height * 0.22;
    const size = lerp(27, max(5, stone.target.size * 0.085), t);
    push();
    translate(x, y);
    rotate(t * 7);
    stroke('#484640'); strokeWeight(1.4); fill('#8d8980');
    beginShape();
    vertex(-size * 0.5, -size * 0.16); vertex(-size * 0.18, -size * 0.43);
    vertex(size * 0.35, -size * 0.30); vertex(size * 0.49, size * 0.16);
    vertex(size * 0.08, size * 0.4); vertex(-size * 0.41, size * 0.28);
    endShape(CLOSE);
    pop();
  }
  stones = stones.filter(stone => now - stone.startedAt < FLIGHT_MS);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildCrowd();
}
