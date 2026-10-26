/* global Marpan25D, push, pop, translate, rotate, scale */
'use strict';
// Data and rendering are separate. No clock, random state, or animation loop.
// Angles are radians; offsets are fractions of the canonical body width.
const MarpanPoses = (() => {
  const poses = new Map();
  const expressions = Object.freeze({
    neutral: Object.freeze({ label: '無表情', style: 'pupil' }),
    happy: Object.freeze({ label: '笑顔', style: 'happy' }),
    surprised: Object.freeze({ label: '驚き', style: 'surprised' }),
    confused: Object.freeze({ label: '困惑', style: 'worried' }),
    sleepy: Object.freeze({ label: '眠そう', style: 'sleepy' })
  });
  function registerPose(id, definition) {
    if (typeof id !== 'string' || !id || poses.has(id)) throw new Error(`Invalid or duplicate pose: ${id}`);
    if (!definition.label || typeof definition.sample !== 'function') throw new TypeError('A pose needs label and sample');
    poses.set(id, Object.freeze({ ...definition, id }));
  }
  registerPose('walking', { label: '歩く', description: '進行方向へ少し傾き、重心を前へ。',
    sample: () => ({ angle: -0.15, yaw: 0.16, dx: 0.025, dy: -0.025 }) });
  registerPose('joyful', { label: '喜ぶ', description: '身体を持ち上げ、外へ開く気持ちを視線に。',
    sample: () => ({ angle: 0.08, yaw: 0, dx: 0, dy: -0.12, eyeGroupOffsetY: -20 }) });
  registerPose('sitting', { label: '正面で座る', description: '傾きをなくし、三つの目を正面に揃えて接地。',
    sample: () => ({ angle: 0, yaw: 0, dx: 0, dy: 0 }) });
  registerPose('reclining', { label: '寝転ぶ', description: '身体ごと横へ倒し、低い位置で休む。',
    sample: () => ({ angle: -0.48, yaw: -0.15, dx: 0, dy: 0.055, eyeGroupOffsetY: 18 }) });
  registerPose('tilting', { label: '首をかしげる', description: '首のない身体全体を傾け、視線を少し上へ。',
    sample: () => ({ angle: 0.29, yaw: -0.1, dx: 0, dy: -0.015, eyeGroupOffsetY: -24 }) });

  function samplePose(pose = 'sitting', overrides = {}) {
    const definition = poses.get(pose);
    if (!definition) throw new RangeError(`Unknown pose: ${pose}`);
    const result = { angle: 0, yaw: 0, dx: 0, dy: 0, eyeGroupOffsetY: 0, ...definition.sample(), ...overrides };
    for (const key of ['angle', 'yaw', 'dx', 'dy', 'eyeGroupOffsetY']) {
      if (!Number.isFinite(result[key])) throw new TypeError(`Invalid pose field: ${key}`);
    }
    return result;
  }
  class Renderer {
    constructor() {
      this.character = new Marpan25D({ id: 'marpan-pose-library', autoBlink: false });
      this.character.setExpressionState('normal');
    }
    draw({ x = 0, y = 0, size = 100, pose = 'sitting', expression = 'neutral', rotation = 0,
      mirror = false, state = {} } = {}) {
      for (const value of [x, y, size, rotation]) if (!Number.isFinite(value)) throw new TypeError('Coordinates, size and rotation must be finite');
      if (size <= 0) throw new RangeError('Size must be positive');
      const face = expressions[expression];
      if (!face) throw new RangeError(`Unknown expression: ${expression}`);
      const frame = samplePose(pose, state);
      // Render at 1000 canonical units so shared minimum stroke widths scale
      // consistently from thumbnails through high-resolution exports.
      push();
      try {
        translate(x, y);
        rotate(rotation);
        scale(size / 1000);
        if (mirror) scale(-1, 1);
        translate(frame.dx * 1000, frame.dy * 1000);
        rotate(frame.angle);
        this.character.drawAt(0, 0, { bodyWidth: 1000, bodyHeight: 680,
          yaw: frame.yaw, expression: face.style, eyeGroupOffsetY: frame.eyeGroupOffsetY,
          pulse: 0, lookX: 0, lookY: 0 });
      } finally { pop(); }
    }
  }
  return Object.freeze({ Renderer, expressions, registerPose, samplePose,
    listPoses: () => [...poses.values()] });
})();
if (typeof module !== 'undefined') module.exports = MarpanPoses;
