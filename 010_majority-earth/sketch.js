/* global Marpan25D, p5 */
'use strict';
const symbols = {circle:'○', triangle:'△', square:'□'};
const opposition = {circle:'square', triangle:'circle', square:'triangle'};
const timing = Object.freeze({ reset: .22, vote: .35, send: .46, flight: .14, morph: .60, duration: .58, ready: 1.35 });
const buttons = [...document.querySelectorAll('[data-shape]')];
let marpan, chosen = null, majority = null, started = 0, previous = 0, sounded = 0, lowPlayed = false;
let priorMajority = null;
let muted = false, audio, master, mesh = [], rotation = 0;
const crowd = Array.from({length:24}, (_,i) => ({x:790+(i%6)*61+(Math.floor(i/6)%2)*12,y:224+Math.floor(i/6)*89, delay:timing.vote}));
function setup(){
  const host=document.getElementById('stage'); const c=createCanvas(host.clientWidth,host.clientHeight);c.parent(host);pixelDensity(Math.min(devicePixelRatio,2));
  marpan=new Marpan25D({autoBlink:false,bodyColor:'#fffdf5'});buildMesh();positionChoices();
}
function windowResized(){const h=document.getElementById('stage');resizeCanvas(h.clientWidth,h.clientHeight);positionChoices();}
function positionChoices(){const host=document.getElementById('stage'),fit=Math.min(width/1280,height/720),controls=document.getElementById('choices');controls.style.left=`${(width-1280*fit)/2+202*fit}px`;controls.style.top=`${host.offsetTop+(height-720*fit)/2+550*fit}px`;}
function easeUnit(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
function elapsed(){return chosen?(performance.now()-started)/1000:-1;}
function choose(shape){
  if(chosen&&elapsed()<timing.ready)return;
  previous=chosen?amount(elapsed()):0; priorMajority=majority; chosen=shape;majority=opposition[shape];started=performance.now();sounded=0;lowPlayed=false;
  buttons.forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.shape===shape));b.disabled=true;});
  document.getElementById('hint').textContent='';
  userStartAudio().then(()=>{audio=getAudioContext();if(!master){master=audio.createGain();master.gain.value=muted?0:.65;master.connect(audio.destination);}tone(740,.22,.08);}).catch(()=>{});
}
function tone(freq,duration,level,low=false){
  if(!audio||audio.state!=='running'||muted)return;
  const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.type='sine';o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(low?38:freq*.87,t+duration);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(level,t+.025);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(master);o.start();o.stop(t+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();};
}
function amount(t){return easeUnit((t-timing.morph)/timing.duration);}
function draw(){
  const t=elapsed();rotation+=Math.min(deltaTime,50)*.000065;
  if(chosen){let n=crowd.filter(c=>t>=c.delay).length;while(sounded<n){tone(320+(sounded%5)*41,.18,.016);sounded++;}if(t>=timing.morph&&!lowPlayed){tone(105,.55,.12,true);lowPlayed=true;}if(t>=timing.ready){buttons.forEach(b=>b.disabled=false);document.getElementById('status').textContent=`あなたは${symbols[chosen]}、24体は${symbols[majority]}。地球は${symbols[majority]}。`;}}
  renderScene(t,chosen,majority,rotation);
}
function renderScene(t,choice,vote,angle){
  background('#f5f2e9');push();const fit=Math.min(width/1280,height/720);translate((width-1280*fit)/2,(height-720*fit)/2);scale(fit);
  noStroke();fill('#e9e9dc');ellipse(635,591,330,25);fill('#e5e6d9');ellipse(202,535,116,12);
  stroke('#dfe2d5');strokeWeight(1);line(65,580,1210,580);
  for(let i=0;i<crowd.length;i++){const c=crowd[i];const active=choice&&t>=c.delay;let hop=active&&t-c.delay<.4?Math.sin((t-c.delay)/.4*Math.PI)*7:0;marpan.drawAt(c.x,c.y-hop,{bodyWidth:49,bodyHeight:34,lookX:630,lookY:350,yaw:0});if(active)badge(c.x,c.y-40-hop,vote,27,'#687e69');}
  marpan.drawAt(202,480,{bodyWidth:130,bodyHeight:88,lookX:630,lookY:380,yaw:0});
  if(choice)badge(202,362,choice,70,'#397f78');
  const morph=choice?amount(t):0;
  if(choice&&t>=timing.send&&t<timing.morph){for(let i=0;i<24;i++){const c=crowd[i],f=Math.min(1,(t-timing.send)/timing.flight);let e=easeUnit(f);push();translate(lerp(c.x,635,e),lerp(c.y-40,365,e)-sin(f*PI)*45);stroke(107,135,104,(1-f)*145);noFill();strokeWeight(1.5);symbol(vote,18*(1-f)+7);pop();}}
  earth(choice&&t<timing.reset?priorMajority:vote,choice&&t<timing.reset?previous*(1-easeUnit(t/timing.reset)):morph,angle);
  noStroke();fill('#9aa28f');textAlign(CENTER,CENTER);textSize(11);textFont('sans-serif');text('01',202,563);text('24',972,615);pop();
}
function symbol(s,size){if(s==='circle')circle(0,0,size);if(s==='square')rect(-size/2,-size/2,size,size,1);if(s==='triangle')triangle(0,-size*.58,-size*.54,size*.4,size*.54,size*.4);}
function badge(x,y,s,size,ink){push();translate(x,y);noStroke();fill('#faf9f2');ellipse(0,0,size*1.45,size*1.45);stroke(ink);strokeWeight(size>40?3:1.6);noFill();symbol(s,size*.68);pop();}
// Each surface vertex keeps its latitude/longitude and land color while its
// radius moves continuously to the cube or triangular-prism intersection.
function buildMesh(){const lat=42,lon=84;const point=(i,j)=>{let a=-PI/2+i/lat*PI,b=j/lon*TWO_PI;return {x:cos(a)*cos(b),y:sin(a),z:cos(a)*sin(b),a,b};};for(let i=0;i<lat;i++)for(let j=0;j<lon;j++){let a=point(i,j),b=point(i+1,j),c=point(i+1,j+1),d=point(i,j+1);mesh.push([a,b,c],[a,c,d]);}}
function radius(v,shape){if(shape==='square')return .83/Math.max(abs(v.x),abs(v.y),abs(v.z));if(shape==='triangle'){let d=Math.max(-v.y, .866*v.x+.5*v.y,-.866*v.x+.5*v.y);return Math.min(.65/Math.max(.001,d),.73/Math.max(.001,abs(v.z)));}return 1;}
function land(a,b){ // Stylized, connected continental plates in spherical coordinates.
  const regions=[[-.45,.1,.57,.69],[.5,.23,.38,.6],[1.5,-.32,.7,.36],[2.7,-.20,.76,.51],[3.3,.51,.3,.32],[4.6,-.3,.5,.55]];
  return regions.some(([x,y,w,h])=>{const dx=Math.atan2(Math.sin(b-x),Math.cos(b-x));return (dx/w)**2+((a-y)/h)**2 < 1+.16*sin(b*17+a*13)+.1*cos(a*31-b*9);});
}
function earth(shape,morph,angle){
  const points=mesh.map(face=>{const p=face.map(v=>{const r=1+(radius(v,shape)-1)*morph;let x=v.x*r,y=v.y*r,z=v.z*r;const xx=x*cos(angle)+z*sin(angle),zz=-x*sin(angle)+z*cos(angle);return {x:xx,y:y*.96-zz*.26,z:y*.26+zz*.96};});const a=p[0],b=p[1],c=p[2];const ux=b.x-a.x,uy=b.y-a.y,uz=b.z-a.z,vx=c.x-a.x,vy=c.y-a.y,vz=c.z-a.z;let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const len=Math.hypot(nx,ny,nz)||1;const light=.55+.45*Math.max(0,(-nx*.45-ny*.65+nz*.65)/len);const la=face.reduce((s,v)=>s+v.a,0)/3,lo=face.reduce((s,v)=>s+v.b,0)/3;return {p,z:(a.z+b.z+c.z)/3,light,land:land(la,lo)};});
  points.sort((a,b)=>a.z-b.z);for(const f of points){const col=f.land?[119,163,114]:[61,140,169];fill(...col.map(c=>c*f.light));stroke(...col.map(c=>c*f.light));strokeWeight(.55);beginShape();for(const p of f.p)vertex(611+p.x*171,354+p.y*171);endShape(CLOSE);}
}
buttons.forEach(b=>b.addEventListener('click',()=>choose(b.dataset.shape)));
document.getElementById('sound').addEventListener('click',e=>{muted=!muted;e.target.textContent=muted?'音 OFF':'音 ON';e.target.setAttribute('aria-pressed',String(muted));if(master)master.gain.setTargetAtTime(muted?0:.65,audio.currentTime,.03);});
document.querySelectorAll('[data-export]').forEach(b=>b.addEventListener('click',()=>{
  // Re-render vectors at print resolution; never upscale a screen capture.
  const w=width,h=height,d=pixelDensity();noLoop();pixelDensity(1);resizeCanvas(3840,2160,true);
  const scene=b.dataset.export;renderScene(scene==='initial'?-1:scene==='voices'?timing.vote+.05:timing.ready,scene==='initial'?null:chosen||'circle',majority||'square',.35);
  saveCanvas(`lifesketch-010-${scene}-${chosen||'circle'}-3840x2160`,'png');pixelDensity(d);resizeCanvas(w,h,true);loop();
}));
