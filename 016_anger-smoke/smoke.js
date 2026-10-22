'use strict';
// Seconds, independent of rendering rate. The room retains its own memory.
class SmokeRoom {
  constructor() { this.reset(); }
  reset() { this.anger = 0; this.mass = 0; this.exposure = 0; this.discomfort = 0; this.quiet = 10; }
  tap() { this.anger = Math.min(1, this.anger + 0.16); this.quiet = 0; }
  step(dt) {
    this.quiet += dt;
    if (this.quiet > 1.1) this.anger = Math.max(0, this.anger - dt * 0.055);
    this.mass = Math.max(0, Math.min(1, this.mass + dt * (this.anger * 0.095 - 0.014)));
    // Smoke must first travel along the ceiling and descend to eye level.
    const target = Math.max(0, Math.min(1, (this.mass - 0.16) / 0.68));
    this.exposure += (target - this.exposure) * (1 - Math.exp(-dt / 3));
    this.discomfort += (this.exposure - this.discomfort) * (1 - Math.exp(-dt / (this.exposure > this.discomfort ? 2 : 7)));
  }
  get stage() { return this.discomfort < 0.12 ? 0 : this.discomfort < 0.4 ? 1 : this.discomfort < 0.75 ? 2 : 3; }
}
if (typeof module !== 'undefined') module.exports = SmokeRoom;
