// ── Background Generator (Node / Lambda) ─────────────────────────────────────
// Mirrors the frontend generateBackground.ts but uses @napi-rs/canvas.
// The drawing logic is intentionally kept in sync with the browser version.

import { createCanvas, Image } from '@napi-rs/canvas';
import type {
  BackgroundRequest,
  BackgroundLayerResponse,
  BackgroundResponse,
} from './types.js';

// ── Internal types ─────────────────────────────────────────────────────────────

type RGB = [number, number, number];
type Rng = () => number;

interface Palette {
  skyGrad: RGB[];
  distant: RGB;
  mid: RGB;
  midAccent: RGB;
  ground: RGB;
  groundAccent: RGB;
  element: RGB;
  window?: RGB;
  lava?: RGB;
  fog?: RGB;
}

// ── PRNG ──────────────────────────────────────────────────────────────────────

function mulberry32(seed: number): Rng {
  let s = seed;
  return function (): number {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function toStyle(c: RGB, a = 1): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))];
}

function gradColor(stops: RGB[], t: number): RGB {
  if (stops.length === 1) return stops[0];
  const seg = (stops.length - 1) * t;
  const i = Math.min(Math.floor(seg), stops.length - 2);
  return lerpRgb(stops[i], stops[i + 1], seg - i);
}

// ── Sky palettes ──────────────────────────────────────────────────────────────

const SKY: Record<string, Record<string, RGB[]>> = {
  day: {
    forest:  [[75,150,210],[130,190,230],[190,225,245]],
    desert:  [[95,170,220],[165,205,225],[230,218,185]],
    cave:    [[15,12,25],[20,18,35],[28,25,45]],
    ocean:   [[50,110,200],[100,165,225],[165,210,245]],
    ruins:   [[110,125,115],[150,162,150],[188,193,178]],
    tundra:  [[148,188,218],[188,213,233],[222,236,246]],
    volcanic:[[38,16,10],[62,26,16],[88,38,22]],
    swamp:   [[58,72,42],[85,98,62],[112,122,82]],
    plains:  [[82,162,218],[138,198,232],[208,232,243]],
    city:    [[98,132,172],[142,168,198],[182,202,218]],
  },
  dusk: {
    forest:  [[62,38,88],[188,88,48],[238,158,78]],
    desert:  [[168,48,28],[218,108,48],[238,175,88]],
    cave:    [[15,10,22],[22,15,32],[32,22,48]],
    ocean:   [[148,42,88],[212,88,58],[238,158,88]],
    ruins:   [[138,72,28],[188,112,52],[218,162,88]],
    tundra:  [[168,72,102],[218,128,72],[238,192,108]],
    volcanic:[[148,28,8],[198,58,18],[228,98,38]],
    swamp:   [[78,68,18],[118,98,38],[158,138,58]],
    plains:  [[82,42,108],[198,88,48],[238,165,78]],
    city:    [[88,52,88],[168,88,58],[218,148,88]],
  },
  night: {
    forest:  [[8,14,32],[12,18,42],[16,22,52]],
    desert:  [[8,12,28],[12,16,38],[18,22,48]],
    cave:    [[5,4,10],[8,6,15],[10,8,20]],
    ocean:   [[5,10,28],[8,14,38],[12,18,48]],
    ruins:   [[10,12,14],[14,16,18],[18,20,22]],
    tundra:  [[8,12,32],[12,18,42],[18,24,55]],
    volcanic:[[10,4,2],[15,6,3],[20,8,5]],
    swamp:   [[5,8,4],[8,12,6],[12,16,8]],
    plains:  [[8,14,32],[12,18,42],[16,22,52]],
    city:    [[6,8,18],[10,12,25],[14,18,35]],
  },
  dawn: {
    forest:  [[88,28,78],[178,78,68],[228,168,88]],
    desert:  [[108,38,68],[198,108,58],[238,192,108]],
    cave:    [[15,10,22],[22,15,32],[32,22,48]],
    ocean:   [[98,28,108],[178,78,88],[228,158,88]],
    ruins:   [[88,48,78],[158,98,78],[208,158,108]],
    tundra:  [[118,48,108],[188,108,88],[228,178,118]],
    volcanic:[[118,18,8],[168,48,18],[208,88,38]],
    swamp:   [[58,48,18],[98,78,38],[138,118,58]],
    plains:  [[88,28,88],[178,78,68],[228,168,88]],
    city:    [[68,38,88],[148,78,68],[208,148,88]],
  },
};

