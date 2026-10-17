/* Wind packets carry a tap's phase to the edge; overlapping arrivals feed vortices.
   Simulation coordinates are normalized so resizing preserves the experience. */
let marpan, canvas, packets=[], vortices=[], clock=0, lastTap=-100, flapQueue=[], flapStart=-100;
let audio, muted=false, exporting=false;
const MAX_PACKETS=28, MAX_VORTICES=4;
function setup(){
 pixelDensity(Math.min(devicePixelRatio||1,2));canvas=createCanvas(windowWidth,windowHeight);canvas.parent('sky');
 marpan=new Marpan25D({id:'life-003-butterfly',autoBlink:true,bodyColor:'#fffdf8'});
 const sky=document.querySelector('#sky');
 sky.addEventListener('pointerdown',e=>{e.preventDefault();sky.focus({preventScroll:true});tap();});
 sky.addEventListener('keydown',e=>{if((e.code==='Space'||e.code==='Enter')&&!e.repeat){e.preventDefault();tap();}});
 document.querySelector('#sound').onclick=()=>{muted=!muted;startSound();updateSoundButton();};
 document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>exportStage(+b.dataset.stage));
 document.addEventListener('visibilitychange',()=>{if(audio)audio.master.gain.setTargetAtTime(document.hidden||muted?0:0.28,audio.ctx.currentTime,.2);});
}
function updateSoundButton(){const b=document.querySelector('#sound');b.textContent=muted?'音 オフ':'音 オン';b.setAttribute('aria-pressed',String(!muted));}
function tap(){
 startSound();const gap=clock-lastTap;lastTap=clock;
 const phase=clock*2.73+Math.sin(gap*4.1)*1.3;
 packets.push({age:0,phase,power:1+Math.exp(-gap/2)*(.6+.5*Math.cos(gap*7)),seed:Math.random()*100});
 if(packets.length>MAX_PACKETS)packets.shift();
 if(flapQueue.length<8)flapQueue.push(clock);
 document.querySelector('#hint').style.opacity='0';
}
function draw(){
 const dt=Math.min(deltaTime/1000,.05);clock+=dt;
 if(clock-flapStart>.34&&flapQueue.length){flapQueue.shift();flapStart=clock;flutterSound();}
 advance(dt);renderScene(packets,vortices,clock,Math.max(0,1-(clock-flapStart)/.34));updateAudio();
}
function advance(dt){
 for(const p of packets){p.age+=dt;if(p.age>=6.5&&!p.arrived){p.arrived=true;const angle=p.phase%TWO_PI;
 let v=vortices.find(v=>Math.abs(Math.atan2(Math.sin(v.angle-angle),Math.cos(v.angle-angle)))<1.25);
 if(!v){if(vortices.length>=MAX_VORTICES)v=vortices.reduce((a,b)=>a.energy<b.energy?a:b);else{v={angle,energy:0,age:0,seed:p.seed};vortices.push(v);}}
 v.energy=Math.min(4,v.energy+p.power*.64);v.seed+=Math.sin(p.phase)*.4;
 }}
 packets=packets.filter(p=>p.age<10);
 for(const v of vortices){v.age+=dt;v.energy=Math.max(0,v.energy-dt*.085);v.angle+=dt*.035*Math.sin(v.seed);}
 vortices=vortices.filter(v=>v.energy>.005);
}
function renderScene(ps,vs,t,flap=0){
 background('#f5f9fa');const unit=Math.min(width,height);const cx=width*.5,cy=height*.53;
 // Growing curling traces remain connected visually to the butterfly's origin.
 noFill();
 for(const p of ps){const progress=Math.min(p.age/7,1),fade=Math.min(p.age*3,1)*Math.min(1,(10-p.age)/2);const r=unit*(.07+progress*.39);
 for(let j=0;j<8+Math.floor(progress*14);j++){
 const a=p.phase+j*TWO_PI/12;stroke(100,153,165,fade*(18+progress*18));strokeWeight(unit*.0011);
 beginShape();for(let k=0;k<=20;k++){const q=k/20;const bend=progress*progress*2.6;const theta=a+q*(.16+bend)+Math.sin(p.seed+j)*progress*.25;const rr=r+q*unit*(.025+progress*.055);vertex(cx+Math.cos(theta)*rr*(width/unit*.85),cy+Math.sin(theta)*rr*.85);}endShape();
 if(j%3===0){noStroke();fill(114,161,169,fade*80);circle(cx+Math.cos(a)*r*(width/unit*.85),cy+Math.sin(a)*r*.85,unit*.003);noFill();}
 }}
 for(const v of vs)drawVortex(v,t,unit,cx,cy);
 drawButterfly(cx,cy,unit,flap,t);
}
function drawVortex(v,t,u,cx,cy){
 const strength=Math.min(v.energy/1.6,1),growth=Math.min(v.age/4,1),s=(.28+strength*.72)*growth;
 const x=cx+Math.cos(v.angle)*width*.39,y=cy+Math.sin(v.angle)*height*.29;
 push();translate(x,y);rotate(Math.sin(v.seed)*.17);noFill();
 // A funnel built of individually turning elliptical streamlines, never over center.
 for(let i=0;i<48;i++){
 const z=i/47,wide=u*(.018+Math.pow(z,1.5)*.21)*s;
 const yy=u*(.19-z*.43)*s;
 const drift=Math.sin(z*5+t*.6+v.seed)*u*.025*s;
 stroke(82,133,148,(38+strength*72)*growth);strokeWeight(u*(.0008+z*.00065));
 const a=t*(1.2+strength)+i*.57+v.seed;
 arc(drift,yy,wide*2,wide*.38,a,a+Math.PI*1.55);
 }
 for(let i=0;i<20;i++){const z=((i/20+t*.12)%1),a=t*2+i*2.4;const r=u*(.018+z*z*.21)*s;noStroke();fill(99,149,159,55*growth);circle(Math.cos(a)*r, u*(.19-z*.43)*s+Math.sin(a)*r*.18,u*.003);}
 pop();
}
function drawButterfly(x,y,u,flap,t){
 const b=u*.072,wing=u*.085;const open=.72+.28*Math.cos(flap*TWO_PI);const lift=Math.sin(flap*PI)*u*.008;
 push();translate(x,y-lift);stroke('#7eaaaf');strokeWeight(u*.0012);
 for(const side of [-1,1]){push();scale(side*open,1);fill('#d8e9e7');beginShape();vertex(0,0);bezierVertex(wing*.3,-wing*1.3,wing*1.45,-wing*1.4,wing*1.12,-wing*.25);bezierVertex(wing*1.55,wing*.65,wing*.35,wing*1.2,0,wing*.12);endShape(CLOSE);
 noFill();stroke(140,177,174,100);bezier(0,0,wing*.4,-wing*.5,wing*.7,-wing*.5,wing*.94,-wing*.7);bezier(0,0,wing*.35,wing*.1,wing*.6,wing*.38,wing*.84,wing*.48);pop();}
 noFill();stroke('#77969b');bezier(-b*.13,-b*.2,-b*.4,-b*.75,-b*.5,-b*.8,-b*.6,-b*.6);bezier(b*.13,-b*.2,b*.4,-b*.75,b*.5,-b*.8,b*.6,-b*.6);
 // Scale the original renderer to retain its body outline and all three eye shapes.
 push();scale(b/300);marpan.drawAt(0,0,{bodyWidth:300,bodyHeight:204,lookX:0,lookY:0});pop();pop();
}
async function startSound(){
 try{await userStartAudio();if(!audio){const ctx=getAudioContext();const master=ctx.createGain();master.gain.value=muted?0:.28;const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-20;compressor.ratio.value=8;master.connect(compressor);compressor.connect(ctx.destination);
 const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
 const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=700;const wind=ctx.createGain();wind.gain.value=0;noise.connect(filter);filter.connect(wind);wind.connect(master);noise.start();audio={ctx,master,buffer,wind,filter};}
 audio.master.gain.setTargetAtTime(muted||document.hidden?0:.28,audio.ctx.currentTime,.1);
 }catch{document.querySelector('#status').textContent='音声を開始できませんでした。音ボタンで再試行できます。';}
}
function flutterSound(){if(!audio||muted)return;const {ctx,buffer,master}=audio,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='bandpass';filter.frequency.value=1400;gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(.2,ctx.currentTime+.015);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.13);source.connect(filter);filter.connect(gain);gain.connect(master);source.start();source.stop(ctx.currentTime+.15);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};}
function updateAudio(){if(!audio)return;const energy=vortices.reduce((a,v)=>a+v.energy,0);const breeze=packets.reduce((a,p)=>a+Math.sin(Math.min(p.age/10,1)*PI)*p.power,0);audio.wind.gain.setTargetAtTime(Math.min(.3,breeze*.018+energy*.045),audio.ctx.currentTime,.4);audio.filter.frequency.setTargetAtTime(1100/(1+energy*.5),audio.ctx.currentTime,.5);}
function windowResized(){if(!exporting)resizeCanvas(windowWidth,windowHeight);}
function exportStage(stage){
 exporting=true;const w=width,h=height,d=pixelDensity();const blink=marpan.autoBlinkEnabled;marpan.disableAutoBlink();marpan.openEyes();
 try{pixelDensity(1);resizeCanvas(3200,2400,true);
 const ps=stage===0?[]:[{age:[0,.7,4.4,7.5][stage],phase:.2,power:1.5,seed:17},{age:[0,.35,3.5,6.8][stage],phase:2.7,power:1.3,seed:29}];
 const vs=stage===3?[{angle:-.32,energy:3,age:6,seed:17},{angle:2.8,energy:2,age:5,seed:29}]:[];
 renderScene(ps,vs,12,stage===1?.55:0);saveCanvas(canvas,`life-sketch-003-butterfly-effect-0${stage+1}`,'png');document.querySelector('#status').textContent=`${stage+1}場面目のPNGを書き出しました。`;
 }finally{resizeCanvas(w,h,true);pixelDensity(d);marpan.autoBlinkEnabled=blink;exporting=false;}
}
