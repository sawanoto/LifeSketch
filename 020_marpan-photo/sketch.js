/* Photo data, placement, shared character rendering and export stay independent. */
const ui = Object.fromEntries(['photo','file','camera','empty','size','angle','size-value','angle-value','save','controls','add','remove','selected','reset','status','result','result-image','download','share','close-result'].map(id => [id, document.getElementById(id)]));
const placements = [];
let placement = null, nextMarpanId = 1;
let photo = null, marpan, stickerCanvas, loadVersion = 0, resultURL = null, savedFile = null;
const photoPointers = new Map();
let photoGesture = null;
let renderedStickerSide = 0;

function setup() {
  pixelDensity(1);
  stickerCanvas = createCanvas(1000, 720);
  stickerCanvas.parent('renderer');
  noLoop();
  marpan = new Marpan25D({ autoBlink: false });
  marpan.setExpressionState('normal');
}

// Draw at a fixed logical size so the shared renderer's minimum stroke widths
// stay identical between the small preview and full-resolution export.
function renderSticker(pixelWidth) {
  const side = Math.max(1, Math.ceil(pixelWidth * 1.04));
  if (side === renderedStickerSide) return stickerCanvas.elt;
  renderedStickerSide = side;
  resizeCanvas(side, Math.ceil(side * 0.72), true);
  clear();
  push();
  scale(side / 1040);
  marpan.drawAt(520, 374.4, { bodyWidth: 1000, bodyHeight: 680, lookX: 520, lookY: 374.4 });
  pop();
  return stickerCanvas.elt;
}

function compose(canvas, showSelection = false) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(photo, 0, 0, canvas.width, canvas.height);
  for (const item of placements) {
  const bodyWidth = Math.min(canvas.width, canvas.height) * 0.35 * item.scale;
  const sticker = renderSticker(bodyWidth);
  ctx.save();
  ctx.translate(item.x * canvas.width, item.y * canvas.height);
  ctx.rotate(item.angle * Math.PI / 180);
  ctx.drawImage(sticker, -bodyWidth * 1.04 / 2, -bodyWidth * 1.04 * 0.72 / 2, bodyWidth * 1.04, bodyWidth * 1.04 * 0.72);
  if (showSelection && placements.length > 1 && item === placement) {
    ctx.strokeStyle = '#527d89';
    ctx.lineWidth = Math.max(2, canvas.width / 450);
    ctx.setLineDash([ctx.lineWidth * 3, ctx.lineWidth * 2]);
    ctx.strokeRect(-bodyWidth * 0.53, -bodyWidth * 0.38, bodyWidth * 1.06, bodyWidth * 0.76);
  }
  ctx.restore();
  }
}

function preview() { if (photo) compose(ui.photo, true); }
function syncSelection() {
  ui.selected.replaceChildren(...placements.map(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `マーパン ${item.id}`;
    option.selected = item === placement;
    return option;
  }));
  for (const control of [ui.selected, ui.remove, ui.size, ui.angle, ui.reset]) control.disabled = !placement;
  syncTransformControls();
}
function syncTransformControls() {
  ui.size.value = placement ? Math.round(placement.scale * 100) : 100;
  ui.angle.value = placement ? Math.round(placement.angle) : 0;
  ui['size-value'].value = `${ui.size.value}%`;
  ui['angle-value'].value = `${ui.angle.value}°`;
}
function addMarpan() {
  if (!photo) return;
  const offset = (placements.length % 5) * 0.04;
  placement = { id: nextMarpanId++, x: 0.5 + offset, y: 0.5 + offset, scale: 1, angle: 0 };
  placements.push(placement);
  cancelPhotoGesture();
  syncSelection();
  clearResult();
  preview();
}
function clearResult() {
  ui.result.hidden = true;
  ui['result-image'].removeAttribute('src');
  ui.download.removeAttribute('href');
  if (resultURL) URL.revokeObjectURL(resultURL);
  resultURL = null;
  savedFile = null;
}
function resetPlacement() {
  if (!placement) return;
  cancelPhotoGesture();
  Object.assign(placement, { x: 0.5, y: 0.5, scale: 1, angle: 0 });
  ui.size.value = 100;
  ui.angle.value = 0;
  updatePlacement();
}
function updatePlacement() {
  if (!placement) return;
  cancelPhotoGesture();
  placement.scale = Number(ui.size.value) / 100;
  placement.angle = Number(ui.angle.value);
  ui['size-value'].value = `${ui.size.value}%`;
  ui['angle-value'].value = `${ui.angle.value}°`;
  clearResult();
  preview();
}

