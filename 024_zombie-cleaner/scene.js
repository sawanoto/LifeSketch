/* Simulation uses normalized coordinates, independent of canvas size and p5. */
class BalloonScene {
  constructor(rng = Math.random) {
    this.rng = rng;
    this.time = 0;
    this.generation = 1;
    this.phase = 'waiting';
    this.phaseTime = 0;
    this.stuck = null;
    this.birds = [];
  }
  balloon() {
    const rise = this.phase === 'rising' ? Math.min(1, this.phaseTime / 6) : 1;
    const eased = rise * rise * (3 - 2 * rise);
    return { x: .56 + Math.sin(this.time * .35) * .003,
      y: .34 + (1 - eased) * .88 + Math.sin(this.time * .47) * .002 };
  }
  launch() {
    // Exactly one independent collision draw per bird, including during absence.
    const hit = this.rng() < .2;
    this.birds.push({ x: .085, y: .84, age: 0,
      speed: .115 + this.rng() * .025,
      lane: .56 + this.rng() * .08,
      target: hit && this.phase === 'waiting' ? this.generation : null });
  }
  update(dt) {
    this.time += dt;
    this.phaseTime += dt;
    if (this.phase === 'absent' && this.phaseTime >= 1.4) {
      this.phase = 'rising'; this.phaseTime = 0; this.generation++;
    } else if (this.phase === 'rising' && this.phaseTime >= 6) {
      this.phase = 'waiting'; this.phaseTime = 0;
    }
    const balloon = this.balloon();
    for (const bird of this.birds) {
      bird.age += dt;
      if (bird.target !== null && (bird.target !== this.generation || this.phase !== 'waiting')) bird.target = null;
      bird.x += bird.speed * dt;
      if (bird.target !== null) {
        // Contact at the left-hand surface, below the eyes.
        const contactX = balloon.x - .086;
        const t = Math.min(1, (bird.x - .085) / (contactX - .085));
        bird.y = .84 + (balloon.y + .018 - .84) * Math.sin(t * Math.PI / 2);
        if (bird.x >= contactX) {
          bird.dead = true;
          if (!this.stuck) this.stuck = { dx: -.086, dy: .018 };
          else {
            // Atomic disappearance: no transition, sound, or secondary effect.
            this.phase = 'absent'; this.phaseTime = 0; this.stuck = null;
          }
        }
      } else {
        // Smoothly join a passing lane if an in-flight target disappears.
        bird.y += (bird.lane - bird.y) * (1 - Math.exp(-dt * 1.4));
      }
    }
    this.birds = this.birds.filter(bird => !bird.dead && bird.x < 1.08);
  }
}
if (typeof module !== 'undefined') module.exports = BalloonScene;
