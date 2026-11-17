/* Exact accumulated mass is separate from its bounded visual representation. */
'use strict';
const TimeBalance = (() => {
  const labels = ['今', '現実', '未来', '空想', '逃避', '妄想', '過去', '悩み'];
  const TAU = Math.PI * 2;
  function logMass(value) {
    if (!value) return 0;
    const digits = value.toString();
    return Math.log(Number(digits.slice(0, 15))) + Math.max(0, digits.length - 15) * Math.LN10;
  }
  function targets(masses) {
    const logs = masses.map(m => m === 0n ? 0 : logMass(m + 1n));
    const normalizer = Math.max(1, ...logs);
    return labels.map((_, i) => {
      let moment = 0;
      for (let j = 0; j < 8; j++) moment += logs[j] / normalizer * Math.cos((i - j) * TAU / 8);
      return 52 * Math.tanh(moment * 0.72);
    });
  }
  function tokens(mass) {
    const digits = mass.toString();
    const result = [];
    for (let i = 0; i < digits.length; i++) {
      const count = Number(digits[digits.length - 1 - i]);
      if (count) result.push({ power: i, count });
    }
    // At extreme magnitudes a single engraved aggregate keeps the tray bounded.
    return result.length > 4 ? [{ total: digits, power: digits.length - 1, count: 1 }] : result;
  }
  return { labels, targets, tokens, angle: seconds => seconds * TAU / 8 };
})();
if (typeof module !== 'undefined') module.exports = TimeBalance;
