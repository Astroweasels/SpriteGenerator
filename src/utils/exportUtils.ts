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
  _frameDelay = 100
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

function buildPackData(
  sheet: SpriteSheet,
  scale: number,
  columns: number,
  fileName: string,
  perSequence: boolean
): { pngDataURL: string; manifest: SpriteSheetManifest; sanitizedName: string } {
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

  return { pngDataURL: sheetCanvas.toDataURL('image/png'), manifest, sanitizedName };
}

export type ExportFormat = 'generic' | 'phaser' | 'godot' | 'css';

export function exportSpriteSheetPack(
  sheet: SpriteSheet,
  scale: number,
  columns: number,
  fileName: string,
  perSequence: boolean,
  format: ExportFormat = 'generic'
): void {
  const { pngDataURL, manifest, sanitizedName } = buildPackData(sheet, scale, columns, fileName, perSequence);

  // Download PNG
  downloadDataURL(pngDataURL, `${sanitizedName}_sheet.png`);

  // Download format-specific file(s)
  setTimeout(() => {
    switch (format) {
      case 'phaser':
        downloadFormatFile(buildPhaserAtlas(manifest, sanitizedName), `${sanitizedName}_atlas.json`);
        break;
      case 'godot':
        downloadFormatFile(buildGodotSpriteFrames(manifest, sanitizedName), `${sanitizedName}.tres`);
        break;
      case 'css':
        downloadFormatFile(buildCssSpriteSheet(manifest, sanitizedName), `${sanitizedName}_sprites.css`);
        break;
      default:
        downloadFormatFile(JSON.stringify(manifest, null, 2), `${sanitizedName}_sheet.json`);
        break;
    }
  }, 100);
}

function downloadFormatFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  downloadBlob(blob, filename);
}

function buildPhaserAtlas(manifest: SpriteSheetManifest, name: string): string {
  const atlas = {
    textures: [{
      image: `${name}_sheet.png`,
      format: manifest.meta.format,
      size: manifest.meta.size,
      scale: manifest.meta.scale,
      frames: Object.entries(manifest.frames).map(([filename, data]) => ({
        filename,
        frame: data.frame,
        rotated: data.rotated,
        trimmed: data.trimmed,
        spriteSourceSize: data.spriteSourceSize,
        sourceSize: data.sourceSize,
      })),
    }],
    meta: {
      app: 'AstroSprite',
      version: '1.0',
    },
  };
  return JSON.stringify(atlas, null, 2);
}

function buildGodotSpriteFrames(manifest: SpriteSheetManifest, name: string): string {
  const animations = Object.entries(manifest.animations);
  const texturePath = `res://${name}_sheet.png`;

  let tres = `[gd_resource type="SpriteFrames" load_steps=${animations.length + 2} format=3]\n\n`;
  tres += `[ext_resource type="Texture2D" path="${texturePath}" id="1"]\n\n`;

  // Build AtlasTexture sub-resources for each frame
  let subId = 1;
  const frameSubIds: Record<string, number> = {};
  for (const [frameName, data] of Object.entries(manifest.frames)) {
    subId++;
    frameSubIds[frameName] = subId;
    const { x, y, w, h } = data.frame;
    tres += `[sub_resource type="AtlasTexture" id="${subId}"]\n`;
    tres += `atlas = ExtResource("1")\n`;
    tres += `region = Rect2(${x}, ${y}, ${w}, ${h})\n\n`;
  }

  // Build the SpriteFrames resource
  tres += `[resource]\n`;
  tres += `animations = [`;

  animations.forEach(([seqName, frameNames], idx) => {
    if (idx > 0) tres += `, `;
    tres += `{\n`;
    tres += `"loop": true,\n`;
    tres += `"name": &"${seqName}",\n`;
    tres += `"speed": 8.0,\n`;
    tres += `"frames": [`;
    frameNames.forEach((fn, fi) => {
      if (fi > 0) tres += `, `;
      const sid = frameSubIds[fn];
      if (sid) {
        tres += `{\n"duration": 1.0,\n"texture": SubResource("${sid}")\n}`;
      }
    });
    tres += `]\n}`;
  });

  tres += `]\n`;
  return tres;
}

function buildCssSpriteSheet(manifest: SpriteSheetManifest, name: string): string {
  const { w, h } = manifest.meta.size;
  let css = `/* AstroSprite CSS Sprite Sheet */\n`;
  css += `/* Image: ${name}_sheet.png (${w}x${h}) */\n\n`;

  css += `.${name}-sprite {\n`;
  css += `  background-image: url('${name}_sheet.png');\n`;
  css += `  background-repeat: no-repeat;\n`;
  css += `  display: inline-block;\n`;
  css += `}\n\n`;

  for (const [frameName, data] of Object.entries(manifest.frames)) {
    const { x, y, w: fw, h: fh } = data.frame;
    css += `.${name}-${frameName} {\n`;
    css += `  width: ${fw}px;\n`;
    css += `  height: ${fh}px;\n`;
    css += `  background-position: -${x}px -${y}px;\n`;
    css += `}\n\n`;
  }

  // Add keyframe animations for each sequence
  for (const [seqName, frameNames] of Object.entries(manifest.animations)) {
    if (frameNames.length < 2) continue;
    const safeSeqName = seqName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const stepPercent = 100 / frameNames.length;

    css += `@keyframes ${name}-${safeSeqName} {\n`;
    frameNames.forEach((fn, i) => {
      const data = manifest.frames[fn];
      if (!data) return;
      const pct = Math.round(i * stepPercent);
      css += `  ${pct}% { background-position: -${data.frame.x}px -${data.frame.y}px; }\n`;
    });
    css += `  100% { background-position: -${manifest.frames[frameNames[0]].frame.x}px -${manifest.frames[frameNames[0]].frame.y}px; }\n`;
    css += `}\n\n`;

    css += `.${name}-anim-${safeSeqName} {\n`;
    css += `  animation: ${name}-${safeSeqName} ${frameNames.length * 0.15}s steps(1) infinite;\n`;
    css += `}\n\n`;
  }

  return css;
}
