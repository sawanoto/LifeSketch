// Genetic data is deliberately independent from rendering and behavior. Future
// species can interpret the same sequence differently without changing it.
class MarpanDNA {
  static get LENGTH() { return 128; }

  static createId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    const randomPart = Math.random().toString(36).slice(2);
    return `marpan-${Date.now().toString(36)}-${randomPart}`;
  }

  static fromId(id, length = MarpanDNA.LENGTH) {
    const source = String(id);
    let state = 2166136261;
    for (let i = 0; i < source.length; i++) {
      state ^= source.charCodeAt(i);
      state = Math.imul(state, 16777619);
    }

    const bases = "ATGC";
    let sequence = "";
    for (let i = 0; i < length; i++) {
      // Mulberry32: a compact deterministic PRNG used only to map an ID to DNA.
      state = (state + 0x6D2B79F5) | 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      sequence += bases[(value ^ (value >>> 14)) & 3];
    }
    return sequence;
  }

  static isValid(sequence, length = MarpanDNA.LENGTH) {
    return typeof sequence === "string"
      && sequence.length === length
      && /^[ATGC]+$/.test(sequence);
  }

  static create(options = {}) {
    const id = String(options.id ?? MarpanDNA.createId());
    const dna = MarpanDNA.isValid(options.dna)
      ? options.dna
      : MarpanDNA.fromId(id);
    return { id, dna };
  }
}

class Marpan25D {
  static get EXPRESSION_PRESETS() {
    return {
      normal: [[0, 0], [0, 0], [0, 0]],
      poopingSides: [[0.18, -0.16], [0, 0], [0.18, -0.16]],
      pooping: [[0.18, -0.16], [-0.06, 0.2], [0.18, -0.16]]
    };
  }

  constructor(options = {}) {
    const genetics = MarpanDNA.create(options);
    this.id = genetics.id;
    this.dna = genetics.dna;
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.maxSize = options.maxSize ?? 440;
    this.bodyColor = options.bodyColor ?? "#ffffff";
    this.yaw = options.yaw ?? 0;
    this.lookTargetX = options.lookTargetX ?? this.x;
    this.lookTargetY = options.lookTargetY ?? this.y;
    this.eyeScale = options.eyeScale ?? 1;
    this.expression = options.expression ?? "pupil";
    this.eyeStyles = {};
    this.eyeColors = {};
    this.eyeActive = {};
    this.eyeGlow = {};
    this.fixedEyeOffsets = {};
    this.blinkStartedAt = -9999;
    this.blinkDuration = 190;
    this.blinkingEyeIndices = [0, 1, 2];
    this.pulse = 0;
    this.autoBlinkEnabled = options.autoBlink ?? false;
    this.autoBlinkMin = options.autoBlinkMin ?? 2200;
    this.autoBlinkMax = options.autoBlinkMax ?? 4200;
    this.autoBlinkIndices = options.autoBlinkIndices ?? [0, 1, 2];
    this.nextAutoBlinkAt = 0;
  }

  getGeneticData() { return { id: this.id, dna: this.dna }; }

