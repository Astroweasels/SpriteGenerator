import { v4 as uuidv4 } from 'uuid';
import type { Color, GenerateRequest, SpriteFrame, SpriteSheet, WeaponType, RegionColorOverrides } from './types.js';
import { createLayer, pixelKey } from './spriteUtils.js';
import { TEMPLATES, pickRegionColor, getBodyRegion } from './templates.js';

// ---- Helpers ----

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

// ---- Color scheme generators ----

function generatePalette(scheme: GenerateRequest['colorScheme'], count: number): Color[] {
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
    default: {
      for (let i = 0; i < count; i++) {
        colors.push(hslToRgb(randomInt(0, 360), randomInt(40, 100), randomInt(20, 80)));
      }
      break;
    }
  }

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
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const half = Math.floor(size / 2);
  const cx = half;

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
  const armW = Math.floor(size * 0.06);
  for (let y = armTop; y <= armBot; y++) {
    const offset = torsoW + 1 + Math.floor((y - armTop) * 0.3);
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

  return grid;
}

function generateCreatureBody(size: number, complexity: string): boolean[][] {
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);

  const bodyRx = Math.floor(size * 0.3);
  const bodyRy = Math.floor(size * 0.25);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / bodyRx;
      const dy = (y - cy) / bodyRy;
      if (dx * dx + dy * dy <= 1) grid[y][x] = true;
    }
  }

  const eyeY = cy - Math.floor(bodyRy * 0.3);
  const eyeOffset = Math.floor(bodyRx * 0.4);
  grid[eyeY][cx - eyeOffset] = true;
  grid[eyeY][cx + eyeOffset] = true;

  const legCount = complexity === 'simple' ? 2 : complexity === 'complex' ? 6 : 4;
  const legLen = Math.floor(size * 0.12);
  const spacing = Math.floor((bodyRx * 2) / (legCount + 1));
  for (let i = 1; i <= legCount; i++) {
    const lx = cx - bodyRx + spacing * i;
    for (let dy = 0; dy < legLen; dy++) {
      const ly = cy + bodyRy + dy;
      if (ly < size && lx >= 0 && lx < size) grid[ly][lx] = true;
    }
  }

  if (complexity !== 'simple') {
    const tailLen = Math.floor(size * 0.15);
    for (let i = 0; i < tailLen; i++) {
      const ty = cy - bodyRy - i;
      if (ty >= 0) grid[ty][cx] = true;
    }
  }

  return grid;
}

function generateMechBody(size: number, complexity: string): boolean[][] {
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const cx = Math.floor(size / 2);

  const headSize = Math.floor(size * 0.15);
  const headTop = Math.floor(size * 0.05);
  for (let y = headTop; y < headTop + headSize; y++) {
    for (let x = cx - headSize; x <= cx + headSize; x++) {
      if (x >= 0 && x < size) grid[y][x] = true;
    }
  }

  const torsoTop = headTop + headSize + 1;
  const torsoBot = Math.floor(size * 0.55);
  const torsoW = Math.floor(size * 0.22);
  for (let y = torsoTop; y <= torsoBot; y++) {
    for (let x = cx - torsoW; x <= cx + torsoW; x++) {
      if (x >= 0 && x < size) grid[y][x] = true;
    }
  }

  const shoulderW = Math.floor(size * 0.12);
  const shoulderH = Math.floor(size * 0.1);
  for (let y = torsoTop; y < torsoTop + shoulderH; y++) {
    for (let dx = torsoW; dx < torsoW + shoulderW; dx++) {
      const lx = cx - dx;
      const rx = cx + dx;
      if (lx >= 0) grid[y][lx] = true;
      if (rx < size) grid[y][rx] = true;
    }
  }

  const armTop = torsoTop + shoulderH;
  const armBot = Math.floor(size * 0.6);
  const armW = Math.floor(size * 0.06);
  for (let y = armTop; y <= armBot; y++) {
    for (let dx = 0; dx < armW; dx++) {
      const offset = torsoW + shoulderW / 2;
      const lx = cx - Math.floor(offset) - dx;
      const rx = cx + Math.floor(offset) + dx;
      if (lx >= 0) grid[y][lx] = true;
      if (rx < size) grid[y][rx] = true;
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
      if (lx >= 0) grid[y][lx] = true;
      if (rx < size) grid[y][rx] = true;
    }
  }

  const feetH = 3;
  const feetW = legW + 4;
  for (let y = legBot; y < Math.min(legBot + feetH, size); y++) {
    for (let dx = legGap - 2; dx <= legGap + feetW; dx++) {
      const lx = cx - dx;
      const rx = cx + dx;
      if (lx >= 0 && lx < size) grid[y][lx] = true;
      if (rx >= 0 && rx < size) grid[y][rx] = true;
    }
  }

  return grid;
}

