'use strict';
// The scene contains no counters: energy is only expressed in the sky.
const MAX_PARTICLES = 320;
const MAX_VOICES = 8;
let intensity = 0, particles = [], voices = [], audio, output, muted = false;
let marpan, bellArt, sky, layout, lastHit = -100, clock = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (new URLSearchParams(location.search).get('embed') === '1') document.body.classList.add('embed');

function setup() {
  const scene = document.getElementById('scene');
  createCanvas(scene.clientWidth, scene.clientHeight).parent(scene);
  pixelDensity(Math.min(devicePixelRatio || 1, 2));
  frameRate(30);
  marpan = new Marpan25D({id:'dotaku-still', autoBlink:false, bodyColor:'#d3d7ca'});
  bellArt = createGraphics(320, 460);
  makeBell(bellArt);
  sky = createGraphics(420, 260);
  sky.pixelDensity(1);
  resizeScene();
  const button = document.getElementById('bell');
  // Native click covers mouse, touch, Enter and Space without duplicate touch events.
  button.addEventListener('click', strike);
  document.getElementById('sound').addEventListener('click', () => {
    muted = !muted;
    document.getElementById('sound').textContent = muted ? '音 オフ' : '音 オン';
    document.getElementById('sound').setAttribute('aria-pressed', String(!muted));
    if (output) output.gain.setTargetAtTime(muted ? 0 : .65, audio.currentTime, .03);
  });
}
function resizeScene() {
  const scene = document.getElementById('scene');
  resizeCanvas(scene.clientWidth, scene.clientHeight);
  const size = Math.min(width * .48, height * .40, 330);
  layout = {x:width * .48, y:height * .59, size, ground:height * .87};
  const b = document.getElementById('bell');
  Object.assign(b.style, {left:`${layout.x-size*.46}px`, top:`${layout.y-size*.71}px`, width:`${size*.92}px`, height:`${size*1.23}px`});
}
function windowResized() { resizeScene(); }
function strike() {
  intensity = Math.min(100, intensity + 14);
  lastHit = clock;
  const {x,y,size} = layout;
  for (let i=0;i<23;i++) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    particles.push({x:x+random(-.29,.29)*size, y:y+size*.62, vx:random(-8,8), vy:random(6,19), age:0, life:random(1.6,2.6), r:random(.6,1.5)});
  }
  if (!muted) ring();
}
async function ring() {
  try {
    if (!audio) {
      audio = getAudioContext();
      output = audio.createGain();
      output.gain.value = .65;
      const limiter = audio.createDynamicsCompressor();
      limiter.threshold.value = -15;
      limiter.knee.value = 12;
      limiter.ratio.value = 8;
      output.connect(limiter); limiter.connect(audio.destination);
    }
    await audio.resume();
    if (muted || document.hidden) return;
    document.getElementById('status').textContent = '';
    const now = audio.currentTime;
    // Steal the oldest tail with a short fade; active oscillators stay bounded.
    if (voices.length >= MAX_VOICES) voices.shift().stop(now);
    const bus = audio.createGain(); bus.connect(output);
    const oscillators = [];
    const voice = {stop(t) {
      bus.gain.cancelScheduledValues(t); bus.gain.setTargetAtTime(0,t,.025);
      for (const osc of oscillators) { try { osc.stop(t+.15); } catch (_) {} }
    }};
    voices.push(voice);
    const partials = [[1,.32,3.8],[2.756,.13,2.6],[4.07,.06,1.7],[5.43,.026,.9]];
    let remaining = partials.length;
    for (const [ratio,volume,decay] of partials) {
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.frequency.value = 392 * ratio;
      gain.gain.setValueAtTime(0,now);
      gain.gain.linearRampToValueAtTime(volume,now+.008);
      gain.gain.exponentialRampToValueAtTime(.0001,now+decay);
      osc.connect(gain); gain.connect(bus); oscillators.push(osc);
      osc.onended = () => {
        osc.disconnect(); gain.disconnect();
        if (--remaining === 0) { bus.disconnect(); const i=voices.indexOf(voice); if(i>=0) voices.splice(i,1); }
      };
      osc.start(now); osc.stop(now+decay+.05);
    }
  } catch (_) { document.getElementById('status').textContent = '音を再生できません。もう一度、銅鐸にふれてください。'; }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && audio) { voices.splice(0).forEach(v=>v.stop(audio.currentTime)); audio.suspend(); }
});
function draw() {
  // Wall-clock decay also restores quiet after leaving the tab in the background.
  const elapsed = Math.max(0, deltaTime / 1000);
  const dt = Math.min(elapsed, .05);
  clock += elapsed;
  intensity = Math.max(0, intensity - elapsed * 3.2);
  const ctx = drawingContext;
  const bg = ctx.createLinearGradient(0,0,0,height);
  bg.addColorStop(0,'#07131e'); bg.addColorStop(.67,'#182c34'); bg.addColorStop(1,'#334340');
  ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
  noStroke();
  for(let i=0;i<55;i++) {
    const x=((i*173.73)%997)/997*width, y=((i*87.41)%431)/431*height*.59;
    fill(191,211,210,35+(i%4)*12); circle(x,y,i%5===0?1.5:1);
  }
  if (intensity > 0) drawAurora();
  const {x,y,size,ground} = layout;
  noStroke(); fill('#1c2d2c');
  beginShape();vertex(0,ground-14);bezierVertex(width*.2,ground-24,width*.3,ground+5,width*.53,ground-8);bezierVertex(width*.7,ground-20,width*.85,ground-7,width,ground-17);vertex(width,height);vertex(0,height);endShape(CLOSE);
  fill(0,0,0,40); ellipse(x,ground+3,size*1.04,size*.12);
  const mw = Math.min(width*.24,145,height*.23), mx=Math.min(width-mw*.58-12,x+size*.57+mw*.52), my=ground-mw*.38;
  fill(0,0,0,35);ellipse(mx,ground+4,mw*1.1,mw*.12);
  marpan.drawAt(mx,my,{bodyWidth:mw,bodyHeight:mw*.72,yaw:0,lookX:mx,lookY:my,pulse:0});
  const age=clock-lastHit;
  const swing = reducedMotion ? 0 : Math.sin(age*58)*Math.exp(-age*7)*.016;
  push();translate(x,y-size*.65);rotate(swing);image(bellArt,-size*.5,0,size,size*1.4375);pop();
  noStroke();
  for(let i=particles.length-1;i>=0;i--) {
    const p=particles[i]; p.age+=elapsed;p.vy+=25*dt;p.x+=(p.vx+Math.sin(clock*2+p.life)*3)*dt;p.y+=p.vy*dt;
    if(p.y>=ground || p.age>=p.life){particles.splice(i,1);continue;}
    fill(244,245,231,190*Math.min(1,(p.life-p.age)*2));circle(p.x,p.y,p.r*1.5);
  }
}
function drawAurora() {
  const g=sky, c=g.drawingContext, e=intensity/100;
  g.clear();
  const t=clock*(reducedMotion?.08:.24+e*.65);
  c.globalCompositeOperation='lighter';
  const bands = 2 + Math.floor(e*3);
  for(let band=0;band<bands;band++) {
    for(let x=0;x<420;x+=2) {
      const u=x/420;
      const spread=.34+e*.69;
      const edge=Math.max(0,1-Math.pow(Math.abs(u-.5)*2/spread,6));
      if(!edge)continue;
      const y=64+band*19+Math.sin(u*7+t+band)* (14+e*34)+Math.sin(u*18-t*1.3+band)*e*15;
      const length=30+e*75+Math.sin(u*11+t)*15;
      const blue=e>.25 && band%3===1, violet=e>.5 && band%3===2;
      const rgb=violet?'175,103,231':blue?'83,159,234':'103,222,167';
      const a=e*edge*(.17+e*.24);
      const gradient=c.createLinearGradient(x,y-length,x,y+22);
      gradient.addColorStop(0,`rgba(${rgb},0)`);gradient.addColorStop(.72,`rgba(${rgb},${a*.5})`);gradient.addColorStop(.92,`rgba(${rgb},${a})`);gradient.addColorStop(1,`rgba(${rgb},0)`);
      c.fillStyle=gradient;c.fillRect(x,y-length,2,length+22);
    }
  }
  c.globalCompositeOperation='source-over';
  image(g,0,0,width,height*.75);
}
function makeBell(g) {
  const c=g.drawingContext;
  g.clear();
  // Raised crown, flared oval body and lattice panels recall a Yayoi dotaku.
  g.stroke('#658c78');g.strokeWeight(15);g.noFill();
  g.arc(160,81,110,119,Math.PI,Math.PI*2);g.line(105,79,105,111);g.line(215,79,215,111);
  g.stroke('#253f38');g.strokeWeight(4);g.arc(160,80,84,94,Math.PI,Math.PI*2);
  const body=new Path2D('M100 102 Q160 84 220 102 L287 390 Q160 423 33 390 Z');
  const bronze=c.createLinearGradient(30,0,290,0);
  bronze.addColorStop(0,'#28483f');bronze.addColorStop(.25,'#6b8a6d');bronze.addColorStop(.48,'#9b9c70');bronze.addColorStop(.68,'#587663');bronze.addColorStop(1,'#253f38');
  c.fillStyle=bronze;c.fill(body);c.strokeStyle='#7e9a7a';c.lineWidth=3;c.stroke(body);
  c.save();c.clip(body);
  let seed=47;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<6000;i++){c.fillStyle=rand()>.48?'rgba(23,71,61,.15)':'rgba(216,194,134,.12)';const px=rand()*320,py=rand()*420;c.fillRect(px,py,rand()*3+1,rand()*3+1);}
  for(const yy of [125,143,231,248,342,362,383]){
    c.strokeStyle='#243f37';c.lineWidth=5;c.beginPath();c.moveTo(20,yy+5);c.quadraticCurveTo(160,yy+26,300,yy+5);c.stroke();
    c.strokeStyle='#a2ad7f';c.lineWidth=2;c.beginPath();c.moveTo(20,yy);c.quadraticCurveTo(160,yy+21,300,yy);c.stroke();
  }
  for(const xx of [115,157,201]){c.strokeStyle='#2b493c';c.lineWidth=8;c.beginPath();c.moveTo(xx,145);c.lineTo(xx+(xx-157)*.27,362);c.stroke();c.strokeStyle='#8d9d77';c.lineWidth=2;c.stroke();}
  c.strokeStyle='rgba(36,64,51,.6)';c.lineWidth=1.3;
  for(let row=0;row<2;row++)for(let col=0;col<4;col++){
    const xx=76+col*47, yy=165+row*113;
    for(let j=0;j<7;j++){c.beginPath();c.moveTo(xx+j*5,yy);c.lineTo(xx+30,yy+30-j*3);c.stroke();c.beginPath();c.moveTo(xx,yy+j*5);c.lineTo(xx+30-j*3,yy+35);c.stroke();}
  }
  c.restore();
  g.stroke('#263f36');g.strokeWeight(3);g.fill('#20352f');g.ellipse(160,394,254,30);
  g.noFill();g.stroke('#8b9b74');g.strokeWeight(4);g.arc(160,391,252,33,0,Math.PI);
}