const BASE_PALETTES: Record<string, Palette> = {
  forest:   { skyGrad:SKY.day.forest,   distant:[40,90,35],   mid:[30,75,22],   midAccent:[55,115,42],  ground:[25,55,16],   groundAccent:[70,130,50],  element:[85,55,28] },
  desert:   { skyGrad:SKY.day.desert,   distant:[190,150,80], mid:[175,125,60], midAccent:[210,165,85], ground:[165,115,50], groundAccent:[205,175,100],element:[120,90,45] },
  cave:     { skyGrad:SKY.day.cave,     distant:[35,28,55],   mid:[25,20,40],   midAccent:[42,35,65],   ground:[18,14,30],   groundAccent:[50,42,72],   element:[60,50,40] },
  ocean:    { skyGrad:SKY.day.ocean,    distant:[30,80,140],  mid:[20,65,115],  midAccent:[40,100,160], ground:[15,45,85],   groundAccent:[30,80,135],  element:[140,115,75] },
  ruins:    { skyGrad:SKY.day.ruins,    distant:[100,105,90], mid:[85,88,75],   midAccent:[115,118,100],ground:[65,68,58],   groundAccent:[105,108,92], element:[80,75,60] },
  tundra:   { skyGrad:SKY.day.tundra,   distant:[180,200,215],mid:[155,175,195],midAccent:[200,215,230],ground:[220,230,238],groundAccent:[240,245,250], element:[110,100,90] },
  volcanic: { skyGrad:SKY.day.volcanic, distant:[110,30,15],  mid:[90,22,10],   midAccent:[140,45,20],  ground:[60,15,8],    groundAccent:[200,80,20],  element:[40,12,6],   lava:[220,90,20] },
  swamp:    { skyGrad:SKY.day.swamp,    distant:[40,60,28],   mid:[28,45,18],   midAccent:[50,72,35],   ground:[18,28,12],   groundAccent:[55,80,38],   element:[50,42,28],  fog:[90,110,70] },
  plains:   { skyGrad:SKY.day.plains,   distant:[140,175,90], mid:[110,155,65], midAccent:[155,190,95], ground:[80,125,45],  groundAccent:[130,180,75], element:[95,72,40] },
  city:     { skyGrad:SKY.day.city,     distant:[85,105,130], mid:[70,88,110],  midAccent:[95,115,140], ground:[55,70,88],   groundAccent:[80,95,115],  element:[65,75,88],  window:[220,210,150] },
};

function getPalette(env: string, time: string): Palette {
  const base = { ...BASE_PALETTES[env] };
  base.skyGrad = SKY[time][env];

  if (time === 'night') {
    const dark = (c: RGB): RGB => [
      Math.round(c[0] * 0.12 + 4),
      Math.round(c[1] * 0.12 + 6),
      Math.round(c[2] * 0.15 + 10),
    ];
    base.distant = dark(base.distant);
    base.mid = dark(base.mid);
    base.midAccent = dark(base.midAccent);
    base.ground = dark(base.ground);
    base.groundAccent = dark(base.groundAccent);
    base.element = dark(base.element);
  } else if (time === 'dusk' || time === 'dawn') {
    const warm = (c: RGB, isDusk: boolean): RGB => [
      Math.min(255, Math.round(c[0] * (isDusk ? 1.1 : 1.05) + (isDusk ? 20 : 15))),
      Math.round(c[1] * 0.82),
      Math.round(c[2] * (isDusk ? 0.65 : 0.75)),
    ];
    const isDusk = time === 'dusk';
    base.distant = warm(base.distant, isDusk);
    base.mid = warm(base.mid, isDusk);
    base.midAccent = warm(base.midAccent, isDusk);
    base.ground = warm(base.ground, isDusk);
    base.groundAccent = warm(base.groundAccent, isDusk);
    base.element = warm(base.element, isDusk);
  }
  return base;
}

// ── Canvas helpers ─────────────────────────────────────────────────────────────

// @napi-rs/canvas context is compatible with browser CanvasRenderingContext2D
type Ctx2D = ReturnType<ReturnType<typeof createCanvas>['getContext']>;

function rowFill(ctx: Ctx2D, by: number, fromBx: number, toBx: number, ps: number, color: RGB, alpha = 1): void {
  ctx.fillStyle = toStyle(color, alpha);
  ctx.fillRect(fromBx * ps, by * ps, (toBx - fromBx) * ps, ps);
}

// ── Profile generators ────────────────────────────────────────────────────────

