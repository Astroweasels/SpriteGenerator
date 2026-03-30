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

export function createLayer(name = 'Layer 1'): Layer {
  return {
    id: uuidv4(),
    name,
    pixels: new Map(),
    visible: true,
    opacity: 1,
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
