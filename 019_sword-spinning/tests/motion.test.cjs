const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function scene(w=1000,h=700){const c=vm.createContext({width:w,height:h,console});vm.runInContext(fs.readFileSync('019_sword-spinning/sketch.js','utf8'),c);vm.runInContext('layout();spawn()',c);return s=>vm.runInContext(s,c);}
test('idle remains safe for repeated revolutions at desktop and mobile sizes',()=>{
 for(const [w,h] of [[1000,700],[390,844],[844,390],[320,568]]){const run=scene(w,h);assert.equal(run('for(let i=0;i<14400;i++)step(1/240); vanishedAt'),null);assert.equal(run('visitor.x===target.x&&visitor.y===target.y'),true);}
});
test('same reach can be safe or touching depending on blade angle',()=>{const run=scene();run('visitor={x:width/2+bodySize*1.4,y:height/2}');assert.equal(run('touching(0)'),true);assert.equal(run('touching(Math.PI/2)'),false);});
test('contact stops movement, fades, and respawns without resetting rotation',()=>{const run=scene();run('target={x:width/2,y:height/2};for(let i=0;i<1500&&vanishedAt===null;i++)step(1/240)');assert.equal(run('vanishedAt!==null'),true);const x=run('visitor.x');run('for(let i=0;i<100;i++)step(1/240)');assert.equal(run('visitor.x'),x);assert.equal(run('vanishedAt!==null'),true);run('for(let i=0;i<200;i++)step(1/240)');assert.equal(run('vanishedAt'),null);assert.equal(run('visitor.x===width*.16&&elapsed>1'),true);});
test('repeated encounters retain constant angular velocity',()=>{const run=scene();run('for(let cycle=0;cycle<8;cycle++){target={x:width/2,y:height/2};for(let i=0;i<1500;i++)step(1/240)}');assert.equal(run('vanishedAt'),null);assert.ok(Math.abs(run('elapsed*TURN_SPEED')-50*Math.PI*.8)<1e-8);});
