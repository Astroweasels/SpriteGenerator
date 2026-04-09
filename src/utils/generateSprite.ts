import type { Color, RandomGenOptions, SpriteFrame, SpriteSheet, AnimationSequence } from '../types';
import type { WeaponType } from './templates';
import { v4 as uuidv4 } from 'uuid';
import { createLayer, pixelKey, createSequence } from './spriteUtils';
import { TEMPLATES, pickRegionColor, getBodyRegion } from './templates';

// ---- Color scheme generators ----

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hslToRgb(h: number, s: number, l: number): Color {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a: 255,
  };
}

function generatePalette(scheme: RandomGenOptions['colorScheme'], count: number): Color[] {
  const colors: Color[] = [];

  switch (scheme) {
    case 'warm': {
      const baseHue = randomInt(0, 60);
      for (let i = 0; i < count; i++) {
        colors.push(hslToRgb(baseHue + randomInt(-20, 20), randomInt(50, 90), randomInt(20, 80)));
      }
      break;
    }
    case 'cool': {
      const baseHue = randomInt(180, 260);
      for (let i = 0; i < count; i++) {
        colors.push(hslToRgb(baseHue + randomInt(-20, 20), randomInt(50, 90), randomInt(20, 80)));
      }
      break;
    }
    case 'monochrome': {
      const hue = randomInt(0, 360);
      for (let i = 0; i < count; i++) {
        colors.push(hslToRgb(hue, randomInt(30, 70), randomInt(15, 85)));
      }
      break;
    }
    case 'complementary': {
      const hue1 = randomInt(0, 360);
      const hue2 = (hue1 + 180) % 360;
      for (let i = 0; i < count; i++) {
        const h = i % 2 === 0 ? hue1 : hue2;
        colors.push(hslToRgb(h + randomInt(-15, 15), randomInt(50, 90), randomInt(25, 75)));
      }
      break;
    }
    case 'earth': {
      const earthHues = [20, 30, 40, 50, 80, 120];
      for (let i = 0; i < count; i++) {
        const hue = earthHues[randomInt(0, earthHues.length - 1)];
        colors.push(hslToRgb(hue + randomInt(-10, 10), randomInt(30, 60), randomInt(20, 60)));
      }
      break;
    }
    case 'neon': {
      for (let i = 0; i < count; i++) {
        colors.push(hslToRgb(randomInt(0, 360), randomInt(90, 100), randomInt(50, 65)));
      }
      break;
    }
    case 'pastel': {
      for (let i = 0; i < count; i++) {
        colors.push(hslToRgb(randomInt(0, 360), randomInt(40, 70), randomInt(70, 90)));
      }
      break;
    }
    default: { // random
      for (let i = 0; i < count; i++) {
        colors.push(hslToRgb(randomInt(0, 360), randomInt(40, 100), randomInt(20, 80)));
      }
      break;
    }
  }

  // Always add a darker shade for outlines
  if (colors.length > 0) {
    const base = colors[0];
    colors.unshift({
      r: Math.max(0, base.r - 80),
      g: Math.max(0, base.g - 80),
      b: Math.max(0, base.b - 80),
      a: 255,
    });
  }

  return colors;
}

// ---- Shape generators ----

function generateHumanoidBody(size: number, complexity: string): boolean[][] {
  const variant = randomInt(0, 2);
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const half = Math.floor(size / 2);
  const cx = half;

  if (variant === 0) {
    // Standard humanoid
    const headTop = Math.floor(size * 0.05);
    const headBot = Math.floor(size * 0.25);
    const headWidth = Math.floor(size * 0.15);
    for (let y = headTop; y <= headBot; y++) {
      for (let x = cx - headWidth; x <= cx + headWidth; x++) {
        if (x >= 0 && x < size) grid[y][x] = true;
      }
    }
    const neckBot = headBot + Math.floor(size * 0.05);
    const neckW = Math.floor(size * 0.06);
    for (let y = headBot; y <= neckBot; y++) {
      for (let x = cx - neckW; x <= cx + neckW; x++) {
        if (x >= 0 && x < size) grid[y][x] = true;
      }
    }
    const torsoBot = Math.floor(size * 0.6);
    const torsoW = Math.floor(size * 0.2);
    for (let y = neckBot; y <= torsoBot; y++) {
      const widthFull = complexity === 'simple' ? torsoW : Math.floor(torsoW * (1 - 0.2 * Math.sin((y - neckBot) / (torsoBot - neckBot) * Math.PI)));
      for (let x = cx - widthFull; x <= cx + widthFull; x++) {
        if (x >= 0 && x < size) grid[y][x] = true;
      }
    }
    const armTop = neckBot + 1;
    const armBot = Math.floor(size * 0.55);
    const armW = Math.max(Math.floor(size * 0.06), 2);
    for (let y = armTop; y <= armBot; y++) {
      const offset = torsoW + 2 + Math.floor((y - armTop) * 0.3);
      for (let dx = 0; dx <= armW; dx++) {
        const lx = cx - offset - dx;
        const rx = cx + offset + dx;
        if (lx >= 0 && lx < size) grid[y][lx] = true;
        if (rx >= 0 && rx < size) grid[y][rx] = true;
      }
    }
    const legTop = torsoBot + 1;
    const legBot = Math.floor(size * 0.95);
    const legW = Math.floor(size * 0.08);
    const legGap = Math.floor(size * 0.04);
    for (let y = legTop; y <= legBot; y++) {
      for (let dx = legGap; dx <= legGap + legW; dx++) {
        const lx = cx - dx;
        const rx = cx + dx;
        if (lx >= 0 && lx < size) grid[y][lx] = true;
        if (rx >= 0 && rx < size) grid[y][rx] = true;
      }
    }
  } else if (variant === 1) {
    // Stocky / dwarf – big head, wide torso, short legs
    const headTop = Math.floor(size * 0.03);
    const headBot = Math.floor(size * 0.28);
    const headWidth = Math.floor(size * 0.18);
    for (let y = headTop; y <= headBot; y++) {
      for (let x = cx - headWidth; x <= cx + headWidth; x++) {
        if (x >= 0 && x < size) grid[y][x] = true;
      }
    }
    const neckBot = headBot + Math.floor(size * 0.03);
    const neckW = Math.floor(size * 0.08);
    for (let y = headBot; y <= neckBot; y++) {
      for (let x = cx - neckW; x <= cx + neckW; x++) {
        if (x >= 0 && x < size) grid[y][x] = true;
      }
    }
    const torsoBot = Math.floor(size * 0.65);
    const torsoW = Math.floor(size * 0.2);
    for (let y = neckBot; y <= torsoBot; y++) {
      const bulge = Math.floor(torsoW * (1 + 0.15 * Math.sin((y - neckBot) / (torsoBot - neckBot) * Math.PI)));
      for (let x = cx - bulge; x <= cx + bulge; x++) {
        if (x >= 0 && x < size) grid[y][x] = true;
      }
    }
    const armTop = neckBot + 1;
    const armBot = Math.floor(size * 0.6);
    const armW = Math.max(Math.floor(size * 0.07), 2);
    for (let y = armTop; y <= armBot; y++) {
      const offset = torsoW + 2 + Math.floor((y - armTop) * 0.2);
      for (let dx = 0; dx <= armW; dx++) {
        const lx = cx - offset - dx;
        const rx = cx + offset + dx;
        if (lx >= 0 && lx < size) grid[y][lx] = true;
        if (rx >= 0 && rx < size) grid[y][rx] = true;
      }
    }
    const legTop = torsoBot + 1;
    const legBot = Math.floor(size * 0.95);
    const legW = Math.floor(size * 0.1);
    const legGap = Math.floor(size * 0.03);
    for (let y = legTop; y <= legBot; y++) {
      for (let dx = legGap; dx <= legGap + legW; dx++) {
        const lx = cx - dx;
        const rx = cx + dx;
        if (lx >= 0 && lx < size) grid[y][lx] = true;
        if (rx >= 0 && rx < size) grid[y][rx] = true;
      }
    }
  } else {
    // Tall / slender – small head, narrow torso, long legs
    const headTop = Math.floor(size * 0.03);
    const headBot = Math.floor(size * 0.18);
    const headWidth = Math.floor(size * 0.11);
    for (let y = headTop; y <= headBot; y++) {
      for (let x = cx - headWidth; x <= cx + headWidth; x++) {
        if (x >= 0 && x < size) grid[y][x] = true;
      }
    }
    const neckBot = headBot + Math.floor(size * 0.06);
    const neckW = Math.floor(size * 0.04);
    for (let y = headBot; y <= neckBot; y++) {
      for (let x = cx - neckW; x <= cx + neckW; x++) {
        if (x >= 0 && x < size) grid[y][x] = true;
      }
    }
    const torsoBot = Math.floor(size * 0.52);
    const torsoW = Math.floor(size * 0.15);
    for (let y = neckBot; y <= torsoBot; y++) {
      const taper = Math.floor(torsoW * (1 - 0.3 * ((y - neckBot) / (torsoBot - neckBot))));
      for (let x = cx - taper; x <= cx + taper; x++) {
        if (x >= 0 && x < size) grid[y][x] = true;
      }
    }
    const armTop = neckBot + 1;
    const armBot = Math.floor(size * 0.52);
    const armW = Math.max(Math.floor(size * 0.05), 2);
    for (let y = armTop; y <= armBot; y++) {
      const offset = torsoW + 2 + Math.floor((y - armTop) * 0.4);
      for (let dx = 0; dx <= armW; dx++) {
        const lx = cx - offset - dx;
        const rx = cx + offset + dx;
        if (lx >= 0 && lx < size) grid[y][lx] = true;
        if (rx >= 0 && rx < size) grid[y][rx] = true;
      }
    }
    const legTop = torsoBot + 1;
    const legBot = Math.floor(size * 0.97);
    const legW = Math.floor(size * 0.06);
    const legGap = Math.floor(size * 0.05);
    for (let y = legTop; y <= legBot; y++) {
      for (let dx = legGap; dx <= legGap + legW; dx++) {
        const lx = cx - dx;
        const rx = cx + dx;
        if (lx >= 0 && lx < size) grid[y][lx] = true;
        if (rx >= 0 && rx < size) grid[y][rx] = true;
      }
    }
  }

  return grid;
}

