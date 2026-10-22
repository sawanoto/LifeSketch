const {test} = require('node:test');
const assert = require('node:assert/strict');
const Motion = require('../motion.js');
test('growth is independent of direction, expression, and pointer sample spacing, including cap crossing', () => {
  const coarse = new Motion('happy', 0, 0), fine = new Motion('crying', 0, 0);
  for (let i = 0; i < 140; i++) {
    coarse.moveTo(i % 2 ? 0 : 100, 0, 1000, 1000);
    for (let j = 1; j <= 10; j++) fine.moveTo(i % 2 ? 100-j*10 : j*10, 0, 1000, 1000);
    assert(Math.abs(coarse.diameter(1000, 1000) - fine.diameter(1000, 1000)) < 1e-8);
    assert(Math.abs(coarse.angle - fine.angle) < 1e-8);
  }
  assert.equal(coarse.diameter(1000, 1000), 860);
});
test('stationary pointers do nothing; vertical and diagonal movement grow; clamped movement counts actual travel', () => {
  const ball = new Motion('normal', 50, 50);
  ball.moveTo(50, 50, 1000, 1000);
  assert.equal(ball.distance, 0); assert.equal(ball.angle, 0);
  ball.moveTo(50, 150, 1000, 1000);
  assert.equal(ball.distance, .1); assert(ball.angle > 0);
  ball.moveTo(150, 250, 1000, 1000);
  assert(Math.abs(ball.distance - (.1 + Math.SQRT2/10)) < 1e-9);
  const before = ball.angle;
  ball.moveTo(-100, 250, 1000, 1000);
  assert(ball.angle < before); assert.equal(ball.x, 0);
  const stopped = ball.distance;
  ball.moveTo(-200, 250, 1000, 1000);
  assert.equal(ball.distance, stopped);
});
