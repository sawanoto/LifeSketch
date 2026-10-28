/* Shared by the artwork and the headless verification. Distances: metres; time: seconds. */
(function(root){
'use strict';
const CONFIG = Object.freeze({step:1/120, distance:720, cruise:12, maximum:26,
  acceleration:4, braking:6, boostPerTap:0.19, boostDecay:0.8, tapInterval:0.035,
  tank:100, idle:0.07, rolling:0.007, drag:0.000015, accelerationFuel:0.008,
  tapFuel:0.025, revFuel:0.12, green:8, yellow:2, red:14,
  signals:[{x:200,phase:2},{x:400,phase:4},{x:600,phase:6}]});
function light(index,time){const c=CONFIG,p=(time+c.signals[index].phase)%(c.green+c.yellow+c.red);return p<c.green?'green':p<c.green+c.yellow?'yellow':'red';}
function vehicle(){return {x:0,v:0,a:0,fuel:CONFIG.tank,boost:0,arrival:null,empty:false,waiting:false,passed:0,yellowGo:null,stops:[]};}
function create(){return {time:0,cars:[vehicle(),vehicle()],lastTap:-Infinity,done:false};}
function tap(s){const c=s.cars[0];if(s.done||c.arrival!==null||c.empty||s.time-s.lastTap<CONFIG.tapInterval)return false;s.lastTap=s.time;c.boost=Math.min(1,c.boost+CONFIG.boostPerTap);c.fuel=Math.max(0,c.fuel-(c.waiting?CONFIG.revFuel:CONFIG.tapFuel));return true;}
function step(s){if(s.done)return;const k=CONFIG,dt=k.step;
 s.cars.forEach((c,i)=>{
  if(c.arrival!==null||c.empty)return;
  if(c.fuel<=0){c.empty=true;c.v=0;return;}
  const oldX=c.x,oldV=c.v;let target=k.cruise+(i===0?c.boost*(k.maximum-k.cruise):0),barrier=Infinity;
  if(c.passed<k.signals.length){const n=c.passed,signal=k.signals[n],d=signal.x-c.x,color=light(n,s.time);
   if(color==='yellow'&&c.yellowGo===null)c.yellowGo=d< c.v*c.v/(2*k.braking)+c.v*0.35;
   if(color==='green')c.yellowGo=null;
   if(color==='red'||(color==='yellow'&&!c.yellowGo)) {barrier=signal.x;target=Math.min(target,Math.sqrt(2*k.braking*Math.max(0,d)));}
  }
  c.a=Math.max(-k.braking,Math.min(k.acceleration,(target-c.v)*2));
  c.v=Math.max(0,c.v+c.a*dt);c.x+= (oldV+c.v)*0.5*dt;
  if(c.x>=barrier){c.x=barrier;c.v=0;}
  c.waiting=barrier-c.x<0.08&&c.v<0.3;
  if(c.waiting&&!c.stops.includes(c.passed))c.stops.push(c.passed);
  if(c.passed<k.signals.length&&c.x>k.signals[c.passed].x+0.01){c.passed++;c.yellowGo=null;}
  c.fuel=Math.max(0,c.fuel-dt*(k.idle+k.rolling*c.v+k.drag*c.v**3+k.accelerationFuel*Math.max(0,c.a)*c.v));
  c.boost=Math.max(0,c.boost-k.boostDecay*dt);
  if(c.x>=k.distance){c.arrival=s.time+dt*(k.distance-oldX)/Math.max(0.0001,c.x-oldX);c.x=k.distance;c.v=0;c.waiting=false;}
 });
 s.time+=dt;s.done=s.cars.every(c=>c.arrival!==null||c.empty);
}
const api={CONFIG,light,create,tap,step};if(typeof module!=='undefined')module.exports=api;else root.RushSimulation=api;
})(typeof window!=='undefined'?window:globalThis);