function generateCreatureBody(size: number, complexity: string): boolean[][] {
  const variant = randomInt(0, 11);
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);

  const fill = (x: number, y: number) => {
    if (x >= 0 && x < size && y >= 0 && y < size) grid[y][x] = true;
  };
  const ellipse = (ex: number, ey: number, rx: number, ry: number) => {
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const dx = (x - ex) / rx, dy = (y - ey) / ry;
        if (dx * dx + dy * dy <= 1) fill(x, y);
      }
  };
  const rect = (x1: number, y1: number, x2: number, y2: number) => {
    for (let y = y1; y <= y2; y++)
      for (let x = x1; x <= x2; x++) fill(x, y);
  };

  switch (variant) {
    case 0: { // Blob with eyes + stubs (original)
      ellipse(cx, cy, Math.floor(size * 0.3), Math.floor(size * 0.25));
      const legCount = complexity === 'simple' ? 2 : complexity === 'complex' ? 6 : 4;
      const legLen = Math.floor(size * 0.12);
      const bodyRx = Math.floor(size * 0.3);
      const spacing = Math.floor((bodyRx * 2) / (legCount + 1));
      for (let i = 1; i <= legCount; i++) {
        const lx = cx - bodyRx + spacing * i;
        for (let dy = 0; dy < legLen; dy++) fill(lx, cy + Math.floor(size * 0.25) + dy);
      }
      if (complexity !== 'simple') {
        const tailLen = Math.floor(size * 0.15);
        for (let i = 0; i < tailLen; i++) fill(cx, cy - Math.floor(size * 0.25) - i);
      }
      break;
    }
    case 1: { // Spider – round body + 8 angular legs
      const r = Math.floor(size * 0.18);
      ellipse(cx, cy, r, r);
      const legLen = Math.floor(size * 0.25);
      for (let side = -1; side <= 1; side += 2) {
        for (let row = 0; row < 4; row++) {
          const startY = cy - r + Math.floor((2 * r) / 5) * (row + 1);
          for (let i = 0; i < legLen; i++) {
            fill(cx + side * (r + i), startY + Math.floor(i * 0.5));
          }
        }
      }
      break;
    }
    case 2: { // Snake – long horizontal body
      const bodyH = Math.max(3, Math.floor(size * 0.1));
      const headR = Math.floor(size * 0.09);
      // Body wave
      for (let x = Math.floor(size * 0.1); x < Math.floor(size * 0.9); x++) {
        const wave = Math.floor(Math.sin((x / size) * Math.PI * 3) * size * 0.06);
        for (let dy = 0; dy < bodyH; dy++) fill(x, cy + wave + dy);
      }
      // Head
      ellipse(Math.floor(size * 0.85), cy, headR, headR);
      break;
    }
    case 3: { // Bird – round body + beak + wings + tail
      ellipse(cx, cy, Math.floor(size * 0.2), Math.floor(size * 0.18));
      // Head
      ellipse(cx, cy - Math.floor(size * 0.25), Math.floor(size * 0.12), Math.floor(size * 0.1));
      // Beak
      const beakY = cy - Math.floor(size * 0.25);
      for (let i = 0; i < Math.floor(size * 0.1); i++) fill(cx + Math.floor(size * 0.12) + i, beakY);
      // Wings
      for (let i = 0; i < Math.floor(size * 0.2); i++) {
        fill(cx - Math.floor(size * 0.2) - i, cy - Math.floor(i * 0.5));
        fill(cx + Math.floor(size * 0.2) + i, cy - Math.floor(i * 0.5));
      }
      // Legs
      for (let dy = 0; dy < Math.floor(size * 0.15); dy++) {
        fill(cx - Math.floor(size * 0.06), cy + Math.floor(size * 0.18) + dy);
        fill(cx + Math.floor(size * 0.06), cy + Math.floor(size * 0.18) + dy);
      }
      break;
    }
    case 4: { // Slime – teardrop
      for (let y = Math.floor(size * 0.2); y < Math.floor(size * 0.85); y++) {
        const t = (y - size * 0.2) / (size * 0.65);
        const w = Math.floor(size * 0.35 * Math.sin(t * Math.PI) * (0.5 + t * 0.5));
        for (let x = cx - w; x <= cx + w; x++) fill(x, y);
      }
      break;
    }
    case 5: { // Dragon – elongated body + wings + horns
      ellipse(cx, cy + Math.floor(size * 0.08), Math.floor(size * 0.22), Math.floor(size * 0.2));
      // Head
      ellipse(cx, cy - Math.floor(size * 0.2), Math.floor(size * 0.13), Math.floor(size * 0.1));
      // Horns
      for (let i = 0; i < Math.floor(size * 0.12); i++) {
        fill(cx - Math.floor(size * 0.08), cy - Math.floor(size * 0.3) - i);
        fill(cx + Math.floor(size * 0.08), cy - Math.floor(size * 0.3) - i);
      }
      // Wings
      for (let i = 0; i < Math.floor(size * 0.3); i++) {
        const wy = cy - Math.floor(i * 0.6);
        fill(cx - Math.floor(size * 0.22) - i, wy);
        fill(cx + Math.floor(size * 0.22) + i, wy);
        if (i % 2 === 0) { fill(cx - Math.floor(size * 0.22) - i, wy + 1); fill(cx + Math.floor(size * 0.22) + i, wy + 1); }
      }
      // Tail
      for (let i = 0; i < Math.floor(size * 0.18); i++) fill(cx + Math.floor(i * 0.3), cy + Math.floor(size * 0.28) + i);
      // Legs
      for (let dy = 0; dy < Math.floor(size * 0.12); dy++) {
        fill(cx - Math.floor(size * 0.1), cy + Math.floor(size * 0.28) + dy);
        fill(cx + Math.floor(size * 0.1), cy + Math.floor(size * 0.28) + dy);
      }
      break;
    }
    case 6: { // Mushroom – cap + stem
      // Cap (half-ellipse)
      for (let y = Math.floor(size * 0.1); y < cy; y++) {
        const t = (y - size * 0.1) / (cy - size * 0.1);
        const w = Math.floor(size * 0.38 * Math.sin(t * Math.PI));
        for (let x = cx - w; x <= cx + w; x++) fill(x, y);
      }
      // Stem
      const stemW = Math.floor(size * 0.1);
      for (let y = cy; y < Math.floor(size * 0.88); y++) {
        fill(cx - stemW, y);
        fill(cx + stemW, y);
        rect(cx - stemW, y, cx + stemW, y);
      }
      break;
    }
    case 7: { // Crab – wide flat body + claws
      ellipse(cx, cy, Math.floor(size * 0.28), Math.floor(size * 0.15));
      // Claws
      const clawR = Math.floor(size * 0.08);
      ellipse(cx - Math.floor(size * 0.38), cy - Math.floor(size * 0.05), clawR, clawR);
      ellipse(cx + Math.floor(size * 0.38), cy - Math.floor(size * 0.05), clawR, clawR);
      // Arms to claws
      for (let i = 0; i < Math.floor(size * 0.1); i++) {
        fill(cx - Math.floor(size * 0.28) - i, cy);
        fill(cx + Math.floor(size * 0.28) + i, cy);
      }
      // Legs
      for (let leg = 0; leg < 3; leg++) {
        const lx = cx - Math.floor(size * 0.2) + leg * Math.floor(size * 0.2);
        for (let dy = 0; dy < Math.floor(size * 0.15); dy++) fill(lx, cy + Math.floor(size * 0.15) + dy);
      }
      break;
    }
    case 8: { // Bat – tiny body + huge wings
      ellipse(cx, cy, Math.floor(size * 0.1), Math.floor(size * 0.12));
      // Head
      ellipse(cx, cy - Math.floor(size * 0.15), Math.floor(size * 0.07), Math.floor(size * 0.06));
      // Ears
      for (let i = 0; i < Math.floor(size * 0.08); i++) {
        fill(cx - Math.floor(size * 0.05), cy - Math.floor(size * 0.21) - i);
        fill(cx + Math.floor(size * 0.05), cy - Math.floor(size * 0.21) - i);
      }
      // Wings (triangular)
      for (let i = 0; i < Math.floor(size * 0.35); i++) {
        const span = Math.floor(i * 0.7);
        for (let dy = 0; dy <= span; dy++) {
          fill(cx - Math.floor(size * 0.1) - i, cy - span + dy * 2);
          fill(cx + Math.floor(size * 0.1) + i, cy - span + dy * 2);
        }
      }
      break;
    }
    case 9: { // Worm / caterpillar – segmented circles
      const segments = complexity === 'simple' ? 3 : complexity === 'complex' ? 7 : 5;
      const segR = Math.floor(size * 0.08);
      for (let i = 0; i < segments; i++) {
        const sx = Math.floor(size * 0.15) + Math.floor((size * 0.7 / segments) * i);
        const sy = cy + Math.floor(Math.sin(i * 0.8) * size * 0.06);
        ellipse(sx, sy, segR, segR);
      }
      // Antennae on first segment
      const headX = Math.floor(size * 0.15);
      for (let i = 0; i < Math.floor(size * 0.08); i++) {
        fill(headX - Math.floor(size * 0.03), cy - segR - i);
        fill(headX + Math.floor(size * 0.03), cy - segR - i);
      }
      break;
    }
    case 10: { // Jellyfish – dome + tentacles
      // Dome (upper half of ellipse)
      for (let y = Math.floor(size * 0.1); y <= cy; y++) {
        const t = (y - size * 0.1) / (cy - size * 0.1);
        const w = Math.floor(size * 0.3 * Math.sin(t * Math.PI * 0.5 + Math.PI * 0.5));
        for (let x = cx - w; x <= cx + w; x++) fill(x, y);
      }
      // Tentacles
      const tentCount = complexity === 'simple' ? 3 : 5;
      const tentLen = Math.floor(size * 0.3);
      const tentSpacing = Math.floor((size * 0.5) / (tentCount + 1));
      for (let t = 1; t <= tentCount; t++) {
        const tx = cx - Math.floor(size * 0.25) + tentSpacing * t;
        for (let i = 0; i < tentLen; i++) {
          const wave = Math.floor(Math.sin(i * 0.5 + t) * size * 0.03);
          fill(tx + wave, cy + 1 + i);
        }
      }
      break;
    }
    case 11: { // Turtle – shell + head + legs
      // Shell (big ellipse)
      ellipse(cx, cy + Math.floor(size * 0.05), Math.floor(size * 0.3), Math.floor(size * 0.2));
      // Head
      ellipse(cx + Math.floor(size * 0.3), cy, Math.floor(size * 0.1), Math.floor(size * 0.08));
      // Legs
      rect(cx - Math.floor(size * 0.2), cy + Math.floor(size * 0.2), cx - Math.floor(size * 0.14), cy + Math.floor(size * 0.32));
      rect(cx + Math.floor(size * 0.14), cy + Math.floor(size * 0.2), cx + Math.floor(size * 0.2), cy + Math.floor(size * 0.32));
      // Tail
      for (let i = 0; i < Math.floor(size * 0.08); i++) fill(cx - Math.floor(size * 0.3) - i, cy + Math.floor(size * 0.05));
      break;
    }
  }

  return grid;
}

