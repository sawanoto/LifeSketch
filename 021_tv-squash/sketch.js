/* global Marpan25D */
'use strict';

// Independent gates: 0.8 × 0.5 × 0.5 = 0.2 chance of returning home.
const TV_OUT_REFLECTION = 0.8;
const RIGHT_RETURN = 0.5;
const TV_BACK_REFLECTION = 0.5;
const LEG_SECONDS = 0.85;
let balls = [], throws = 0;
let leftMarpan, rightMarpan, scene, previousTime;

function launchBall() {
  balls.push({leg:0, progress:0, guaranteed:throws++ === 0});
}

// Each ball keeps its identity through all four legs. No replacement on impact.
function advanceBall(ball, seconds, randomValue = Math.random) {
  ball.progress += seconds / LEG_SECONDS;
  while (ball.progress >= 1) {
    ball.progress -= 1;
    if (ball.leg === 3) return false;
    const chance = [TV_OUT_REFLECTION, RIGHT_RETURN, TV_BACK_REFLECTION][ball.leg];
    if (!ball.guaranteed && randomValue() >= chance) return false;
    ball.leg++;
  }
  return true;
}

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('stage');
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  leftMarpan = new Marpan25D({bodyColor:'#fffdf6', autoBlink:false});
  rightMarpan = new Marpan25D({bodyColor:'#fffdf6', autoBlink:false});
  layout();
  previousTime = performance.now();
  canvas.elt.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    advance(performance.now());
    launchBall();
  });
}

function layout() {
  const unit = Math.min(width / 720, height / 640, 1.35);
  const cx = width / 2, cy = height / 2;
  scene = {
    unit,
    left:{x:cx-210*unit, y:cy+140*unit},
    right:{x:cx+210*unit, y:cy+140*unit},
    tv:{x:cx, y:cy-95*unit},
    // The ball touches the front glass, a horizontal wall in this projection.
    impact:{x:cx, y:cy-85*unit},
    size:125*unit,
    radius:Math.max(3, 6*unit)
  };
}
function endpoints(leg) {
  const {left,right,impact} = scene;
  // Symmetric hand positions make the TV reflection preserve horizontal
  // velocity and reverse vertical velocity, on both visits to the glass.
  const a = {x:left.x+scene.size*.36, y:left.y-scene.size*.15};
  const b = {x:right.x-scene.size*.36, y:right.y-scene.size*.15};
  return [[a,impact],[impact,b],[b,impact],[impact,a]][leg];
}
function advance(now) {
  const dt = Math.max(0, (now-previousTime)/1000);
  previousTime = now;
  let retained = 0;
  for (const ball of balls) if (advanceBall(ball, dt)) balls[retained++] = ball;
  balls.length = retained;
}
function drawTV() {
  const {tv,unit:u} = scene;
  push();translate(tv.x,tv.y);scale(u);
  noStroke();fill('#e5e0d5');ellipse(0,72,175,18);
  stroke('#77766e');strokeWeight(2);line(-35,46,-45,68);line(35,46,45,68);
  fill('#aaa99f');rect(-95,-65,190,115,12);
  fill('#d5ddd6');stroke('#666f68');rect(-83,-54,151,91,9);
  noFill();stroke('#eaf0e9');strokeWeight(2);line(-70,-41,50,-41);
  noStroke();fill('#666f68');circle(80,15,6);circle(80,30,6);
  pop();
}
function drawMarpan(marpan, position, yaw) {
  const {size,impact,unit:u} = scene;
  noStroke();fill('#e5e0d5');ellipse(position.x,position.y+size*.34,size*.95,12*u);
  marpan.drawAt(position.x,position.y,{
    bodyWidth:size, bodyHeight:size*.68, pulse:0, yaw,
    lookX:impact.x, lookY:impact.y
  });
}
function draw() {
  advance(performance.now());
  background('#f5f2e9');
  drawTV();
  drawMarpan(leftMarpan,scene.left,.65);
  drawMarpan(rightMarpan,scene.right,-.65);
  // Both characters keep their gaze and pose, regardless of any ball outcome.
  stroke('#9b7554');strokeWeight(Math.max(1,scene.unit));fill('#c99b64');
  for (const ball of balls) {
    const [a,b] = endpoints(ball.leg), t=ball.progress;
    circle(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,scene.radius*2);
  }
}
function windowResized() {
  resizeCanvas(windowWidth,windowHeight);
  layout(); // Normalized leg progress survives orientation changes.
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange',()=>{previousTime=performance.now();});
}
