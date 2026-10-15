const NOTES = [
  {label:'ド', frequency:261.63, color:'#f17d77'},
  {label:'レ', frequency:293.66, color:'#f3a65e'},
  {label:'ミ', frequency:329.63, color:'#f1d36d'},
  {label:'ファ', frequency:349.23, color:'#8bcf8c'},
  {label:'ソ', frequency:392, color:'#78c7dc'},
  {label:'ラ', frequency:440, color:'#8da8e6'},
  {label:'シ', frequency:493.88, color:'#bd9bde'},
  {label:'高いド', frequency:523.25, color:'#ee9ec3'}
];
const MIN_LENGTH = .5, MAX_LENGTH = 1.5, STRIKE_MS = 440, IMPACT = .43;
const lengths = NOTES.map(() => 1);
const strikes = NOTES.map(() => null);
const PIANO_NOTES = [['Fs3',185], ['A3',220], ['C4',261.63], ['Ds4',311.13], ['Fs4',369.99], ['A4',440], ['C5',523.25], ['Ds5',622.25], ['Fs5',739.99], ['A5',880], ['C6',1046.5]];
const voices = new Set(), sliders = [], readouts = [], buttons = [];
let pianoLoad = null, pianoSamples = [], pianoOutput = null, soundEpoch = 0;
let marpan, activeNote = -1, drag = null;

if (new URLSearchParams(location.search).has('embed')) document.documentElement.classList.add('embedded');

function frequencyFor(index) { return NOTES[index].frequency / lengths[index]; }

function loadPiano() {
  if (pianoLoad) return pianoLoad;
  pianoLoad = Promise.all(PIANO_NOTES.map(async ([name, frequency]) => {
    const response = await fetch(`../assets/piano/${name}.mp3`);
    if (!response.ok) throw new Error(`Piano sample unavailable: ${name}`);
    const buffer = await getAudioContext().decodeAudioData(await response.arrayBuffer());
    return {frequency, buffer};
  })).then(samples => { pianoSamples = samples; }).catch(error => { pianoLoad = null; throw error; });
  return pianoLoad;
}

function stopVoice(voice) {
  const now = getAudioContext().currentTime;
  voice.gain.gain.cancelScheduledValues(now);
  voice.gain.gain.setTargetAtTime(0, now, .008);
  voice.source.stop(now + .04);
  voices.delete(voice);
}

function playPiano(frequency) {
  const context = getAudioContext(), now = context.currentTime;
  if (!pianoOutput) {
    pianoOutput = context.createDynamicsCompressor();
    pianoOutput.threshold.value = -16;
    pianoOutput.ratio.value = 4;
    pianoOutput.connect(context.destination);
  }
  if (voices.size >= 16) stopVoice(voices.values().next().value);
  const sample = pianoSamples.reduce((best, candidate) =>
    Math.abs(Math.log2(frequency / candidate.frequency)) < Math.abs(Math.log2(frequency / best.frequency)) ? candidate : best);
  const source = context.createBufferSource(), gain = context.createGain();
  source.buffer = sample.buffer;
  source.playbackRate.value = frequency / sample.frequency;
  const duration = Math.min(sample.buffer.duration / source.playbackRate.value, 3.4);
  gain.gain.setValueAtTime(.75, now);
  gain.gain.setValueAtTime(.75, now + Math.max(0, duration - .3));
  gain.gain.linearRampToValueAtTime(0, now + duration);
  source.connect(gain); gain.connect(pianoOutput);
  const voice = {source, gain}; voices.add(voice);
  source.onended = () => { voices.delete(voice); source.disconnect(); gain.disconnect(); };
  source.start(now); source.stop(now + duration);
}