function rollProfile(baseW: number, baseH: number, minFrac: number, maxFrac: number, tileable: boolean, rng: Rng): number[] {
  const pi2 = Math.PI * 2;
  const seed1 = rng() * 10, seed2 = rng() * 10, seed3 = rng() * 10;
  const freq1 = tileable ? pi2 * Math.round(1 + rng() * 2) / baseW : pi2 * (1.2 + rng()) / baseW;
  const freq2 = tileable ? pi2 * Math.round(3 + rng() * 3) / baseW : pi2 * (3.5 + rng() * 2) / baseW;
  const freq3 = tileable ? pi2 * Math.round(6 + rng() * 4) / baseW : pi2 * (7 + rng() * 3) / baseW;

  return Array.from({ length: baseW }, (_, x) => {
    let h = Math.sin(x * freq1 + seed1) * 0.5
          + Math.sin(x * freq2 + seed2) * 0.3
          + Math.sin(x * freq3 + seed3) * 0.15;
    const t = (h + 0.95) / 1.9;
    return Math.round(baseH * lerp(minFrac, maxFrac, t));
  });
}

function flatProfile(baseW: number, baseH: number, frac: number, tileable: boolean, rng: Rng): number[] {
  const base = Math.round(baseH * frac);
  const pi2 = Math.PI * 2;
  const seed1 = rng() * 10;
  const freq = tileable ? pi2 * Math.round(2 + rng() * 2) / baseW : pi2 * (2 + rng()) / baseW;
  return Array.from({ length: baseW }, (_, x) => {
    const wave = Math.sin(x * freq + seed1) * Math.round(baseH * 0.025);
    return Math.round(base + wave);
  });
}

const DEFAULT_TOPOGRAPHY: Record<string, string> = {
  forest:'rolling', desert:'flat', cave:'flat', ocean:'flat',
  ruins:'rolling', tundra:'mountains', volcanic:'jagged',
  swamp:'flat', plains:'flat', city:'flat',
};

function jaggProfile(baseW: number, baseH: number, minFrac: number, maxFrac: number, tileable: boolean, rng: Rng): number[] {
  const smooth = rollProfile(baseW, baseH, minFrac, maxFrac, tileable, rng);
  const spikeCount = Math.floor(2 + rng() * 3);
  for (let s = 0; s < spikeCount; s++) {
    const cx = Math.floor(rng() * baseW);
    const spikeH = Math.floor(baseH * (0.08 + rng() * 0.12));
    const width = Math.floor(baseW * 0.06 + rng() * baseW * 0.06);
    for (let x = 0; x < baseW; x++) {
      const dist = Math.min(
        Math.abs(x - cx),
        tileable ? Math.abs(x - cx + baseW) : 9999,
        tileable ? Math.abs(x - cx - baseW) : 9999
      );
      if (dist < width) smooth[x] = Math.max(1, smooth[x] - Math.round(spikeH * (1 - dist / width)));
    }
  }
  return smooth;
}

function buildingProfile(baseW: number, baseH: number, density: string, rng: Rng): number[] {
  const profile: number[] = new Array(baseW).fill(Math.round(baseH * 0.6));
  const spacing = density === 'sparse' ? 10 : density === 'medium' ? 7 : 5;
  let x = 0;
  while (x < baseW) {
    const bw = Math.floor(3 + rng() * spacing);
    const bh = Math.floor(baseH * (0.15 + rng() * 0.45));
    const by = Math.round(baseH * 0.9) - bh;
    for (let bx = x; bx < Math.min(x + bw, baseW); bx++) profile[bx] = by;
    x += bw + Math.floor(1 + rng() * 2);
  }
  return profile;
}

// ── Element drawers ───────────────────────────────────────────────────────────

function drawPineTree(ctx: Ctx2D, cx: number, groundY: number, ps: number, size: number, pal: Palette): void {
  const trunkW = Math.max(1, Math.floor(size * 0.18));
  const trunkH = Math.max(1, Math.floor(size * 0.3));
  const crownH = size - trunkH;
  const tierCount = Math.max(2, Math.floor(crownH / 3));
  ctx.fillStyle = toStyle(pal.element);
  ctx.fillRect((cx - Math.floor(trunkW / 2)) * ps, (groundY - trunkH) * ps, trunkW * ps, trunkH * ps);
  for (let t = 0; t < tierCount; t++) {
    const tierFrac = (t + 1) / tierCount;
    const tierW = Math.max(1, Math.round((size * 0.55) * (1 - t / tierCount * 0.5)));
    const tierY = groundY - trunkH - Math.round(crownH * tierFrac);
    const rows = Math.max(1, Math.floor(crownH / tierCount));
    for (let r = 0; r < rows; r++) {
      const rw = Math.max(1, Math.round(tierW * (1 - r / rows)));
      rowFill(ctx, tierY - rows + r, cx - Math.floor(rw / 2), cx - Math.floor(rw / 2) + rw, ps, pal.mid);
    }
  }
}