function generateAbstractBody(size: number, complexity: string): boolean[][] {
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);

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
    case 0: { // Pine tree
      const trunkW = Math.max(1, Math.floor(size * 0.06));
      const trunkTop = Math.floor(size * 0.65);
      const trunkBot = Math.floor(size * 0.95);
      rect(cx - trunkW, trunkTop, cx + trunkW, trunkBot);
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
    case 1: { // Round tree / oak
      const trunkW = Math.max(1, Math.floor(size * 0.07));
      const trunkTop = Math.floor(size * 0.55);
      const trunkBot = Math.floor(size * 0.95);
      rect(cx - trunkW, trunkTop, cx + trunkW, trunkBot);
      const canopyR = Math.floor(size * 0.32);
      const canopyY = Math.floor(size * 0.3);
      ellipse(cx, canopyY, canopyR, Math.floor(canopyR * 0.8));
      if (complexity !== 'simple') {
        ellipse(cx - Math.floor(size * 0.15), canopyY + Math.floor(size * 0.05), Math.floor(canopyR * 0.6), Math.floor(canopyR * 0.5));
        ellipse(cx + Math.floor(size * 0.15), canopyY + Math.floor(size * 0.05), Math.floor(canopyR * 0.6), Math.floor(canopyR * 0.5));
      }
      break;
    }
    case 2: { // Bush
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
    case 3: { // Rock
      const rockCy = Math.floor(size * 0.55);
      const baseR = Math.floor(size * 0.3);
      ellipse(cx, rockCy, baseR, Math.floor(baseR * 0.7));
      for (let y = rockCy + Math.floor(baseR * 0.5); y < size; y++)
        for (let x = 0; x < size; x++) grid[y][x] = false;
      if (complexity !== 'simple') {
        ellipse(cx + Math.floor(size * 0.08), rockCy - Math.floor(size * 0.15), Math.floor(baseR * 0.5), Math.floor(baseR * 0.4));
      }
      break;
    }
    case 4: { // House
      const wallLeft = Math.floor(size * 0.15);
      const wallRight = Math.floor(size * 0.85);
      const wallTop = Math.floor(size * 0.4);
      const wallBot = Math.floor(size * 0.9);
      rect(wallLeft, wallTop, wallRight, wallBot);
      const roofTop = Math.floor(size * 0.08);
      for (let y = roofTop; y <= wallTop; y++) {
        const t = (y - roofTop) / (wallTop - roofTop);
        const w = Math.floor((wallRight - wallLeft) / 2 * t + 2);
        for (let x = cx - w; x <= cx + w; x++) fill(x, y);
      }
      const doorW = Math.floor(size * 0.08);
      const doorTop = Math.floor(size * 0.65);
      rect(cx - doorW, doorTop, cx + doorW, wallBot);
      if (complexity !== 'simple') {
        const winSize = Math.floor(size * 0.06);
        const winY = Math.floor(size * 0.52);
        rect(wallLeft + Math.floor(size * 0.08), winY - winSize, wallLeft + Math.floor(size * 0.08) + winSize * 2, winY + winSize);
        rect(wallRight - Math.floor(size * 0.08) - winSize * 2, winY - winSize, wallRight - Math.floor(size * 0.08), winY + winSize);
      }
      break;
    }
    case 5: { // Chest
      const boxLeft = Math.floor(size * 0.2);
      const boxRight = Math.floor(size * 0.8);
      const boxTop = Math.floor(size * 0.45);
      const boxBot = Math.floor(size * 0.85);
      rect(boxLeft, boxTop, boxRight, boxBot);
      for (let y = Math.floor(size * 0.3); y <= boxTop; y++) {
        const t = (y - size * 0.3) / (boxTop - size * 0.3);
        const squeeze = Math.floor((boxRight - boxLeft) / 2 * (0.85 + 0.15 * t));
        for (let x = cx - squeeze; x <= cx + squeeze; x++) fill(x, y);
      }
      fill(cx - 1, boxTop);
      fill(cx, boxTop);
      fill(cx + 1, boxTop);
      fill(cx, boxTop + 1);
      break;
    }
    case 6: { // Barrel
      const barrelTop = Math.floor(size * 0.15);
      const barrelBot = Math.floor(size * 0.9);
      const maxW = Math.floor(size * 0.3);
      for (let y = barrelTop; y <= barrelBot; y++) {
        const t = (y - barrelTop) / (barrelBot - barrelTop);
        const bulge = Math.sin(t * Math.PI);
        const w = Math.floor(maxW * (0.8 + 0.2 * bulge));
        for (let x = cx - w; x <= cx + w; x++) fill(x, y);
      }
      const rimW = Math.floor(maxW * 0.85);
      for (let x = cx - rimW; x <= cx + rimW; x++) {
        fill(x, barrelTop); fill(x, barrelTop + 1);
        fill(x, barrelBot); fill(x, barrelBot - 1);
      }
      break;
    }
    case 7: { // Potion bottle
      const bodyR = Math.floor(size * 0.22);
      const bodyCy = Math.floor(size * 0.6);
      ellipse(cx, bodyCy, bodyR, bodyR);
      const neckW = Math.max(1, Math.floor(size * 0.06));
      const neckTop = Math.floor(size * 0.2);
      const neckBot = bodyCy - bodyR + 2;
      rect(cx - neckW, neckTop, cx + neckW, neckBot);
      const capW = neckW + 1;
      rect(cx - capW, neckTop - 2, cx + capW, neckTop);
      const flatY = bodyCy + bodyR - 2;
      rect(cx - bodyR + 2, flatY, cx + bodyR - 2, Math.floor(size * 0.88));
      break;
    }
    case 8: { // Crystal
      const crystalTop = Math.floor(size * 0.08);
      const crystalBot = Math.floor(size * 0.9);
      const mid = Math.floor(size * 0.4);
      const maxW = Math.floor(size * 0.2);
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
    case 9: { // Campfire
      const logLen = Math.floor(size * 0.3);
      const logY = Math.floor(size * 0.75);
      const logH = Math.max(1, Math.floor(size * 0.04));
      for (let i = 0; i < logLen; i++) {
        for (let h = 0; h < logH; h++) {
          fill(cx - logLen / 2 + i, logY + h + Math.floor(i * 0.15));
          fill(cx - logLen / 2 + i, logY + h - Math.floor(i * 0.15));
        }
      }
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

// ---- Coloring ----

function colorizeGrid(
  grid: boolean[][],
  size: number,
  palette: Color[],
  symmetrical: boolean
): Map<string, Color> {
  const pixels = new Map<string, Color>();
  const cx = Math.floor(size / 2);

  const outlineColor = palette[0];
  const bodyColors = palette.slice(1);

  for (let y = 0; y < size; y++) {
    const limit = symmetrical ? cx + 1 : size;
    for (let x = 0; x < limit; x++) {
      if (!grid[y][x]) continue;

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

// ---- Template-based coloring ----

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
  const poses = getPoseOffsets(poseIndex, size);

  for (const [key, color] of basePixels) {
    const [x, y] = key.split(',').map(Number);

    let dx = 0, dy = 0;
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

function getPoseOffsets(poseIndex: number, size: number) {
  const s = Math.max(1, Math.floor(size * 0.05));
  const poseLibrary = [
    // 0: Idle
    [],
    // 1: Walk 1 - left foot forward
    [
      { region: 'leftLeg' as const, offsetX: -s, offsetY: -s },
      { region: 'rightLeg' as const, offsetX: s, offsetY: 0 },
      { region: 'leftArm' as const, offsetX: s, offsetY: 0 },
      { region: 'rightArm' as const, offsetX: -s, offsetY: 0 },
    ],
    // 2: Walk 2 - right foot forward
    [
      { region: 'leftLeg' as const, offsetX: s, offsetY: 0 },
      { region: 'rightLeg' as const, offsetX: -s, offsetY: -s },
      { region: 'leftArm' as const, offsetX: -s, offsetY: 0 },
      { region: 'rightArm' as const, offsetX: s, offsetY: 0 },
    ],
    // 3: Arms up
    [
      { region: 'leftArm' as const, offsetX: -s, offsetY: -s * 2 },
      { region: 'rightArm' as const, offsetX: s, offsetY: -s * 2 },
    ],
    // 4: Crouch
    [
      { region: 'torso' as const, offsetX: 0, offsetY: s },
      { region: 'head' as const, offsetX: 0, offsetY: s },
      { region: 'leftLeg' as const, offsetX: -s, offsetY: s },
      { region: 'rightLeg' as const, offsetX: s, offsetY: s },
    ],
    // 5: Jump
    [
      { region: 'leftLeg' as const, offsetX: -s, offsetY: s },
      { region: 'rightLeg' as const, offsetX: s, offsetY: s },
      { region: 'leftArm' as const, offsetX: -s, offsetY: -s },
      { region: 'rightArm' as const, offsetX: s, offsetY: -s },
      { region: 'head' as const, offsetX: 0, offsetY: -s },
    ],
    // 6: Attack (swing right)
    [
      { region: 'rightArm' as const, offsetX: s * 3, offsetY: -s },
      { region: 'torso' as const, offsetX: s, offsetY: 0 },
    ],
    // 7: Attack (swing left)
    [
      { region: 'leftArm' as const, offsetX: -s * 3, offsetY: -s },
      { region: 'torso' as const, offsetX: -s, offsetY: 0 },
    ],
    // 8: Breathe
    [
      { region: 'torso' as const, offsetX: 0, offsetY: -1 },
      { region: 'head' as const, offsetX: 0, offsetY: -1 },
      { region: 'leftArm' as const, offsetX: 0, offsetY: -1 },
      { region: 'rightArm' as const, offsetX: 0, offsetY: -1 },
    ],
    // 9: Thrust wind-up
    [
      { region: 'rightArm' as const, offsetX: -s * 2, offsetY: 0 },
      { region: 'torso' as const, offsetX: -s, offsetY: 0 },
    ],
    // 10: Thrust forward
    [
      { region: 'rightArm' as const, offsetX: s * 4, offsetY: 0 },
      { region: 'torso' as const, offsetX: s, offsetY: 0 },
    ],
    // 11: Overhead raise
    [
      { region: 'rightArm' as const, offsetX: s, offsetY: -s * 3 },
      { region: 'leftArm' as const, offsetX: -s, offsetY: -s * 3 },
      { region: 'head' as const, offsetX: 0, offsetY: -1 },
    ],
    // 12: Overhead slam
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
function getHeadDyForPose(poseIndex: number, size: number): number {
  const offsets = getPoseOffsets(poseIndex, size);
  for (const o of offsets) {
    if (o.region === 'head') return o.offsetY;
  }
  return 0;
}

// ---- Eyes ----

const EYE_WHITE: Color = { r: 255, g: 255, b: 255, a: 255 };
const EYE_PUPIL: Color = { r: 20, g: 20, b: 30, a: 255 };

function addEyes(
  pixels: Map<string, Color>,
  size: number,
  style: string,
  headDy = 0,
): void {
  const cx = Math.floor(size / 2);
  let eyeY: number;
  let eyeOffset: number;
  let eyeRadius: number;

  if (style === 'humanoid' || style === 'mech') {
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
    return;
  }

  const drawEye = (ex: number, ey: number) => {
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
    if (ex >= 0 && ex < size && ey >= 0 && ey < size) {
      pixels.set(pixelKey(ex, ey), EYE_PUPIL);
    }
  };

  drawEye(cx - eyeOffset, eyeY);
  drawEye(cx + eyeOffset, eyeY);
}

// ---- Weapon rendering ----

function getWeaponDirection(poseIndex: number): [number, number] {
  switch (poseIndex) {
    case 6: return [1, 0];
    case 10: return [1, 0];
    case 11: return [0, -1];
    default: return [0, 1];
  }
}

function addWeapon(
  pixels: Map<string, Color>,
  size: number,
  weapon: WeaponType,
  poseIndex: number,
  accentColors: Color[],
): void {
  if (weapon === 'none') return;

  const cx = Math.floor(size / 2);
  const s = Math.max(1, Math.floor(size * 0.05));

  const offsets = getPoseOffsets(poseIndex, size);
  let armDx = 0, armDy = 0;
  for (const o of offsets) {
    if (o.region === 'rightArm') { armDx += o.offsetX; armDy += o.offsetY; }
  }

  const handX = cx + Math.floor(size * 0.19) + armDx;
  const handY = Math.floor(size * 0.50) + armDy;

  const [dirX, dirY] = getWeaponDirection(poseIndex);
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
      px(handX - dirX, handY - dirY, handleColor);
      px(handX - dirX * 2, handY - dirY * 2, handleColor);
      px(handX + perpX, handY + perpY, metalColor);
      px(handX - perpX, handY - perpY, metalColor);
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
      const staffLen = Math.max(6, Math.floor(size * 0.40));
      const upLen = Math.floor(staffLen * 0.6);
      const downLen = staffLen - upLen;
      for (let i = -upLen; i <= downLen; i++) {
        px(handX, handY + i, handleColor);
      }
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

// ---- Color overrides ----

function applyColorOverrides(
  pixels: Map<string, Color>,
  size: number,
  overrides: RegionColorOverrides,
): void {
  const cx = Math.floor(size / 2);
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  for (const key of pixels.keys()) {
    const [x, y] = key.split(',').map(Number);
    grid[y][x] = true;
  }

  for (const [key] of pixels) {
    const [x, y] = key.split(',').map(Number);
    const isEdge =
      !grid[y - 1]?.[x] || !grid[y + 1]?.[x] ||
      !grid[y]?.[x - 1] || !grid[y]?.[x + 1];

    if (isEdge && overrides.outline) {
      const oc = overrides.outline;
      pixels.set(key, { r: oc.r, g: oc.g, b: oc.b, a: 255 });
      continue;
    }

    const region = getBodyRegion(x, y, size);
    const overrideColors = overrides[region as keyof RegionColorOverrides];
    if (overrideColors && Array.isArray(overrideColors) && overrideColors.length > 0) {
      const base = overrideColors[Math.floor(Math.random() * overrideColors.length)];
      const jitter = () => Math.floor(Math.random() * 11) - 5;
      pixels.set(key, {
        r: Math.max(0, Math.min(255, base.r + jitter())),
        g: Math.max(0, Math.min(255, base.g + jitter())),
        b: Math.max(0, Math.min(255, base.b + jitter())),
        a: 255,
      });
    }
  }
}

// ---- Sequence definitions ----

const POSE_SEQUENCES: { name: string; poseIndices: number[] }[] = [
  { name: 'Idle',             poseIndices: [0, 8, 0, 8] },
  { name: 'Walk',             poseIndices: [0, 1, 0, 2] },
  { name: 'Jump',             poseIndices: [4, 5, 0] },
  { name: 'Attack Slash',     poseIndices: [0, 6, 7, 0] },
  { name: 'Attack Thrust',    poseIndices: [0, 9, 10, 0] },
  { name: 'Attack Overhead',  poseIndices: [0, 11, 12, 0] },
];

export const POSE_SEQUENCE_NAMES = POSE_SEQUENCES.map(s => s.name);

// ---- Frame assembly ----

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
  const headDy = getHeadDyForPose(poseIndex, size);
  addEyes(px, size, style, headDy);
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

// ---- Main generation function ----

export function generateRandomSprite(options: GenerateRequest): SpriteSheet {
  const size = options.size;
  const paletteSize = options.complexity === 'simple' ? 4 : options.complexity === 'complex' ? 8 : 6;
  const palette = generatePalette(options.colorScheme, paletteSize);

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
    weapon = options.weapon ?? tmpl.weapon;
    weaponColors = tmpl.regions.accent;
  } else {
    basePixels = colorizeGrid(grid, size, palette, options.symmetrical);
    weapon = options.style === 'object' ? 'none' : (options.weapon ?? 'none');
  }

  // Apply color overrides if provided
  if (options.colorOverrides) {
    applyColorOverrides(basePixels, size, options.colorOverrides);
    if (options.colorOverrides.accent) {
      weaponColors = options.colorOverrides.accent.map(c => ({ ...c, a: 255 }));
    }
  }

  const frames: SpriteFrame[] = [];

  // Objects are always static — single frame, no poses
  if (options.style === 'object') {
    frames.push(makeFrame('Object', basePixels, size, options.style, 0));
  } else if (options.selectedSequences && options.selectedSequences.length > 0) {
    const selected = new Set(options.selectedSequences);
    for (const seqDef of POSE_SEQUENCES) {
      if (!selected.has(seqDef.name)) continue;
      for (let i = 0; i < seqDef.poseIndices.length; i++) {
        const frame = makeFrame(
          `${seqDef.name} ${i + 1}`,
          basePixels, size, options.style,
          seqDef.poseIndices[i], weapon, weaponColors,
        );
        frames.push(frame);
      }
    }
  } else if (options.generatePoses) {
    // Legacy mode: generate idle + N individual poses
    const idleFrame = makeFrame('Idle', basePixels, size, options.style, 0, weapon, weaponColors);
    frames.push(idleFrame);
    const poseNames = ['Walk 1', 'Walk 2', 'Arms Up', 'Crouch', 'Jump', 'Attack R', 'Attack L'];
    const count = Math.min(options.poseCount, poseNames.length);
    for (let i = 0; i < count; i++) {
      const frame = makeFrame(poseNames[i], basePixels, size, options.style, i + 1, weapon, weaponColors);
      frames.push(frame);
    }
  } else {
    // Single idle frame
    const idleFrame = makeFrame('Idle', basePixels, size, options.style, 0, weapon, weaponColors);
    frames.push(idleFrame);
  }

  if (frames.length === 0) {
    frames.push(makeFrame('Idle', basePixels, size, options.style, 0, weapon, weaponColors));
  }

  return { frames, width: size, height: size };
}