function setup() {
  const holder = document.querySelector('#canvas-holder');
  const canvas = createCanvas(holder.clientWidth, holder.clientHeight);
  canvas.parent(holder);
  canvas.elt.style.touchAction = 'none';
  canvas.elt.setAttribute('aria-label', 'パイプの胴をタップして演奏。上端のつまみを上下にドラッグして長さを変更');
  pixelDensity(Math.min(devicePixelRatio || 1, 2));
  marpan = new Marpan25D({bodyColor:'#fff8ee', autoBlink:true});
  NOTES.forEach((note, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = note.label;
    button.setAttribute('aria-label', `${note.label}のパイプを叩く`);
    button.style.setProperty('--note-color', note.color);
    button.addEventListener('click', () => strike(i));
    document.querySelector('#note-buttons').append(button);
    buttons.push(button);
    const card = document.createElement('div');
    card.className = 'length-card';
    card.style.setProperty('--note-color', note.color);
    const label = document.createElement('label');
    label.htmlFor = `length-${i}`;
    label.textContent = `${note.label}の長さ`;
    const slider = document.createElement('input');
    slider.id = label.htmlFor;
    slider.type = 'range';
    slider.min = 50; slider.max = 150; slider.step = 1; slider.value = 100;
    slider.addEventListener('input', () => setLength(i, Number(slider.value) / 100));
    slider.addEventListener('change', () => strike(i));
    const output = document.createElement('output');
    output.htmlFor = slider.id;
    card.append(label, slider, output);
    document.querySelector('#length-sliders').append(card);
    sliders.push(slider); readouts.push(output);
    setLength(i, 1);
  });
  document.querySelector('#reset-lengths').addEventListener('click', () => {
    NOTES.forEach((_, i) => { setLength(i, 1); strikes[i] = null; buttons[i].classList.remove('is-playing'); });
    soundEpoch++;
    voices.forEach(stopVoice);
    activeNote = -1;
    document.querySelector('#sound-status').textContent = 'すべてのパイプを元の長さに戻しました';
  });
  canvas.elt.addEventListener('pointerdown', onPointerDown);
  canvas.elt.addEventListener('pointermove', onPointerMove);
  canvas.elt.addEventListener('pointerup', finishDrag);
  canvas.elt.addEventListener('pointercancel', event => { if (drag?.pointerId === event.pointerId) drag = null; });
  canvas.elt.addEventListener('lostpointercapture', event => { if (drag?.pointerId === event.pointerId) drag = null; });
  document.addEventListener('keydown', event => {
    if (event.target.matches('input,textarea,select') || event.repeat) return;
    if (/^[1-8]$/.test(event.key)) { event.preventDefault(); strike(Number(event.key) - 1); }
  });
  document.querySelector('#sound-status').textContent = 'ピアノの音を準備しています…';
  loadPiano().then(() => {
    document.querySelector('#sound-status').textContent = 'パイプをタップして、ピアノの音で試してみよう';
  }).catch(() => {
    document.querySelector('#sound-status').textContent = 'ピアノ音源を読み込めませんでした。タップして再試行できます。';
  });
}

function setLength(i, ratio) {
  lengths[i] = Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, Math.round(ratio * 100) / 100));
  sliders[i].value = Math.round(lengths[i] * 100);
  readouts[i].textContent = `${Math.round(lengths[i] * 100)}% · ${Math.round(frequencyFor(i))} Hz`;
  sliders[i].setAttribute('aria-valuetext', readouts[i].textContent);
}

function windowResized() {
  const holder = document.querySelector('#canvas-holder');
  resizeCanvas(holder.clientWidth, holder.clientHeight);
}

function geometry(i) {
  const margin = width < 520 ? 13 : 34;
  const cell = (width - margin * 2) / 8;
  const diameter = Math.min(cell * .68, 55);
  const ground = height * .85;
  const restGap = height * .08;
  const unitHeight = height * .46;
  const tubeHeight = unitHeight * (NOTES[0].frequency / NOTES[i].frequency) * lengths[i];
  const bottom = ground - restGap;
  return {x:margin + cell * (i + .5), diameter, ground, restGap, unitHeight, tubeHeight, bottom, top:bottom - tubeHeight};
}

async function strike(i) {
  const epoch = soundEpoch;
  try {
    await userStartAudio();
    await loadPiano();
    if (epoch !== soundEpoch) return;
    strikes[i] = {started:millis(), sounded:false, frequency:frequencyFor(i)};
    activeNote = i;
    buttons[i].classList.add('is-playing');
  } catch (error) {
    document.querySelector('#sound-status').textContent = '音を開始できませんでした。もう一度パイプをタップしてください。';
  }
}

