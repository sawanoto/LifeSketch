/* Photo data, placement, shared character rendering and export stay independent. */
const ui = Object.fromEntries(['photo','file','camera','empty','size','angle','size-value','angle-value','save','controls','reset','status','result','result-image','download','share','close-result'].map(id => [id, document.getElementById(id)]));
const placement = { x: 0.5, y: 0.5, scale: 1, angle: 0 };
let photo = null, marpan, stickerCanvas, loadVersion = 0, resultURL = null, savedFile = null;
let drag = null;

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
  resizeCanvas(side, Math.ceil(side * 0.72), true);
  clear();
  push();
  scale(side / 1040);
  marpan.drawAt(520, 374.4, { bodyWidth: 1000, bodyHeight: 680, lookX: 520, lookY: 374.4 });
  pop();
  return stickerCanvas.elt;
}

function compose(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(photo, 0, 0, canvas.width, canvas.height);
  const bodyWidth = Math.min(canvas.width, canvas.height) * 0.35 * placement.scale;
  const sticker = renderSticker(bodyWidth);
  ctx.save();
  ctx.translate(placement.x * canvas.width, placement.y * canvas.height);
  ctx.rotate(placement.angle * Math.PI / 180);
  ctx.drawImage(sticker, -bodyWidth * 1.04 / 2, -bodyWidth * 1.04 * 0.72 / 2, bodyWidth * 1.04, bodyWidth * 1.04 * 0.72);
  ctx.restore();
}

function preview() { if (photo) compose(ui.photo); }
function clearResult() {
  ui.result.hidden = true;
  ui['result-image'].removeAttribute('src');
  ui.download.removeAttribute('href');
  if (resultURL) URL.revokeObjectURL(resultURL);
  resultURL = null;
  savedFile = null;
}
function resetPlacement() {
  Object.assign(placement, { x: 0.5, y: 0.5, scale: 1, angle: 0 });
  ui.size.value = 100;
  ui.angle.value = 0;
  updatePlacement();
}
function updatePlacement() {
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
    drag = null;
    const ratio = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
    ui.photo.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    ui.photo.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    ui.photo.hidden = false;
    ui.empty.hidden = true;
    ui.controls.disabled = false;
    ui.save.disabled = false;
    resetPlacement();
    ui.status.textContent = '';
  } catch {
    if (version === loadVersion) ui.status.textContent = '写真を開けませんでした。JPEG・PNG・WebPの画像を選んでください。';
  } finally { URL.revokeObjectURL(url); }
}
for (const input of [ui.file, ui.camera]) input.addEventListener('change', () => loadPhoto(input));
ui.size.addEventListener('input', updatePlacement);
ui.angle.addEventListener('input', updatePlacement);
ui.reset.addEventListener('click', resetPlacement);
function photoPointerPosition(event) {
  const rect = ui.photo.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}
ui.photo.addEventListener('pointerdown', event => {
  if (!photo || drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const p = photoPointerPosition(event);
  if (!p) return;
  const dx = (p.x - placement.x) * ui.photo.width, dy = (p.y - placement.y) * ui.photo.height;
  const angle = placement.angle * Math.PI / 180;
  const localX = dx * Math.cos(angle) + dy * Math.sin(angle);
  const localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
  const bodyWidth = Math.min(ui.photo.width, ui.photo.height) * 0.35 * placement.scale;
  if (Math.abs(localX) > bodyWidth * 0.55 || Math.abs(localY) > bodyWidth * 0.39) return;
  event.preventDefault();
  ui.photo.setPointerCapture(event.pointerId);
  drag = { id: event.pointerId, x: p.x - placement.x, y: p.y - placement.y };
  clearResult();
});
ui.photo.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id) return;
  const p = photoPointerPosition(event);
  if (!p) return;
  placement.x = Math.max(0, Math.min(1, p.x - drag.x));
  placement.y = Math.max(0, Math.min(1, p.y - drag.y));
  preview();
});
for (const type of ['pointerup','pointercancel','lostpointercapture']) ui.photo.addEventListener(type, event => { if (drag?.id === event.pointerId) drag = null; });
ui.photo.addEventListener('keydown', event => {
  const directions = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] };
  if (!photo || !directions[event.key]) return;
  event.preventDefault();
  const [x,y] = directions[event.key], step = event.shiftKey ? 0.05 : 0.01;
  placement.x = Math.max(0, Math.min(1, placement.x + x * step));
  placement.y = Math.max(0, Math.min(1, placement.y + y * step));
  clearResult();
  preview();
});

ui.save.addEventListener('click', async () => {
  if (!photo) return;
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
