const assert=require('node:assert/strict');
const S=require('./simulation.js');
function run(hz,stopAt=Infinity){const s=S.create();let next=0,catches=new Set();while(!s.done&&s.time<180){if(hz&&s.time>=next&&s.time<stopAt){S.tap(s);next+=1/hz;}S.step(s);const [a,b]=s.cars;if(a.waiting&&b.waiting&&a.passed===b.passed)catches.add(a.passed);for(const c of s.cars){assert(c.fuel>=0);assert(c.v>=0);if(c.waiting)assert(c.v<0.3);}}
assert(s.done);return {hz,stopAt,s,catches:[...catches]};}
const cases=[run(0),run(1),run(6),run(12),run(28),run(6,8)];
assert.deepEqual(cases[0].s.cars[0],cases[0].s.cars[1]);
assert(cases[2].catches.length>=2);assert(cases[2].s.cars[0].arrival!==null);assert(cases[4].s.cars[0].empty);
assert(cases[2].s.cars[0].fuel<cases[0].s.cars[0].fuel);
for(const r of cases){assert.equal(r.s.cars[1].arrival,cases[0].s.cars[1].arrival);}
console.table(cases.map(r=>({taps:r.hz,until:r.stopAt,upper:r.s.cars[0].arrival?.toFixed(2)||'empty',lower:r.s.cars[1].arrival.toFixed(2),upperFuel:(100-r.s.cars[0].fuel).toFixed(2),lowerFuel:(100-r.s.cars[1].fuel).toFixed(2),redStops:r.s.cars[0].stops.join(','),catchUps:r.catches.join(',')})));
// A stopped engine can burn fuel but cannot move through a red light.
const idle=S.create();while(!idle.cars[0].waiting&&idle.time<21)S.step(idle);const car=idle.cars[0];assert(car.waiting);const x=car.x,fuel=car.fuel;for(let j=0;j<120;j++){if(j%10===0)S.tap(idle);S.step(idle);}assert.equal(car.x,x);assert(car.fuel<fuel);
// Yellow: commit only when braking safely is no longer possible.
for(const [distance,speed,go] of [[5,20,true],[80,12,false]]){const s=S.create();s.time=6.1;s.cars[0].x=200-distance;s.cars[0].v=speed;S.step(s);assert.equal(s.cars[0].yellowGo,go);}
// Identical timestamped inputs with 30/60/120 Hz rendering drive the same fixed steps.
function framed(fps){const s=S.create();let ticks=0,nextTap=0;for(let frame=0;frame<80*fps&&!s.done;frame++){const goal=Math.round((frame+1)*120/fps);while(ticks<goal&&!s.done){if(ticks>=nextTap){S.tap(s);nextTap+=20;}S.step(s);ticks++;}}return s;}
assert.deepEqual(framed(30),framed(60));assert.deepEqual(framed(60),framed(120));
// No car crosses an unpassed red stop line.
for(const hz of [0,1,3,6,12]){const s=S.create();let next=0;while(!s.done&&s.time<180){if(hz&&s.time>=next){S.tap(s);next+=1/hz;}const before=s.cars.map(c=>({x:c.x,n:c.passed}));const colors=before.map(c=>c.n<3?S.light(c.n,s.time):null);S.step(s);s.cars.forEach((c,i)=>{if(colors[i]==='red')assert(c.x<=S.CONFIG.signals[before[i].n].x||before[i].x>S.CONFIG.signals[before[i].n].x);});}}
console.log('PASS: deterministic replay, fuel, red lines, yellow decisions, stationary revving, 30/60/120 Hz.');