function draw() {
  background('#faf9f5');
  const ground = height * .85;
  noStroke(); fill('#e6dfd2'); rect(0, ground, width, height - ground);
  stroke('#d0c6b5'); strokeWeight(1); line(0, ground, width, ground); noStroke();
  for (let i = 0; i < NOTES.length; i++) {
    const g = geometry(i), hit = strikes[i];
    const t = hit ? Math.min((millis() - hit.started) / STRIKE_MS, 1) : 1;
    let gap = g.restGap;
    if (hit && t < 1) {
      if (t < .2) gap += height * .045 * Math.sin(t / .2 * HALF_PI);
      else if (t < IMPACT) gap = (g.restGap + height * .045) * (1 - Math.pow((t - .2) / (IMPACT - .2), 2));
      else gap = g.restGap * Math.sin((t - IMPACT) / (1 - IMPACT) * HALF_PI);
      if (t >= IMPACT && !hit.sounded) {
        hit.sounded = true;
        playPiano(hit.frequency);
        document.querySelector('#sound-status').textContent = `${NOTES[i].label}のパイプ · 長さ ${Math.round(lengths[i] * 100)}% · ${Math.round(hit.frequency)} Hz`;
      }
    }
    if (hit && t >= 1) { strikes[i] = null; buttons[i].classList.remove('is-playing'); }
    const bottom = g.ground - gap;
    fill(50, 44, 37, 22 + 55 * (1 - Math.min(gap / (height * .13), 1)));
    ellipse(g.x + gap * .12, g.ground + 4, g.diameter * (1.1 + gap / height * 4), 9 + gap * .12);
    if (hit && t >= IMPACT && t < .78) {
      const ripple = (t - IMPACT) / (.78 - IMPACT);
      noFill(); stroke(168, 130, 77, 180 * (1 - ripple)); strokeWeight(2);
      ellipse(g.x, ground + 3, g.diameter * (1 + ripple * 2), 10 + ripple * 12); noStroke();
    }
    drawTube(g.x, bottom - g.tubeHeight, bottom, g.diameter, NOTES[i].color);
    fill('#283140'); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(width < 520 ? 12 : 16);
    text(i === 7 ? '高ド' : NOTES[i].label, g.x, ground + 28);
  }
  const look = geometry(Math.max(activeNote, 0));
  marpan.drawAt(width * .88, height * .12, {bodyWidth:Math.min(width * .14, 90), lookX:look.x, lookY:ground, pulse:strikes.some(Boolean) ? .6 : 0});
}

function drawTube(x, top, bottom, diameter, tubeColor) {
  const rim = diameter * .34;
  fill(tubeColor); rect(x - diameter / 2, top, diameter, bottom - top);
  ellipse(x, bottom, diameter, rim);
  fill('#00000015'); rect(x + diameter * .23, top, diameter * .27, bottom - top);
  fill('#ffffff65'); rect(x - diameter * .34, top + 3, diameter * .13, Math.max(1, bottom - top - 6), 4);
  fill(tubeColor); ellipse(x, top, diameter, rim);
  fill('#38332f'); ellipse(x, top, diameter * .71, rim * .64);
  noFill(); stroke('#ffffffbc'); strokeWeight(2);
  arc(x, top, diameter * .88, rim * .86, PI, TWO_PI); noStroke();
  // A small outlined handle distinguishes resizing from tapping the tube body.
  fill('#fffdf6'); stroke('#5d6668'); strokeWeight(1);
  ellipse(x, top - 10, 18, 18); noStroke();
  fill('#5d6668'); triangle(x - 3, top - 11, x + 3, top - 11, x, top - 15);
  triangle(x - 3, top - 9, x + 3, top - 9, x, top - 5);
}

function pointInCanvas(event) {
  const box = event.currentTarget.getBoundingClientRect();
  return {x:(event.clientX - box.left) * width / box.width, y:(event.clientY - box.top) * height / box.height};
}

function onPointerDown(event) {
  if (drag) return;
  const p = pointInCanvas(event);
  for (let i = 0; i < NOTES.length; i++) {
    const g = geometry(i);
    if (Math.abs(p.x - g.x) <= Math.max(g.diameter / 2, 17) && Math.abs(p.y - (g.top - 10)) <= 20) {
      drag = {index:i, pointerId:event.pointerId, startY:p.y, startLength:lengths[i]};
      strikes[i] = null; buttons[i].classList.remove('is-playing');
      event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault(); return;
    }
    if (Math.abs(p.x - g.x) <= Math.max(g.diameter / 2, 17) && p.y >= g.top && p.y <= g.bottom + g.diameter * .2) {
      strike(i); event.preventDefault(); return;
    }
  }
}

function onPointerMove(event) {
  if (!drag || drag.pointerId !== event.pointerId) return;
  const g = geometry(drag.index), p = pointInCanvas(event);
  const baseHeight = g.unitHeight * NOTES[0].frequency / NOTES[drag.index].frequency;
  setLength(drag.index, drag.startLength + (drag.startY - p.y) / baseHeight);
  event.preventDefault();
}

function finishDrag(event) {
  if (!drag || drag.pointerId !== event.pointerId) return;
  const i = drag.index; drag = null;
  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  strike(i);
}