function drawRoundTree(ctx: Ctx2D, cx: number, groundY: number, ps: number, size: number, pal: Palette): void {
  const trunkW = Math.max(1, Math.floor(size * 0.15));
  const trunkH = Math.max(2, Math.floor(size * 0.35));
  const radius = Math.floor(size * 0.32);
  ctx.fillStyle = toStyle(pal.element);
  ctx.fillRect((cx - Math.floor(trunkW / 2)) * ps, (groundY - trunkH) * ps, trunkW * ps, trunkH * ps);
  const cy = groundY - trunkH - radius;
  for (let dy = -radius; dy <= radius; dy++) {
    const rw = Math.round(Math.sqrt(Math.max(0, radius * radius - dy * dy)));
    if (rw > 0) rowFill(ctx, cy + dy, cx - rw, cx + rw, ps, pal.mid);
  }
  for (let dy = -radius; dy <= -Math.floor(radius * 0.5); dy++) {
    const rw = Math.round(Math.sqrt(Math.max(0, radius * radius - dy * dy)) * 0.7);
    if (rw > 0) rowFill(ctx, cy + dy, cx - rw, cx + rw, ps, pal.midAccent);
  }
}

function drawCactus(ctx: Ctx2D, cx: number, groundY: number, ps: number, size: number, pal: Palette): void {
  const w = Math.max(2, Math.floor(size * 0.25));
  const armY = Math.floor(size * 0.45);
  const armLen = Math.floor(size * 0.3);
  ctx.fillStyle = toStyle(pal.mid);
  ctx.fillRect((cx - Math.floor(w / 2)) * ps, (groundY - size) * ps, w * ps, size * ps);
  ctx.fillRect((cx - Math.floor(w / 2) - armLen) * ps, (groundY - armY - Math.floor(w / 2)) * ps, armLen * ps, w * ps);
  ctx.fillRect((cx - Math.floor(w / 2) - w) * ps, (groundY - armY - Math.floor(armLen * 0.7)) * ps, w * ps, Math.floor(armLen * 0.7) * ps);
  ctx.fillRect((cx + Math.floor(w / 2)) * ps, (groundY - armY - Math.floor(w / 2)) * ps, armLen * ps, w * ps);
  ctx.fillRect((cx + Math.floor(w / 2) + armLen - w) * ps, (groundY - armY - Math.floor(armLen * 0.7)) * ps, w * ps, Math.floor(armLen * 0.7) * ps);
}

function drawRock(ctx: Ctx2D, cx: number, groundY: number, ps: number, size: number, pal: Palette): void {
  const w = Math.max(2, Math.floor(size * 0.7));
  const h = Math.max(1, Math.floor(size * 0.5));
  for (let dy = 0; dy < h; dy++) {
    const frac = 1 - dy / h;
    const rw = Math.round(w * Math.sqrt(frac));
    rowFill(ctx, groundY - dy, cx - Math.floor(rw / 2), cx - Math.floor(rw / 2) + rw, ps, pal.distant);
  }
  const hw = Math.floor(w * 0.4);
  rowFill(ctx, groundY - h + 1, cx - Math.floor(hw / 2), cx - Math.floor(hw / 2) + hw, ps, pal.midAccent);
}

function drawPillar(ctx: Ctx2D, cx: number, groundY: number, ps: number, h: number, pal: Palette): void {
  const w = Math.max(2, Math.floor(h * 0.22));
  const capH = Math.max(1, Math.floor(h * 0.08));
  ctx.fillStyle = toStyle(pal.mid);
  ctx.fillRect((cx - Math.floor(w / 2)) * ps, (groundY - h) * ps, w * ps, h * ps);
  ctx.fillStyle = toStyle(pal.midAccent);
  ctx.fillRect((cx - Math.floor((w + 2) / 2)) * ps, (groundY - h) * ps, (w + 2) * ps, capH * ps);
  ctx.fillRect((cx - Math.floor((w + 2) / 2)) * ps, (groundY - capH) * ps, (w + 2) * ps, capH * ps);
}

function drawBuilding(ctx: Ctx2D, lx: number, groundY: number, ps: number, w: number, h: number, pal: Palette): void {
  ctx.fillStyle = toStyle(pal.mid);
  ctx.fillRect(lx * ps, (groundY - h) * ps, w * ps, h * ps);
  ctx.fillStyle = toStyle(pal.midAccent);
  ctx.fillRect(lx * ps, (groundY - h) * ps, w * ps, ps);
  if (pal.window) {
    ctx.fillStyle = toStyle(pal.window, 0.7);
    const ww = Math.max(1, Math.floor(w * 0.25));
    const wh = Math.max(1, Math.floor(ww * 1.4));
    const cols = Math.max(1, Math.floor(w / (ww + 2)));
    const rows2 = Math.max(1, Math.floor(h / (wh + 2)));
    for (let r = 0; r < rows2; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillRect((lx + 1 + c * (ww + 2)) * ps, (groundY - h + 2 + r * (wh + 2)) * ps, ww * ps, wh * ps);
      }
    }
  }
}

