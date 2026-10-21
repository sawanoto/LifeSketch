/* Shared Marpan remains still. The lens changes only the direction of one gaze. */
const stage = document.getElementById('stage');
const lens = document.getElementById('lens');
let marpan, position = 0, activePointer = null, dragOffset = 0;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function geometry() {
  return { cx: width * .5, cy: height * .5, travel: height * .23,
    treeX: width * .82, gap: height * .32,
    body: Math.min(width * .22, 170), lensH: Math.min(145, height * .29),
    treeSize: Math.min(width * .19, height * .21, 112) };
}
function setup() {
  const canvas = createCanvas(stage.clientWidth, stage.clientHeight);
  canvas.parent(stage);
  canvas.elt.setAttribute('role', 'img');
  canvas.elt.setAttribute('aria-label', '左に三つ目のマーパン、中央に凸レンズ、右に3本の木。期待はリンゴの実る木、現実は緑の木、不安は枯れ木。上から期待、現実、不安。点線の視線がレンズで曲がります。');
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  marpan = new Marpan25D({ expression: 'pupil', yaw: .18 });
  noLoop();
  new ResizeObserver(() => {
    resizeCanvas(stage.clientWidth, stage.clientHeight);
    updateControl();
  }).observe(stage);
  updateControl();
}
function updateControl() {
  const g = geometry();
  lens.style.left = `${g.cx}px`;
  lens.style.top = `${g.cy + position * g.travel}px`;
  lens.style.height = `${g.lensH + 12}px`;
  lens.setAttribute('aria-valuenow', Math.round(-position * 100));
  lens.setAttribute('aria-valuetext', position < -.05 ? '上・期待の方向' : position > .05 ? '下・不安の方向' : '中央・現実の方向');
  redraw();
}
function setPosition(value) {
  position = clamp(value, -1, 1);
  updateControl();
}
lens.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0 || activePointer !== null) return;
  event.preventDefault();
  activePointer = event.pointerId;
  const g = geometry();
  dragOffset = event.clientY - stage.getBoundingClientRect().top - (g.cy + position * g.travel);
  lens.setPointerCapture(event.pointerId);
  lens.classList.add('dragging');
  lens.focus({ preventScroll: true });
});
lens.addEventListener('pointermove', event => {
  if (event.pointerId !== activePointer) return;
  const g = geometry();
  setPosition((event.clientY - stage.getBoundingClientRect().top - dragOffset - g.cy) / g.travel);
});
function endDrag(event) {
  if (event.pointerId !== activePointer) return;
  activePointer = null;
  lens.classList.remove('dragging');
}
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) lens.addEventListener(type, endDrag);
lens.addEventListener('keydown', event => {
  const actions = { ArrowUp: position - .05, ArrowDown: position + .05, Home: -1, End: 1, '0': 0 };
  if (!(event.key in actions)) return;
  event.preventDefault();
  setPosition(actions[event.key]);
});

function draw() {
  background('#f5f2e9');
  const g = geometry();
  const lensY = g.cy + position * g.travel;
  const targetY = g.cy + position * g.gap;
  const mx = width * .17;
  marpan.drawAt(mx, g.cy, { bodyWidth: g.body, bodyHeight: g.body * .9,
    lookX: g.cx, lookY: lensY });
  // Start at the rightmost eye's pupil, using the shared renderer's eye geometry.
  const sourceX = mx + Math.sin(.62) * g.body * .47 + g.body * .038;
  const sourceY = g.cy + clamp((lensY - g.cy) / (g.body * .45), -1, 1) * g.body * .037;
  drawingContext.setLineDash([2, 7]);
  stroke('#6b7d91'); strokeWeight(1.8); noFill(); strokeCap(ROUND);
  beginShape(); vertex(sourceX, sourceY); vertex(g.cx, lensY); vertex(g.treeX, targetY); endShape();
  drawingContext.setLineDash([]);
  ['期待', '現実', '不安'].forEach((label, i) => drawTree(g.treeX, g.cy + (i - 1) * g.gap, g.treeSize, label));
  // Symmetric biconvex profile: thin tips, thick middle, translucent glass.
  push(); translate(g.cx, lensY);
  const h = g.lensH / 2, w = Math.min(27, width * .05);
  stroke('#709ca9'); strokeWeight(1.5); fill(160, 211, 226, 95);
  beginShape(); vertex(0, -h);
  bezierVertex(w, -h * .62, w, h * .62, 0, h);
  bezierVertex(-w, h * .62, -w, -h * .62, 0, -h); endShape(CLOSE);
  noFill(); stroke(255, 255, 255, 190);
  bezier(-3, -h * .73, -w * .68, -h * .3, -w * .68, h * .3, -3, h * .73);
  fill('#6b8797'); noStroke(); circle(0, 0, 5);
  pop();
}
function drawTree(x, y, size, label) {
  push(); translate(x, y);
  // Keep the scale and trunk shared; fruit and bare branches clarify the themes.
  stroke('#8b806c'); strokeWeight(size * .065); strokeCap(ROUND);
  line(0, size * .48, 0, -size * .12);
  line(0, size * .14, -size * .19, -size * .08);
  line(0, size * .07, size * .2, -size * .17);
  if (label === '不安') {
    stroke('#8b806c'); strokeWeight(size * .035);
    line(0, -size * .12, -size * .07, -size * .53);
    line(-size * .04, -size * .33, size * .16, -size * .5);
    line(-size * .19, -size * .08, -size * .32, -size * .31);
    line(-size * .24, -size * .17, -size * .39, -size * .19);
    line(size * .2, -size * .17, size * .3, -size * .4);
    line(size * .23, -size * .24, size * .39, -size * .28);
  } else {
    noStroke(); fill('#a6b59b');
    ellipse(-size * .21, -size * .1, size * .48, size * .52);
    ellipse(size * .2, -size * .15, size * .5, size * .55);
    ellipse(0, -size * .33, size * .55, size * .58);
    if (label === '期待') {
      for (const [ax, ay] of [[-.24, -.08], [.2, -.16], [-.04, -.38]]) {
        push(); translate(ax * size, ay * size);
        stroke('#78664d'); strokeWeight(size * .016);
        line(0, -size * .035, size * .012, -size * .09);
        noStroke(); fill('#b96552');
        ellipse(-size * .022, 0, size * .085, size * .10);
        ellipse(size * .022, 0, size * .085, size * .10);
        pop();
      }
    }
  }
  stroke('#bfb7a7'); strokeWeight(1); line(-size * .34, size * .49, size * .34, size * .49);
  noStroke(); fill('#625f55'); textAlign(CENTER, BOTTOM);
  textFont('serif'); textSize(clamp(width * .025, 17, 22));
  text(label, 0, -size * .72);
  pop();
}
