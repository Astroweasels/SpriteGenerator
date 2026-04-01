import type { SpriteFrame, SpriteSheet } from '../types';
import { flattenLayers, colorToCSS } from './spriteUtils';

export interface SpriteSheetManifest {
  frames: Record<string, {
    frame: { x: number; y: number; w: number; h: number };
    rotated: boolean;
    trimmed: boolean;
    spriteSourceSize: { x: number; y: number; w: number; h: number };
    sourceSize: { w: number; h: number };
  }>;
  animations: Record<string, string[]>;
  meta: {
    app: string;
    version: string;
    image: string;
    format: string;
    size: { w: number; h: number };
    scale: number;
  };
}

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

function sanitizeFrameName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
}

function groupFramesBySequence(sheet: SpriteSheet): { name: string; frameIndices: number[] }[] {
  if (sheet.sequences && sheet.sequences.length > 0) {
    return sheet.sequences.map(seq => ({
      name: seq.name,
      frameIndices: seq.frameIds
        .map(id => sheet.frames.findIndex(f => f.id === id))
        .filter(i => i >= 0),
    }));
  }

  // Fallback: group by frame name pattern (e.g. "Walk 1", "Walk 2" → "Walk")
  const seqMap = new Map<string, number[]>();
  sheet.frames.forEach((frame, i) => {
    const match = frame.name.match(/^(.+?)\s+\d+$/);
    const seqName = match ? match[1] : frame.name;
    if (!seqMap.has(seqName)) seqMap.set(seqName, []);
    seqMap.get(seqName)!.push(i);
  });
  return Array.from(seqMap.entries()).map(([name, frameIndices]) => ({ name, frameIndices }));
}

export function exportSpriteSheetPack(
  sheet: SpriteSheet,
  scale: number,
  columns: number,
  fileName: string,
  perSequence: boolean
): void {
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'sprite';
  const sequences = groupFramesBySequence(sheet);
  const fw = sheet.width * scale;
  const fh = sheet.height * scale;

  let sheetCanvas: HTMLCanvasElement;
  const manifest: SpriteSheetManifest = {
    frames: {},
    animations: {},
    meta: {
      app: 'AstroSprite',
      version: '1.0',
      image: `${sanitizedName}_sheet.png`,
      format: 'RGBA8888',
      size: { w: 0, h: 0 },
      scale,
    },
  };

  if (perSequence && sequences.length > 0) {
    // Each sequence gets its own row
    const maxCols = Math.max(...sequences.map(s => s.frameIndices.length));
    const rows = sequences.length;

    sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = maxCols * fw;
    sheetCanvas.height = rows * fh;
    const ctx = sheetCanvas.getContext('2d')!;

    sequences.forEach((seq, row) => {
      const frameNames: string[] = [];
      seq.frameIndices.forEach((frameIdx, col) => {
        const frame = sheet.frames[frameIdx];
        const x = col * fw;
        const y = row * fh;
        renderFrameToCanvas(ctx, frame, sheet.width, sheet.height, scale, x, y);

        const frameName = sanitizeFrameName(frame.name);
        manifest.frames[frameName] = {
          frame: { x, y, w: fw, h: fh },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: fw, h: fh },
          sourceSize: { w: fw, h: fh },
        };
        frameNames.push(frameName);
      });
      manifest.animations[seq.name] = frameNames;
    });
  } else {
    // Standard grid layout
    const cols = Math.min(columns, sheet.frames.length);
    const rows = Math.ceil(sheet.frames.length / cols);

    sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = cols * fw;
    sheetCanvas.height = rows * fh;
    const ctx = sheetCanvas.getContext('2d')!;

    sheet.frames.forEach((frame, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * fw;
      const y = row * fh;
      renderFrameToCanvas(ctx, frame, sheet.width, sheet.height, scale, x, y);

      const frameName = sanitizeFrameName(frame.name);
      manifest.frames[frameName] = {
        frame: { x, y, w: fw, h: fh },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: fw, h: fh },
        sourceSize: { w: fw, h: fh },
      };
    });

    sequences.forEach(seq => {
      manifest.animations[seq.name] = seq.frameIndices.map(
        i => sanitizeFrameName(sheet.frames[i].name)
      );
    });
  }

  manifest.meta.size = { w: sheetCanvas.width, h: sheetCanvas.height };

  // Download PNG
  const pngDataURL = sheetCanvas.toDataURL('image/png');
  downloadDataURL(pngDataURL, `${sanitizedName}_sheet.png`);

  // Download JSON manifest with slight delay to avoid browser blocking
  setTimeout(() => {
    const jsonBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    downloadBlob(jsonBlob, `${sanitizedName}_sheet.json`);
  }, 100);
}