  setPosition(x, y) { this.x = x; this.y = y; }
  setBodyColor(value) { this.bodyColor = value; }
  setYaw(value) { this.yaw = value; }
  lookAt(x, y) { this.lookTargetX = x; this.lookTargetY = y; }
  setEyeScale(value) { this.eyeScale = max(0.2, value); }
  setExpression(value) { this.expression = value; }
  // Named pupil-only expressions. Eye order is left, center, right.
  setExpressionState(name) {
    const preset = Marpan25D.EXPRESSION_PRESETS[name];
    if (!preset) return false;
    this.expressionState = name;
    this.expression = "pupil";
    preset.forEach(([x, y], index) => this.setPupilOffset(index, x, y));
    return true;
  }
  setPupilOffset(index, pupilX, pupilY) {
    this.fixedEyeOffsets[index] = { x: pupilX, y: pupilY };
  }
  getPupilOffset(index) {
    const offset = this.fixedEyeOffsets[index] ?? { x: 0, y: 0 };
    return { pupilX: offset.x, pupilY: offset.y };
  }
  setEyeExpression(index, value) { this.eyeStyles[index] = value; }
  setEyeStyle(index, style, colorValue = null, active = true, glow = false) {
    this.eyeStyles[index] = style;
    if (colorValue !== null) this.setEyeColor(index, colorValue, active, glow);
  }
  setEyeColor(index, value, active = true, glow = false) {
    this.eyeColors[index] = value;
    this.eyeActive[index] = active;
    this.eyeGlow[index] = glow;
  }
  setFixedEyeOffset(index, x, y) { this.fixedEyeOffsets[index] = { x, y }; }
  clearEyeSettings(index) {
    delete this.eyeStyles[index];
    delete this.eyeColors[index];
    delete this.eyeActive[index];
    delete this.eyeGlow[index];
    delete this.fixedEyeOffsets[index];
  }
  clearAllEyeSettings() {
    this.eyeStyles = {};
    this.eyeColors = {};
    this.eyeActive = {};
    this.eyeGlow = {};
    this.fixedEyeOffsets = {};
  }
  blink(indices = [0, 1, 2], duration = 190) {
    this.blinkingEyeIndices = indices;
    this.blinkDuration = duration;
    this.blinkStartedAt = millis();
  }
  wink(index, duration = 220) { this.blink([index], duration); }
  openEyes() { this.blinkStartedAt = -9999; }
  bounce(amount = 1) { this.pulse = max(this.pulse, amount); }
  enableAutoBlink(minDelay = 2200, maxDelay = 4200) {
    this.autoBlinkEnabled = true;
    this.autoBlinkMin = minDelay;
    this.autoBlinkMax = maxDelay;
    this.nextAutoBlinkAt = millis() + random(minDelay, maxDelay);
  }
  setAutoBlinkIndices(indices = [0, 1, 2]) { this.autoBlinkIndices = indices; }
  disableAutoBlink() { this.autoBlinkEnabled = false; }
  lightEye(index, colorValue = "#121212", glow = false) {
    this.setEyeColor(index, colorValue, true, glow);
  }
  clearLight(index) {
    delete this.eyeColors[index];
    delete this.eyeActive[index];
    delete this.eyeGlow[index];
  }

  getBodyWidth() {
    return min(width * 0.56, height * 0.63, this.maxSize);
  }

  getBodyHeight(bodyW = this.getBodyWidth()) {
    return bodyW * 0.68;
  }

  draw(options = {}) {
    this.pulse *= 0.86;
    this.drawAt(this.x, this.y, { yaw: this.yaw, ...options });
  }

  drawAt(cx, cy, options = {}) {
    this.updateAutoBlink();
    const bodyW = options.bodyWidth ?? this.getBodyWidth();
    const bodyH = options.bodyHeight ?? this.getBodyHeight(bodyW);
    const yaw = options.yaw ?? this.yaw;
    const scaleX = options.scaleX ?? 1;
    const scaleY = options.scaleY ?? 1;
    const pinch = options.pinch ?? 0;
    const bodyColor = options.bodyColor ?? this.bodyColor;
    const lookX = options.lookX ?? this.lookTargetX;
    const lookY = options.lookY ?? this.lookTargetY;
    const dentAmount = constrain(options.dentAmount ?? 0, 0, 1);
    const dentDirectionX = options.dentDirectionX ?? 1;
    const dentDirectionY = options.dentDirectionY ?? 0;
    const lift = (options.pulse ?? this.pulse) * bodyH * 0.028;

    push();
    translate(cx, cy - lift);
    scale(scaleX, scaleY);
    if (dentAmount > 0.001) {
      this.drawDentedBody(0, 0, bodyW, bodyH, pinch, bodyColor, dentDirectionX, dentDirectionY, dentAmount);
      this.beginDentedClip(0, 0, bodyW, bodyH, pinch, dentDirectionX, dentDirectionY, dentAmount);
    } else {
      this.drawBody(0, 0, bodyW, bodyH, pinch, bodyColor);
      this.beginClip(0, 0, bodyW, bodyH, pinch);
    }
    this.drawEyes(0, 0, bodyW, bodyH, yaw, lookX - cx, lookY - cy, options);
    drawingContext.restore();
    pop();
  }

