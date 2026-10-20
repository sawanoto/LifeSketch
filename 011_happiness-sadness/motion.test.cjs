const assert = require('node:assert/strict');
const MoodMotion = require('./motion.js');
for (const dt of [1 / 30, 1 / 60, 1 / 120]) {
  for (const direction of [-1, 1]) {
    const mood = new MoodMotion();
    mood.press(direction);
    let peak = 0;
    for (let t = 0; t < 2; t += dt) {
      mood.step(dt); peak = Math.max(peak, Math.abs(mood.y));
    }
    assert(peak > 0.48 && peak < 0.52);
    assert.equal(mood.y, 0);
    for (let t = 0; t < 30; t += dt) {
      mood.press(direction); mood.step(dt);
      assert(Math.abs(mood.y) <= 0.8);
    }
    assert(Math.abs(mood.y) > 0.79);
    mood.press(-direction); mood.step(0.16);
    assert.equal(Math.sign(mood.v), -direction);
    mood.step(3); assert.equal(mood.y, 0);
    mood.press(direction); mood.step(0.2); mood.release(); mood.step(60);
    assert.equal(mood.y, 0);
  }
}
console.log('Single input, bounds, sustained input, reversal, release and long pause: passed at 30/60/120 fps.');
