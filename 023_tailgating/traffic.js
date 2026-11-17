/* Metres and seconds. Fixed-step physics is independent of rendering and camera. */
(function (root) {
  const CONFIG = Object.freeze({
    count: 96, controlled: 5, length: 4.4, gap: 12, speed: 10,
    step: 1 / 120, reaction: 0.72, response: 1.15,
    acceleration: 2, braking: 6, minimumGap: 1.5,
    boost: 1.8, boostDuration: 1.8, restartDelay: 10,
    stopSpeed: 0.25, hold: 3.5,
  });
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  class Traffic {
    constructor() {
      this.time = 0; this.started = false; this.elapsed = 0;
      this.cars = Array.from({ length: CONFIG.count }, (_, i) => ({
        x: -i * (CONFIG.length + CONFIG.gap), v: CONFIG.speed, a: 0,
        brake: false, waiting: 0,
      }));
      this.frames = Math.ceil(CONFIG.reaction / CONFIG.step);
      this.history = Array.from({ length: this.frames }, () => this.snapshot());
      this.cursor = 0;
    }
    snapshot() { return this.cars.map(c => ({ x: c.x, v: c.v })); }
    trigger() { if (this.started) return false; this.started = true; return true; }
    step() {
      const C = CONFIG, dt = C.step;
      this.time += dt;
      if (this.started) this.elapsed += dt;
      const past = this.history[this.cursor];
      for (let i = 0; i < this.cars.length; i++) {
        const c = this.cars[i];
        let a = 0;
        if (i > 0) {
          const gap = past[i - 1].x - past[i].x - C.length;
          // Delayed optimal-velocity response: compression lowers desired speed.
          const desired = C.speed * clamp((gap - C.minimumGap) / (C.gap - C.minimumGap), 0, 1);
          a = C.response * (desired - past[i].v);
          if (c.waiting > 0) { c.waiting -= dt; a = -C.braking; }
        }
        if (this.started && i === C.controlled && this.elapsed < C.boostDuration) a = C.boost;
        c.a = clamp(a, -C.braking, C.acceleration);
        let v = Math.max(0, c.v + c.a * dt);
        let x = c.x + (c.v + v) * .5 * dt;
        if (i > 0) {
          // Immediate physical safety envelope, separate from driver's delayed reaction.
          const leader = this.cars[i - 1];
          const room = leader.x - C.length - C.minimumGap - c.x;
          v = Math.min(v, Math.sqrt(Math.max(0, leader.v ** 2 + 2 * C.braking * Math.max(0, room))));
          x = Math.min(c.x + (c.v + v) * .5 * dt, leader.x - C.length - C.minimumGap);
        }
        if (v < C.stopSpeed && c.v >= C.stopSpeed) c.waiting = C.restartDelay;
        if (c.waiting > 0 && v < C.stopSpeed) v = 0;
        c.brake = c.a < -.65 || v < .1;
        c.x = x; c.v = v;
      }
      this.history[this.cursor] = this.snapshot();
      this.cursor = (this.cursor + 1) % this.frames;
    }
  }
  const api = { CONFIG, Traffic };
  if (typeof module !== 'undefined') module.exports = api;
  else root.Tailgating = api;
})(typeof window === 'undefined' ? globalThis : window);
