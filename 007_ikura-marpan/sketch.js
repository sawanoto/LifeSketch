'use strict';
// A 900 × 900 logical drawing keeps hit testing, resize and print identical.
const PAPER = '#faf5eb', POP_DELAY = 90;
let marpan, eggs = [], waves = [], emptySince = null, clock = 0;
let audioEnabled = true, audioContext, master, limiter, noiseBuffer;
let lastVoice = 0, voices = 0;
function makeEggs(drop = false) {
  const result = [];
  const rows = [5, 7, 7, 6];
  rows.forEach((count, row) => {
    for (let i = 0; i < count; i++) {
      const id = result.length;
      result.push({x:450 + (i-(count-1)/2)*65 + Math.sin(id*9)*5,
        y:337+row*43 + Math.cos(id*7)*5, r:34+(Math.sin(id*13)+1)*3,
        phase:id*1.9, pressed:null, gone:false, landed:drop ? clock+450+id*35 : -Infinity});
    }
  });
  return result;
}
function setup() {
  const host = document.getElementById('scene');
  const canvas = createCanvas(host.clientWidth,host.clientHeight); canvas.parent(host);
  pixelDensity(Math.min(devicePixelRatio || 1,2));
  marpan = new Marpan25D({autoBlink:false}); eggs = makeEggs();
  canvas.elt.tabIndex=0; canvas.elt.setAttribute('role','button');
  canvas.elt.setAttribute('aria-label','イクラをタップして弾く。キーボードではスペースまたはEnterで一粒ずつ弾けます。');
  canvas.elt.addEventListener('pointerdown', event => {
    if(event.pointerType==='mouse' && event.button!==0)return;
    event.preventDefault(); startAudio();
    const box=canvas.elt.getBoundingClientRect(), s=sceneScale(width,height);
    const x=((event.clientX-box.left)*width/box.width-width/2)/s+450;
    const y=((event.clientY-box.top)*height/box.height-height/2)/s+450;
    // Frontmost visible membrane wins; generous targets never pop a neighbour twice.
    for(let i=eggs.length-1;i>=0;i--){const e=eggs[i];
      if(!e.gone && e.pressed===null && clock>=e.landed && Math.hypot(x-e.x,y-e.y)<=e.r+8){pressEgg(e);break;}}
  });
  canvas.elt.addEventListener('keydown',event=>{if(event.code==='Space'||event.code==='Enter'){
    event.preventDefault();startAudio();const e=eggs.find(e=>!e.gone&&e.pressed===null&&clock>=e.landed);if(e)pressEgg(e);}});
  document.getElementById('sound').onclick=()=>{
    audioEnabled=!audioEnabled; const button=document.getElementById('sound');
    button.textContent=audioEnabled?'音 オン':'音 オフ';button.setAttribute('aria-pressed',String(audioEnabled));
    if(audioEnabled)startAudio();if(master)master.gain.setTargetAtTime(audioEnabled?.55:0,audioContext.currentTime,.025);
  };
  document.querySelectorAll('[data-export]').forEach(b=>b.onclick=()=>exportPNG(b.dataset.export));
  new ResizeObserver(()=>resizeCanvas(host.clientWidth,host.clientHeight)).observe(host);
}
function sceneScale(w,h){return Math.min(w/700,h/800);}
function pressEgg(e){e.pressed=clock;}
function draw(){
  clock=millis();
  for(const e of eggs)if(!e.gone&&e.pressed!==null&&clock-e.pressed>=POP_DELAY){
    e.gone=true; waves.push({x:e.x,y:e.y,born:clock,seed:e.phase}); playPop();
  }
  waves=waves.filter(w=>clock-w.born<2300);
  if(eggs.every(e=>e.gone)){
    if(emptySince===null)emptySince=clock;
    if(clock-emptySince>1500){eggs=makeEggs(true);emptySince=null;}
  }
  renderScene(width,height,clock,eggs,waves);
}
function renderScene(w,h,t,items,ripples){
  background(PAPER);push();translate(w/2,h/2);scale(sceneScale(w,h));translate(-450,-450);
  const c=drawingContext;
  // A quiet porcelain-like shadow, without extra objects competing with the roe.
  noStroke();for(let i=14;i>0;i--){fill(77,65,35,1.5);ellipse(450,666,460+i*8,47+i*3);}
  nori();
  for(const e of items)if(!e.gone)drawEgg(e,t);
  marpan.drawEyes(450,559,414,240,0,0,-14,{eyeScale:.87});
  c.save();c.globalCompositeOperation='lighter';
  for(const wave of ripples)drawWave(wave,t);
  c.restore();pop();
}
function nori(){
  const c=drawingContext;
  c.save();c.beginPath();c.moveTo(200,420);c.bezierCurveTo(210,362,690,362,700,420);
  c.lineTo(684,602);c.bezierCurveTo(672,700,228,700,216,602);c.closePath();
  const g=c.createLinearGradient(200,0,700,0);g.addColorStop(0,'#151f19');g.addColorStop(.3,'#394638');g.addColorStop(.65,'#243026');g.addColorStop(1,'#101b16');c.fillStyle=g;c.fill();c.clip();
  // Deterministic fine seaweed fibres.
  for(let i=0;i<220;i++){const x=200+(Math.sin(i*133.7)*.5+.5)*500,y=408+(Math.cos(i*87.3)*.5+.5)*260;
    c.strokeStyle=i%3?'rgba(166,178,125,.09)':'rgba(0,10,0,.19)';c.lineWidth=1+i%2;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.sin(i)*9,y+9+i%13);c.stroke();}
  c.restore();noStroke();fill('#131e16');ellipse(450,418,500,166);fill('#eee9d5');ellipse(450,412,467,139);
  for(let i=0;i<135;i++){const a=i*2.39996,r=Math.sqrt((i+.5)/135);const x=450+Math.cos(a)*r*222,y=412+Math.sin(a)*r*62;push();translate(x,y);rotate(a);fill(i%3?'#fffcf0':'#dedcc8');ellipse(0,0,14,7);pop();}
  noFill();stroke('#43503a');strokeWeight(5);ellipse(450,419,490,155);noStroke();
}
function drawEgg(e,t){
  let offset=0,sx=1,sy=1;
  if(t<e.landed){const u=constrain((e.landed-t)/600,0,1);offset=-700*u*u;}
  else if(t-e.landed<650){const a=t-e.landed;sx+=Math.sin(a*.026)*Math.exp(-a/180)*.16;sy=2-sx;}
  const age=e.pressed===null?-1:t-e.pressed;
  if(age>=0){const u=constrain(age/POP_DELAY,0,1);sx=1+.26*Math.sin(u*PI);sy=1-.3*Math.sin(u*PI);}
  else{sx+=Math.sin(t*.0025+e.phase)*.018;sy-=Math.sin(t*.0025+e.phase)*.018;}
  push();translate(e.x,e.y+offset);scale(sx,sy);const c=drawingContext,r=e.r;
  noStroke();fill(106,43,4,38);ellipse(3,r*.75,r*1.7,r*.55);
  const g=c.createRadialGradient(-r*.32,-r*.35,r*.05,0,0,r);
  g.addColorStop(0,'rgba(255,220,104,.84)');g.addColorStop(.45,'rgba(255,151,25,.85)');g.addColorStop(.82,'rgba(241,85,9,.84)');g.addColorStop(1,'rgba(255,169,47,.58)');
  c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();
  fill(218,65,9,95);ellipse(r*.12,r*.2,r*.9,r*.77);
  noFill();stroke(255,199,91,age>55?240:170);strokeWeight(age>55?2.6:1.4);circle(0,0,r*2);
  stroke(255,242,193,180);strokeWeight(2);arc(0,0,r*1.76,r*1.76,PI*1.04,PI*1.54);
  noStroke();fill(255,255,230,220);ellipse(-r*.32,-r*.4,r*.43,r*.22);fill(255,245,206,135);circle(r*.4,r*.38,r*.13);pop();
}
function drawWave(w,t){
  const age=t-w.born;if(age<0||age>2300)return;
  const u=age/2300, fade=Math.pow(1-u,1.7), radius=20+400*(1-Math.pow(1-u,2));
  const c=drawingContext;
  for(let i=0;i<3;i++){
    const r=radius*(1-i*.16);const g=c.createRadialGradient(w.x,w.y,r*.64,w.x,w.y,r);
    g.addColorStop(0,'rgba(245,132,20,0)');g.addColorStop(.6,`rgba(255,152,22,${fade*.075})`);g.addColorStop(.88,`rgba(255,190,65,${fade*.28})`);g.addColorStop(1,'rgba(255,173,28,0)');
    c.fillStyle=g;c.beginPath();c.arc(w.x,w.y,r,0,Math.PI*2);c.fill();
  }
  noFill();stroke(255,182,65,fade*100);strokeWeight(1.5);ellipse(w.x,w.y,radius*1.86,radius*1.72);
  noStroke();for(let i=0;i<17;i++){const a=i*2.4+w.seed,r=radius*(.58+(i%5)*.08);fill(255,208,106,fade*(130+i%3*35));circle(w.x+Math.cos(a)*r,w.y+Math.sin(a)*r,2+i%3);}
  if(age<260)for(let i=0;i<7;i++){const a=i*TWO_PI/7+w.seed,d=12+age*.19;fill(255,162,44,(1-age/260)*170);ellipse(w.x+Math.cos(a)*d,w.y+Math.sin(a)*d,5,3);}
}
async function startAudio(){
  try{await userStartAudio();audioContext=getAudioContext();
    if(!master){master=audioContext.createGain();master.gain.value=audioEnabled?.55:0;
      limiter=audioContext.createDynamicsCompressor();limiter.threshold.value=-19;limiter.knee.value=12;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.22;master.connect(limiter);limiter.connect(audioContext.destination);
      noiseBuffer=audioContext.createBuffer(1,audioContext.sampleRate*.055,audioContext.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,3);}
  }catch{document.getElementById('status').textContent='音を始めるには「音 オン」をもう一度押してください。';}
}
function playPop(){
  if(!audioEnabled||!master||audioContext.state!=='running')return;
  const now=audioContext.currentTime;
  // Bound simultaneous tails as well as peak level; no queued wall-clock timers.
  if(now-lastVoice>1.6)voices=0;lastVoice=now;if(voices>=12)return;voices++;
  const end=()=>{voices=Math.max(0,voices-1);};
  const noise=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();
  noise.buffer=noiseBuffer;filter.type='bandpass';filter.frequency.value=1900+Math.random()*500;filter.Q.value=.9;gain.gain.value=.2;noise.connect(filter);filter.connect(gain);gain.connect(master);noise.start(now);noise.onended=()=>{noise.disconnect();filter.disconnect();gain.disconnect();};
  const snap=audioContext.createOscillator(),sg=audioContext.createGain();snap.frequency.setValueAtTime(1000,now);snap.frequency.exponentialRampToValueAtTime(330,now+.035);sg.gain.setValueAtTime(.13,now);sg.gain.exponentialRampToValueAtTime(.0001,now+.05);snap.connect(sg);sg.connect(master);snap.start(now);snap.stop(now+.06);snap.onended=()=>{snap.disconnect();sg.disconnect();};
  const soft=audioContext.createOscillator(),envelope=audioContext.createGain();soft.type='sine';soft.frequency.setValueAtTime(230,now+.035);soft.frequency.exponentialRampToValueAtTime(125,now+1.5);
  envelope.gain.setValueAtTime(0,now);envelope.gain.linearRampToValueAtTime(.075/Math.sqrt(Math.max(1,voices)),now+.15);envelope.gain.exponentialRampToValueAtTime(.0001,now+1.65);soft.connect(envelope);envelope.connect(master);soft.start(now+.035);soft.stop(now+1.7);soft.onended=()=>{soft.disconnect();envelope.disconnect();end();};
}
function exportPNG(state){
  // Render deterministic print scenes on the same p5 canvas, then restore immediately.
  const oldW=width,oldH=height,density=pixelDensity();
  try{
    pixelDensity(1);resizeCanvas(2400,3000,true);
    const items=makeEggs(),e=items[items.length-4],ripples=[];
    if(state!=='full'){e.gone=true;ripples.push({x:e.x,y:e.y,born:state==='burst'?-65:-1050,seed:e.phase});}
    renderScene(width,height,0,items,ripples);saveCanvas(`ikura-marpan-${state}-2400x3000`,'png');
    document.getElementById('status').textContent='PNGを保存しました。';
  }catch{document.getElementById('status').textContent='保存できませんでした。もう一度お試しください。';}
  finally{pixelDensity(density);resizeCanvas(oldW,oldH,true);renderScene(width,height,clock,eggs,waves);}
}
