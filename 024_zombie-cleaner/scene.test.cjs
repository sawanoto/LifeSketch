const { test } = require('node:test');
const assert = require('node:assert/strict');
const BalloonScene = require('./scene.js');
function advance(scene, seconds) {
  for (let i = 0; i < seconds * 120; i++) scene.update(1 / 120);
}
test('independent per-bird probability includes the exact 20% boundary', () => {
  const values = [.19999, 0, 0, .2, 0, 0, .01, 0, 0, .9, 0, 0, .1, 0, 0];
  const scene = new BalloonScene(() => values.shift());
  for (let i = 0; i < 5; i++) scene.launch();
  assert.deepEqual(scene.birds.map(b => b.target), [1, null, 1, null, 1]);
  assert.equal(values.length, 0);
});
test('first bird stays; second removes balloon and both birds in one step; repeats', () => {
  const scene = new BalloonScene(() => 0);
  for (let cycle = 0; cycle < 4; cycle++) {
    scene.launch(); advance(scene, 5);
    assert.ok(scene.stuck); assert.equal(scene.phase, 'waiting');
    advance(scene, 10); assert.ok(scene.stuck);
    scene.launch();
    while (scene.phase !== 'absent') scene.update(1 / 120);
    assert.equal(scene.stuck, null); assert.equal(scene.birds.length, 0);
    advance(scene, 1); assert.equal(scene.phase, 'absent');
    advance(scene, 1); assert.equal(scene.phase, 'rising');
    const y = scene.balloon().y;
    advance(scene, 2); assert.ok(scene.balloon().y < y);
    advance(scene, 5); assert.equal(scene.phase, 'waiting');
  }
});
test('simultaneous hits cancel stale targets; birds during absence/rise leave', () => {
  const scene = new BalloonScene(() => 0);
  for (let i = 0; i < 100; i++) scene.launch();
  advance(scene, 4);
  assert.equal(scene.phase, 'absent');
  assert.equal(scene.birds.length, 98);
  assert.ok(scene.birds.every(b => b.target === null));
  scene.launch(); assert.equal(scene.birds.at(-1).target, null);
  advance(scene, 2); scene.launch(); assert.equal(scene.birds.at(-1).target, null);
  advance(scene, 15);
  assert.equal(scene.birds.length, 0); assert.equal(scene.stuck, null);
  assert.equal(scene.phase, 'waiting');
});
test('non-colliding birds pass below the balloon and leave the screen', () => {
  const scene = new BalloonScene(() => .9);
  for (let i = 0; i < 100; i++) scene.launch();
  advance(scene, 3);
  assert.ok(scene.birds.every(b => b.y > .56));
  advance(scene, 10);
  assert.equal(scene.birds.length, 0); assert.equal(scene.stuck, null);
});