function generateMechBody(size: number, _complexity: string): boolean[][] {
  const variant = randomInt(0, 2);
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const cx = Math.floor(size / 2);

  const fillRect = (x1: number, y1: number, x2: number, y2: number) => {
    for (let y = y1; y <= y2; y++)
      for (let x = x1; x <= x2; x++)
        if (x >= 0 && x < size && y >= 0 && y < size) grid[y][x] = true;
  };

  if (variant === 0) {
    // Standard mech – boxy with broad shoulders
    const headSize = Math.floor(size * 0.15);
    const headTop = Math.floor(size * 0.05);
    fillRect(cx - headSize, headTop, cx + headSize, headTop + headSize);
    const torsoTop = headTop + headSize + 1;
    const torsoBot = Math.floor(size * 0.55);
    const torsoW = Math.floor(size * 0.22);
    fillRect(cx - torsoW, torsoTop, cx + torsoW, torsoBot);
    const shoulderW = Math.floor(size * 0.12);
    const shoulderH = Math.floor(size * 0.1);
    fillRect(cx - torsoW - shoulderW, torsoTop, cx - torsoW, torsoTop + shoulderH);
    fillRect(cx + torsoW, torsoTop, cx + torsoW + shoulderW, torsoTop + shoulderH);
    const armTop = torsoTop + shoulderH;
    const armBot = Math.floor(size * 0.6);
    const armW = Math.floor(size * 0.06);
    const armOff = Math.floor(torsoW + shoulderW / 2);
    fillRect(cx - armOff - armW, armTop, cx - armOff, armBot);
    fillRect(cx + armOff, armTop, cx + armOff + armW, armBot);
    const legTop = torsoBot + 1;
    const legBot = Math.floor(size * 0.95);
    const legW = Math.floor(size * 0.1);
    const legGap = Math.floor(size * 0.03);
    fillRect(cx - legGap - legW, legTop, cx - legGap, legBot);
    fillRect(cx + legGap, legTop, cx + legGap + legW, legBot);
    const feetH = 3;
    fillRect(cx - legGap - legW - 2, legBot, cx - legGap + 2, legBot + feetH);
    fillRect(cx + legGap - 2, legBot, cx + legGap + legW + 2, legBot + feetH);
  } else if (variant === 1) {
    // Tank mech – wide low frame, no neck, treads instead of legs
    const headW = Math.floor(size * 0.12);
    const headTop = Math.floor(size * 0.08);
    const headBot = Math.floor(size * 0.2);
    fillRect(cx - headW, headTop, cx + headW, headBot);
    // Wide torso directly below head
    const torsoBot = Math.floor(size * 0.58);
    const torsoW = Math.floor(size * 0.3);
    fillRect(cx - torsoW, headBot, cx + torsoW, torsoBot);
    // Gun barrels on shoulders
    const gunLen = Math.floor(size * 0.15);
    const gunW = Math.floor(size * 0.03);
    fillRect(cx - torsoW - gunLen, headBot, cx - torsoW, headBot + gunW);
    fillRect(cx + torsoW, headBot, cx + torsoW + gunLen, headBot + gunW);
    // Treads (wide rectangles)
    const treadTop = torsoBot + 1;
    const treadBot = Math.floor(size * 0.92);
    const treadW = Math.floor(size * 0.12);
    fillRect(cx - torsoW, treadTop, cx - torsoW + treadW, treadBot);
    fillRect(cx + torsoW - treadW, treadTop, cx + torsoW, treadBot);
    // Connector between treads
    fillRect(cx - Math.floor(size * 0.1), treadTop + 2, cx + Math.floor(size * 0.1), treadBot - 2);
  } else {
    // Sleek mech – narrow angular frame, visor head
    const headH = Math.floor(size * 0.1);
    const headTop = Math.floor(size * 0.06);
    const headW = Math.floor(size * 0.1);
    // Visor (slightly wider than head block)
    fillRect(cx - headW, headTop, cx + headW, headTop + headH);
    fillRect(cx - headW - 2, headTop + Math.floor(headH * 0.4), cx + headW + 2, headTop + Math.floor(headH * 0.7));
    // Narrow torso
    const torsoTop = headTop + headH + 2;
    const torsoBot = Math.floor(size * 0.5);
    const torsoW = Math.floor(size * 0.14);
    for (let y = torsoTop; y <= torsoBot; y++) {
      const t = (y - torsoTop) / (torsoBot - torsoTop);
      const w = Math.floor(torsoW * (1 + t * 0.3));
      fillRect(cx - w, y, cx + w, y);
    }
    // Angular arms
    const armLen = Math.floor(size * 0.25);
    for (let i = 0; i < armLen; i++) {
      const ax = torsoW + 2 + Math.floor(i * 0.4);
      const ay = torsoTop + i;
      if (ay < size) {
        if (cx - ax >= 0) grid[ay][cx - ax] = true;
        if (cx + ax < size) grid[ay][cx + ax] = true;
        if (cx - ax + 1 >= 0) grid[ay][cx - ax + 1] = true;
        if (cx + ax - 1 < size) grid[ay][cx + ax - 1] = true;
      }
    }
    // Long thin legs
    const legTop = torsoBot + 1;
    const legBot = Math.floor(size * 0.93);
    const legW = Math.floor(size * 0.05);
    const legGap = Math.floor(size * 0.05);
    fillRect(cx - legGap - legW, legTop, cx - legGap, legBot);
    fillRect(cx + legGap, legTop, cx + legGap + legW, legBot);
    // Feet – angled
    fillRect(cx - legGap - legW - 3, legBot, cx - legGap + 1, legBot + 2);
    fillRect(cx + legGap - 1, legBot, cx + legGap + legW + 3, legBot + 2);
  }

  return grid;
}