async function loadPhoto(input) {
  const file = input.files[0];
  input.value = '';
  if (!file) return;
  const version = ++loadVersion;
  ui.status.textContent = '写真を読み込んでいます…';
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (version !== loadVersion) return;
    photo = image;
    cancelPhotoGesture();
    const ratio = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
    ui.photo.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    ui.photo.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    ui.photo.hidden = false;
    ui.empty.hidden = true;
    ui.controls.disabled = false;
    ui.save.disabled = false;
    placements.length = 0;
    nextMarpanId = 1;
    addMarpan();
    ui.status.textContent = '';
  } catch {
    if (version === loadVersion) ui.status.textContent = '写真を開けませんでした。JPEG・PNG・WebPの画像を選んでください。';
  } finally { URL.revokeObjectURL(url); }
}
for (const input of [ui.file, ui.camera]) input.addEventListener('change', () => loadPhoto(input));
ui.size.addEventListener('input', updatePlacement);
ui.angle.addEventListener('input', updatePlacement);
ui.reset.addEventListener('click', resetPlacement);
ui.add.addEventListener('click', addMarpan);
ui.remove.addEventListener('click', () => {
  if (!placement) return;
  placements.splice(placements.indexOf(placement), 1);
  placement = placements[placements.length - 1] || null;
  cancelPhotoGesture();
  syncSelection();
  clearResult();
  preview();
});
ui.selected.addEventListener('change', () => {
  placement = placements.find(item => item.id === Number(ui.selected.value)) || null;
  cancelPhotoGesture();
  syncSelection();
  preview();
});
function photoPointerPosition(event) {
  const rect = ui.photo.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}
