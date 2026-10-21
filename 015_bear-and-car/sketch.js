const stage = document.getElementById('stage');
const clock = new BearCarTiming.Clock();
let marpan;
function setup() {
  const canvas = createCanvas(stage.clientWidth, stage.clientHeight);
  canvas.parent(stage);
  canvas.elt.setAttribute('role', 'img');
  canvas.elt.setAttribute('aria-label', '左にクマ、右に車。同じ三つ目のマーパンの前を通過し、右だけが繰り返し横に倒れて起き上がる。');
  pixelDensity(Math.min(devicePixelRatio || 1, 2));
  marpan = new Marpan25D({ id: 'bear-and-car', expression: 'pupil', yaw: 0 });
  noLoop();
  new ResizeObserver(() => { resizeCanvas(stage.clientWidth, stage.clientHeight); }).observe(stage);
}
function draw() { clock.tick(performance.now(), document.hidden); paint(clock.elapsed); }
function paint(elapsed) {
  background('#f5f2e9');
  const state = BearCarTiming.sample(elapsed), half = width / 2;
  stroke('#d9d2c4'); strokeWeight(1); line(half, 18, half, height - 18);
  for (let side = 0; side < 2; side++) {
    push();
    drawingContext.save(); drawingContext.beginPath(); drawingContext.rect(side * half, 0, half, height); drawingContext.clip();
    translate(side * half, 0);
    const size = Math.min(half * .30, height * .30, 125 * Math.max(1, width / 1100)), ground = height * .69;
    stroke('#d2cabc'); strokeWeight(1); line(half * .08, ground + 3, half * .92, ground + 3);
    const amount = side ? state.carFall : state.bearFall;
    // Rotate the shared renderer as a whole; preserve all three eyes and their layout.
    push(); translate(half * .5 + size * .14 * amount, ground - size * .5 * amount);
    rotate(amount * HALF_PI); marpan.drawAt(0, -size * .45, {bodyWidth:size, bodyHeight:size * .9}); pop();
    if (clock.running || elapsed > 0) {
      // Impact at t=3s,6s,…; the centre of each silhouette reaches Marpan at phase zero.
      const phase = (state.phase + 1500) % 3000;
      const travel = half + size * 2.4;
      const x = -size * 1.2 + travel * phase / 3000;
      // Before the first impact, enter only during the latter half of the first cycle.
      if (elapsed >= 1500) {
        push(); translate(x, ground); scale(size / 100);
        noStroke(); fill('#171715');
        if (side) car(); else bear(elapsed);
        pop();
      }
    }
    drawingContext.restore(); pop();
  }
}
function car() {
  rect(-66,-35,132,24,6); quad(-43,-35,-24,-59,26,-59,49,-35);
  circle(-40,-10,25); circle(42,-10,25);
  rect(54,-30,15,14,3);
}
function bear(elapsed) {
  ellipse(-8,-37,101,57); ellipse(40,-49,42,43); ellipse(61,-43,27,19); circle(30,-70,16);
  const gait = Math.sin(elapsed / 115) * 6;
  for (const [x, shift] of [[-40,gait],[-20,-gait],[19,-gait],[35,gait]]) {
    quad(x-7,-34,x+7,-34,x+7+shift,-3,x-7+shift,-3);
  }
  circle(-57,-44,13);
}
document.getElementById('start').addEventListener('click', () => {
  if (clock.running) return;
  clock.running = true; clock.last = document.hidden ? null : performance.now(); loop();
  document.getElementById('start').disabled = true;
  document.getElementById('status').textContent = '再生中';
});
document.getElementById('reset').addEventListener('click', () => {
  clock.reset(); noLoop(); redraw();
  document.getElementById('start').disabled = false;
  document.getElementById('status').textContent = '開始して、しばらく眺めてみる。';
  document.getElementById('statistics').hidden = true;
  document.getElementById('probability').setAttribute('aria-expanded', 'false');
  document.getElementById('probability').textContent = '確率を見る';
});
document.addEventListener('visibilitychange', () => {
  clock.tick(performance.now(), true); // Never add the time spent hidden.
  if (document.hidden) noLoop();
  else if (clock.running) { clock.last = performance.now(); loop(); }
});
document.getElementById('probability').addEventListener('click', event => {
  const panel = document.getElementById('statistics'); panel.hidden = !panel.hidden;
  event.currentTarget.setAttribute('aria-expanded', String(!panel.hidden));
  event.currentTarget.textContent = panel.hidden ? '確率を見る' : '確率を閉じる';
});
document.getElementById('export').addEventListener('click', () => {
  const elapsed = clock.tick(performance.now(), document.hidden);
  const oldWidth = width, oldHeight = height, density = pixelDensity();
  try {
    pixelDensity(1); resizeCanvas(3200, 2400, true); paint(elapsed);
    // Include identification in the book-sized still, without changing the live stage.
    noStroke(); fill('#4c4942'); textAlign(CENTER); textFont('serif'); textSize(70);
    text('クマと車',1600,190); textSize(46); text('クマ',800,390); text('車',2400,390);
    textSize(38); text('「怖いもの」と「危険なもの」は、同じだろうか。',1600,2210);
    saveCanvas('lifesketch-015-bear-and-car','png');
  } finally { pixelDensity(density); resizeCanvas(oldWidth, oldHeight, true); paint(elapsed); }
});
