/* global MarpanPoses */
'use strict';
const MarpanNotebook = (() => {
  // Same five-position rhythm as the reference; twenty unique pose/face pairs.
  const rows = [
    ['walking:neutral', 'joyful:happy', 'sitting:neutral', 'reclining:sleepy', 'tilting:confused'],
    ['sitting:happy', 'reclining:neutral', 'tilting:happy', 'walking:surprised', 'joyful:surprised'],
    ['tilting:surprised', 'walking:confused', 'joyful:neutral', 'sitting:sleepy', 'reclining:happy'],
    ['joyful:confused', 'sitting:surprised', 'reclining:confused', 'tilting:sleepy', 'walking:happy']
  ];
  const characters = Object.freeze(rows.flatMap((row, r) => row.map((entry, c) => {
    const [pose, expression] = entry.split(':');
    return Object.freeze({ pose, expression, x: 145 + c * 177.5, y: 365 + r * 260,
      size: 125, mirror: (r + c) % 3 === 1, rotation: (r % 2 ? -1 : 1) * (c % 2 ? 0.025 : 0) });
  })));
  function draw(renderer, context, width, height) {
    const factor = Math.min(width / 1000, height / 1414);
    context.save();
    context.translate((width - 1000 * factor) / 2, (height - 1414 * factor) / 2);
    context.scale(factor, factor);
    context.fillStyle = '#48b52c';
    context.fillRect(0, 0, 1000, 1414);
    context.fillStyle = '#fffef6';
    context.font = '400 39px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    // Explicit character placement gives stable tracking without font APIs.
    [...'MAR-PAN'].forEach((letter, i) => context.fillText(letter, 500 + (i - 3) * 47, 170));
    for (const character of characters) {
      context.fillStyle = '#2a882b66';
      context.beginPath();
      context.ellipse(character.x, character.y + 49, 53, 10, 0, 0, Math.PI * 2);
      context.fill();
      renderer.draw(character);
    }
    context.restore();
  }
  return Object.freeze({ characters, draw, width: 2500, height: 3535 });
})();
if (typeof module !== 'undefined') module.exports = MarpanNotebook;
