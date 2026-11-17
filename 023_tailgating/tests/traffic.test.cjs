const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Traffic, CONFIG: C } = require('../traffic.js');
function advance(s, seconds, check = () => {}) {
  for (let i = 0; i < seconds / C.step; i++) { s.step(); check(); }
}
test('unperturbed traffic keeps uniform speed and spacing', () => {
  const s = new Traffic(); advance(s, 30);
  for (let i = 1; i < C.count; i++) {
    assert.ok(Math.abs(s.cars[i].v - C.speed) < 1e-8);
    assert.ok(Math.abs(s.cars[i - 1].x - s.cars[i].x - C.length - C.gap) < 1e-8);
  }
});
test('one modest acceleration causes a delayed upstream jam without collisions', () => {
  const s = new Traffic(), onsets = new Map();
  assert.equal(s.trigger(), true); assert.equal(s.trigger(), false);
  let peak = 0, queue = 0;
  advance(s, 30, () => {
    peak = Math.max(peak, s.cars[C.controlled].v);
    let run = 0;
    for (let i = 1; i < C.count; i++) {
      const c = s.cars[i];
      assert.ok(s.cars[i - 1].x - c.x - C.length >= C.minimumGap - 1e-8);
      assert.ok(Number.isFinite(c.v) && c.v >= 0);
      if (c.v < 9 && !onsets.has(i)) onsets.set(i, s.elapsed);
      run = c.v === 0 ? run + 1 : 0; queue = Math.max(queue, run);
    }
  });
  assert.ok(peak > C.speed && peak < C.speed * 1.4);
  for (let i = C.controlled; i < C.controlled + 10; i++) assert.ok(onsets.get(i + 1) > onsets.get(i));
  assert.ok(queue >= 9);
  assert.ok(Math.abs(s.cars[C.controlled].v - C.speed) < .01);
});
