const NOTES = [
  { label: "ド", frequency: 261.63, color: "#f17d77" },
  { label: "レ", frequency: 293.66, color: "#f3a65e" },
  { label: "ミ", frequency: 329.63, color: "#f1d36d" },
  { label: "ファ", frequency: 349.23, color: "#8bcf8c" },
  { label: "ソ", frequency: 392.00, color: "#78c7dc" },
  { label: "ラ", frequency: 440.00, color: "#8da8e6" },
  { label: "シ", frequency: 493.88, color: "#bd9bde" },
  { label: "高いド", frequency: 523.25, color: "#ee9ec3" }
];

if (new URLSearchParams(window.location.search).has("embed")) {
  document.documentElement.classList.add("embedded");
}

let marpan;
let voice;
let audioReady = false;
let activeNote = -1;
let activeUntil = 0;
let lastPointerAt = 0;

function setup() {
  const holder = document.querySelector("#canvas-holder");
  createCanvas(holder.clientWidth, holder.clientHeight).parent(holder);
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  marpan = new Marpan25D({ bodyColor: "#fff8ee", autoBlink: true, maxSize: 180 });
  const buttons = document.querySelector("#note-buttons");
  NOTES.forEach((note, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = note.label;
    button.setAttribute("aria-label", `${note.label}の音を鳴らす`);
    button.style.setProperty("--note-color", note.color);
    button.addEventListener("click", () => playNote(index));
    buttons.append(button);
  });
}

function windowResized() {
  const holder = document.querySelector("#canvas-holder");
  resizeCanvas(holder.clientWidth, holder.clientHeight);
}

function draw() {
  background("#faf9f5");
  const margin = width < 520 ? 16 : 36;
  const gap = width < 520 ? 5 : 10;
  const tubeWidth = (width - 2 * margin - gap * 7) / 8;
  const baseline = height * .78;
  const longest = height * .47;
  const shortest = height * .23;
  noStroke();
  fill("#e9e7df");
  rect(0, baseline + 16, width, height - baseline);
  for (let i = 0; i < NOTES.length; i++) {
    const x = margin + i * (tubeWidth + gap);
    const tubeHeight = longest + (shortest - longest) * i / 7;
    const bounce = activeNote === i && millis() < activeUntil ? 12 * sin((activeUntil - millis()) * .035) : 0;
    const y = baseline - tubeHeight - bounce;
    fill("#00000018");
    rect(x + 3, baseline + 4, tubeWidth, 11, 7);
    fill(NOTES[i].color);
    rect(x, y, tubeWidth, tubeHeight, Math.min(14, tubeWidth * .3));
    fill("#ffffff90");
    rect(x + tubeWidth * .14, y + 8, Math.max(3, tubeWidth * .13), tubeHeight - 18, 4);
    fill("#25323d");
    textAlign(CENTER, CENTER);
    textSize(width < 520 ? 14 : 19);
    textStyle(BOLD);
    text(width < 520 && i === 7 ? "高ド" : NOTES[i].label, x + tubeWidth / 2, baseline - 20 - bounce);
  }
  const targetX = activeNote < 0 ? width * .5 : margin + (activeNote + .5) * (tubeWidth + gap);
  marpan.drawAt(width * .5, height * .21, {
    bodyWidth: Math.min(width * .29, height * .29, 175),
    lookX: targetX,
    lookY: baseline - longest * .55,
    pulse: activeNote >= 0 && millis() < activeUntil ? .6 : 0
  });
}

function playNote(index) {
  if (index < 0 || index >= NOTES.length) return;
  if (!audioReady) {
    userStartAudio();
    voice = new p5.Oscillator("sine");
    voice.start();
    voice.amp(0);
    audioReady = true;
  }
  voice.amp(0, .015);
  voice.freq(NOTES[index].frequency, .01);
  voice.amp(.23, .025);
  voice.amp(0, .24, .05);
  activeNote = index;
  activeUntil = millis() + 290;
  document.querySelector("#sound-status").textContent = `${NOTES[index].label}を鳴らしました`;
  const buttons = document.querySelectorAll("#note-buttons button");
  buttons.forEach(button => button.classList.remove("is-playing"));
  buttons[index].classList.add("is-playing");
  window.setTimeout(() => buttons[index].classList.remove("is-playing"), 290);
}

function pointerToNote() {
  if (mouseX < 0 || mouseX >= width || mouseY < height * .28 || mouseY > height * .83) return;
  const margin = width < 520 ? 16 : 36;
  const gap = width < 520 ? 5 : 10;
  const tubeWidth = (width - 2 * margin - gap * 7) / 8;
  const index = Math.floor((mouseX - margin) / (tubeWidth + gap));
  if (index >= 0 && index < 8 && mouseX <= margin + index * (tubeWidth + gap) + tubeWidth) {
    playNote(index);
    lastPointerAt = millis();
  }
}

function mousePressed(event) {
  if (!(event.target instanceof HTMLCanvasElement)) return;
  if (millis() - lastPointerAt > 100) pointerToNote();
  return false;
}

function touchStarted(event) {
  if (!(event.target instanceof HTMLCanvasElement)) return;
  pointerToNote();
  return false;
}

function keyPressed() {
  const index = Number(key) - 1;
  if (index >= 0 && index < 8) playNote(index);
}
