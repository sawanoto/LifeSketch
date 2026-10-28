/* Canvas coordinates are CSS pixels; camera coordinates are world metres. */
(() => {
  const { Traffic, CONFIG: C } = window.Tailgating;
  const VIEW = Object.freeze({ scale: 15, mobileScale: 11, followAfter: 5,
    cameraResponse: 1.4, endingAfter: 25, endingCars: 9 });
  const canvas = document.getElementById('road'), ctx = canvas.getContext('2d');
  const accelerate = document.getElementById('accelerate');
  let sim, camera, width, height, scale, last = null, accumulator = 0;
  let phase, holdTime, frame = 0, finalCamera;
  function reset() {
    cancelAnimationFrame(frame);
    sim = new Traffic(); camera = sim.cars[C.controlled].x;
    phase = 'ready'; holdTime = 0; last = null; accumulator = 0;
    accelerate.disabled = false; accelerate.hidden = false;
    draw(); schedule();
  }
  function start() {
    if (sim.trigger()) { phase = 'running'; accelerate.disabled = true; accelerate.hidden = true; }
  }
  accelerate.addEventListener('click', start);
  document.getElementById('reset').addEventListener('click', reset);
  function resize() {
    width = innerWidth; height = innerHeight; scale = width < 600 ? VIEW.mobileScale : VIEW.scale;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
  }
  function stoppedQueue() {
    let best = [], current = [];
    sim.cars.forEach((c, i) => {
      if (i > C.controlled && c.v === 0) current.push(c);
      else { if (current.length > best.length) best = current; current = []; }
    });
    return current.length > best.length ? current : best;
  }
  function updateCamera(dt) {
    let target = sim.cars[C.controlled].x;
    if (phase === 'ready') { camera = target; return; }
    if (phase === 'hold' || phase === 'ended') target = finalCamera;
    else if (sim.elapsed > VIEW.followAfter) {
      // Follow the measured compression, rather than a scripted timetable.
      let tail = C.controlled;
      for (let i = C.controlled + 1; i < C.count; i++) if (sim.cars[i].v < C.speed * .65) tail = i;
      const focus = Math.max(C.controlled, tail - 2);
      target = sim.cars[focus].x;
    }
    camera += (target - camera) * (1 - Math.exp(-VIEW.cameraResponse * dt));
  }
  function tick(now) {
    frame = 0;
    const dt = last === null ? 0 : Math.min((now - last) / 1000, .1); last = now;
    if (phase === 'hold') {
      holdTime += dt;
      if (holdTime >= C.hold) phase = 'ended';
    } else {
      accumulator += dt;
      while (accumulator >= C.step) { sim.step(); accumulator -= C.step; }
      if (phase === 'running' && sim.elapsed > VIEW.endingAfter) {
        const queue = stoppedQueue();
        if (queue.length >= VIEW.endingCars) {
          finalCamera = (queue[0].x + queue[queue.length - 1].x) / 2;
          // Preserve the naturally formed queue as the final still tableau.
          phase = 'hold'; holdTime = 0;
        }
      }
    }
    updateCamera(dt); draw();
    if (phase !== 'ended') schedule();
  }
  function schedule() { if (!document.hidden && !frame) frame = requestAnimationFrame(tick); }
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frame); frame = 0; last = null;
    if (!document.hidden && phase !== 'ended') schedule();
  });
  function car(c, i, y) {
    const x = (c.x - camera) * scale + width * (width < 600 ? .43 : .57);
    const length = C.length * scale, h = scale * 1.85;
    if (x < -length || x > width + length) return;
    ctx.save(); ctx.translate(x, y);
    // Slight nose dip under braking, with fixed road contact and no overlap.
    ctx.rotate(Math.max(-.025, Math.min(.035, -c.a * .006)));
    ctx.fillStyle = '#514f49';
    for (const wx of [-length * .30, length * .30]) {
      ctx.fillRect(wx - 5, -h * .6, 10, h * 1.2);
    }
    ctx.fillStyle = i === C.controlled ? '#527d89' : '#aaa79b';
    ctx.beginPath(); ctx.roundRect(-length / 2, -h / 2, length, h, 5); ctx.fill();
    ctx.fillStyle = '#e8e6dc';
    ctx.beginPath(); ctx.roundRect(-length * .22, -h * .37, length * .40, h * .74, 3); ctx.fill();
    // Windshield and headlights make rightward orientation visible without arrows.
    ctx.fillStyle = '#737e7c'; ctx.fillRect(length * .13, -h * .32, length * .09, h * .64);
    ctx.fillStyle = '#f4edcf';
    for (const ly of [-h * .34, h * .22]) ctx.fillRect(length / 2 - 3, ly, 3, h * .12);
    ctx.fillStyle = c.brake ? '#ce5145' : '#8f7770';
    for (const ly of [-h * .36, h * .20]) ctx.fillRect(-length / 2, ly, 4, h * .16);
    ctx.restore();
  }
  function draw() {
    if (!sim || !width) return;
    ctx.fillStyle = '#f5f2e9'; ctx.fillRect(0, 0, width, height);
    const y = height * .52, roadHeight = scale * 5.8;
    ctx.fillStyle = '#e8e5dc'; ctx.fillRect(0, y - roadHeight / 2, width, roadHeight);
    ctx.strokeStyle = '#c6c2b5'; ctx.lineWidth = 1;
    for (const side of [-1, 1]) {
      const edge = y + side * (roadHeight / 2 - 7);
      ctx.beginPath(); ctx.moveTo(0, edge); ctx.lineTo(width, edge); ctx.stroke();
      // Fixed roadside seams reveal world motion even while the camera follows cars.
      const spacing = 18 * scale, offset = ((-camera * scale + width * (width < 600 ? .43 : .57)) % spacing + spacing) % spacing;
      ctx.fillStyle = '#c6c2b5';
      for (let x = offset - spacing; x < width; x += spacing) ctx.fillRect(x, edge + side * 12, 2, 8);
    }
    sim.cars.forEach((c, i) => car(c, i, y));
    const selected = sim.cars[C.controlled];
    accelerate.style.left = `${(selected.x - camera) * scale + width * (width < 600 ? .43 : .57) - C.length * scale / 2 - 5}px`;
    accelerate.style.top = `${y - 28}px`;
    accelerate.style.width = `${C.length * scale + 10}px`;
  }
  window.addEventListener('resize', resize);
  reset(); resize();
})();
