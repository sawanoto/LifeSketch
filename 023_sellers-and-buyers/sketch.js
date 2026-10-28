/* Sellers occupy fixed world coordinates. Only the buyer and the camera travel.
   Visible stalls are generated from a bounded window, never an accumulating list. */
const PITCH = 220;
const GOODS = ['陶器', '編み物', '木工', 'アクセサリー'];
const COLORS = ['#c59779', '#94a99a', '#c0a16a', '#b29baa'];
const HANDOVER = 850;
const WALK = 1450;
let sellers, buyer, shop = 0, phase = 'waiting', elapsed = 0;
let camera = 0, buyerX = 150, held = null, sceneWidth = 900;
let buyButton, statusText;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setup() {
  const canvas = createCanvas(900, 460);
  canvas.parent('stage');
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  sellers = GOODS.map((_, i) => new Marpan25D({id: `market-seller-${i}`, autoBlink:true}));
  buyer = new Marpan25D({id:'market-buyer', autoBlink:true});
  buyButton = document.getElementById('buy');
  statusText = document.getElementById('status');
  buyButton.addEventListener('click', purchase);
  document.getElementById('reset').addEventListener('click', resetMarket);
  windowResized();
}
function resetMarket() {
  shop = 0; phase = 'waiting'; elapsed = 0; camera = 0; buyerX = 150; held = null;
  statusText.textContent = 'お店に触れる';
  positionButton();
}
function windowResized() {
  const available = document.getElementById('stage').clientWidth;
  sceneWidth = Math.max(480, Math.min(1100, available));
  resizeCanvas(available, available * 460 / sceneWidth);
  // Keep the buyer's current world position visible, even during a resize.
  camera = Math.max(0, buyerX - Math.min(340, sceneWidth * .34));
  if (buyButton) positionButton();
}
function purchase() {
  if (phase !== 'waiting') return;
  phase = 'buying'; elapsed = 0;
  statusText.textContent = `${GOODS[shop % 4]}を受け取る`;
  positionButton();
}
function marketEase(t) { return t * t * (3 - 2 * t); }
function updateMarket(dt) {
  if (phase === 'waiting') return;
  elapsed += dt;
  if (phase === 'buying' && elapsed >= HANDOVER) {
    held = shop % 4; phase = 'walking'; elapsed = 0;
    statusText.textContent = '次のお店へ';
  }
  if (phase === 'walking') {
    const t = Math.min(1, elapsed / WALK);
    buyerX = 150 + shop * PITCH + PITCH * marketEase(t);
    camera = Math.max(0, buyerX - Math.min(340, sceneWidth * .34));
    if (t === 1) {
      shop++; phase = 'waiting'; elapsed = 0;
      statusText.textContent = 'お店に触れる';
    }
  }
}
function positionButton() {
  const s = width / sceneWidth;
  buyButton.disabled = phase !== 'waiting';
  buyButton.setAttribute('aria-label', `${GOODS[shop % 4]}のお店で購入`);
  Object.assign(buyButton.style, {
    left:`${(150 + shop * PITCH - camera - 88) * s}px`, top:`${86 * s}px`,
    width:`${176 * s}px`, height:`${202 * s}px`
  });
}
function draw() {
  updateMarket(Math.min(deltaTime, 50));
  background('#f5f2e9');
  push(); scale(width / sceneWidth);
  noStroke(); fill('#eee8db'); rect(0, 301, sceneWidth, 110, 12);
  stroke('#dcd3c2'); strokeWeight(1); line(0, 302, sceneWidth, 302);
  const first = Math.max(0, Math.floor((camera - 250) / PITCH));
  const last = Math.ceil((camera + sceneWidth) / PITCH);
  for (let i = first; i <= last; i++) drawShop(i);
  drawBuyer();
  if (phase === 'buying') {
    const t = marketEase(Math.min(1, elapsed / HANDOVER));
    product(shop % 4, lerp(150 + shop * PITCH - camera, buyerX - camera + 38, t),
      lerp(225, 352, t) - Math.sin(t * Math.PI) * 38, 1.1);
  }
  pop(); positionButton();
}
function drawShop(i) {
  const x = 150 + i * PITCH - camera, kind = i % 4;
  const giving = i === shop && phase === 'buying';
  const bow = giving ? Math.sin(elapsed / HANDOVER * Math.PI) * 5 : 0;
  stroke('#cabda8'); strokeWeight(3); line(x-80, 125, x-80, 258); line(x+80,125,x+80,258);
  noStroke(); fill(COLORS[kind]); rect(x-88, 100, 176, 30, 4);
  fill('#fffaf0'); textAlign(CENTER,CENTER); textSize(13); text(GOODS[kind],x,115);
  sellers[kind].drawAt(x, 187 + bow, {bodyWidth:76, bodyHeight:78, lookX:x,lookY:325, yaw:0});
  noStroke(); fill('#dfd1b9'); rect(x-84, 226, 168, 34, 3);
  fill('#c7b595'); rect(x-80,260,7,20);rect(x+73,260,7,20);
  for(let j=-1;j<=1;j++) {
    if (giving && j===0) continue;
    product(kind,x+j*46,222,.8);
  }
}
function drawBuyer() {
  const x = buyerX-camera;
  const step = phase === 'walking' && !reducedMotion ? Math.sin(elapsed / 85) : 0;
  noStroke();fill('#d9d0bf');ellipse(x,393,78,12);
  stroke('#5b554b');strokeWeight(8);strokeCap(ROUND);
  line(x-16,378,x-19+step*9,390);line(x+16,378,x+19-step*9,390);
  buyer.drawAt(x, 347-Math.abs(step)*3, {bodyWidth:88,bodyHeight:81,
    yaw:phase==='walking'?.24:0,lookX:x+(phase==='walking'?100:0),lookY:phase==='walking'?340:210});
  // One small bag stays a constant size: purchases never become a score or burden.
  noFill();stroke('#927e60');strokeWeight(2);arc(x+45,355,17,20,Math.PI,TWO_PI);
  fill('#c6ad85');rect(x+30,353,32,31,3);
  if(held!==null) product(held,x+46,353,.55);
  if(phase==='waiting') {
    noStroke();fill('#a68d68');triangle(x-5,304,x+5,304,x,298);
  }
}
function product(kind,x,y,s) {
  push();translate(x,y);scale(s);stroke('#766955');strokeWeight(1.5);fill(COLORS[kind]);
  if(kind===0){ellipse(0,-5,25,13);arc(0,-5,25,27,0,Math.PI);line(-12,-5,12,-5);}
  if(kind===1){rect(-14,-15,28,20,5);line(-12,-8,12,-8);line(-12,-2,12,-2);}
  if(kind===2){rect(-15,-12,30,16,2);line(-10,-7,10,-7);}
  if(kind===3){noFill();ellipse(0,-6,22,23);fill('#d1ac69');ellipse(0,5,7,8);}
  pop();
}