function cancelPhotoGesture() {
  photoGesture = null;
  const ids = [...photoPointers.keys()];
  photoPointers.clear();
  for (const id of ids) {
    if (ui.photo.hasPointerCapture(id)) ui.photo.releasePointerCapture(id);
  }
}
function gestureGeometry() {
  const points = [...photoPointers.values()];
  const first = points[0], second = points[1] || first;
  const dx = (second.x - first.x) * ui.photo.width;
  const dy = (second.y - first.y) * ui.photo.height;
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
    distance: Math.hypot(dx, dy),
    angle: Math.atan2(dy, dx)
  };
}
// Rebase whenever a finger is added/lifted so switching between one and two
// fingers never jumps. All movement is relative to the gesture's start.
function beginPhotoGesture() {
  photoGesture = photoPointers.size && placement ? {
    item: placement,
    start: { ...placement },
    geometry: gestureGeometry(),
    count: photoPointers.size
  } : null;
}
function hitMarpan(p) {
  return [...placements].reverse().find(item => {
    const dx = (p.x - item.x) * ui.photo.width, dy = (p.y - item.y) * ui.photo.height;
    const angle = item.angle * Math.PI / 180;
    const localX = dx * Math.cos(angle) + dy * Math.sin(angle);
    const localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
    const bodyWidth = Math.min(ui.photo.width, ui.photo.height) * 0.35 * item.scale;
    return Math.abs(localX) <= bodyWidth * 0.55 && Math.abs(localY) <= bodyWidth * 0.39;
  });
}
ui.photo.addEventListener('pointerdown', event => {
  if (!photo || ui.controls.disabled || photoPointers.size >= 2 || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const p = photoPointerPosition(event);
  if (!p) return;
  // Only the first finger chooses a character; a second finger always edits
  // the same selection even if it lands on another Marpan.
  if (!photoPointers.size) {
    placement = hitMarpan(p) || placement;
    syncSelection();
  }
  if (!placement) return;
  event.preventDefault();
  ui.photo.setPointerCapture(event.pointerId);
  photoPointers.set(event.pointerId, p);
  beginPhotoGesture();
  clearResult();
  preview();
});
ui.photo.addEventListener('pointermove', event => {
  if (!photoGesture || !photoPointers.has(event.pointerId)) return;
  if (ui.controls.disabled) { cancelPhotoGesture(); return; }
  const p = photoPointerPosition(event);
  if (!p) return;
  event.preventDefault();
  photoPointers.set(event.pointerId, p);
  const current = gestureGeometry();
  const { item, start, geometry, count } = photoGesture;
  item.x = Math.max(0, Math.min(1, start.x + current.x - geometry.x));
  item.y = Math.max(0, Math.min(1, start.y + current.y - geometry.y));
  if (count === 2 && geometry.distance > 0.001 && current.distance > 0.001) {
    item.scale = Math.max(0.2, Math.min(2.5, start.scale * current.distance / geometry.distance));
    const delta = Math.atan2(Math.sin(current.angle - geometry.angle), Math.cos(current.angle - geometry.angle));
    item.angle = ((start.angle + delta * 180 / Math.PI + 180) % 360 + 360) % 360 - 180;
  }
  syncTransformControls();
  preview();
});
for (const type of ['pointerup','pointercancel','lostpointercapture']) ui.photo.addEventListener(type, event => {
  if (!photoPointers.delete(event.pointerId)) return;
  if (ui.photo.hasPointerCapture(event.pointerId)) ui.photo.releasePointerCapture(event.pointerId);
  beginPhotoGesture();
});
ui.photo.addEventListener('keydown', event => {
  const directions = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] };
  if (!photo || !placement || ui.controls.disabled || !directions[event.key]) return;
  event.preventDefault();
  const [x,y] = directions[event.key], step = event.shiftKey ? 0.05 : 0.01;
  placement.x = Math.max(0, Math.min(1, placement.x + x * step));
  placement.y = Math.max(0, Math.min(1, placement.y + y * step));
  clearResult();
  preview();
});

ui.save.addEventListener('click', async () => {
  if (!photo) return;
  cancelPhotoGesture();
  ui.save.disabled = true;
  ui.controls.disabled = true;
  ui.file.disabled = true;
  ui.camera.disabled = true;
  ui.status.textContent = '保存用の画像を作っています…';
  try {
    const output = document.createElement('canvas');
    output.width = photo.naturalWidth;
    output.height = photo.naturalHeight;
    compose(output);
    const blob = await new Promise(resolve => output.toBlob(resolve, 'image/png'));
    output.width = output.height = 1;
    if (!blob) throw new Error('Export failed');
    clearResult();
    resultURL = URL.createObjectURL(blob);
    savedFile = new File([blob], 'lifesketch-marpan.png', { type: 'image/png' });
    ui['result-image'].src = resultURL;
    ui.download.href = resultURL;
    ui.share.hidden = !navigator.canShare?.({ files: [savedFile] });
    ui.result.hidden = false;
    ui.status.textContent = '画像ができました。ダウンロード、または画像を長押しして保存してください。';
    ui.result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch {
    ui.status.textContent = '画像を保存できませんでした。小さい解像度の写真でお試しください。';
  } finally {
    ui.save.disabled = false;
    ui.controls.disabled = false;
    syncSelection();
    ui.file.disabled = false;
    ui.camera.disabled = false;
    preview(); // Release the large temporary sticker buffer after export.
  }
});
ui.share.addEventListener('click', async () => {
  if (!savedFile) return;
  try { await navigator.share({ files: [savedFile] }); }
  catch (error) { if (error.name !== 'AbortError') ui.status.textContent = '共有できませんでした。ダウンロードか画像の長押しで保存してください。'; }
});
ui['close-result'].addEventListener('click', clearResult);
