import type { Color } from '../types';
import { pixelKey } from './spriteUtils';

/**
 * Read a PNG file and extract pixel data as a Map<string, Color>.
 * Clamps to maxDim on each axis.
 */
export function importPng(
  file: File,
  maxDim: number = 128
): Promise<{ pixels: Map<string, Color>; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        const w = Math.min(img.width, maxDim);
        const h = Math.min(img.height, maxDim);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);

        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const pixels = new Map<string, Color>();

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const a = data[i + 3];
            if (a === 0) continue; // skip fully transparent
            pixels.set(pixelKey(x, y), {
              r: data[i],
              g: data[i + 1],
              b: data[i + 2],
              a,
            });
          }
        }

        resolve({ pixels, width: w, height: h });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
