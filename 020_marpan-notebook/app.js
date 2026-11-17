/* global MarpanPoses, MarpanNotebook, createCanvas, pixelDensity, noLoop,
   resizeCanvas, redraw, drawingContext, width, height */
'use strict';
let poseRenderer, coverCanvas, exportURL;
function setup() {
  const host = document.getElementById('scene');
  const size = Math.max(1, Math.round(host.clientWidth));
  coverCanvas = createCanvas(size, Math.round(size * 1.414));
  coverCanvas.parent(host);
  coverCanvas.elt.setAttribute('aria-hidden', 'true');
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  poseRenderer = new MarpanPoses.Renderer();
  noLoop();
  document.getElementById('export').disabled = false;
  document.getElementById('export').onclick = exportPNG;
  document.getElementById('status').textContent = '';
  new ResizeObserver(() => {
    const next = Math.max(1, Math.round(host.clientWidth));
    if (next !== width) { resizeCanvas(next, Math.round(next * 1.414)); redraw(); }
  }).observe(host);
}
function draw() { MarpanNotebook.draw(poseRenderer, drawingContext, width, height); }
async function exportPNG() {
  const button = document.getElementById('export');
  const status = document.getElementById('status');
  const displayWidth = width, displayHeight = height, density = window.pixelDensity();
  button.disabled = true;
  status.textContent = 'PNGを準備しています…';
  let snapshot;
  try {
    try {
      pixelDensity(1);
      resizeCanvas(MarpanNotebook.width, MarpanNotebook.height, true);
      draw();
      snapshot = document.createElement('canvas');
      snapshot.width = MarpanNotebook.width;
      snapshot.height = MarpanNotebook.height;
      snapshot.getContext('2d').drawImage(coverCanvas.elt, 0, 0);
    } finally {
      pixelDensity(density);
      resizeCanvas(displayWidth, displayHeight, true);
      redraw();
    }
    const blob = await new Promise(resolve => snapshot.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('PNG encoding failed');
    if (exportURL) URL.revokeObjectURL(exportURL);
    exportURL = URL.createObjectURL(blob);
    const fallback = document.getElementById('fallback');
    fallback.href = exportURL;
    fallback.hidden = false;
    const link = document.createElement('a');
    link.href = exportURL;
    link.download = 'mar-pan-notebook.png';
    document.body.append(link);
    link.click();
    link.remove();
    status.textContent = 'PNGを書き出しました。保存できない場合は下のリンクから画像を開いて保存してください。';
  } catch (error) {
    status.textContent = '保存できませんでした。もう一度お試しください。';
    console.error(error);
  } finally { button.disabled = false; }
}
window.addEventListener('pagehide', () => { if (exportURL) URL.revokeObjectURL(exportURL); });
