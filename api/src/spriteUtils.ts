import { v4 as uuidv4 } from 'uuid';
import type { Color, Layer, SpriteFrame } from './types.js';

export const TRANSPARENT: Color = { r: 0, g: 0, b: 0, a: 0 };

export function pixelKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function parsePixelKey(key: string): [number, number] {
  const [x, y] = key.split(',').map(Number);
  return [x, y];
}

export function colorsEqual(a: Color, b: Color): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

export function createLayer(name = 'Layer 1'): Layer {
  return {
    id: uuidv4(),
    name,
    pixels: new Map(),
    visible: true,
    opacity: 1,
  };
}

export function cloneLayer(layer: Layer): Layer {
  return {
    ...layer,
    id: uuidv4(),
    name: `${layer.name} (copy)`,
    pixels: new Map(layer.pixels),
  };
}

export function flattenLayers(layers: Layer[], _width: number, _height: number): Map<string, Color> {
  const result = new Map<string, Color>();
  for (const layer of layers) {
    if (!layer.visible) continue;
    for (const [key, color] of layer.pixels) {
      if (color.a === 0) continue;
      const blended = blendColor(result.get(key) || TRANSPARENT, {
        ...color,
        a: Math.round(color.a * layer.opacity),
      });
      result.set(key, blended);
    }
  }
  return result;
}

export function blendColor(bottom: Color, top: Color): Color {
  if (top.a === 0) return bottom;
  if (top.a === 255 || bottom.a === 0) return top;
  const aTop = top.a / 255;
  const aBot = bottom.a / 255;
  const aOut = aTop + aBot * (1 - aTop);
  if (aOut === 0) return TRANSPARENT;
  return {
    r: Math.round((top.r * aTop + bottom.r * aBot * (1 - aTop)) / aOut),
    g: Math.round((top.g * aTop + bottom.g * aBot * (1 - aTop)) / aOut),
    b: Math.round((top.b * aTop + bottom.b * aBot * (1 - aTop)) / aOut),
    a: Math.round(aOut * 255),
  };
}

export function floodFill(
  pixels: Map<string, Color>,
  startX: number,
  startY: number,
  fillColor: Color,
  width: number,
  height: number
): Map<string, Color> {
  const targetColor = pixels.get(pixelKey(startX, startY)) || TRANSPARENT;
  if (colorsEqual(targetColor, fillColor)) return pixels;

  const newPixels = new Map(pixels);
  const stack: [number, number][] = [[startX, startY]];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const key = pixelKey(x, y);
    if (visited.has(key)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const currentColor = newPixels.get(key) || TRANSPARENT;
    if (!colorsEqual(currentColor, targetColor)) continue;

    visited.add(key);
    newPixels.set(key, fillColor);

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return newPixels;
}

export function getLinePixels(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const pixels: [number, number][] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let cx = x0, cy = y0;
  while (true) {
    pixels.push([cx, cy]);
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
  }
  return pixels;
}

export function getRectPixels(x0: number, y0: number, x1: number, y1: number, filled: boolean): [number, number][] {
  const pixels: [number, number][] = [];
  const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      if (filled || x === minX || x === maxX || y === minY || y === maxY) {
        pixels.push([x, y]);
      }
    }
  }
  return pixels;
}

export function getCirclePixels(cx: number, cy: number, radius: number, filled: boolean): [number, number][] {
  const pixels: [number, number][] = [];
  let x = radius, y = 0, err = 1 - radius;

  const addSymmetric = (px: number, py: number) => {
    if (filled) {
      for (let i = cx - px; i <= cx + px; i++) {
        pixels.push([i, cy + py]);
        pixels.push([i, cy - py]);
      }
      for (let i = cx - py; i <= cx + py; i++) {
        pixels.push([i, cy + x]);
        pixels.push([i, cy - x]);
      }
    } else {
      pixels.push([cx + px, cy + py], [cx - px, cy + py]);
      pixels.push([cx + px, cy - py], [cx - px, cy - py]);
      pixels.push([cx + py, cy + px], [cx - py, cy + px]);
      pixels.push([cx + py, cy - px], [cx - py, cy - px]);
    }
  };

  while (x >= y) {
    addSymmetric(x, y);
    y++;
    if (err < 0) {
      err += 2 * y + 1;
    } else {
      x--;
      err += 2 * (y - x) + 1;
    }
  }
  return pixels;
}