function drawBareTree(ctx: Ctx2D, cx: number, groundY: number, ps: number, size: number, pal: Palette): void {
  const trunkW = Math.max(1, Math.floor(size * 0.15));
  const trunkH = Math.floor(size * 0.7);
  ctx.fillStyle = toStyle(pal.element);
  ctx.fillRect((cx - Math.floor(trunkW / 2)) * ps, (groundY - trunkH) * ps, trunkW * ps, trunkH * ps);
  const branchLen = Math.floor(size * 0.25);
  const branchY = groundY - Math.floor(trunkH * 0.75);
  for (const d of [-1, 1]) {
    for (let r = 0; r < 2; r++) {
      const by2 = branchY - r * Math.floor(trunkH * 0.15);
      for (let bx = 1; bx <= branchLen; bx++) {
        ctx.fillStyle = toStyle(pal.element);
        ctx.fillRect((cx + d * bx) * ps, (by2 - Math.floor(bx * 0.4)) * ps, ps, ps);
      }
    }
  }
}

function drawStalagmite(ctx: Ctx2D, cx: number, groundY: number, ps: number, h: number, pal: Palette, fromTop: boolean): void {
  for (let y = 0; y < h; y++) {
    const frac = y / h;
    const rw = Math.max(1, Math.round((h * 0.2) * (1 - frac)));
    rowFill(ctx, fromTop ? y : groundY - h + y, cx - Math.floor(rw / 2), cx - Math.floor(rw / 2) + rw, ps, pal.mid);
  }
}

// ── Layer builders ─────────────────────────────────────────────────────────────

const OUTPUT_HEIGHT = 180;

function buildSkyLayer(req: BackgroundRequest, pal: Palette, rng: Rng): Buffer {
  const ps = req.pixelSize;
  const baseW = req.outputWidth / ps;
  const baseH = OUTPUT_HEIGHT / ps;
  const canvas = createCanvas(req.outputWidth, OUTPUT_HEIGHT);
  const ctx = canvas.getContext('2d');

  for (let y = 0; y < baseH; y++) {
    ctx.fillStyle = toStyle(gradColor(pal.skyGrad, y / (baseH - 1)));
    ctx.fillRect(0, y * ps, req.outputWidth, ps);
  }

  if (req.environment !== 'cave') {
    const isNight = req.timeOfDay === 'night';
    const sunX = Math.floor(baseW * 0.75), sunY = Math.floor(baseH * 0.2);
    const sunR = Math.max(2, Math.floor(baseH * 0.08));
    const sunColor: RGB = isNight ? [230,230,215] : req.timeOfDay === 'day' ? [255,238,160] : [238,168,80];
    for (let dy = -sunR; dy <= sunR; dy++) {
      const rw = Math.round(Math.sqrt(Math.max(0, sunR * sunR - dy * dy)));
      if (rw > 0) rowFill(ctx, sunY + dy, sunX - rw, sunX + rw, ps, sunColor);
    }
    if (isNight) {
      const cutColor = gradColor(pal.skyGrad, 0.15);
      for (let dy = -sunR; dy <= sunR; dy++) {
        const rw = Math.round(Math.sqrt(Math.max(0, sunR * sunR - dy * dy)));
        const shift = Math.floor(rw * 0.55);
        if (rw > 0) rowFill(ctx, sunY + dy, sunX - rw + Math.floor(sunR * 0.5) + shift, sunX + rw, ps, cutColor);
      }
    }
  }

  if (req.timeOfDay !== 'day' && req.environment !== 'cave') {
    ctx.fillStyle = toStyle([240, 240, 255]);
    const starCount = req.timeOfDay === 'night' ? 60 : 20;
    for (let i = 0; i < starCount; i++) {
      ctx.fillRect(Math.floor(rng() * baseW) * ps, Math.floor(rng() * baseH * 0.55) * ps, ps, ps);
    }
  }

  if (req.weather !== 'stormy' && req.environment !== 'cave' && req.environment !== 'volcanic') {
    const count = req.weather === 'foggy' ? 8 : req.density === 'dense' ? 4 : req.density === 'medium' ? 3 : 2;
    const alpha = req.weather === 'foggy' ? 0.4 : req.timeOfDay === 'night' ? 0.15 : 0.55;
    const cc: RGB = req.timeOfDay === 'night' ? [140,150,170] : req.timeOfDay === 'day' ? [240,245,255] : [230,190,160];
    for (let i = 0; i < count; i++) {
      const cx = Math.floor(rng() * baseW);
      const cy = Math.floor(baseH * 0.1 + rng() * baseH * 0.25);
      const cw = Math.floor(6 + rng() * 12);
      const ch = Math.max(2, Math.floor(cw * 0.35));
      ctx.fillStyle = toStyle(cc, alpha);
      for (let dy = 0; dy < ch; dy++) {
        const frac = Math.abs(dy - ch / 2) / (ch / 2);
        const rw = Math.round(cw * Math.sqrt(1 - frac * frac));
        ctx.fillRect((cx - Math.floor(rw / 2)) * ps, (cy + dy - Math.floor(ch / 2)) * ps, rw * ps, ps);
      }
    }
  }

  if (req.weather === 'stormy') {
    ctx.fillStyle = toStyle([20,20,30], 0.45);
    ctx.fillRect(0, 0, req.outputWidth, OUTPUT_HEIGHT);
  }

  if (req.weather === 'foggy' || req.environment === 'swamp') {
    const fogC = pal.fog ?? pal.skyGrad[2];
    ctx.fillStyle = toStyle(fogC, req.environment === 'swamp' ? 0.22 : 0.18);
    ctx.fillRect(0, Math.floor(baseH * 0.5) * ps, req.outputWidth, OUTPUT_HEIGHT);
  }

  if (req.weather === 'snowy' || req.environment === 'tundra') {
    ctx.fillStyle = toStyle([245, 248, 255], 0.6);
    ctx.fillRect(0, Math.floor(baseH * 0.75) * ps, req.outputWidth, OUTPUT_HEIGHT);
  }

  return canvas.toBuffer('image/png');
}