function generateAbstractBody(size: number, complexity: string): boolean[][] {
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);

  // Generate random blobs
  const blobCount = complexity === 'simple' ? 2 : complexity === 'complex' ? 6 : 4;
  for (let b = 0; b < blobCount; b++) {
    const bx = cx + randomInt(-size / 4, size / 4);
    const by = cy + randomInt(-size / 4, size / 4);
    const rx = randomInt(size * 0.08, size * 0.2);
    const ry = randomInt(size * 0.08, size * 0.2);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - bx) / rx;
        const dy = (y - by) / ry;
        if (dx * dx + dy * dy <= 1) grid[y][x] = true;
      }
    }
  }

  return grid;
}

function generateObjectBody(size: number, complexity: string, forceVariant?: number): boolean[][] {
  const variant = forceVariant !== undefined ? forceVariant : randomInt(0, 9);
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const cx = Math.floor(size / 2);

  const fill = (x: number, y: number) => {
    if (x >= 0 && x < size && y >= 0 && y < size) grid[y][x] = true;
  };
  const ellipse = (ex: number, ey: number, rx: number, ry: number) => {
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const dx = (x - ex) / rx, dy = (y - ey) / ry;
        if (dx * dx + dy * dy <= 1) fill(x, y);
      }
  };
  const rect = (x1: number, y1: number, x2: number, y2: number) => {
    for (let y = y1; y <= y2; y++)
      for (let x = x1; x <= x2; x++) fill(x, y);
  };

  switch (variant) {
    case 0: { // Pine tree — triangular canopy + trunk
      const trunkW = Math.max(1, Math.floor(size * 0.06));
      const trunkTop = Math.floor(size * 0.65);
      const trunkBot = Math.floor(size * 0.95);
      rect(cx - trunkW, trunkTop, cx + trunkW, trunkBot);
      // Layered triangle canopy
      const layers = complexity === 'simple' ? 1 : complexity === 'complex' ? 3 : 2;
      for (let l = 0; l < layers; l++) {
        const layerTop = Math.floor(size * (0.05 + l * 0.2));
        const layerBot = Math.floor(size * (0.35 + l * 0.2));
        for (let y = layerTop; y <= layerBot; y++) {
          const t = (y - layerTop) / (layerBot - layerTop);
          const w = Math.floor(size * 0.35 * t);
          for (let x = cx - w; x <= cx + w; x++) fill(x, y);
        }
      }
      break;
    }
    case 1: { // Round tree / oak — circular canopy + trunk
      const trunkW = Math.max(1, Math.floor(size * 0.07));
      const trunkTop = Math.floor(size * 0.55);
      const trunkBot = Math.floor(size * 0.95);
      rect(cx - trunkW, trunkTop, cx + trunkW, trunkBot);
      // Canopy
      const canopyR = Math.floor(size * 0.32);
      const canopyY = Math.floor(size * 0.3);
      ellipse(cx, canopyY, canopyR, Math.floor(canopyR * 0.8));
      if (complexity !== 'simple') {
        ellipse(cx - Math.floor(size * 0.15), canopyY + Math.floor(size * 0.05), Math.floor(canopyR * 0.6), Math.floor(canopyR * 0.5));
        ellipse(cx + Math.floor(size * 0.15), canopyY + Math.floor(size * 0.05), Math.floor(canopyR * 0.6), Math.floor(canopyR * 0.5));
      }
      break;
    }
    case 2: { // Bush — overlapping round shapes on ground
      const baseY = Math.floor(size * 0.55);
      const r = Math.floor(size * 0.22);
      ellipse(cx, baseY, r, r);
      ellipse(cx - Math.floor(size * 0.15), baseY + Math.floor(size * 0.08), Math.floor(r * 0.8), Math.floor(r * 0.7));
      ellipse(cx + Math.floor(size * 0.15), baseY + Math.floor(size * 0.08), Math.floor(r * 0.8), Math.floor(r * 0.7));
      if (complexity !== 'simple') {
        ellipse(cx, baseY - Math.floor(size * 0.12), Math.floor(r * 0.6), Math.floor(r * 0.5));
      }
      break;
    }
    case 3: { // Rock — irregular polygon approximation
      const rockCy = Math.floor(size * 0.55);
      const baseR = Math.floor(size * 0.3);
      // Main mass
      ellipse(cx, rockCy, baseR, Math.floor(baseR * 0.7));
      // Flat bottom
      for (let y = rockCy + Math.floor(baseR * 0.5); y < size; y++)
        for (let x = 0; x < size; x++) grid[y][x] = false;
      // Extra bump on top
      if (complexity !== 'simple') {
        ellipse(cx + Math.floor(size * 0.08), rockCy - Math.floor(size * 0.15), Math.floor(baseR * 0.5), Math.floor(baseR * 0.4));
      }
      break;
    }
    case 4: { // House — rectangular body + triangular roof + door
      const wallLeft = Math.floor(size * 0.15);
      const wallRight = Math.floor(size * 0.85);
      const wallTop = Math.floor(size * 0.4);
      const wallBot = Math.floor(size * 0.9);
      rect(wallLeft, wallTop, wallRight, wallBot);
      // Roof triangle
      const roofTop = Math.floor(size * 0.08);
      for (let y = roofTop; y <= wallTop; y++) {
        const t = (y - roofTop) / (wallTop - roofTop);
        const w = Math.floor((wallRight - wallLeft) / 2 * t + 2);
        for (let x = cx - w; x <= cx + w; x++) fill(x, y);
      }
      // Door
      const doorW = Math.floor(size * 0.08);
      const doorTop = Math.floor(size * 0.65);
      rect(cx - doorW, doorTop, cx + doorW, wallBot);
      // Window (clear out a hole — we just leave it filled, coloring will differentiate)
      if (complexity !== 'simple') {
        const winSize = Math.floor(size * 0.06);
        const winY = Math.floor(size * 0.52);
        rect(wallLeft + Math.floor(size * 0.08), winY - winSize, wallLeft + Math.floor(size * 0.08) + winSize * 2, winY + winSize);
        rect(wallRight - Math.floor(size * 0.08) - winSize * 2, winY - winSize, wallRight - Math.floor(size * 0.08), winY + winSize);
      }
      break;
    }
    case 5: { // Chest / treasure box — rectangular box + lid
      const boxLeft = Math.floor(size * 0.2);
      const boxRight = Math.floor(size * 0.8);
      const boxTop = Math.floor(size * 0.45);
      const boxBot = Math.floor(size * 0.85);
      rect(boxLeft, boxTop, boxRight, boxBot);
      // Lid (rounded top)
      for (let y = Math.floor(size * 0.3); y <= boxTop; y++) {
        const t = (y - size * 0.3) / (boxTop - size * 0.3);
        const squeeze = Math.floor((boxRight - boxLeft) / 2 * (0.85 + 0.15 * t));
        for (let x = cx - squeeze; x <= cx + squeeze; x++) fill(x, y);
      }
      // Lock/clasp
      const lockY = boxTop;
      fill(cx - 1, lockY);
      fill(cx, lockY);
      fill(cx + 1, lockY);
      fill(cx, lockY + 1);
      break;
    }
    case 6: { // Barrel — cylinder approximation
      const barrelTop = Math.floor(size * 0.15);
      const barrelBot = Math.floor(size * 0.9);
      const maxW = Math.floor(size * 0.3);
      for (let y = barrelTop; y <= barrelBot; y++) {
        const t = (y - barrelTop) / (barrelBot - barrelTop);
        const bulge = Math.sin(t * Math.PI);
        const w = Math.floor(maxW * (0.8 + 0.2 * bulge));
        for (let x = cx - w; x <= cx + w; x++) fill(x, y);
      }
      // Rim lines (top and bottom)
      const rimW = Math.floor(maxW * 0.85);
      for (let x = cx - rimW; x <= cx + rimW; x++) {
        fill(x, barrelTop);
        fill(x, barrelTop + 1);
        fill(x, barrelBot);
        fill(x, barrelBot - 1);
      }
      break;
    }
    case 7: { // Potion bottle — spherical body + narrow neck
      const bodyR = Math.floor(size * 0.22);
      const bodyCy = Math.floor(size * 0.6);
      ellipse(cx, bodyCy, bodyR, bodyR);
      // Neck
      const neckW = Math.max(1, Math.floor(size * 0.06));
      const neckTop = Math.floor(size * 0.2);
      const neckBot = bodyCy - bodyR + 2;
      rect(cx - neckW, neckTop, cx + neckW, neckBot);
      // Cork / cap
      const capW = neckW + 1;
      rect(cx - capW, neckTop - 2, cx + capW, neckTop);
      // Flat bottom
      const flatY = bodyCy + bodyR - 2;
      rect(cx - bodyR + 2, flatY, cx + bodyR - 2, Math.floor(size * 0.88));
      break;
    }
    case 8: { // Crystal — angular faceted shape
      const crystalTop = Math.floor(size * 0.08);
      const crystalBot = Math.floor(size * 0.9);
      const mid = Math.floor(size * 0.4);
      const maxW = Math.floor(size * 0.2);
      // Main crystal
      for (let y = crystalTop; y <= crystalBot; y++) {
        let w: number;
        if (y <= mid) {
          const t = (y - crystalTop) / (mid - crystalTop);
          w = Math.floor(maxW * t);
        } else {
          const t = (y - mid) / (crystalBot - mid);
          w = Math.floor(maxW * (1 - t * 0.7));
        }
        for (let x = cx - w; x <= cx + w; x++) fill(x, y);
      }
      // Side crystals for complex
      if (complexity !== 'simple') {
        const sideH = Math.floor(size * 0.35);
        const sideW = Math.floor(size * 0.1);
        const sideBot = Math.floor(size * 0.85);
        for (let y = sideBot - sideH; y <= sideBot; y++) {
          const t = (y - (sideBot - sideH)) / sideH;
          const w = Math.floor(sideW * (t < 0.5 ? t * 2 : 2 - t * 2));
          const offset = Math.floor(size * 0.22);
          for (let dx = -w; dx <= w; dx++) {
            fill(cx - offset + dx, y);
            fill(cx + offset + dx, y);
          }
        }
      }
      break;
    }
    case 9: { // Campfire — logs + flame shape
      // Logs (crossed)
      const logLen = Math.floor(size * 0.3);
      const logY = Math.floor(size * 0.75);
      const logH = Math.max(1, Math.floor(size * 0.04));
      for (let i = 0; i < logLen; i++) {
        for (let h = 0; h < logH; h++) {
          fill(cx - logLen / 2 + i, logY + h + Math.floor(i * 0.15));
          fill(cx - logLen / 2 + i, logY + h - Math.floor(i * 0.15));
        }
      }
      // Flame (teardrop pointing up)
      for (let y = Math.floor(size * 0.15); y < logY; y++) {
        const t = (y - size * 0.15) / (logY - size * 0.15);
        const w = Math.floor(size * 0.2 * Math.sin(t * Math.PI) * (0.3 + t * 0.7));
        for (let x = cx - w; x <= cx + w; x++) fill(x, y);
      }
      break;
    }
  }

  return grid;
}