  updateAutoBlink() {
    if (!this.autoBlinkEnabled) return;
    if (this.nextAutoBlinkAt <= 0) {
      this.nextAutoBlinkAt = millis() + random(this.autoBlinkMin, this.autoBlinkMax);
    }
    if (millis() >= this.nextAutoBlinkAt) {
      this.blink(this.autoBlinkIndices);
      this.nextAutoBlinkAt = millis() + random(this.autoBlinkMin, this.autoBlinkMax);
    }
  }

  drawBody(cx, cy, bodyW, bodyH, pinch, bodyColor) {
    const waist = bodyH * 0.2 - pinch * bodyH * 0.05;
    stroke(18);
    strokeWeight(max(4, bodyW * 0.012));
    strokeJoin(ROUND);
    if (bodyColor === null) noFill();
    else fill(bodyColor);
    beginShape();
    vertex(cx, cy - bodyH * 0.5);
    bezierVertex(cx + bodyW * 0.27, cy - bodyH * 0.5, cx + bodyW * 0.5, cy - bodyH * 0.25, cx + bodyW * 0.48, cy + waist);
    bezierVertex(cx + bodyW * 0.46, cy + bodyH * 0.46, cx + bodyW * 0.25, cy + bodyH * 0.5, cx, cy + bodyH * 0.5);
    bezierVertex(cx - bodyW * 0.25, cy + bodyH * 0.5, cx - bodyW * 0.46, cy + bodyH * 0.46, cx - bodyW * 0.48, cy + waist);
    bezierVertex(cx - bodyW * 0.5, cy - bodyH * 0.25, cx - bodyW * 0.26, cy - bodyH * 0.5, cx, cy - bodyH * 0.5);
    endShape(CLOSE);
  }

  beginClip(cx, cy, bodyW, bodyH, pinch) {
    const waist = bodyH * 0.2 - pinch * bodyH * 0.05;
    const context = drawingContext;
    context.save();
    context.beginPath();
    context.moveTo(cx - bodyW * 0.48, cy + waist);
    context.bezierCurveTo(cx - bodyW * 0.5, cy - bodyH * 0.25, cx - bodyW * 0.26, cy - bodyH * 0.5, cx, cy - bodyH * 0.5);
    context.bezierCurveTo(cx + bodyW * 0.27, cy - bodyH * 0.5, cx + bodyW * 0.5, cy - bodyH * 0.25, cx + bodyW * 0.48, cy + waist);
    context.bezierCurveTo(cx + bodyW * 0.46, cy + bodyH * 0.46, cx + bodyW * 0.25, cy + bodyH * 0.5, cx, cy + bodyH * 0.5);
    context.bezierCurveTo(cx - bodyW * 0.25, cy + bodyH * 0.5, cx - bodyW * 0.46, cy + bodyH * 0.46, cx - bodyW * 0.48, cy + waist);
    context.closePath();
    context.clip();
  }