function buildDistantLayer(req: BackgroundRequest, pal: Palette, rng: Rng): Buffer {
  const ps = req.pixelSize;
  const baseW = req.outputWidth / ps;
  const baseH = OUTPUT_HEIGHT / ps;
  const canvas = createCanvas(req.outputWidth, OUTPUT_HEIGHT);
  const ctx = canvas.getContext('2d');

  let profile: number[];
  if (req.environment === 'cave') {
    profile = rollProfile(baseW, baseH, 0.02, 0.35, req.tileable, rng);
    ctx.fillStyle = toStyle(pal.distant);
    for (let x = 0; x < baseW; x++) ctx.fillRect(x * ps, 0, ps, profile[x] * ps);
    ctx.fillStyle = toStyle(pal.ground);
    ctx.fillRect(0, Math.floor(baseH * 0.72) * ps, req.outputWidth, OUTPUT_HEIGHT);
    return canvas.toBuffer('image/png');
  } else if (req.environment === 'city') {
    profile = buildingProfile(baseW, baseH, req.density, rng);
  } else {
    const topo = req.topography ?? DEFAULT_TOPOGRAPHY[req.environment] ?? 'rolling';
    switch (topo) {
      case 'flat':      profile = flatProfile(baseW, baseH, 0.52, req.tileable, rng); break;
      case 'mountains': profile = rollProfile(baseW, baseH, 0.25, 0.55, req.tileable, rng); break;
      case 'jagged':    profile = jaggProfile(baseW, baseH, 0.28, 0.58, req.tileable, rng); break;
      default:          profile = rollProfile(baseW, baseH, 0.38, 0.60, req.tileable, rng); break;
    }
  }

  ctx.fillStyle = toStyle(pal.distant);
  for (let x = 0; x < baseW; x++) ctx.fillRect(x * ps, profile[x] * ps, ps, (baseH - profile[x]) * ps);

  if (req.environment === 'tundra') {
    ctx.fillStyle = toStyle([240, 245, 255]);
    for (let x = 0; x < baseW; x++) {
      const capH = Math.max(0, Math.round((Math.floor(baseH * 0.45) - profile[x]) * 0.35));
      if (capH > 0) ctx.fillRect(x * ps, profile[x] * ps, ps, capH * ps);
    }
  }

  if (req.environment === 'volcanic' && pal.lava) {
    ctx.fillStyle = toStyle(pal.lava, 0.5);
    for (let x = 0; x < baseW; x++) ctx.fillRect(x * ps, (profile[x] - 1) * ps, ps, 2 * ps);
  }

  return canvas.toBuffer('image/png');
}

