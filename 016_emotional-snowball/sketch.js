/* global SnowballMotion, Marpan25D, createCanvas, pixelDensity, resizeCanvas,
 width, height, background, push, pop, translate, rotate, scale, drawingContext,
 noStroke, fill, beginShape,
 vertex, bezierVertex, endShape, CLOSE */
'use strict';
let balls = [], drag = null, canvasElement;
function resetScene() {
  endDrag();
  balls = ['happy', 'normal', 'crying'].map((expression, i) => {
    const ball = new SnowballMotion(expression, width * (0.25 + i * 0.25), height / 2);
    ball.renderer = new Marpan25D({bodyColor:'#e4bea0', autoBlink:false});
    ball.renderer.setExpressionState('normal');
    ball.renderer.setExpression(expression === 'normal' ? 'pupil' : expression);
    return ball;
  });
}
function setup() {
  const stage = document.getElementById('stage');
  const canvas = createCanvas(stage.clientWidth, stage.clientHeight);
  canvas.parent(stage); canvasElement = canvas.elt;
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  canvasElement.setAttribute('aria-label', '笑顔・無表情・泣き顔のマーパン。ドラッグで転がす。隠れたらリセットで最初から。');
  resetScene();
  canvasElement.addEventListener('pointerdown', event => {
    if (drag || event.button !== 0) return;
    const p = pointerPosition(event);
    const ball = [...balls].reverse().find(item => hit(item, p.x, p.y));
    if (!ball) return;
    event.preventDefault();
    balls.splice(balls.indexOf(ball), 1); balls.push(ball);
    drag = {ball, pointer:event.pointerId, offsetX:p.x - ball.x, offsetY:p.y - ball.y};
    canvasElement.setPointerCapture(event.pointerId);
    canvasElement.classList.add('dragging');
  });
  canvasElement.addEventListener('pointermove', event => {
    if (!drag || drag.pointer !== event.pointerId) return;
    event.preventDefault();
    const samples = event.getCoalescedEvents?.();
    for (const sample of samples?.length ? samples : [event]) movePointer(sample);
  });
  canvasElement.addEventListener('pointerup', event => {
    if (drag?.pointer !== event.pointerId) return;
    movePointer(event); endDrag();
  });
  for (const name of ['pointercancel', 'lostpointercapture']) {
    canvasElement.addEventListener(name, event => { if (drag?.pointer === event.pointerId) endDrag(); });
  }
  window.addEventListener('blur', endDrag);
  document.addEventListener('visibilitychange', () => { if (document.hidden) endDrag(); });
  document.getElementById('reset').addEventListener('click', resetScene);
}
function pointerPosition(event) {
  const rect = canvasElement.getBoundingClientRect();
  return {x:(event.clientX - rect.left) * width / rect.width,
    y:(event.clientY - rect.top) * height / rect.height};
}
function movePointer(event) {
  const p = pointerPosition(event);
  drag.ball.moveTo(p.x - drag.offsetX, p.y - drag.offsetY, width, height);
}
function endDrag() {
  const pointer = drag?.pointer; drag = null;
  if (!canvasElement) return;
  canvasElement.classList.remove('dragging');
  if (pointer !== undefined && canvasElement.hasPointerCapture(pointer)) canvasElement.releasePointerCapture(pointer);
}
function hit(ball, x, y) {
  const diameter = ball.diameter(width, height), c = Math.cos(ball.angle), s = Math.sin(ball.angle);
  const dx = x - ball.x, dy = y - ball.y;
  const localX = (dx * c + dy * s) * 1000 / diameter;
  const localY = (-dx * s + dy * c) * 1000 / diameter;
  // Use the shared body's actual silhouette, including after rotation.
  const ctx = drawingContext; ctx.save(); ctx.resetTransform();
  ball.renderer.beginClip(0, 0, 1000, ball.renderer.getBodyHeight(1000), 0);
  const inside = ctx.isPointInPath(localX, localY);
  ctx.restore(); ctx.restore(); return inside;
}
function draw() {
  background('#f5f2e9');
  for (const ball of balls) {
    const diameter = ball.diameter(width, height);
    push(); translate(ball.x, ball.y); rotate(ball.angle); scale(diameter / 1000);
    ball.renderer.drawAt(0, 0, {bodyWidth:1000, lookX:0, lookY:0});
    if (ball.expression === 'crying') {
      noStroke(); fill('#8ab8c7');
      for (const side of [-1, 1]) {
        const x = side * 230;
        beginShape(); vertex(x, 115);
        bezierVertex(x - 12, 150, x - 57, 195, x - 22, 220);
        bezierVertex(x + 30, 249, x + 58, 195, x, 115); endShape(CLOSE);
      }
    }
    pop();
  }
}
function windowResized() {
  endDrag();
  const oldW = width, oldH = height, stage = document.getElementById('stage');
  resizeCanvas(stage.clientWidth, stage.clientHeight);
  for (const ball of balls) { ball.x *= width / oldW; ball.y *= height / oldH; }
}