  getDentedOutline(cx, cy, bodyW, bodyH, pinch, directionX, directionY, amount) {
    const waist = bodyH * 0.2 - pinch * bodyH * 0.05;
    const segments = [
      [cx, cy - bodyH * 0.5, cx + bodyW * 0.27, cy - bodyH * 0.5, cx + bodyW * 0.5, cy - bodyH * 0.25, cx + bodyW * 0.48, cy + waist],
      [cx + bodyW * 0.48, cy + waist, cx + bodyW * 0.46, cy + bodyH * 0.46, cx + bodyW * 0.25, cy + bodyH * 0.5, cx, cy + bodyH * 0.5],
      [cx, cy + bodyH * 0.5, cx - bodyW * 0.25, cy + bodyH * 0.5, cx - bodyW * 0.46, cy + bodyH * 0.46, cx - bodyW * 0.48, cy + waist],
      [cx - bodyW * 0.48, cy + waist, cx - bodyW * 0.5, cy - bodyH * 0.25, cx - bodyW * 0.26, cy - bodyH * 0.5, cx, cy - bodyH * 0.5]
    ];
    const directionLength = max(0.0001, sqrt(directionX * directionX + directionY * directionY));
    const ux = directionX / directionLength;
    const uy = directionY / directionLength;
    const depth = bodyW * 0.115 * amount;
    const points = [];

    for (const segment of segments) {
      for (let step = 0; step < 14; step++) {
        const t = step / 14;
        let x = bezierPoint(segment[0], segment[2], segment[4], segment[6], t);
        let y = bezierPoint(segment[1], segment[3], segment[5], segment[7], t);
        const rx = (x - cx) / (bodyW * 0.5);
        const ry = (y - cy) / (bodyH * 0.5);
        const radialLength = max(0.0001, sqrt(rx * rx + ry * ry));
        const facing = (rx / radialLength) * ux + (ry / radialLength) * uy;
        const influence = constrain((facing - 0.52) / 0.48, 0, 1);
        const smoothInfluence = influence * influence * (3 - 2 * influence);
        x -= ux * depth * smoothInfluence;
        y -= uy * depth * smoothInfluence;
        points.push({ x, y });
      }
    }
    return points;
  }

