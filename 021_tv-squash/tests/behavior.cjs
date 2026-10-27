'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(`${__dirname}/../sketch.js`, 'utf8'), context);
vm.runInContext(`
  launchBall(); launchBall();
  if (balls.length !== 2 || !balls[0].guaranteed || balls[1].guaranteed) throw Error('first/concurrency');
  const first = balls[0];
  for (let leg=0; leg<3; leg++) {
    if (!advanceBall(first, LEG_SECONDS, () => 1) || first.leg !== leg+1) throw Error('first guarantee');
  }
  if (advanceBall(first, LEG_SECONDS, () => 1)) throw Error('must end at left');
`, context);
function run(values) {
  context.values = values;
  return vm.runInContext(`(() => {
    const b={leg:0,progress:0,guaranteed:false}; let i=0;
    while(advanceBall(b,LEG_SECONDS,()=>values[i++])) {}
    return b.leg;
  })()`, context);
}
assert.equal(run([.9]),0); // TV outward loss
assert.equal(run([.1,.9]),1); // Right stays still
assert.equal(run([.1,.1,.9]),2); // TV return loss
assert.equal(run([.1,.1,.1]),3); // Return ends at left
const result = vm.runInContext(`(() => {
  let seed=731, returned=0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<100000;i++) {
    const b={leg:0,progress:0,guaranteed:false};
    advanceBall(b,LEG_SECONDS*4,random);
    if(b.leg===3) returned++;
  }
  return returned;
})()`,context);
assert.ok(result>19000 && result<21000, result);
console.log(`All route/first-ball checks passed; ${result}/100000 returned (${result/1000}%).`);
