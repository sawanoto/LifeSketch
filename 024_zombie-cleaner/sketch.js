const scene = new BalloonScene();
let marpan;
let stage;
function setup() {
  stage = document.getElementById('stage');
  const canvas = createCanvas(stage.clientWidth, stage.clientHeight);
  canvas.parent(stage);
  canvas.attribute('aria-label', '街の上に浮かぶマーパンのアドバルーン');
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  marpan = new Marpan25D({ bodyColor: '#f9f8ef' });
  document.getElementById('loft').addEventListener('click', () => scene.launch());
  new ResizeObserver(() => resizeCanvas(stage.clientWidth, stage.clientHeight)).observe(stage);
}
function draw() {
  // Small simulation steps preserve contact ordering even after a slow frame.
  let remaining = Math.min(deltaTime / 1000, .1);
  while (remaining > 0) { const step = Math.min(remaining, 1 / 120); scene.update(step); remaining -= step; }
  background('#e9f3f4');
  const b = scene.balloon();
  const size = width * .18;
  if (scene.phase !== 'absent') {
    stroke('#a9b6b0'); strokeWeight(1);
    noFill();
    bezier(b.x * width, b.y * height + size * .5, width * .55, height * .65, width * .6, height * .85, width * .58, height);
    if (scene.stuck) pigeon((b.x + scene.stuck.dx) * width, (b.y + scene.stuck.dy) * height, 0, true);
    marpan.drawAt(b.x * width, b.y * height, { bodyWidth: size, bodyHeight: size,
      lookX: b.x * width, lookY: b.y * height, pulse: 0 });
  }
  city();
  for (const bird of scene.birds) pigeon(bird.x * width, bird.y * height, bird.age, false);
}
function city() {
  noStroke();
  for (let i = 0; i < 17; i++) {
    const x = i * width / 16;
    const w = width / 16 + 1;
    const top = height * (.79 + Math.sin(i * 4.7) * .025);
    fill('#d4dfdc'); rect(x, top, w, height - top);
  }
  // Side planes and converging window rows suggest a view from the street.
  for (let i = 0; i < 7; i++) {
    const x = i * width / 6 - width * .035;
    const w = width * .12;
    const y = height * (.86 + Math.sin(i * 2.4) * .025);
    const inward = (width * .5 - x) * .025;
    fill('#bccac5'); quad(x, y, x + w, y - height * .012, x + w + inward, height, x - inward, height);
    fill('#acbdb7'); quad(x + w, y - height * .012, x + w + width * .025, y + height * .008, x + w + width * .025 + inward, height, x + w + inward, height);
    fill('#e4eae2');
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      rect(x + w * (.17 + col * .27), y + height * (.025 + row * .038), Math.max(3, w * .1), height * .014);
    }
  }
}
function pigeon(x, y, age, stuck) {
  const s = Math.max(12, Math.min(19, width * .028));
  push(); translate(x, y); scale(s / 20);
  // The beak/head are hidden in the surface when embedded; tail stays visible.
  stroke('#647475'); strokeWeight(1); fill('#9aa9aa');
  triangle(-17, 2, -29, -3, -27, 7);
  ellipse(-8, 1, 27, 14);
  if (!stuck) {
    fill('#a8b6b6'); ellipse(7, -5, 12, 12);
    fill('#b4a28b'); triangle(12, -6, 19, -3, 12, -2);
    noStroke(); fill('#394a4c'); circle(9, -7, 2);
  }
  fill('#c1cbca'); stroke('#748686');
  const flap = stuck ? 12 : Math.sin(age * 19) * 19;
  triangle(-14, 0, -8, -7 - flap, 4, 0);
  pop();
}