// ---- Eyes ----

const EYE_WHITE: Color = { r: 255, g: 255, b: 255, a: 255 };
const EYE_PUPIL: Color = { r: 20, g: 20, b: 30, a: 255 };

/** Stamp eyes onto the pixel map after coloring. Works for humanoid/mech/creature.
 *  headDy shifts the eyes vertically to follow head movement in poses. */
function addEyes(
  pixels: Map<string, Color>,
  size: number,
  style: string,
  headDy = 0,
): void {
  const cx = Math.floor(size / 2);

  // Eye placement depends on sprite style
  let eyeY: number;
  let eyeOffset: number;
  let eyeRadius: number;

  if (style === 'humanoid' || style === 'mech') {
    // Eyes sit in the lower-middle of the head (face/skin area)
    const headTop = Math.floor(size * 0.05);
    const headBot = Math.floor(size * 0.25);
    eyeY = Math.floor(headTop + (headBot - headTop) * 0.65) + headDy;
    eyeOffset = Math.max(1, Math.floor(size * 0.06));
    eyeRadius = Math.max(0, Math.floor(size * 0.025));
  } else if (style === 'creature') {
    const cy = Math.floor(size / 2);
    const bodyRy = Math.floor(size * 0.25);
    eyeY = cy - Math.floor(bodyRy * 0.3);
    eyeOffset = Math.max(1, Math.floor(size * 0.1));
    eyeRadius = Math.max(0, Math.floor(size * 0.03));
  } else {
    return; // abstract has no eyes
  }

  // Draw eye dots (white with dark pupil)
  const drawEye = (ex: number, ey: number) => {
    // White surround (for sizes >= 24)
    if (eyeRadius > 0) {
      for (let dy = -eyeRadius; dy <= eyeRadius; dy++) {
        for (let dx = -eyeRadius; dx <= eyeRadius; dx++) {
          if (dx * dx + dy * dy <= eyeRadius * eyeRadius) {
            const px = ex + dx;
            const py = ey + dy;
            if (px >= 0 && px < size && py >= 0 && py < size) {
              pixels.set(pixelKey(px, py), EYE_WHITE);
            }
          }
        }
      }
    }
    // Pupil center
    if (ex >= 0 && ex < size && ey >= 0 && ey < size) {
      pixels.set(pixelKey(ex, ey), EYE_PUPIL);
    }
  };

  const leftEyeX = cx - eyeOffset;
  const rightEyeX = cx + eyeOffset;

  drawEye(leftEyeX, eyeY);
  drawEye(rightEyeX, eyeY);
}