function buildMidLayer(req: BackgroundRequest, pal: Palette, rng: Rng): Buffer {
  const ps = req.pixelSize;
  const baseW = req.outputWidth / ps;
  const baseH = OUTPUT_HEIGHT / ps;
  const canvas = createCanvas(req.outputWidth, OUTPUT_HEIGHT);
  const ctx = canvas.getContext('2d');

  const midProfile = rollProfile(baseW, baseH, 0.55, 0.72, req.tileable, rng);
  ctx.fillStyle = toStyle(pal.mid);
  for (let x = 0; x < baseW; x++) ctx.fillRect(x * ps, midProfile[x] * ps, ps, (baseH - midProfile[x]) * ps);

  const densityFactor = req.density === 'sparse' ? 1 : req.density === 'medium' ? 1.7 : 2.8;
  const spacing = Math.floor(baseW / (3 * densityFactor));
  const offset = Math.floor(rng() * spacing);

  for (let bx = offset; bx < baseW; bx += Math.max(1, Math.floor(spacing * (0.7 + rng() * 0.6)))) {
    const gY = midProfile[Math.min(bx, baseW - 1)];
    const size = Math.floor(baseH * (0.12 + rng() * 0.12));
    switch (req.environment) {
      case 'forest':
        if (rng() > 0.4) drawPineTree(ctx, bx, gY, ps, size, pal);
        else drawRoundTree(ctx, bx, gY, ps, size, pal);
        break;
      case 'desert':
        if (rng() > 0.5) drawCactus(ctx, bx, gY, ps, size, pal);
        else drawRock(ctx, bx, gY, ps, size, pal);
        break;
      case 'ruins':
        if (rng() > 0.3) drawPillar(ctx, bx, gY, ps, size, pal);
        else drawRock(ctx, bx, gY, ps, Math.floor(size * 0.8), pal);
        break;
      case 'tundra': case 'swamp':
        drawBareTree(ctx, bx, gY, ps, size, pal);
        break;
      case 'city':
        drawBuilding(ctx, bx - Math.floor(size * 0.3), gY, ps, Math.floor(size * 0.6), size, pal);
        break;
      case 'cave':
        if (rng() > 0.5) drawStalagmite(ctx, bx, gY, ps, size, pal, false);
        else drawStalagmite(ctx, bx, Math.floor(size * 0.4), ps, size, pal, true);
        break;
      case 'plains':
        if (rng() > 0.75) {
          if (rng() > 0.5) drawPineTree(ctx, bx, gY, ps, size, pal);
          else drawRoundTree(ctx, bx, gY, ps, size, pal);
        }
        break;
      default:
        drawRock(ctx, bx, gY, ps, size, pal);
        if (req.environment === 'volcanic' && pal.lava) {
          ctx.fillStyle = toStyle(pal.lava, 0.4);
          ctx.fillRect(Math.max(0, (bx - 2) * ps), gY * ps, 4 * ps, ps);
        }
    }
  }

  return canvas.toBuffer('image/png');
}

function buildForeLayer(req: BackgroundRequest, pal: Palette, rng: Rng): Buffer {
  const ps = req.pixelSize;
  const baseW = req.outputWidth / ps;
  const baseH = OUTPUT_HEIGHT / ps;
  const canvas = createCanvas(req.outputWidth, OUTPUT_HEIGHT);
  const ctx = canvas.getContext('2d');

  const groundTop = Math.floor(baseH * 0.75);
  ctx.fillStyle = toStyle(pal.ground);
  ctx.fillRect(0, groundTop * ps, req.outputWidth, OUTPUT_HEIGHT);

  const edgeProfile = rollProfile(baseW, baseH, 0.73, 0.78, req.tileable, rng);
  ctx.fillStyle = toStyle(pal.ground);
  for (let x = 0; x < baseW; x++) ctx.fillRect(x * ps, edgeProfile[x] * ps, ps, (baseH - edgeProfile[x]) * ps);
  ctx.fillStyle = toStyle(pal.groundAccent);
  for (let x = 0; x < baseW; x++) ctx.fillRect(x * ps, edgeProfile[x] * ps, ps, ps);

  const densityFactor = req.density === 'sparse' ? 0.5 : req.density === 'medium' ? 1 : 1.8;
  const detailCount = Math.floor(baseW * 0.08 * densityFactor);
  for (let i = 0; i < detailCount; i++) {
    const dx = Math.floor(rng() * baseW);
    const dy = edgeProfile[Math.min(dx, baseW - 1)] - 1;
    const dsize = Math.max(1, Math.floor(2 + rng() * 3));
    switch (req.environment) {
      case 'forest': case 'plains': case 'swamp': {
        ctx.fillStyle = toStyle(pal.groundAccent);
        for (let g = -1; g <= 1; g++) {
          if (dx + g >= 0 && dx + g < baseW) {
            const gh = Math.max(1, Math.floor(dsize * (0.5 + rng() * 0.5)));
            ctx.fillRect((dx + g) * ps, (dy - gh + 1) * ps, ps, gh * ps);
          }
        }
        break;
      }
      case 'tundra': {
        ctx.fillStyle = toStyle([235, 242, 255]);
        ctx.fillRect(dx * ps, dy * ps, dsize * ps, ps);
        break;
      }
      case 'volcanic': {
        if (pal.lava) {
          ctx.fillStyle = toStyle(pal.lava, 0.6);
          ctx.fillRect(dx * ps, dy * ps, ps, ps);
        }
        break;
      }
      default:
        ctx.fillStyle = toStyle(pal.groundAccent);
        ctx.fillRect(dx * ps, dy * ps, dsize * ps, ps);
    }
  }

  if (req.weather === 'rainy' || req.weather === 'stormy') {
    ctx.fillStyle = toStyle([160, 180, 210], 0.35);
    for (let r = 0; r < 30; r++) {
      const rx = Math.floor(rng() * baseW);
      const ry = Math.floor(rng() * groundTop);
      ctx.fillRect(rx * ps, ry * ps, ps, Math.max(2, Math.floor(3 + rng() * 4)) * ps);
    }
  }

  if (req.weather === 'snowy' || req.environment === 'tundra') {
    ctx.fillStyle = toStyle([245, 248, 255], 0.8);
    for (let s = 0; s < 20; s++) {
      ctx.fillRect(Math.floor(rng() * baseW) * ps, Math.floor(rng() * groundTop) * ps, ps, ps);
    }
  }

  return canvas.toBuffer('image/png');
}

