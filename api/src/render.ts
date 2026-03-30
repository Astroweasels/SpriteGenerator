import { createCanvas } from '@napi-rs/canvas';
import type { Color, SpriteFrame, SpriteSheet } from './types.js';
import { flattenLayers } from './spriteUtils.js';

/**
 * Render a single frame to a PNG buffer.
 */
export function renderFrameToPNG(
  frame: SpriteFrame,
  width: number,
  height: number,
  scale = 1
): Buffer {
  const canvas = createCanvas(width * scale, height * scale);
  const ctx = canvas.getContext('2d');

  const pixels = flattenLayers(frame.layers, width, height);
  for (const [key, color] of pixels) {
    if (color.a === 0) continue;
    const [x, y] = key.split(',').map(Number);
    ctx.fillStyle = colorToCSS(color);
    ctx.fillRect(x * scale, y * scale, scale, scale);
  }

  return canvas.toBuffer('image/png');
}

/**
 * Render all frames as a horizontal sprite sheet PNG buffer.
 */
export function renderSheetToPNG(
  sheet: SpriteSheet,
  scale = 1,
  columns?: number
): Buffer {
  const cols = columns || sheet.frames.length;
  const rows = Math.ceil(sheet.frames.length / cols);
  const canvas = createCanvas(cols * sheet.width * scale, rows * sheet.height * scale);
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < sheet.frames.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const frame = sheet.frames[i];
    const pixels = flattenLayers(frame.layers, sheet.width, sheet.height);

    for (const [key, color] of pixels) {
      if (color.a === 0) continue;
      const [x, y] = key.split(',').map(Number);
      ctx.fillStyle = colorToCSS(color);
      ctx.fillRect(
        (col * sheet.width + x) * scale,
        (row * sheet.height + y) * scale,
        scale,
        scale
      );
    }
  }

  return canvas.toBuffer('image/png');
}

function colorToCSS(c: Color): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a / 255})`;
}
