// Normalized world coordinates survive resizing. Time advances independently of sight.
let traveler, beloved, neighbors, veil;
let worldTime = 0, focus = 0;
let position = {x:.22,y:.62}, destination = {...position};
const love = {x:.64,y:.46};
const held = new Set();
const smooth = t => t*t*(3-2*t);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
function setup() {
  const canvas = createCanvas(800,500);
  canvas.parent('stage'); canvas.elt.setAttribute('aria-hidden','true');
  pixelDensity(Math.min(devicePixelRatio || 1,2));
  traveler = new Marpan25D({id:'blind-traveler',autoBlink:true});
  beloved = new Marpan25D({id:'blind-beloved',bodyColor:'#d6b4a7',autoBlink:true});
  neighbors = Array.from({length:5},(_,i)=>new Marpan25D({id:`blind-neighbor-${i}`}));
  const stage = document.getElementById('stage');
  function point(e) {
    const r=canvas.elt.getBoundingClientRect();
    destination={x:clamp((e.clientX-r.left)/r.width,.07,.93),y:clamp((e.clientY-r.top)/r.height,.12,.88)};
  }
  stage.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    stage.focus({preventScroll:true}); stage.setPointerCapture(e.pointerId); point(e);
  });
  stage.addEventListener('pointermove',e=>{if(stage.hasPointerCapture(e.pointerId))point(e);});
  stage.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow')){e.preventDefault();held.add(e.key);}});
  stage.addEventListener('keyup',e=>held.delete(e.key));
  stage.addEventListener('blur',()=>held.clear());
  window.addEventListener('blur',()=>held.clear());
  document.getElementById('reset').addEventListener('click',resetWorld);
  windowResized();
}
function resetWorld() {
  worldTime=0; focus=0; held.clear();
  position={x:.22,y:.62}; destination={...position};
}
function windowResized() {
  const w=document.getElementById('stage').clientWidth;
  resizeCanvas(w,w*(w<600?1.18:.58));
  if(veil)veil.remove();
  veil=createGraphics(width,height); veil.pixelDensity(1);
}
function advanceWorld(dt) {
  worldTime+=dt;
  if(held.size) {
    destination={x:clamp(position.x+((held.has('ArrowRight')?1:0)-(held.has('ArrowLeft')?1:0))*.36*dt,.07,.93),
      y:clamp(position.y+((held.has('ArrowDown')?1:0)-(held.has('ArrowUp')?1:0))*.36*dt,.12,.88)};
  }
  const dx=(destination.x-position.x)*width,dy=(destination.y-position.y)*height;
  const distance=Math.hypot(dx,dy), step=Math.min(distance,Math.min(width,height)*.65*dt);
  if(distance>0){position.x+=dx/distance*step/width;position.y+=dy/distance*step/height;}
  const proximity=Math.hypot((position.x-love.x)*width,(position.y-love.y)*height)/Math.min(width,height);
  const target=smooth(clamp(1-(proximity-.055)/.52,0,1));
  focus+=(target-focus)*(1-Math.exp(-dt*7));
}
function person(p,x,y,size,color) {
  p.drawAt(x,y,{bodyWidth:size,bodyHeight:size*.92,bodyColor:color,lookX:love.x*width,lookY:love.y*height});
}
function drawWorld(unit) {
  background('#eee8db');
  noFill();stroke('#e0d8c8');strokeWeight(1);
  for(let i=0;i<4;i++)ellipse(width*.5,height*.52,width*(.4+i*.27),height*(.28+i*.22));
  const t=worldTime;
  textAlign(CENTER,CENTER);textSize(unit*.034);noStroke();
  // Work: a small, repeating pile of papers, never a punishment or score.
  const wx=width*.19,wy=height*.23;
  fill('#a0ada7');rect(wx-unit*.09,wy,unit*.18,unit*.065,3);
  const papers=1+Math.floor(t/3)%5;
  for(let i=0;i<papers;i++){fill('#faf8f1');rect(wx-unit*.045+i*2,wy-i*unit*.009,unit*.08,unit*.016,1);}
  fill('#938978');text('仕事',wx,wy+unit*.11);
  // Family: washing keeps turning, towels keep changing places.
  const fx=width*.78,fy=height*.79;
  stroke('#aaa18e');line(fx-unit*.12,fy-unit*.07,fx+unit*.12,fy-unit*.07);noStroke();
  for(let i=0;i<3;i++){fill(['#b3beb0','#cab89c','#c9aaa3'][(i+Math.floor(t/5))%3]);rect(fx-unit*.1+i*unit*.075,fy-unit*.07+Math.sin(t+i)*unit*.006,unit*.05,unit*.07,2);}
  fill('#938978');text('家族',fx,fy+unit*.07);
  // Friends circle their table while a cup gently travels between them.
  const cx=width*.22,cy=height*.79;
  fill('#cdbfa6');ellipse(cx,cy,unit*.11,unit*.055);
  for(let i=0;i<2;i++){const a=t*.16+i*Math.PI;person(neighbors[i],cx+Math.cos(a)*unit*.105,cy+Math.sin(a)*unit*.045,unit*.065,'#e0d0ad');}
  fill('#938978');text('友人',cx,cy+unit*.12);
  // Society: the same little bus continues its route outside the aperture.
  const bx=width*(.48+((t*.024)% .44)),by=height*.16;
  fill('#9eafb0');rect(bx-unit*.09,by-unit*.035,unit*.18,unit*.07,5);
  fill('#e8eee8');for(let i=0;i<3;i++)rect(bx-unit*.065+i*unit*.045,by-unit*.022,unit*.03,unit*.025,1);
  fill('#827d70');ellipse(bx-unit*.05,by+unit*.037,unit*.022);ellipse(bx+unit*.05,by+unit*.037,unit*.022);
  fill('#938978');text('社会',width*.77,height*.26);
  for(let i=2;i<5;i++)person(neighbors[i],width*((.08+t*.012+i*.21)%.88+.02),height*(.34+(i%2)*.3),unit*.06,'#d8d6c8');
}
function draw() {
  advanceWorld(Math.min(deltaTime/1000,.05));
  const unit=Math.min(width,height), size=unit*.13;
  drawWorld(unit);
  const px=position.x*width,py=position.y*height,lx=love.x*width,ly=love.y*height;
  person(traveler,px,py,size,'#fffdf7');
  person(beloved,lx,ly,size,'#d6b4a7');
  // A single soft aperture closes around the pair, then settles on the beloved.
  // The world is drawn and updated in full on every frame, even when invisible.
  const cx=(px+lx)/2+(lx-px)/2*focus,cy=(py+ly)/2+(ly-py)/2*focus;
  const radius=Math.hypot(width,height)*(1-focus)+size*.62;
  veil.clear();const ctx=veil.drawingContext;
  ctx.fillStyle='#302e32';ctx.fillRect(0,0,width,height);
  ctx.globalCompositeOperation='destination-out';
  const gradient=ctx.createRadialGradient(cx,cy,radius*.7,cx,cy,radius*1.35);
  gradient.addColorStop(0,'rgba(0,0,0,1)');gradient.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
  ctx.globalCompositeOperation='source-over';
  push();tint(255,255*focus);image(veil,0,0);pop();
}
