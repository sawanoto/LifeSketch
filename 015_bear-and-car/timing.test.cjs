const {test} = require('node:test');
const assert = require('node:assert/strict');
const {sample, Clock, CYCLE, BEAR_PASSES} = require('./timing.js');
test('car falls every three seconds and recovers before the next pass', () => {
  assert.equal(sample(2999).carFall, 0);
  for (let i = 1; i < 10000; i++) {
    assert.equal(sample(i*CYCLE+180).carFall, 1);
    assert.equal(sample(i*CYCLE+1350).carFall, 0);
  }
});
test('bear first falls only at pass 1689 and repeats deterministically', () => {
  assert.equal(BEAR_PASSES,1689);
  for(let i=0;i<BEAR_PASSES;i++) assert.equal(sample(i*CYCLE+180).bearFall,0);
  for(let i=1;i<=10;i++) {
    const t=i*CYCLE*BEAR_PASSES;
    assert.equal(sample(t-1).bearFall,0);
    assert.equal(sample(t+180).bearFall,1);
    assert.equal(sample(t+1350).bearFall,0);
    assert.equal(sample(t+CYCLE+180).bearFall,0);
  }
});
test('hidden time is excluded, reset stops and clears elapsed time', () => {
  const clock=new Clock(); clock.running=true;
  clock.tick(0); clock.tick(2000); clock.tick(2010,true);
  clock.tick(9000000,true); clock.tick(9001000); clock.tick(9002000);
  assert.equal(clock.elapsed,3000);
  clock.reset(); clock.tick(9999999); assert.equal(clock.elapsed,0); assert.equal(clock.running,false);
});