// ── Godot scene ───────────────────────────────────────────────────────────────

function buildGodotScene(layers: { name: string; parallaxScale: number }[], w: number, h: number): string {
  let out = `[gd_scene format=3]\n\n[node name="Background" type="ParallaxBackground"]\n\n`;
  layers.forEach(layer => {
    const safe = layer.name.charAt(0).toUpperCase() + layer.name.slice(1);
    out += `[node name="${safe}Layer" type="ParallaxLayer" parent="."]\n`;
    out += `motion_scale = Vector2(${layer.parallaxScale.toFixed(2)}, 0.0)\n\n`;
    out += `[node name="${safe}Sprite" type="Sprite2D" parent="${safe}Layer"]\n`;
    out += `# texture = preload("res://backgrounds/${layer.name}.png")\n`;
    out += `centered = false\nregion_enabled = true\nregion_rect = Rect2(0, 0, ${w}, ${h})\n\n`;
  });
  return out;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const LAYER_SCALES: Record<number, number[]> = { 2:[0,0.6], 3:[0,0.25,0.65], 4:[0,0.15,0.4,0.8] };
const LAYER_NAMES:  Record<number, string[]>  = { 2:['sky','foreground'], 3:['sky','midground','foreground'], 4:['sky','distant','midground','foreground'] };

export function generateBackgroundAPI(req: BackgroundRequest): BackgroundResponse {
  const seed = req.seed ?? (Date.now() & 0xffffffff);
  const rng = mulberry32(seed);
  const pal = getPalette(req.environment, req.timeOfDay);

  const allBuffers = [
    buildSkyLayer(req, pal, rng),
    buildDistantLayer(req, pal, rng),
    buildMidLayer(req, pal, rng),
    buildForeLayer(req, pal, rng),
  ];

  const indices: Record<number, number[]> = { 2:[0,3], 3:[0,2,3], 4:[0,1,2,3] };
  const chosen = indices[req.layerCount].map(i => allBuffers[i]);
  const scales = LAYER_SCALES[req.layerCount];
  const names  = LAYER_NAMES[req.layerCount];

  const layers: BackgroundLayerResponse[] = chosen.map((buf, i) => ({
    name: names[i],
    png: `data:image/png;base64,${buf.toString('base64')}`,
    parallaxScale: scales[i],
  }));

  // Composite: draw all layers stacked
  const comp = createCanvas(req.outputWidth, OUTPUT_HEIGHT);
  const compCtx = comp.getContext('2d');
  chosen.forEach(buf => {
    const layerCanvas = createCanvas(req.outputWidth, OUTPUT_HEIGHT);
    const lCtx = layerCanvas.getContext('2d');
    const img = new Image();
    img.src = buf;
    lCtx.drawImage(img, 0, 0);
    compCtx.drawImage(layerCanvas, 0, 0);
  });
  const compositePng = `data:image/png;base64,${comp.toBuffer('image/png').toString('base64')}`;

  return {
    success: true,
    layers,
    composite: compositePng,
    width: req.outputWidth,
    height: OUTPUT_HEIGHT,
    godotScene: buildGodotScene(layers, req.outputWidth, OUTPUT_HEIGHT),
  };
}
