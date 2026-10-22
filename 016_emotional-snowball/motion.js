/* Distance is measured in stage-short-side units, never frames or elapsed time. */
'use strict';
class SnowballMotion {
  constructor(expression, x, y) {
    Object.assign(this, {expression, x, y, distance:0, angle:0});
  }
  diameter(w, h) {
    const side = Math.min(w, h);
    const initial = Math.min(w * 0.21, h * 0.24, 148);
    // Twelve short-side traversals reach the cap, equally for all expressions.
    return initial + (side * 0.86 - initial) * Math.min(1, this.distance / 12);
  }
  moveTo(x, y, w, h) {
    const nx = Math.max(0, Math.min(w, x));
    const ny = Math.max(0, Math.min(h, y));
    const dx = nx - this.x, dy = ny - this.y;
    const length = Math.hypot(dx, dy);
    if (!length) return;
    const before = this.diameter(w, h);
    const growingLength = Math.min(length, Math.max(0, 12 - this.distance) * Math.min(w, h));
    this.distance += length / Math.min(w, h);
    const after = this.diameter(w, h);
    // Integrate ds/r for a linearly growing radius (independent of event spacing).
    const radians = Math.abs(after - before) < 1e-9 ? 2 * length / before
      : 2 * growingLength * Math.log(after / before) / (after - before)
        + 2 * (length - growingLength) / after;
    this.angle += radians * (dx !== 0 ? Math.sign(dx) : Math.sign(dy));
    this.x = nx; this.y = ny;
  }
}
if (typeof module !== 'undefined') module.exports = SnowballMotion;
