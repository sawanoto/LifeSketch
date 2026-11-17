/* Fixed world stalls, an always-walking buyer, and a following camera.
   Only visible stalls, in-flight goods and nine basket items are retained. */
const PITCH = 220;
const COLORS = ['#c59779', '#94a99a', '#c0a16a', '#b29baa'];
const SPEED = 108;
const FLIGHT_MS = 400;
const COPY = {
  ja: {title:'売り手と買い手', reset:'はじめから', hint:'タップすると、上のお店からバスケットへ', buy:'上のお店から商品を購入', stage:'手仕事市を歩くマーパン', goods:['陶器','編み物','木工','アクセサリー']},
  en: {title:'Sellers and Buyers', reset:'Restart', hint:'Tap to fill the basket from the shop above', buy:'Buy from the shop above', stage:'Marpan walking through a craft market', goods:['Pottery','Knits','Woodcraft','Jewelry']}
};
let language = 'ja';
try { language = localStorage.getItem('lifesketch-market-language') === 'en' ? 'en' : 'ja'; } catch {}
let sellers, buyer, camera = 0, buyerX = 150, sceneWidth = 900;
let marketTime = 0, flights = [], basket = [];
let buyButton;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function setup() {
  const canvas = createCanvas(900, 460);
  canvas.parent('stage');
  canvas.elt.setAttribute('aria-hidden','true');
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  sellers = COLORS.map((_, i) => new Marpan25D({id:`market-seller-${i}`,autoBlink:true}));
  buyer = new Marpan25D({id:'market-buyer',autoBlink:true});
  buyButton = document.getElementById('buy');
  buyButton.addEventListener('click', purchase);
  document.getElementById('reset').addEventListener('click',resetMarket);
  document.getElementById('language').addEventListener('click',()=>{
    language = language === 'ja' ? 'en' : 'ja';
    try { localStorage.setItem('lifesketch-market-language',language); } catch {}
    applyLanguage();
  });
  applyLanguage(); windowResized();
}
function applyLanguage() {
  const copy = COPY[language];
  document.documentElement.lang = language;
  document.title = `${copy.title} · LifeSketch 023`;
  document.querySelector('h1').textContent = copy.title;
  document.getElementById('reset').textContent = copy.reset;
  document.getElementById('status').textContent = copy.hint;
  document.getElementById('stage').setAttribute('aria-label',copy.stage);
  buyButton.setAttribute('aria-label',copy.buy);
  const toggle = document.getElementById('language');
  toggle.textContent = language === 'ja' ? 'English' : '日本語';
  toggle.setAttribute('aria-label',language === 'ja' ? 'Switch to English' : '日本語に切り替える');
}
function resetMarket() {
  camera = 0; buyerX = 150; marketTime = 0; flights = []; basket = [];
}
function windowResized() {
  const available = document.getElementById('stage').clientWidth;
  sceneWidth = Math.max(480,Math.min(1100,available));
  resizeCanvas(available,available * 460 / sceneWidth);
  camera = Math.max(0,buyerX - Math.min(340,sceneWidth * .34));
}
function purchase() {
  // Each tap captures the nearest shop at that instant, without stopping walking.
  const shop = Math.max(0,Math.round((buyerX - 150) / PITCH));
  if (flights.length < 64) flights.push({shop,kind:shop % 4,age:0});
}
function updateMarket(dt) {
  marketTime += dt;
  buyerX += SPEED * dt / 1000;
  camera = Math.max(0,buyerX - Math.min(340,sceneWidth * .34));
  for (const flight of flights) {
    flight.age += dt;
    if (flight.age >= FLIGHT_MS) {
      basket.push(flight.kind);
      if (basket.length > 9) basket.shift();
    }
  }
  flights = flights.filter(f => f.age < FLIGHT_MS);
}
function draw() {
  updateMarket(Math.min(deltaTime,50));
  background('#f5f2e9'); push(); scale(width / sceneWidth);
  noStroke(); fill('#eee8db'); rect(0,301,sceneWidth,110,12);
  stroke('#dcd3c2');strokeWeight(1);line(0,302,sceneWidth,302);
  const first = Math.max(0,Math.floor((camera-250)/PITCH));
  const last = Math.ceil((camera+sceneWidth)/PITCH);
  for (let i=first;i<=last;i++) drawShop(i);
  drawBuyer();
  for (const flight of flights) {
    const t = flight.age / FLIGHT_MS;
    const eased = t*t*(3-2*t);
    product(flight.kind,lerp(150+flight.shop*PITCH-camera,buyerX-camera+49,eased),
      lerp(222,354,eased)-Math.sin(t*Math.PI)*30,1-.35*t);
  }
  pop();
}
function drawShop(i) {
  const x = 150 + i * PITCH - camera, kind = i % 4;
  const recent = flights.find(f => f.shop === i);
  const bow = recent ? Math.sin(Math.min(1, recent.age / FLIGHT_MS) * Math.PI) * 4 : 0;
  stroke('#cabda8'); strokeWeight(3); line(x-80, 125, x-80, 258); line(x+80,125,x+80,258);
  noStroke(); fill(COLORS[kind]); rect(x-88, 100, 176, 30, 4);
  fill('#fffaf0'); textAlign(CENTER,CENTER); textSize(13); text(COPY[language].goods[kind],x,115);
  sellers[kind].drawAt(x, 187 + bow, {bodyWidth:76, bodyHeight:78, lookX:x,lookY:325, yaw:0});
  noStroke(); fill('#dfd1b9'); rect(x-84, 226, 168, 34, 3);
  fill('#c7b595'); rect(x-80,260,7,20);rect(x+73,260,7,20);
  for(let j=-1;j<=1;j++) {
    product(kind,x+j*46,222,.8);
  }
}
function drawBuyer() {
  const x = buyerX-camera;
  const step = reducedMotion ? 0 : Math.sin(marketTime/85);
  noStroke();fill('#d9d0bf');ellipse(x,393,78,12);
  stroke('#5b554b');strokeWeight(8);strokeCap(ROUND);
  line(x-16,378,x-19+step*9,390);line(x+16,378,x+19-step*9,390);
  buyer.drawAt(x,347-Math.abs(step)*3,{bodyWidth:88,bodyHeight:81,yaw:.24,lookX:x+100,lookY:340});
  // A woven basket keeps a small, renewing arrangement of goods without a score.
  noFill();stroke('#927e60');strokeWeight(3);arc(x+48,357,38,30,Math.PI,TWO_PI);
  for (let i=0;i<basket.length;i++) product(basket[i],x+34+(i%3)*13,350-Math.floor(i/3)*6,.55);
  fill('#c6ad85');strokeWeight(2);quad(x+22,356,x+76,356,x+69,385,x+29,385);
  stroke('#a78a61');strokeWeight(1);
  for(let i=0;i<3;i++)line(x+28,364+i*7,x+70,364+i*7);
  for(let i=0;i<4;i++)line(x+31+i*11,359,x+34+i*9,383);
}
function product(kind,x,y,s) {
  push();translate(x,y);scale(s);stroke('#766955');strokeWeight(1.5);fill(COLORS[kind]);
  if(kind===0){ellipse(0,-5,25,13);arc(0,-5,25,27,0,Math.PI);line(-12,-5,12,-5);}
  if(kind===1){rect(-14,-15,28,20,5);line(-12,-8,12,-8);line(-12,-2,12,-2);}
  if(kind===2){rect(-15,-12,30,16,2);line(-10,-7,10,-7);}
  if(kind===3){noFill();ellipse(0,-6,22,23);fill('#d1ac69');ellipse(0,5,7,8);}
  pop();
}
