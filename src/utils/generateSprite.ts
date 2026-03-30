import type { Color, RandomGenOptions, SpriteFrame, SpriteSheet, AnimationSequence } from '../types';
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
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const half = Math.floor(size / 2);
  const cx = half;

  // Head (top quarter)
  const headTop = Math.floor(size * 0.05);
  const headBot = Math.floor(size * 0.25);
  const headWidth = Math.floor(size * 0.15);
  for (let y = headTop; y <= headBot; y++) {
    for (let x = cx - headWidth; x <= cx + headWidth; x++) {
      if (x >= 0 && x < size) grid[y][x] = true;
    }
  }

  // Neck
  const neckBot = headBot + Math.floor(size * 0.05);
  const neckW = Math.floor(size * 0.06);
  for (let y = headBot; y <= neckBot; y++) {
    for (let x = cx - neckW; x <= cx + neckW; x++) {
      if (x >= 0 && x < size) grid[y][x] = true;
    }
  }

  // Torso
  const torsoBot = Math.floor(size * 0.6);
  const torsoW = Math.floor(size * 0.2);
  for (let y = neckBot; y <= torsoBot; y++) {
    const widthFull = complexity === 'simple' ? torsoW : Math.floor(torsoW * (1 - 0.2 * Math.sin((y - neckBot) / (torsoBot - neckBot) * Math.PI)));
    for (let x = cx - widthFull; x <= cx + widthFull; x++) {
      if (x >= 0 && x < size) grid[y][x] = true;
    }
  }

  // Arms
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

  // Legs
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

  // Main body blob
  const bodyRx = Math.floor(size * 0.3);
  const bodyRy = Math.floor(size * 0.25);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / bodyRx;
      const dy = (y - cy) / bodyRy;
      if (dx * dx + dy * dy <= 1) grid[y][x] = true;
    }
  }

  // Eyes
  const eyeY = cy - Math.floor(bodyRy * 0.3);
  const eyeOffset = Math.floor(bodyRx * 0.4);
  grid[eyeY][cx - eyeOffset] = true;
  grid[eyeY][cx + eyeOffset] = true;

  // Legs (little stubs at the bottom)
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

  // Tail or horn
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

  // Head - square
  const headSize = Math.floor(size * 0.15);
  const headTop = Math.floor(size * 0.05);
  for (let y = headTop; y < headTop + headSize; y++) {
    for (let x = cx - headSize; x <= cx + headSize; x++) {
      if (x >= 0 && x < size) grid[y][x] = true;
    }
  }

  // Torso - rectangular
  const torsoTop = headTop + headSize + 1;
  const torsoBot = Math.floor(size * 0.55);
  const torsoW = Math.floor(size * 0.22);
  for (let y = torsoTop; y <= torsoBot; y++) {
    for (let x = cx - torsoW; x <= cx + torsoW; x++) {
      if (x >= 0 && x < size) grid[y][x] = true;
    }
  }

  // Shoulders
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

  // Arms
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

  // Legs - thick
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

  // Feet
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

// ---- Eyes ----

const EYE_WHITE: Color = { r: 255, g: 255, b: 255, a: 255 };
const EYE_PUPIL: Color = { r: 20, g: 20, b: 30, a: 255 };

/** Stamp eyes onto the pixel map after coloring. Works for humanoid/mech/creature.
 *  headDy shifts the eyes vertically to follow head movement in poses. */
function addEyes(
  pixels: Map<string, Color>,
  size: number,
  style: string,
  symmetrical: boolean,
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

function getPoseOffsets(poseIndex: number, size: number, style: string) {
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
  // index 0 = idle (no transform), 1 = walk1, 2 = walk2,
  // 3 = arms up, 4 = crouch, 5 = jump, 6 = attack R, 7 = attack L, 8 = breathe
  { name: 'Idle',    poseIndices: [0, 8, 0, 8] },        // idle→breathe→idle→breathe
  { name: 'Walk',    poseIndices: [0, 1, 0, 2] },       // idle→walk1→idle→walk2
  { name: 'Jump',    poseIndices: [4, 5, 0] },           // crouch→jump→land (idle)
  { name: 'Attack',  poseIndices: [0, 6, 7, 0] },       // idle→swing R→swing L→idle
];

function makeFrame(
  name: string,
  basePixels: Map<string, Color>,
  size: number,
  style: string,
  poseIndex: number,
): SpriteFrame {
  const px = poseIndex === 0
    ? new Map(basePixels)
    : applyPoseToPixels(basePixels, size, poseIndex, style);
  // Eyes follow the head offset for the current pose
  const headDy = getHeadDyForPose(poseIndex, size, style);
  addEyes(px, size, style, true, headDy);
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
  if (options.template && TEMPLATES[options.template]) {
    basePixels = colorizeGridWithTemplate(grid, size, options.template, options.symmetrical);
  } else {
    basePixels = colorizeGrid(grid, size, palette, options.symmetrical);
  }

  const frames: SpriteFrame[] = [];
  const sequences: AnimationSequence[] = [];

  if (options.generatePoses && options.poseCount > 0) {
    // Build separate sequences
    // Pick which sequence groups to include based on poseCount budget
    let remaining = options.poseCount + 1; // +1 for the idle frame
    for (const seqDef of POSE_SEQUENCES) {
      if (remaining <= 0) break;
      const seqFrames: SpriteFrame[] = [];
      for (let i = 0; i < seqDef.poseIndices.length && remaining > 0; i++) {
        const poseIdx = seqDef.poseIndices[i];
        const frameName = `${seqDef.name} ${i + 1}`;
        const frame = makeFrame(frameName, basePixels, size, options.style, poseIdx);
        seqFrames.push(frame);
        remaining--;
      }
      frames.push(...seqFrames);
      sequences.push(createSequence(seqDef.name, seqFrames.map(f => f.id)));
    }
  } else {
    // Single idle frame
    const idle = makeFrame('Idle', basePixels, size, options.style, 0);
    frames.push(idle);
    sequences.push(createSequence('Idle', [idle.id]));
  }

  return {
    frames,
    sequences,
    width: size,
    height: size,
  };
}
