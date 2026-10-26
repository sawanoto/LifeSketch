/* global MarpanPoses, createCanvas, pixelDensity, noLoop, redraw, clear, drawingContext */
'use strict';
let poseRenderer, workbench;
const cards = [];
function setup() {
  workbench = createCanvas(700, 500);
  workbench.elt.hidden = true;
  pixelDensity(1);
  poseRenderer = new MarpanPoses.Renderer();
  const select = document.getElementById('expression');
  for (const [id, entry] of Object.entries(MarpanPoses.expressions)) {
    select.add(new Option(entry.label, id));
  }
  select.value = 'happy';
  for (const pose of MarpanPoses.listPoses()) {
    const card = document.createElement('article');
    card.className = 'pose-card';
    const image = document.createElement('div');
    image.className = 'pose-image';
    const canvas = document.createElement('canvas');
    canvas.width = 700; canvas.height = 500;
    canvas.setAttribute('role', 'img');
    image.append(canvas);
    const copy = document.createElement('div');
    copy.className = 'pose-copy';
    const heading = document.createElement('h2'); heading.textContent = pose.label;
    const code = document.createElement('code'); code.textContent = pose.id;
    const description = document.createElement('p'); description.textContent = pose.description;
    copy.append(heading, code, description);
    card.append(image, copy);
    document.getElementById('cards').append(card);
    cards.push({ pose, canvas });
  }
  for (const id of ['expression', 'rotation', 'mirror']) {
    document.getElementById(id).addEventListener('input', () => redraw());
  }
  noLoop();
}
function draw() {
  const expression = document.getElementById('expression').value;
  const degrees = Number(document.getElementById('rotation').value);
  const mirror = document.getElementById('mirror').checked;
  const faceLabel = MarpanPoses.expressions[expression].label;
  document.getElementById('angle').value = `${degrees}°`;
  document.getElementById('selection').textContent = `${cards.length}ポーズ / ${faceLabel} / ${degrees}°${mirror ? ' / 左右反転' : ''}`;
  for (const { pose, canvas } of cards) {
    clear();
    poseRenderer.draw({ x: 350, y: 260, size: 430, pose: pose.id,
      expression, rotation: degrees * Math.PI / 180, mirror });
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(workbench.elt, 0, 0);
    canvas.setAttribute('aria-label', `${pose.label}：${faceLabel}、回転${degrees}度${mirror ? '、左右反転' : ''}`);
  }
}
