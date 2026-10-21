const { test } = require('node:test');
const assert = require('node:assert/strict');
const SmokeRoom = require('./smoke.js');
function advance(room, seconds, tapping = false, dt = 1 / 60) {
  for (let t = 0; t < seconds; t += dt) { if (tapping) room.tap(); room.step(dt); }
}
test('no smoke before interaction; anger is bounded; exposure follows accumulating smoke', () => {
  const r = new SmokeRoom(); advance(r, 20); assert.equal(r.mass, 0); assert.equal(r.stage, 0);
  r.tap(); advance(r, .5); assert.ok(r.mass > 0); assert.equal(r.stage, 0);
  advance(r, 35, true); assert.equal(r.anger, 1); assert.equal(r.mass, 1); assert.equal(r.stage, 3);
});
test('anger ends before smoke clears, and recovery lags behind the smoke', () => {
  const r = new SmokeRoom(); advance(r, 35, true); advance(r, 22);
  assert.equal(r.anger, 0); assert.ok(r.mass > .5); assert.ok(r.discomfort > .5);
  advance(r, 75); assert.equal(r.mass, 0); assert.ok(r.discomfort > 0);
  advance(r, 45); assert.ok(r.discomfort < .01); assert.equal(r.stage, 0);
  r.reset(); assert.equal(r.mass, 0); assert.equal(r.anger, 0); assert.equal(r.discomfort, 0);
});
test('timing is consistent across mobile and desktop frame rates', () => {
  const a = new SmokeRoom(), b = new SmokeRoom();
  advance(a, 35, true, 1 / 30); advance(b, 35, true, 1 / 120);
  advance(a, 25, false, 1 / 30); advance(b, 25, false, 1 / 120);
  assert.ok(Math.abs(a.mass - b.mass) < .004);
  assert.ok(Math.abs(a.discomfort - b.discomfort) < .004);
});
