/* global Marpan25D, createCanvas, pixelDensity, resizeCanvas, clear, width, height */
'use strict';
// All offerings share one duration, one absorption, and one transient reaction.
const offerings = [
  ['お金', '#d5dcc1', '<rect x="7" y="15" width="50" height="34" rx="4"/><path d="M12 23h5m30 18h5"/><circle cx="32" cy="32" r="10"/><path d="m28 26 4 6 4-6m-4 6v8m-5-6h10"/>'],
  ['食べ物', '#e7c79a', '<path d="M8 31h48c-2 15-10 21-24 21S10 46 8 31Z"/><path fill="#fffaf0" d="M11 30c0-8 7-16 12-14 4-9 16-9 20 0 7-1 11 6 10 14Z"/>'],
  ['家', '#d4b5a0', '<path d="M13 29 32 12l19 17v25H13Z"/><path fill="#faf3e6" d="M26 54V36h12v18"/><path d="M7 31 32 9l25 22"/>'],
  ['車', '#b9cbd0', '<path d="m10 32 7-16h28l9 16v15H10Z"/><path fill="#f4f1e8" d="m18 29 4-9h19l5 9Z"/><circle cx="19" cy="47" r="6"/><circle cx="46" cy="47" r="6"/>'],
  ['本', '#cabda6', '<path d="M9 14c9-2 16 0 23 4 7-4 14-6 23-4v37c-9-2-16 0-23 4-7-4-14-6-23-4Z"/><path d="M32 18v37M16 24l9 2m-9 7 9 2m14-9 9-2m-9 11 9-2"/>'],
  ['愛情', '#e4bdc3', '<path stroke="none" d="M32 52C-7 29 14 3 32 22 50 3 71 29 32 52Z"/>'],
  ['安心', '#bdd2cc', '<path stroke="none" d="M5 38c0-10 8-15 15-12 1-19 27-20 29-2 15-1 18 25 2 25H16C8 49 5 44 5 38Z"/>'],
  ['喜び', '#e8d49b', '<path stroke="none" d="m32 5 7 18 19 9-19 8-7 19-8-19-18-8 18-9Z"/>'],
  ['承認', '#c9c2df', '<circle stroke="none" cx="32" cy="32" r="24"/><path fill="none" stroke="#fffcf6" stroke-width="4" d="m21 32 8 8 15-17"/>'],
  ['幸福', '#e3ccad', '<circle stroke="none" opacity=".6" cx="25" cy="26" r="18"/><circle stroke="none" opacity=".6" cx="40" cy="28" r="18"/><circle stroke="none" opacity=".6" cx="32" cy="41" r="18"/>']
];
const flights = [];
let marpan, receivedAt = -Infinity;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function setup() {
  const stage = document.getElementById('stage');
  const canvas = createCanvas(stage.clientWidth, stage.clientHeight);
  canvas.parent(stage); canvas.elt.setAttribute('aria-hidden', 'true');
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  marpan = new Marpan25D({bodyColor:'#e4bea0', autoBlink:false});
  marpan.setExpressionState('normal');
  offerings.forEach(([label, color, shape], i) => {
    const button = document.createElement('button');
    button.type = 'button'; button.setAttribute('aria-label', `${label}を与える`);
    button.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true" fill="${color}" stroke="#847d70" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${shape}</svg><span>${label}</span>`;
    button.addEventListener('click', () => give(button));
    document.getElementById(i < 5 ? 'materials' : 'feelings').append(button);
  });
  new ResizeObserver(() => resizeCanvas(stage.clientWidth, stage.clientHeight)).observe(stage);
}
function give(button) {
  if (button.disabled) return;
  const rect = button.querySelector('svg').getBoundingClientRect();
  const node = document.createElement('div');
  node.className = 'offering'; node.setAttribute('aria-hidden', 'true');
  node.append(button.querySelector('svg').cloneNode(true)); document.body.append(node);
  flights.push({node, button, x:(rect.x + rect.width / 2) / innerWidth,
    y:(rect.y + rect.height / 2) / innerHeight, start:performance.now()});
  button.disabled = true;
}
function draw() {
  clear();
  const now = performance.now();
  const age = (now - receivedAt) / 360;
  const reaction = age >= 0 && age < 1 ? Math.sin(age * Math.PI) : 0;
  marpan.drawAt(width / 2, height / 2, {bodyWidth:Math.min(190, height * .9),
    lookX:width / 2, lookY:height / 2, scaleX:1 + reaction * .012,
    scaleY:1 - reaction * .012, pulse:0, expression:'pupil'});
  const target = document.getElementById('stage').getBoundingClientRect();
  for (let i = flights.length - 1; i >= 0; i--) {
    const flight = flights[i];
    const t = Math.min(1, (now - flight.start) / 900);
    const ease = t * t * (3 - 2 * t);
    const x = flight.x * innerWidth * (1 - ease) + (target.x + target.width / 2) * ease;
    const y = flight.y * innerHeight * (1 - ease) + (target.y + target.height / 2) * ease;
    const absorb = Math.max(0, (t - .65) / .35);
    flight.node.style.transform = `translate(${x - 24}px,${y - 24}px) scale(${1 - absorb * .95})`;
    flight.node.style.opacity = reducedMotion.matches ? 1 - t : 1 - absorb;
    // Reduced motion keeps the same timing, with a stationary fade at the body.
    if (reducedMotion.matches) flight.node.style.transform = `translate(${target.x + target.width / 2 - 24}px,${target.y + target.height / 2 - 24}px)`;
    if (t === 1) {
      receivedAt = now;
      flight.node.remove(); flight.button.disabled = false; flights.splice(i, 1);
    }
  }
}
