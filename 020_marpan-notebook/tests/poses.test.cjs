'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const poses = require('../../shared/marpan-poses.js');
const notebook = require('../cover.js');
test('cover has 20 distinct pose/expression pairs in a 5 by 4 grid', () => {
  assert.equal(notebook.characters.length, 20);
  assert.equal(new Set(notebook.characters.map(c => `${c.pose}:${c.expression}`)).size, 20);
  assert.equal(new Set(notebook.characters.map(c => c.x)).size, 5);
  assert.equal(new Set(notebook.characters.map(c => c.y)).size, 4);
  for (const c of notebook.characters) {
    assert.ok(poses.expressions[c.expression]);
    poses.samplePose(c.pose);
  }
});
test('pose samples are independent, deterministic, and support external animation state', () => {
  const before = poses.samplePose('walking');
  const animated = poses.samplePose('walking', { angle: 0.2, dy: -0.1 });
  assert.equal(animated.angle, 0.2);
  animated.yaw = 4;
  assert.deepEqual(poses.samplePose('walking'), before);
  assert.throws(() => poses.samplePose('missing'), RangeError);
  assert.throws(() => poses.samplePose('walking', { angle: NaN }), TypeError);
});
test('registration is discoverable and validates duplicate IDs', () => {
  poses.registerPose('test-wave', { label: 'test', sample: () => ({ angle: 0.1 }) });
  assert.equal(poses.listPoses().at(-1).id, 'test-wave');
  assert.throws(() => poses.registerPose('test-wave', {}));
});
test('all poses preserve the canonical body, and expression never leaks to next draw', () => {
  const calls = [];
  const context = { module: { exports: {} }, Marpan25D: class {
    setExpressionState() {}
    drawAt(x, y, options) { calls.push(options); }
  }, push() {}, pop() {}, translate() {}, rotate() {}, scale() {} };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../../shared/marpan-poses.js'), 'utf8'), context);
  const api = context.module.exports;
  const renderer = new api.Renderer();
  for (const p of api.listPoses()) for (const expression of Object.keys(api.expressions)) {
    renderer.draw({ pose: p.id, expression });
    const call = calls.at(-1);
    assert.equal(call.bodyWidth, 1000);
    assert.equal(call.bodyHeight, 680);
    assert.equal(call.expression, api.expressions[expression].style);
  }
  assert.equal(calls.length, 25);
});
