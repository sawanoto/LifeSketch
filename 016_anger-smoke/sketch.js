/* global SmokeRoom, Marpan25D, createCanvas, resizeCanvas, pixelDensity, width, height,
 drawingContext, background, push, pop, translate, scale, userStartAudio, getAudioContext */
'use strict';
const room = new SmokeRoom();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let left, right, last, clock = 0, held = false, pointer = null, holdAge = 0, repeat = 0;
let particles = [], emission = 0, sprite, smokeLayer, previousStage = -1;
let audio, master, hiss, enabled = true, audioFailed = false;
const voices = new Set();
function geometry() {
  const size = Math.min(width - 40, height - 28, 540);
  return { x: (width - size) / 2, y: (height - size) / 2, size, body: size * 0.31 };
}
function setup() {
  const host = document.getElementById('stage');
  const canvas = createCanvas(host.clientWidth, host.clientHeight); canvas.parent(host);
  canvas.elt.setAttribute('aria-hidden', 'true');
  pixelDensity(Math.min(devicePixelRatio || 1, 2));
  left = new Marpan25D({expression:'angry'}); right = new Marpan25D({expression:'pupil', autoBlink:true});
  sprite = document.createElement('canvas'); sprite.width = sprite.height = 96;
  const s = sprite.getContext('2d'), gradient = s.createRadialGradient(48,48,0,48,48,48);
  gradient.addColorStop(0,'rgba(95,96,94,.6)'); gradient.addColorStop(.45,'rgba(112,113,110,.3)'); gradient.addColorStop(1,'rgba(125,126,122,0)');
  s.fillStyle=gradient; s.fillRect(0,0,96,96);
  // Composite soft smoke at a fixed resolution, independently of device DPR.
  smokeLayer=document.createElement('canvas'); smokeLayer.width=smokeLayer.height=256;
  const button = document.getElementById('anger');
  button.addEventListener('pointerdown', e => {
    if (pointer !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault(); pointer=e.pointerId; button.setPointerCapture(pointer); held=true; holdAge=repeat=0; feed();
  });
  const release = e => { if (e.pointerId === pointer) stopHolding(); };
  ['pointerup','pointercancel','lostpointercapture'].forEach(type => button.addEventListener(type,release));
  button.addEventListener('click', e => { if (e.detail === 0) feed(); });
  button.addEventListener('contextmenu', e => e.preventDefault());
  new ResizeObserver(() => { resizeCanvas(host.clientWidth,host.clientHeight); positionControl(); }).observe(host);
  document.getElementById('reset').onclick = () => {
    stopHolding(); room.reset(); particles=[]; emission=0; previousStage=-1;
    voices.forEach(v=>{try{v.stop();}catch(_){/* already ended */}});
    if(hiss) hiss.gain.setTargetAtTime(0,audio.currentTime,.03);
  };
  document.getElementById('sound').onclick = () => {
    enabled=!enabled;
    const b=document.getElementById('sound'); b.textContent=enabled?'音 ON':'音 OFF';
    b.setAttribute('aria-pressed',String(enabled)); b.setAttribute('aria-label',enabled?'音を消す':'音を出す');
    if(enabled) startAudio(); updateAudio();
  };
  window.addEventListener('blur',stopHolding);
  document.addEventListener('visibilitychange',()=>{stopHolding(); last=performance.now(); updateAudio();});
  positionControl(); last=performance.now();
}
function stopHolding() { held=false; pointer=null; holdAge=repeat=0; }
function positionControl() {
  const g=geometry(), b=document.getElementById('anger');
  Object.assign(b.style,{left:`${g.x+g.size*.27-g.body*.51}px`,top:`${g.y+g.size*.76-g.body*.36}px`,width:`${g.body*1.02}px`,height:`${g.body*.73}px`});
}
function feed() { room.tap(); startAudio().then(grumble); }
function draw() {
  const now=performance.now(), dt=Math.min(.05,Math.max(0,(now-last)/1000)); last=now;
  if(document.hidden) return;
  clock+=dt;
  if(held) { holdAge+=dt; repeat+=dt; if(holdAge>.35 && repeat>.22){repeat=0;feed();} }
  room.step(dt);
  emission+=dt*room.anger*24;
  while(emission>=1){emission--; if(particles.length<220) particles.push({x:.27,y:.651,vx:(Math.random()-.5)*.035,flow:.05+Math.random()*.05,age:0,r:.025+Math.random()*.025,seed:Math.random()*6.28});}
  particles.forEach(p=>{
    p.age+=dt;
    if(p.y>.12 && p.age<5) {p.y-=dt*.12; p.x+=dt*(p.vx+Math.sin(p.age*2+p.seed)*.015);}
    else {p.x+=dt*p.flow; p.y+=dt*(.008+room.mass*.036);}
    if(p.x>.97){p.x=.97;p.flow=-Math.abs(p.flow);}
    if(p.x<.03){p.x=.03;p.flow=Math.abs(p.flow);}
    p.r=Math.min(.24,p.r+dt*.012);
  });
  particles=particles.filter(p=>p.age<24 && p.y<1.18);
  background('#f5f2e9');
  const g=geometry(), c=drawingContext;
  c.save(); c.translate(g.x,g.y); c.scale(g.size,g.size);
  c.fillStyle='#faf8f1'; c.fillRect(0,0,1,1);
  c.beginPath(); c.rect(.004,.004,.992,.992); c.clip();
  drawSmoke(c,1);
  c.restore();
  const shake=reducedMotion?0:Math.sin(clock*65)*room.anger*g.size*.004;
  const h=g.body*.68, discomfort=room.discomfort, squash=1-discomfort*.34;
  push(); translate(g.x+g.size*.27+shake,g.y+g.size*.76);
  // Shared angry pupils stay intact; compression and color intensify with anger.
  scale(1+room.anger*.025,1-room.anger*.04);
  left.drawAt(0,0,{bodyWidth:g.body,bodyHeight:h,bodyColor:`rgb(${249-room.anger*20},${245-room.anger*54},${235-room.anger*48})`,eyeScale:1-room.anger*.15,lookX:0,lookY:h*.1}); pop();
  const expression=['pupil','sleepy','worried','crying'][room.stage];
  right.setExpression(expression);
  const sway=reducedMotion?0:Math.sin(clock*2.7)*discomfort*g.size*.006;
  right.drawAt(g.x+g.size*.73+sway,g.y+g.size*.76+h*(1-squash)*.5,{bodyWidth:g.body,bodyHeight:h,scaleX:1-discomfort*.11,scaleY:squash,pinch:discomfort,lookX:g.x+g.size*.68,lookY:g.y+g.size*.73,bodyColor:'#f9f7ef'});
  // A light foreground veil keeps all three eyes readable at maximum density.
  c.save(); c.translate(g.x,g.y); c.scale(g.size,g.size); c.beginPath(); c.rect(.004,.004,.992,.992); c.clip(); drawSmoke(c,.12); c.restore();
  c.strokeStyle='#77756c'; c.lineWidth=1.5; c.strokeRect(g.x,g.y,g.size,g.size);
  if(previousStage!==room.stage){previousStage=room.stage;document.getElementById('status').textContent=['右のマーパンは静かにしている','右のマーパンが煙に気づいた','右のマーパンが苦しそうに縮こまっている','右のマーパンがうずくまっている'][room.stage];}
  updateAudio();
}
function drawSmoke(c,opacity) {
  if(opacity===1){
    const layer=smokeLayer.getContext('2d');
    layer.clearRect(0,0,256,256); layer.save(); layer.scale(256,256);
    paintSmoke(layer); layer.restore();
  }
  c.globalAlpha=opacity; c.drawImage(smokeLayer,0,0,1,1); c.globalAlpha=1;
}
function paintSmoke(c) {
  if(room.mass>.001){
    const depth=.12+room.mass*1.1;
    for(let i=0;i<38;i++){
      const x=(i*.6180339+Math.sin(clock*.13+i)*.035)%1;
      const hash=Math.sin(i*127.1+31.7)*43758.5453;
      const y=(hash-Math.floor(hash))*depth-.07;
      const r=.18+room.mass*.12+Math.sin(i+clock*.2)*.025;
      c.globalAlpha=room.mass*.22;
      c.drawImage(sprite,x-r,y-r,r*2,r*2);
    }
  }
  particles.forEach(p=>{c.globalAlpha=Math.min(1,p.age*3)*Math.min(1,(24-p.age)/5)*.3;c.drawImage(sprite,p.x-p.r,p.y-p.r,p.r*2,p.r*2);});
  c.globalAlpha=1;
}
async function startAudio() {
  if(!enabled || audioFailed) return;
  try {
    await userStartAudio();
    if(!audio){
      audio=getAudioContext(); master=audio.createGain(); master.gain.value=.42; master.connect(audio.destination);
      const buffer=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate), data=buffer.getChannelData(0);
      for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*.4;
      const noise=audio.createBufferSource(); noise.buffer=buffer; noise.loop=true;
      const filter=audio.createBiquadFilter(); filter.type='bandpass'; filter.frequency.value=1100; filter.Q.value=.6;
      hiss=audio.createGain(); hiss.gain.value=0; noise.connect(filter); filter.connect(hiss); hiss.connect(master); noise.start();
    }
  } catch(_){audioFailed=true;}
}
function grumble() {
  if(!audio || !enabled || document.hidden || voices.size>=6) return;
  const t=audio.currentTime, osc=audio.createOscillator(), gain=audio.createGain();
  osc.type='sine'; osc.frequency.setValueAtTime(82+room.anger*18,t); osc.frequency.exponentialRampToValueAtTime(41,t+.18);
  gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(.07+room.anger*.12,t+.018);gain.gain.exponentialRampToValueAtTime(.001,t+.23);
  osc.connect(gain); gain.connect(master); voices.add(osc);osc.onended=()=>{voices.delete(osc);osc.disconnect();gain.disconnect();};osc.start();osc.stop(t+.24);
}
function updateAudio() {
  if(!audio) return;
  master.gain.setTargetAtTime(enabled&&!document.hidden?.42:0,audio.currentTime,.08);
  hiss.gain.setTargetAtTime(room.anger*.045,audio.currentTime,.3);
}
