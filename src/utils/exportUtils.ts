import { Color, SpriteFrame, SpriteSheet } from '../types';
import { flattenLayers, pixelKey, colorToCSS } from './spriteUtils';

export function renderFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  frame: SpriteFrame,
  width: number,
  height: number,
  scale = 1,
  offsetX = 0,
  offsetY = 0
): void {
  const pixels = flattenLayers(frame.layers, width, height);
  for (const [key, color] of pixels) {
    if (color.a === 0) continue;
    const [x, y] = key.split(',').map(Number);
    ctx.fillStyle = colorToCSS(color);
    ctx.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale);
  }
}

export function exportFrameAsPNG(
  frame: SpriteFrame,
  width: number,
  height: number,
  scale = 1
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  renderFrameToCanvas(ctx, frame, width, height, scale);
  return canvas.toDataURL('image/png');
}

export function exportSpriteSheetAsPNG(
  sheet: SpriteSheet,
  scale = 1,
  columns?: number
): string {
  const cols = columns || sheet.frames.length;
  const rows = Math.ceil(sheet.frames.length / cols);
  const canvas = document.createElement('canvas');
  canvas.width = cols * sheet.width * scale;
  canvas.height = rows * sheet.height * scale;
  const ctx = canvas.getContext('2d')!;

  sheet.frames.forEach((frame, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    renderFrameToCanvas(
      ctx, frame, sheet.width, sheet.height, scale,
      col * sheet.width * scale,
      row * sheet.height * scale
    );
  });

  return canvas.toDataURL('image/png');
}

export function exportAsGIF(
  sheet: SpriteSheet,
  scale = 1,
  frameDelay = 100
): Promise<Blob> {
  // Simple GIF export using canvas frames
  // For a real GIF we'd need a library, but we can export as animated PNG sequence
  // For now, export as sprite sheet and let user know
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = sheet.width * scale;
    canvas.height = sheet.height * scale;
    const ctx = canvas.getContext('2d')!;

    // Just export first frame as fallback
    renderFrameToCanvas(ctx, sheet.frames[0], sheet.width, sheet.height, scale);
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, 'image/png');
  });
}

export function downloadDataURL(dataURL: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  downloadDataURL(url, filename);
  URL.revokeObjectURL(url);
}
