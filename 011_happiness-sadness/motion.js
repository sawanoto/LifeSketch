'use strict';
// Units are body heights. Exact critically damped integration is frame-rate independent.
class MoodMotion {
  constructor() { this.y = 0; this.v = 0; this.direction = 0; this.remaining = 0; }
  press(direction) { this.direction = direction; this.remaining = 0.28; }
  release() { this.remaining = 0; }
  step(dt) {
    while (dt > 0) {
      const active = this.remaining > 0;
      const slice = active ? Math.min(dt, this.remaining) : dt;
      const target = active ? this.direction * 0.8 : 0;
      const omega = 7, offset = this.y - target, c = this.v + omega * offset;
      const decay = Math.exp(-omega * slice);
      this.y = target + (offset + c * slice) * decay;
      this.v = (this.v - omega * c * slice) * decay;
      this.y = Math.max(-0.8, Math.min(0.8, this.y));
      if (active) this.remaining = Math.max(0, this.remaining - slice);
      dt -= slice;
    }
    if (!this.remaining && Math.abs(this.y) < 0.0001 && Math.abs(this.v) < 0.001) this.y = this.v = 0;
    return this.y;
  }
}
if (typeof module !== 'undefined') module.exports = MoodMotion;