// ---- Coloring ----

function colorizeGrid(
  grid: boolean[][],
  size: number,
  palette: Color[],
  symmetrical: boolean
): Map<string, Color> {
  const pixels = new Map<string, Color>();
  const cx = Math.floor(size / 2);

  // Outline color is first in palette
  const outlineColor = palette[0];
  const bodyColors = palette.slice(1);

  for (let y = 0; y < size; y++) {
    const limit = symmetrical ? cx + 1 : size;
    for (let x = 0; x < limit; x++) {
      if (!grid[y][x]) continue;

      // Check if this is an edge pixel
      const isEdge =
        !grid[y - 1]?.[x] || !grid[y + 1]?.[x] ||
        !grid[y]?.[x - 1] || !grid[y]?.[x + 1];

      const color = isEdge ? outlineColor : bodyColors[randomInt(0, bodyColors.length - 1)];
      pixels.set(pixelKey(x, y), color);

      if (symmetrical && x !== cx) {
        const mirrorX = size - 1 - x;
        pixels.set(pixelKey(mirrorX, y), color);
      }
    }
  }

  return pixels;
}

function colorizeGridWithTemplate(
  grid: boolean[][],
  size: number,
  templateName: string,
  symmetrical: boolean
): Map<string, Color> {
  const template = TEMPLATES[templateName];
  const pixels = new Map<string, Color>();
  const cx = Math.floor(size / 2);

  for (let y = 0; y < size; y++) {
    const limit = symmetrical ? cx + 1 : size;
    for (let x = 0; x < limit; x++) {
      if (!grid[y][x]) continue;

      const isEdge =
        !grid[y - 1]?.[x] || !grid[y + 1]?.[x] ||
        !grid[y]?.[x - 1] || !grid[y]?.[x + 1];

      let color: Color;
      if (isEdge) {
        color = template.outline;
      } else {
        const region = getBodyRegion(x, y, size);
        color = pickRegionColor(template.regions[region]);
      }

      pixels.set(pixelKey(x, y), color);

      if (symmetrical && x !== cx) {
        const mirrorX = size - 1 - x;
        pixels.set(pixelKey(mirrorX, y), color);
      }
    }
  }

  return pixels;
}

// ---- Pose generation ----

function applyPoseToPixels(
  basePixels: Map<string, Color>,
  size: number,
  poseIndex: number,
  style: string
): Map<string, Color> {
  const newPixels = new Map<string, Color>();
  const cx = Math.floor(size / 2);
  const poses = getPoseOffsets(poseIndex, size, style);

  for (const [key, color] of basePixels) {
    const [x, y] = key.split(',').map(Number);

    let dx = 0, dy = 0;
    // Apply pose transformations based on pixel region
    const normalizedY = y / size;
    const normalizedX = (x - cx) / (size / 2);

    for (const pose of poses) {
      let applies = false;
      switch (pose.region) {
        case 'head':
          applies = normalizedY < 0.25;
          break;
        case 'torso':
          applies = normalizedY >= 0.25 && normalizedY < 0.55;
          break;
        case 'leftArm':
          applies = normalizedY >= 0.25 && normalizedY < 0.55 && normalizedX < -0.4;
          break;
        case 'rightArm':
          applies = normalizedY >= 0.25 && normalizedY < 0.55 && normalizedX > 0.4;
          break;
        case 'leftLeg':
          applies = normalizedY >= 0.6 && normalizedX < 0;
          break;
        case 'rightLeg':
          applies = normalizedY >= 0.6 && normalizedX >= 0;
          break;
      }
      if (applies) {
        dx += pose.offsetX;
        dy += pose.offsetY;
      }
    }

    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
      newPixels.set(pixelKey(nx, ny), color);
    }
  }

  return newPixels;
}

