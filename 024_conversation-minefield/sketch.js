const VOWELS = ['あ','い','う','え','お'];
const LETTERS = ['a','i','u','e','o'];
const INKS = ['#b47b52','#758e83','#ae9859','#96839c','#748a9c'];
const RESTORE_MS = 230, EFFECT_MS = 650;
let marpan, bombs = [], bursts = [], audio, buttons, stage;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function setup() {
  stage=document.getElementById('stage');
  const c=createCanvas(stage.clientWidth,stage.clientHeight); c.parent(stage); c.elt.setAttribute('aria-hidden','true');
  pixelDensity(Math.min(devicePixelRatio||1,2));
  marpan=new Marpan25D({id:'conversation-minefield',autoBlink:false});
  audio=new MinefieldSound();
  // Two of every vowel on each side of the horizon. Locations never change.
  for(let row=0;row<4;row++) for(let col=0;col<5;col++) {
    bombs.push({vowel:(col+row*2)%5,x:.09+col*.205,y:[.16,.34,.66,.86][row],air:row<2,last:-Infinity});
  }
  buttons=[...document.querySelectorAll('[data-vowel]')];
  for(const button of buttons) {
    button.addEventListener('pointerdown',e=>{
      if(e.button!==0) return;
      e.preventDefault(); button.focus({preventScroll:true}); strike(Number(button.dataset.vowel));
    });
    // Native keyboard activation / assistive technology; pointer click has fired already.
    button.addEventListener('click',e=>{if(e.detail===0) strike(Number(button.dataset.vowel));});
  }
  document.addEventListener('keydown',e=>{
    if(e.altKey||e.ctrlKey||e.metaKey||e.isComposing) return;
    const index=LETTERS.indexOf(e.key.toLowerCase());
    if(index>=0) { e.preventDefault(); strike(index); }
  });
  document.getElementById('sound').addEventListener('click',e=>{
    const enabled=audio.toggle(); e.currentTarget.textContent=enabled?'音あり':'音なし';
    e.currentTarget.setAttribute('aria-pressed',String(enabled));
  });
  new ResizeObserver(()=>windowResized()).observe(stage);
}
function windowResized() { if(stage) resizeCanvas(stage.clientWidth,stage.clientHeight); }
function strike(index) {
  const now=millis();
  for(const bomb of bombs) if(bomb.vowel===index) {
    bomb.last=now;
    bursts.push({x:bomb.x,y:bomb.y,air:bomb.air,vowel:index,start:now,seed:random(TWO_PI)});
  }
  // Bound rendering cost; no cooldown and no input queue.
  if(bursts.length>240) bursts.splice(0,bursts.length-240);
  const button=buttons[index]; button.classList.add('playing');
  clearTimeout(button.releaseTimer); button.releaseTimer=setTimeout(()=>button.classList.remove('playing'),110);
  audio.play(index);
}
function draw() {
  const now=millis(); background('#eef1e9');
  noStroke(); fill('#dddcc5'); rect(0,height*.5,width,height*.5);
  stroke('#c7cbb7');strokeWeight(1);line(0,height*.5,width,height*.5);
  for(const b of bombs) if(now-b.last>=RESTORE_MS) drawBomb(b);
  bursts=bursts.filter(b=>now-b.start<EFFECT_MS);
  for(const b of bursts) drawBurst(b,(now-b.start)/EFFECT_MS);
  // Fixed renderer inputs: no blink, pulse, tracking, physics, or blast damage.
  const size=Math.min(width*.25,height*.29,145);
  noStroke();fill(93,101,78,25);ellipse(width*.5,height*.5+size*.53,size*.95,size*.16);
  marpan.drawAt(width*.5,height*.5,{bodyWidth:size,bodyHeight:size,lookX:width*.5,lookY:height*.5,yaw:0,pulse:0});
}
function position(b) { return {x:b.x*width,y:b.y*height}; }
function bombRadius() { return Math.min(22,Math.max(14,width*.039),height*.053); }
function drawBomb(b) {
  const p=position(b), r=bombRadius(); push();translate(p.x,p.y);
  stroke('#626d61');strokeWeight(1.5);
  if(b.air) {
    // Little suspension fin and hanging ribbon make the suspended sphere legible.
    noFill();bezier(0,r, -r*.45,r*1.5, r*.45,r*1.9,0,r*2.4);
    for(let i=0;i<6;i++){const a=i*TWO_PI/6;line(cos(a)*r*.9,sin(a)*r*.9,cos(a)*r*1.24,sin(a)*r*1.24);}
    fill('#758078');ellipse(0,0,r*2,r*2);noStroke();fill(255,255,255,65);ellipse(-r*.36,-r*.4,r*.28,r*.2);
  } else {
    noStroke();fill(98,105,77,25);ellipse(0,r*.5,r*2.9,r*.65);
    stroke('#626d61');fill('#858b70');arc(0,r*.35,r*2.7,r*2.8,PI,TWO_PI,CHORD);
    fill('#a0a58c');rect(-r*.52,-r*1.2,r*1.04,r*.25,3);
    stroke('#b9bca1');line(-r*1.65,r*.38,r*1.65,r*.38);
  }
  noStroke();fill('#fffdf2');textAlign(CENTER,CENTER);textSize(Math.max(15,r*.95));text(VOWELS[b.vowel],0,b.air?-r*.12:-r*.5);pop();
}
function drawBurst(b,t) {
  const p=position(b), r=bombRadius(), fade=1-t;
  push();translate(p.x,p.y);noFill();stroke(195,140,68,fade*150);strokeWeight(2);
  circle(0,0,r*(2+t*(reducedMotion?1:4)));
  // No full-screen flash; each local star fades smoothly.
  if(t<.38) {
    noStroke();fill(245,191,83,(1-t/.38)*210);beginShape();
    for(let i=0;i<20;i++) {const a=i*TWO_PI/20+b.seed;const radius=r*(i%2? .65:1.65)*(1+t);vertex(cos(a)*radius,sin(a)*radius);}
    endShape(CLOSE);
  }
  for(let i=0;i<5;i++) {
    const a=i*TWO_PI/5+b.seed, distance=r*t*(reducedMotion?.8:2.5);
    noStroke();fill(133,141,127,Math.sin(t*PI)*85);
    circle(cos(a)*distance,sin(a)*distance-t*r,r*(.4+t*.8));
    stroke(INKS[b.vowel]);strokeWeight(2*fade);
    if(!reducedMotion) line(cos(a)*distance*1.5,sin(a)*distance*1.5,cos(a)*(distance*1.5+4*fade),sin(a)*(distance*1.5+4*fade));
  }
  pop();
}
