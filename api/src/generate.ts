import { v4 as uuidv4 } from 'uuid';
import type { Color, GenerateRequest, SpriteFrame, SpriteSheet } from './types.js';
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
    [],
    [
      { region: 'leftLeg' as const, offsetX: -s, offsetY: -s },
      { region: 'rightLeg' as const, offsetX: s, offsetY: 0 },
      { region: 'leftArm' as const, offsetX: s, offsetY: 0 },
      { region: 'rightArm' as const, offsetX: -s, offsetY: 0 },
    ],
    [
      { region: 'leftLeg' as const, offsetX: s, offsetY: 0 },
      { region: 'rightLeg' as const, offsetX: -s, offsetY: -s },
      { region: 'leftArm' as const, offsetX: -s, offsetY: 0 },
      { region: 'rightArm' as const, offsetX: s, offsetY: 0 },
    ],
    [
      { region: 'leftArm' as const, offsetX: -s, offsetY: -s * 2 },
      { region: 'rightArm' as const, offsetX: s, offsetY: -s * 2 },
    ],
    [
      { region: 'torso' as const, offsetX: 0, offsetY: s },
      { region: 'head' as const, offsetX: 0, offsetY: s },
      { region: 'leftLeg' as const, offsetX: -s, offsetY: s },
      { region: 'rightLeg' as const, offsetX: s, offsetY: s },
    ],
    [
      { region: 'leftLeg' as const, offsetX: -s, offsetY: s },
      { region: 'rightLeg' as const, offsetX: s, offsetY: s },
      { region: 'leftArm' as const, offsetX: -s, offsetY: -s },
      { region: 'rightArm' as const, offsetX: s, offsetY: -s },
      { region: 'head' as const, offsetX: 0, offsetY: -s },
    ],
    [
      { region: 'rightArm' as const, offsetX: s * 3, offsetY: -s },
      { region: 'torso' as const, offsetX: s, offsetY: 0 },
    ],
    [
      { region: 'leftArm' as const, offsetX: -s * 3, offsetY: -s },
      { region: 'torso' as const, offsetX: -s, offsetY: 0 },
    ],
  ];

  return poseLibrary[poseIndex % poseLibrary.length];
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

  let basePixels: Map<string, Color>;
  if (options.template && TEMPLATES[options.template]) {
    basePixels = colorizeGridWithTemplate(grid, size, options.template, options.symmetrical);
  } else {
    basePixels = colorizeGrid(grid, size, palette, options.symmetrical);
  }

  const baseLayer = createLayer('Generated');
  baseLayer.pixels = basePixels;

  const baseFrame: SpriteFrame = {
    id: uuidv4(),
    name: 'Idle',
    layers: [baseLayer],
    activeLayerId: baseLayer.id,
  };

  const frames: SpriteFrame[] = [baseFrame];

  if (options.generatePoses) {
    const poseNames = ['Walk 1', 'Walk 2', 'Arms Up', 'Crouch', 'Jump', 'Attack R', 'Attack L'];
    const count = Math.min(options.poseCount, poseNames.length);
    for (let i = 0; i < count; i++) {
      const posePixels = applyPoseToPixels(basePixels, size, i + 1, options.style);
      const poseLayer = createLayer('Generated');
      poseLayer.pixels = posePixels;
      frames.push({
        id: uuidv4(),
        name: poseNames[i],
        layers: [poseLayer],
        activeLayerId: poseLayer.id,
      });
    }
  }

  return { frames, width: size, height: size };
}