  traceSmoothOutline(context, points) {
    const last = points[points.length - 1];
    const first = points[0];
    context.beginPath();
    context.moveTo((last.x + first.x) * 0.5, (last.y + first.y) * 0.5);
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const next = points[(i + 1) % points.length];
      context.quadraticCurveTo(point.x, point.y, (point.x + next.x) * 0.5, (point.y + next.y) * 0.5);
    }
    context.closePath();
  }

  drawDentedBody(cx, cy, bodyW, bodyH, pinch, bodyColor, directionX, directionY, amount) {
    const points = this.getDentedOutline(cx, cy, bodyW, bodyH, pinch, directionX, directionY, amount);
    stroke(18);
    strokeWeight(max(4, bodyW * 0.012));
    strokeJoin(ROUND);
    if (bodyColor === null) noFill();
    else fill(bodyColor);
    this.traceSmoothOutline(drawingContext, points);
    if (bodyColor !== null) drawingContext.fill();
    drawingContext.stroke();
  }

  beginDentedClip(cx, cy, bodyW, bodyH, pinch, directionX, directionY, amount) {
    const context = drawingContext;
    const points = this.getDentedOutline(cx, cy, bodyW, bodyH, pinch, directionX, directionY, amount);
    context.save();
    this.traceSmoothOutline(context, points);
    context.clip();
  }

  drawEyes(cx, cy, bodyW, bodyH, yaw, lookOffsetX, lookOffsetY, options = {}) {
    const eyeScale = options.eyeScale ?? this.eyeScale;
    const eyeGroupOffsetX = options.eyeGroupOffsetX ?? 0;
    const eyeGroupOffsetY = options.eyeGroupOffsetY ?? 0;
    const baseEyeW = bodyW * 0.135 * 1.42 * eyeScale;
    const baseEyeH = baseEyeW * 1.08;
    const gazeX = constrain(lookOffsetX / (bodyW * 0.5), -1, 1);
    const gazeY = constrain(lookOffsetY / (bodyH * 0.5), -1, 1);
    const blinkAge = millis() - this.blinkStartedAt;
    const blinking = blinkAge >= 0 && blinkAge <= this.blinkDuration;
    const blinkAmount = blinking ? sin(map(blinkAge, 0, this.blinkDuration, 0, PI)) : 0;
    const eyes = [];

    for (let i = 0; i < 3; i++) {
      const longitude = yaw + (i - 1) * 0.44;
      const depth = cos(longitude);
      if (depth <= 0.015) continue;
      eyes.push({
        index: i,
        depth,
        x: cx + sin(longitude) * bodyW * 0.47 + eyeGroupOffsetX,
        y: cy + eyeGroupOffsetY,
        projection: max(0.025, depth)
      });
    }

    eyes.sort((a, b) => a.depth - b.depth || a.index - b.index);
    for (const eye of eyes) {
      const distanceScale = 0.76 + eye.depth * 0.24;
      const eyeW = baseEyeW * distanceScale * eye.projection;
      const eyeH = baseEyeH * distanceScale;
      const style = this.eyeStyles[eye.index] ?? options.expression ?? this.expression;
      const eyeColor = this.eyeColors[eye.index] ?? "#121212";
      const active = this.eyeActive[eye.index] ?? true;
      const fixed = this.fixedEyeOffsets[eye.index];
      const pupilX = fixed ? fixed.x * eyeW : gazeX * eyeW * 0.2;
      const pupilY = fixed ? fixed.y * eyeH : gazeY * eyeH * 0.18;
      const closes = this.blinkingEyeIndices.includes(eye.index) ? blinkAmount : 0;
      const openScale = lerp(1, 0.055, closes);

      push();
      translate(eye.x, eye.y);
      scale(1, openScale);
      if (style === "beak") {
        this.drawBeak(eyeW, eyeH, eyeColor);
        pop();
        continue;
      }
      if (this.eyeGlow[eye.index] && active && openScale > 0.2) {
        drawingContext.shadowColor = eyeColor;
        drawingContext.shadowBlur = eyeW * 0.48;
      }
      stroke(18);
      strokeWeight(max(2, eyeW * 0.045));
      fill(style === "signal" ? (active ? eyeColor : "#3b403c") : 255);
      ellipse(0, 0, eyeW, eyeH);
      drawingContext.shadowBlur = 0;

      if (openScale > 0.18 && style !== "signal") {
        this.drawEyeContent(style, eyeW, eyeH, pupilX, pupilY, eyeColor, eye.index);
      } else if (style === "signal" && active && openScale > 0.18) {
        noStroke(); fill(255, 185);
        ellipse(-eyeW * 0.16, -eyeH * 0.18, eyeW * 0.12);
      }
      pop();
    }
  }

  drawBeak(eyeW, eyeH, colorValue = "#f6e819") {
    const beakW = eyeW * 1.18;
    const beakH = eyeH * 1.08;
    stroke(54, 61, 39);
    strokeWeight(max(2, eyeW * 0.045));
    fill(colorValue);
    beginShape();
    vertex(-beakW * 0.38, -beakH * 0.44);
    bezierVertex(-beakW * 0.08, -beakH * 0.6, beakW * 0.39, -beakH * 0.48, beakW * 0.44, -beakH * 0.1);
    bezierVertex(beakW * 0.49, beakH * 0.24, beakW * 0.2, beakH * 0.5, -beakW * 0.13, beakH * 0.44);
    bezierVertex(-beakW * 0.47, beakH * 0.36, -beakW * 0.56, -beakH * 0.18, -beakW * 0.38, -beakH * 0.44);
    endShape(CLOSE);

    noFill();
    bezier(
      -beakW * 0.47, beakH * 0.02,
      -beakW * 0.22, beakH * 0.08,
      beakW * 0.02, beakH * 0.48,
      beakW * 0.38, beakH * 0.2
    );
  }

  drawLaughMouth(eyeW, eyeH, colorValue = "#121212") {
    const openAmount = 0.86 + (sin(millis() * 0.022) + 1) * 0.12;
    const outerH = eyeH * 0.74 * openAmount;
    const innerH = eyeH * 0.62 * openAmount;

    noStroke();
    fill(colorValue);
    ellipse(0, eyeH * 0.08, eyeW * 0.62, outerH);

    fill(255);
    ellipse(0, eyeH * 0.1, eyeW * 0.51, innerH);
  }

  drawSmugMouth(eyeW, eyeH, colorValue = "#121212") {
    noFill();
    stroke(colorValue);
    strokeWeight(max(3, eyeW * 0.095));
    strokeCap(ROUND);
    arc(0, -eyeH * 0.015, eyeW * 0.62, eyeH * 0.42, 0.08, PI - 0.08);
  }

  drawFearMouth(eyeW, eyeH, colorValue = "#121212") {
    stroke(colorValue);
    strokeWeight(max(3, eyeW * 0.075));
    fill(255);
    ellipse(0, eyeH * 0.065, eyeW * 0.5, eyeW * 0.46);
  }

  drawEyeContent(style, eyeW, eyeH, pupilX, pupilY, eyeColor, index) {
    const ink = eyeColor ?? "#121212";
    if (style === "laugh-mouth") {
      this.drawLaughMouth(eyeW, eyeH, ink);
    } else if (style === "smug-mouth") {
      this.drawSmugMouth(eyeW, eyeH, ink);
    } else if (style === "fear-mouth") {
      this.drawFearMouth(eyeW, eyeH, ink);
    } else if (style === "diamond") {
      const shimmer = 0.88 + sin(millis() * 0.008 + index * 1.7) * 0.12;
      const diamondW = eyeW * 0.48 * shimmer;
      const diamondH = eyeH * 0.48 * shimmer;
      noStroke(); fill(ink);
      beginShape();
      vertex(pupilX, pupilY - diamondH * 0.58);
      vertex(pupilX + diamondW * 0.52, pupilY);
      vertex(pupilX, pupilY + diamondH * 0.58);
      vertex(pupilX - diamondW * 0.52, pupilY);
      endShape(CLOSE);
      fill(255, 225);
      circle(pupilX - diamondW * 0.13, pupilY - diamondH * 0.14, max(2, eyeW * 0.075));
      stroke(ink); strokeWeight(max(1.5, eyeW * 0.035)); strokeCap(ROUND);
      const ray = eyeW * (0.34 + 0.04 * sin(millis() * 0.01 + index));
      line(pupilX, pupilY - ray, pupilX, pupilY - ray * 0.72);
      line(pupilX + ray, pupilY, pupilX + ray * 0.72, pupilY);
      line(pupilX, pupilY + ray, pupilX, pupilY + ray * 0.72);
      line(pupilX - ray, pupilY, pupilX - ray * 0.72, pupilY);
    } else if (style === "surprised") {
      noStroke(); fill(ink);
      ellipse(pupilX, pupilY, eyeW * 0.18, eyeW * 0.18);
      fill(255, 220);
      circle(pupilX - eyeW * 0.025, pupilY - eyeW * 0.025, max(1.5, eyeW * 0.035));
    } else if (style === "laughing") {
      noFill(); stroke(ink); strokeWeight(max(4, eyeW * 0.16)); strokeCap(ROUND);
      arc(0, eyeH * 0.14, eyeW * 0.66, eyeH * 0.52, PI, TWO_PI);
      strokeWeight(max(2, eyeW * 0.055));
      arc(0, eyeH * 0.21, eyeW * 0.38, eyeH * 0.18, PI, TWO_PI);
    } else if (style === "happy") {
      noFill(); stroke(ink); strokeWeight(max(3, eyeW * 0.13)); strokeCap(ROUND);
      arc(0, eyeH * 0.1, eyeW * 0.56, eyeH * 0.44, PI, TWO_PI);
    } else if (style === "sleepy") {
      noStroke(); fill(ink); ellipse(pupilX, pupilY + eyeH * 0.12, eyeW * 0.32, eyeW * 0.28);
      stroke(ink); strokeWeight(max(3, eyeW * 0.1)); strokeCap(ROUND);
      line(-eyeW * 0.27, -eyeH * 0.02, eyeW * 0.27, -eyeH * 0.02);
    } else if (style === "angry") {
      noStroke(); fill(ink); ellipse(pupilX, pupilY + eyeH * 0.09, eyeW * 0.32, eyeW * 0.32);
      const tilt = index === 0 ? 1 : index === 2 ? -1 : 0;
      stroke(ink); strokeWeight(max(3, eyeW * 0.11)); strokeCap(ROUND);
      line(-eyeW * 0.29, -eyeH * (0.08 + tilt * 0.1), eyeW * 0.29, -eyeH * (0.08 - tilt * 0.1));
    } else if (style === "smile") {
      noFill(); stroke(ink); strokeWeight(max(3, eyeW * 0.14)); strokeCap(ROUND);
      arc(pupilX, pupilY - eyeH * 0.05, eyeW * 0.54, eyeH * 0.5, 0, PI);
    } else if (style === "flat") {
      stroke(ink); strokeWeight(max(3, eyeW * 0.11)); strokeCap(ROUND);
      line(pupilX - eyeW * 0.27, pupilY, pupilX + eyeW * 0.27, pupilY);
    } else if (style === "worried") {
      noStroke(); fill(ink);
      ellipse(pupilX, pupilY + eyeH * 0.1, eyeW * 0.29, eyeW * 0.29);
      fill(255, 210);
      circle(pupilX - eyeW * 0.055, pupilY + eyeH * 0.045, max(2, eyeW * 0.055));

      noFill(); stroke(ink); strokeWeight(max(2.5, eyeW * 0.075)); strokeCap(ROUND);
      if (index === 0) {
        line(-eyeW * 0.28, -eyeH * 0.16, eyeW * 0.25, -eyeH * 0.25);
      } else if (index === 2) {
        line(-eyeW * 0.25, -eyeH * 0.25, eyeW * 0.28, -eyeH * 0.16);
      } else {
        line(-eyeW * 0.27, -eyeH * 0.2, eyeW * 0.27, -eyeH * 0.2);
      }
    } else if (style === "crying") {
      noFill();
      stroke(ink);
      strokeWeight(max(3, eyeW * 0.105));
      strokeCap(ROUND);
      strokeJoin(ROUND);
      const halfW = eyeW * 0.22;
      const halfH = eyeH * 0.18;
      if (index === 0) {
        // Screen-left eye: ＞, pointing inward.
        line(-halfW, -halfH, halfW, 0);
        line(halfW, 0, -halfW, halfH);
      } else if (index === 2) {
        // Screen-right eye: ＜, pointing inward.
        line(halfW, -halfH, -halfW, 0);
        line(-halfW, 0, halfW, halfH);
      } else {
        // Center eye: への字.
        line(-halfW, halfH * 0.45, 0, -halfH);
        line(0, -halfH, halfW, halfH * 0.45);
      }
    } else if (style === "shy") {
      const shyX = pupilX * 0.52;
      const shyY = pupilY * 0.35 + eyeH * 0.11;
      noStroke();
      fill(ink);
      ellipse(shyX, shyY, eyeW * 0.27, eyeW * 0.27);
      fill(255, 220);
      circle(shyX - eyeW * 0.048, shyY - eyeW * 0.048, max(2, eyeW * 0.052));

      noFill();
      stroke(ink);
      strokeWeight(max(2.5, eyeW * 0.07));
      strokeCap(ROUND);
      arc(0, -eyeH * 0.01, eyeW * 0.58, eyeH * 0.27, PI + 0.08, TWO_PI - 0.08);
    } else if (style === "suspicious") {
      const sideX = eyeW * 0.13 + pupilX * 0.24;
      const sideY = pupilY * 0.18 + eyeH * 0.055;
      noStroke();
      fill(ink);
      ellipse(sideX, sideY, eyeW * 0.27, eyeW * 0.27);
      fill(255, 215);
      circle(sideX - eyeW * 0.045, sideY - eyeW * 0.045, max(2, eyeW * 0.05));

      stroke(ink);
      strokeWeight(max(3, eyeW * 0.095));
      strokeCap(ROUND);
      const tilt = index === 0 ? -0.065 : index === 2 ? 0.065 : 0.015;
      line(-eyeW * 0.29, -eyeH * (0.09 - tilt), eyeW * 0.29, -eyeH * (0.09 + tilt));
    } else if (style === "flustered") {
      const phase = millis() * 0.006 + index * 1.9;
      const offsetX = index === 0 ? -eyeW * 0.095 : index === 2 ? eyeW * 0.095 : eyeW * 0.035;
      const offsetY = index === 1 ? eyeH * 0.08 : -eyeH * 0.015;
      const restlessX = pupilX * 0.38 + offsetX + sin(phase) * eyeW * 0.035;
      const restlessY = pupilY * 0.28 + offsetY + cos(phase * 1.17) * eyeH * 0.025;

      noStroke();
      fill(ink);
      ellipse(restlessX, restlessY, eyeW * 0.29, eyeW * 0.29);
      fill(255, 220);
      circle(restlessX - eyeW * 0.05, restlessY - eyeW * 0.05, max(2, eyeW * 0.052));

      stroke(ink);
      strokeWeight(max(2.5, eyeW * 0.075));
      strokeCap(ROUND);
      if (index === 0) {
        line(-eyeW * 0.27, -eyeH * 0.12, eyeW * 0.25, -eyeH * 0.2);
      } else if (index === 1) {
        line(-eyeW * 0.24, -eyeH * 0.18, eyeW * 0.27, -eyeH * 0.1);
      } else {
        line(-eyeW * 0.25, -eyeH * 0.2, eyeW * 0.27, -eyeH * 0.11);
      }
    } else if (style === "smug") {
      const proudX = pupilX * 0.2 + eyeW * 0.035;
      const proudY = pupilY * 0.12 + eyeH * 0.045;
      noStroke();
      fill(ink);
      ellipse(proudX, proudY, eyeW * 0.24, eyeW * 0.24);
      fill(255, 215);
      circle(proudX - eyeW * 0.043, proudY - eyeW * 0.043, max(2, eyeW * 0.047));

      stroke(ink);
      strokeWeight(max(3.5, eyeW * 0.115));
      strokeCap(ROUND);
      const lidY = eyeH * 0.005;
      const tilt = index === 0 ? 0.045 : index === 2 ? -0.045 : 0;
      line(-eyeW * 0.3, lidY - eyeH * tilt, eyeW * 0.3, lidY + eyeH * tilt);
    } else if (style === "fearful") {
      const fearX = pupilX * 0.12;
      const fearY = pupilY * 0.12 + eyeH * 0.015;
      noStroke();
      fill(ink);
      ellipse(fearX, fearY, eyeW * 0.16, eyeW * 0.16);
      fill(255, 225);
      circle(fearX - eyeW * 0.026, fearY - eyeW * 0.026, max(1.5, eyeW * 0.032));

      noFill();
      stroke(ink);
      strokeWeight(max(2.5, eyeW * 0.07));
      strokeCap(ROUND);
      if (index === 0) {
        arc(eyeW * 0.02, -eyeH * 0.12, eyeW * 0.6, eyeH * 0.28, PI + 0.18, TWO_PI - 0.04);
      } else if (index === 2) {
        arc(-eyeW * 0.02, -eyeH * 0.12, eyeW * 0.6, eyeH * 0.28, PI + 0.04, TWO_PI - 0.18);
      } else {
        arc(0, -eyeH * 0.13, eyeW * 0.58, eyeH * 0.25, PI + 0.1, TWO_PI - 0.1);
      }
    } else if (style === "confused") {
      stroke(ink);
      strokeCap(ROUND);
      if (index === 0 || index === 2) {
        noFill();
        strokeWeight(max(2.5, eyeW * 0.065));
        beginShape();
        for (let angle = 0; angle <= TWO_PI * 2.5; angle += 0.22) {
          const radius = map(angle, 0, TWO_PI * 2.5, eyeW * 0.03, eyeW * 0.27);
          const direction = index === 0 ? 1 : -1;
          vertex(cos(angle) * radius, sin(angle) * radius * direction);
        }
        endShape();
      } else {
        const driftX = sin(millis() * 0.004) * eyeW * 0.12;
        const driftY = -eyeH * 0.11 + cos(millis() * 0.003) * eyeH * 0.04;
        noStroke();
        fill(ink);
        ellipse(driftX, driftY, eyeW * 0.27, eyeW * 0.27);
        fill(255, 215);
        circle(driftX - eyeW * 0.045, driftY - eyeW * 0.045, max(2, eyeW * 0.05));
      }
    } else {
      noStroke(); fill(ink);
      ellipse(pupilX, pupilY, eyeW * 0.38, eyeW * 0.38);
    }
  }
}
