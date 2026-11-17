/* global Marpan25D */
'use strict';

const TURN_SPEED = Math.PI * 0.8; // One revolution every 2.5 seconds, forever.
const FADE_TIME = 0.24;
const RESPAWN_TIME = 0.95;
let centerMarpan, visitorMarpan, visitor, target;
let bodySize, swordScale, bodyOutline;
let elapsed = 0, previousTime;
let vanishedAt = null;

// This same polygon draws and tests the entire sword, including its guard/grip.
const SWORD = [[0.36,-0.035],[0.60,-0.035],[0.60,-0.13],[0.66,-0.13],
  [0.66,-0.052],[1.65,-0.052],[1.84,0],[1.65,0.052],
  [0.66,0.052],[0.66,0.13],[0.60,0.13],[0.60,0.035],[0.36,0.035]];

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('stage');
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  centerMarpan = new Marpan25D({bodyColor:'#fffdf6', autoBlink:false});
  visitorMarpan = new Marpan25D({bodyColor:'#fffdf6', autoBlink:false});
  centerMarpan.setExpressionState('normal');
  visitorMarpan.setExpressionState('normal');
  layout();
  spawn();
  previousTime = performance.now();
  canvas.elt.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    advance(performance.now());
    if (vanishedAt !== null) return;
    const rect = canvas.elt.getBoundingClientRect();
    target = bounded({x:(event.clientX-rect.left)*width/rect.width,
      y:(event.clientY-rect.top)*height/rect.height});
  });
}

function layout() {
  bodySize = Math.min(100, width * 0.15, height * 0.15);
  swordScale = bodySize;
  // Sample the shared renderer's four cubic body curves (normal pinch).
  const h = 0.68;
  const curves = [
    [[0,-h/2],[.27,-h/2],[.5,-h*.25],[.48,h*.2]],
    [[.48,h*.2],[.46,h*.46],[.25,h/2],[0,h/2]],
    [[0,h/2],[-.25,h/2],[-.46,h*.46],[-.48,h*.2]],
    [[-.48,h*.2],[-.5,-h*.25],[-.26,-h/2],[0,-h/2]]
  ];
  bodyOutline = curves.flatMap(c => Array.from({length:24}, (_,i) => {
    const t=i/24, u=1-t;
    return {x:bodySize*(u*u*u*c[0][0]+3*u*u*t*c[1][0]+3*u*t*t*c[2][0]+t*t*t*c[3][0]),
      y:bodySize*(u*u*u*c[0][1]+3*u*u*t*c[1][1]+3*u*t*t*c[2][1]+t*t*t*c[3][1])};
  }));
}

function bounded(p) {
  const mx = bodySize*.5+3, my = bodySize*.34+3;
  return {x:Math.max(mx,Math.min(width-mx,p.x)), y:Math.max(my,Math.min(height-my,p.y))};
}
function spawn() {
  visitor = bounded({x:width*.16,y:height*.77});
  target = {...visitor};
  vanishedAt = null;
}
function swordPolygon(angle) {
  const c=Math.cos(angle), s=Math.sin(angle);
  return SWORD.map(([x,y]) => ({x:width/2+swordScale*(x*c-y*s),
    y:height/2+swordScale*(x*s+y*c)}));
}
function contains(poly, p) {
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const a=poly[i], b=poly[j];
    if((a.y>p.y)!==(b.y>p.y) && p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) inside=!inside;
  }
  return inside;
}
function cross(a,b,p) {return (b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);}
function intersects(a,b,c,d) {
  if(Math.max(a.x,b.x)<Math.min(c.x,d.x)||Math.max(c.x,d.x)<Math.min(a.x,b.x)
    ||Math.max(a.y,b.y)<Math.min(c.y,d.y)||Math.max(c.y,d.y)<Math.min(a.y,b.y)) return false;
  return cross(a,b,c)*cross(a,b,d)<=0 && cross(c,d,a)*cross(c,d,b)<=0;
}
function touching(angle) {
  if(Math.hypot(visitor.x-width/2,visitor.y-height/2)>swordScale*1.84+bodySize*.6) return false;
  const sword=swordPolygon(angle);
  const body=bodyOutline.map(p=>({x:p.x+visitor.x,y:p.y+visitor.y}));
  if(contains(body,sword[0])||contains(sword,body[0])) return true;
  return sword.some((a,i)=>body.some((c,j)=>intersects(a,sword[(i+1)%sword.length],c,body[(j+1)%body.length])));
}
function step(dt) {
  elapsed += dt;
  if(vanishedAt !== null) {
    if(elapsed-vanishedAt >= RESPAWN_TIME) spawn();
    return;
  }
  const dx=target.x-visitor.x, dy=target.y-visitor.y;
  const distance=Math.hypot(dx,dy);
  const movement=Math.min(distance,bodySize*1.65*dt);
  if(distance>0) {visitor.x+=dx/distance*movement;visitor.y+=dy/distance*movement;}
  if(touching(elapsed*TURN_SPEED)) {
    vanishedAt=elapsed;
    target={...visitor};
  }
}
function advance(now) {
  let remaining=(now-previousTime)/1000;
  previousTime=now;
  // Hidden tabs pause the whole simulation; visible slow frames are subdivided.
  // Combined sword-tip and visitor motion stays below half a CSS pixel per step.
  const maxStep=Math.min(1/240,0.5/(bodySize*1.65+swordScale*1.84*TURN_SPEED));
  while(remaining>0.0000001) {const dt=Math.min(remaining,maxStep);step(dt);remaining-=dt;}
}
function drawMarpan(marpan,p,alpha=1) {
  push();
  drawingContext.globalAlpha=alpha;
  marpan.drawAt(p.x,p.y,{bodyWidth:bodySize,bodyHeight:bodySize*.68,pulse:0,yaw:0});
  pop();
}
function draw() {
  advance(performance.now());
  background('#f5f2e9');
  drawMarpan(centerMarpan,{x:width/2,y:height/2});
  const alpha=vanishedAt===null?1:Math.max(0,1-(elapsed-vanishedAt)/FADE_TIME);
  if(alpha>0) drawMarpan(visitorMarpan,visitor,alpha);
  const points=swordPolygon(elapsed*TURN_SPEED);
  stroke('#55564f');strokeWeight(1.5);strokeJoin(ROUND);fill('#c9cec9');
  beginShape();for(const p of points) vertex(p.x,p.y);endShape(CLOSE);
  // A fine ridge makes the blade's direction legible without a danger halo.
  const c=Math.cos(elapsed*TURN_SPEED),s=Math.sin(elapsed*TURN_SPEED);
  stroke('#f8f9f4');strokeWeight(1);
  line(width/2+c*swordScale*.70,height/2+s*swordScale*.70,
    width/2+c*swordScale*1.70,height/2+s*swordScale*1.70);
}
function windowResized() {
  const oldW=width,oldH=height;
  resizeCanvas(windowWidth,windowHeight);
  layout();
  visitor=bounded({x:visitor.x/oldW*width,y:visitor.y/oldH*height});
  target=bounded({x:target.x/oldW*width,y:target.y/oldH*height});
}
// Do not replay minutes of unseen motion or introduce a tab-resume event.
if(typeof document!=='undefined') document.addEventListener('visibilitychange',()=>{previousTime=performance.now();});