function getPoseOffsets(poseIndex: number, size: number, _style: string) {
  const s = Math.max(1, Math.floor(size * 0.05));
  const poseLibrary = [
    // Idle
    [],
    // Walk 1 - left foot forward
    [
      { region: 'leftLeg' as const, offsetX: -s, offsetY: -s },
      { region: 'rightLeg' as const, offsetX: s, offsetY: 0 },
      { region: 'leftArm' as const, offsetX: s, offsetY: 0 },
      { region: 'rightArm' as const, offsetX: -s, offsetY: 0 },
    ],
    // Walk 2 - right foot forward
    [
      { region: 'leftLeg' as const, offsetX: s, offsetY: 0 },
      { region: 'rightLeg' as const, offsetX: -s, offsetY: -s },
      { region: 'leftArm' as const, offsetX: -s, offsetY: 0 },
      { region: 'rightArm' as const, offsetX: s, offsetY: 0 },
    ],
    // Arms up
    [
      { region: 'leftArm' as const, offsetX: -s, offsetY: -s * 2 },
      { region: 'rightArm' as const, offsetX: s, offsetY: -s * 2 },
    ],
    // Crouch
    [
      { region: 'torso' as const, offsetX: 0, offsetY: s },
      { region: 'head' as const, offsetX: 0, offsetY: s },
      { region: 'leftLeg' as const, offsetX: -s, offsetY: s },
      { region: 'rightLeg' as const, offsetX: s, offsetY: s },
    ],
    // Jump
    [
      { region: 'leftLeg' as const, offsetX: -s, offsetY: s },
      { region: 'rightLeg' as const, offsetX: s, offsetY: s },
      { region: 'leftArm' as const, offsetX: -s, offsetY: -s },
      { region: 'rightArm' as const, offsetX: s, offsetY: -s },
      { region: 'head' as const, offsetX: 0, offsetY: -s },
    ],
    // Attack (swing right)
    [
      { region: 'rightArm' as const, offsetX: s * 3, offsetY: -s },
      { region: 'torso' as const, offsetX: s, offsetY: 0 },
    ],
    // Attack (swing left)
    [
      { region: 'leftArm' as const, offsetX: -s * 3, offsetY: -s },
      { region: 'torso' as const, offsetX: -s, offsetY: 0 },
    ],
    // Breathe (shoulders/torso shift up slightly)
    [
      { region: 'torso' as const, offsetX: 0, offsetY: -1 },
      { region: 'head' as const, offsetX: 0, offsetY: -1 },
      { region: 'leftArm' as const, offsetX: 0, offsetY: -1 },
      { region: 'rightArm' as const, offsetX: 0, offsetY: -1 },
    ],
    // Thrust wind-up – pull right arm back
    [
      { region: 'rightArm' as const, offsetX: -s * 2, offsetY: 0 },
      { region: 'torso' as const, offsetX: -s, offsetY: 0 },
    ],
    // Thrust forward – right arm extends far right
    [
      { region: 'rightArm' as const, offsetX: s * 4, offsetY: 0 },
      { region: 'torso' as const, offsetX: s, offsetY: 0 },
    ],
    // Overhead raise – both arms up high
    [
      { region: 'rightArm' as const, offsetX: s, offsetY: -s * 3 },
      { region: 'leftArm' as const, offsetX: -s, offsetY: -s * 3 },
      { region: 'head' as const, offsetX: 0, offsetY: -1 },
    ],
    // Overhead slam – arms brought down
    [
      { region: 'rightArm' as const, offsetX: s * 2, offsetY: s * 2 },
      { region: 'leftArm' as const, offsetX: -s, offsetY: s },
      { region: 'torso' as const, offsetX: 0, offsetY: s },
      { region: 'head' as const, offsetX: 0, offsetY: s },
    ],
  ];

  return poseLibrary[poseIndex % poseLibrary.length];
}

/** Get the head Y offset for a given pose so eyes can follow. */
function getHeadDyForPose(poseIndex: number, size: number, style: string): number {
  const offsets = getPoseOffsets(poseIndex, size, style);
  for (const o of offsets) {
    if (o.region === 'head') return o.offsetY;
  }
  return 0;
}

// ---- Main generation function ----

/** Pose library indices and their sequence grouping */
const POSE_SEQUENCES: { name: string; poseIndices: number[] }[] = [
  // 0=idle, 1=walk1, 2=walk2, 3=arms up, 4=crouch, 5=jump,
  // 6=attack R, 7=attack L, 8=breathe,
  // 9=thrust wind-up, 10=thrust forward, 11=overhead raise, 12=overhead slam
  { name: 'Idle',             poseIndices: [0, 8, 0, 8] },
  { name: 'Walk',             poseIndices: [0, 1, 0, 2] },
  { name: 'Jump',             poseIndices: [4, 5, 0] },
  { name: 'Attack Slash',     poseIndices: [0, 6, 7, 0] },
  { name: 'Attack Thrust',    poseIndices: [0, 9, 10, 0] },
  { name: 'Attack Overhead',  poseIndices: [0, 11, 12, 0] },
];

export const POSE_SEQUENCE_NAMES = POSE_SEQUENCES.map(s => s.name);

export const OBJECT_VARIANTS = [
  { id: 0, name: 'Pine Tree', icon: '🌲' },
  { id: 1, name: 'Oak Tree', icon: '🌳' },
  { id: 2, name: 'Bush', icon: '🌿' },
  { id: 3, name: 'Rock', icon: '🪨' },
  { id: 4, name: 'House', icon: '🏠' },
  { id: 5, name: 'Chest', icon: '📦' },
  { id: 6, name: 'Barrel', icon: '🛢️' },
  { id: 7, name: 'Potion', icon: '🧪' },
  { id: 8, name: 'Crystal', icon: '💎' },
  { id: 9, name: 'Campfire', icon: '🔥' },
] as const;

// ---- Weapon rendering ----

/** Direction the weapon points for a given pose index. */
function getWeaponDirection(poseIndex: number): [number, number] {
  switch (poseIndex) {
    case 6:  return [1, 0];   // attack R – blade right
    case 10: return [1, 0];   // thrust forward – blade right
    case 11: return [0, -1];  // overhead raise – blade up
    default: return [0, 1];   // weapon hangs down
  }
}

