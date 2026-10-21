/* 2023 calendar-year totals. See README for the monthly bear aggregation. */
(function (root) {
  const CYCLE = 3000;
  const BEAR_PASSES = Math.round(368273 / 218);
  const smooth = x => x * x * (3 - 2 * x);
  function fall(age) {
    if (age < 0 || age >= 1350) return 0;
    if (age < 180) return smooth(age / 180);
    if (age < 950) return 1;
    return 1 - smooth((age - 950) / 400);
  }
  function sample(elapsed) {
    const pass = Math.floor(elapsed / CYCLE);
    const phase = elapsed % CYCLE;
    const bearAge = elapsed - Math.floor(elapsed / (CYCLE * BEAR_PASSES)) * CYCLE * BEAR_PASSES;
    return { pass, phase, carFall: elapsed >= CYCLE ? fall(phase) : 0,
      bearFall: elapsed >= CYCLE * BEAR_PASSES ? fall(bearAge) : 0 };
  }
  class Clock {
    constructor() { this.reset(); }
    reset() { this.elapsed = 0; this.last = null; this.running = false; }
    tick(now, hidden = false) {
      if (this.running && !hidden && this.last !== null) this.elapsed += Math.max(0, now - this.last);
      this.last = this.running && !hidden ? now : null;
      return this.elapsed;
    }
  }
  const api = { CYCLE, BEAR_PASSES, sample, Clock };
  if (typeof module !== 'undefined') module.exports = api;
  else root.BearCarTiming = api;
})(globalThis);