/** Draw weapon pixels on top of the posed sprite. */
function addWeapon(
  pixels: Map<string, Color>,
  size: number,
  weapon: WeaponType,
  poseIndex: number,
  accentColors: Color[],
): void {
  if (weapon === 'none') return;

  const cx = Math.floor(size / 2);

  // Get right-arm offset for this pose
  const offsets = getPoseOffsets(poseIndex, size, 'humanoid');
  let armDx = 0, armDy = 0;
  for (const o of offsets) {
    if (o.region === 'rightArm') { armDx += o.offsetX; armDy += o.offsetY; }
  }

  // Hand position (right-arm outer edge, bottom of arm zone)
  const handX = cx + Math.floor(size * 0.22) + armDx;
  const handY = Math.floor(size * 0.50) + armDy;

  const [dirX, dirY] = getWeaponDirection(poseIndex);
  // Perpendicular for crossguards: rotate direction 90°
  const perpX = -dirY;
  const perpY = dirX;

  const metalColor = accentColors[0] ?? { r: 180, g: 180, b: 200, a: 255 };
  const handleColor: Color = { r: 90, g: 60, b: 35, a: 255 };
  const highlight: Color = {
    r: Math.min(255, metalColor.r + 50),
    g: Math.min(255, metalColor.g + 50),
    b: Math.min(255, metalColor.b + 50),
    a: 255,
  };

  const px = (x: number, y: number, c: Color) => {
    if (x >= 0 && x < size && y >= 0 && y < size)
      pixels.set(pixelKey(x, y), c);
  };

  switch (weapon) {
    case 'sword': {
      const len = Math.max(4, Math.floor(size * 0.22));
      // Handle (behind grip)
      px(handX - dirX, handY - dirY, handleColor);
      px(handX - dirX * 2, handY - dirY * 2, handleColor);
      // Crossguard
      px(handX + perpX, handY + perpY, metalColor);
      px(handX - perpX, handY - perpY, metalColor);
      // Blade
      for (let i = 1; i <= len; i++) {
        px(handX + dirX * i, handY + dirY * i, i <= 2 ? highlight : metalColor);
      }
      px(handX + dirX * len, handY + dirY * len, highlight);
      break;
    }
    case 'dagger': {
      const len = Math.max(2, Math.floor(size * 0.12));
      px(handX - dirX, handY - dirY, handleColor);
      px(handX + perpX, handY + perpY, metalColor);
      for (let i = 1; i <= len; i++) {
        px(handX + dirX * i, handY + dirY * i, i === len ? highlight : metalColor);
      }
      break;
    }
    case 'bow': {
      // Bow is always drawn vertically regardless of pose direction
      const bowH = Math.max(4, Math.floor(size * 0.28));
      const half = Math.floor(bowH / 2);
      const stringColor: Color = { r: 200, g: 200, b: 200, a: 255 };
      for (let i = -half; i <= half; i++) {
        const curve = Math.abs(i) <= Math.floor(half / 2) ? 1 : 0;
        px(handX + curve, handY + i, handleColor);
        px(handX - 1, handY + i, stringColor);
      }
      break;
    }
    case 'staff': {
      // Staff is always vertical
      const staffLen = Math.max(6, Math.floor(size * 0.40));
      const upLen = Math.floor(staffLen * 0.6);
      const downLen = staffLen - upLen;
      for (let i = -upLen; i <= downLen; i++) {
        px(handX, handY + i, handleColor);
      }
      // Orb at top
      const orbY = handY - upLen;
      const orbColor: Color = { r: 100, g: 200, b: 255, a: 255 };
      px(handX, orbY, orbColor);
      px(handX - 1, orbY, highlight);
      px(handX + 1, orbY, highlight);
      px(handX, orbY - 1, highlight);
      break;
    }
  }
}

// ---- Frame / sprite assembly ----

function makeFrame(
  name: string,
  basePixels: Map<string, Color>,
  size: number,
  style: string,
  poseIndex: number,
  weapon: WeaponType = 'none',
  weaponColors: Color[] = [],
): SpriteFrame {
  const px = poseIndex === 0
    ? new Map(basePixels)
    : applyPoseToPixels(basePixels, size, poseIndex, style);
  // Eyes follow the head offset for the current pose
  const headDy = getHeadDyForPose(poseIndex, size, style);
  addEyes(px, size, style, headDy);
  // Weapon overlay (only for humanoid templates with a weapon)
  if (weapon !== 'none') {
    addWeapon(px, size, weapon, poseIndex, weaponColors);
  }
  const layer = createLayer('Generated');
  layer.pixels = px;
  return {
    id: uuidv4(),
    name,
    layers: [layer],
    activeLayerId: layer.id,
  };
}

export function generateRandomSprite(options: RandomGenOptions): SpriteSheet {
  const size = options.size;
  const paletteSize = options.complexity === 'simple' ? 4 : options.complexity === 'complex' ? 8 : 6;
  const palette = generatePalette(options.colorScheme, paletteSize);

  // Generate base shape
  let grid: boolean[][];
  switch (options.style) {
    case 'humanoid':
      grid = generateHumanoidBody(size, options.complexity);
      break;
    case 'creature':
      grid = generateCreatureBody(size, options.complexity);
      break;
    case 'mech':
      grid = generateMechBody(size, options.complexity);
      break;
    case 'object':
      grid = generateObjectBody(size, options.complexity, options.objectVariant);
      break;
    default:
      grid = generateAbstractBody(size, options.complexity);
      break;
  }

  // Apply symmetry if requested
  if (options.symmetrical) {
    const cx = Math.floor(size / 2);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < cx; x++) {
        if (grid[y][x]) grid[y][size - 1 - x] = true;
        else if (grid[y][size - 1 - x]) grid[y][x] = true;
      }
    }
  }

  // Colorize
  let basePixels: Map<string, Color>;
  let weapon: WeaponType = 'none';
  let weaponColors: Color[] = [];
  if (options.style !== 'object' && options.template && TEMPLATES[options.template]) {
    basePixels = colorizeGridWithTemplate(grid, size, options.template, options.symmetrical);
    const tmpl = TEMPLATES[options.template];
    weapon = tmpl.weapon;
    weaponColors = tmpl.regions.accent;
  } else {
    basePixels = colorizeGrid(grid, size, palette, options.symmetrical);
  }

  const frames: SpriteFrame[] = [];
  const sequences: AnimationSequence[] = [];

  // Objects are always static — single frame, no poses
  if (options.style === 'object') {
    const frame = makeFrame('Object', basePixels, size, options.style, 0);
    frames.push(frame);
    sequences.push(createSequence('Static', [frame.id]));
  } else {
    const selected = new Set(options.selectedPoses);

    if (selected.size > 0) {
    // Build sequences for each selected pose preset
    for (const seqDef of POSE_SEQUENCES) {
      if (!selected.has(seqDef.name)) continue;
      const seqFrames: SpriteFrame[] = [];
      for (let i = 0; i < seqDef.poseIndices.length; i++) {
        const poseIdx = seqDef.poseIndices[i];
        const frameName = `${seqDef.name} ${i + 1}`;
        const frame = makeFrame(frameName, basePixels, size, options.style, poseIdx, weapon, weaponColors);
        seqFrames.push(frame);
      }
      frames.push(...seqFrames);
      sequences.push(createSequence(seqDef.name, seqFrames.map(f => f.id)));
    }
  } else {
    // Nothing selected — single idle frame
    const idle = makeFrame('Idle', basePixels, size, options.style, 0, weapon, weaponColors);
    frames.push(idle);
    sequences.push(createSequence('Idle', [idle.id]));
  }
  } // end non-object branch

  return {
    frames,
    sequences,
    width: size,
    height: size,
  };
}
