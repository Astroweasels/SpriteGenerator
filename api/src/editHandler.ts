import { createCanvas, loadImage } from '@napi-rs/canvas';
import { v4 as uuidv4 } from 'uuid';
import type {
  Color, SpriteFrame, SpriteSheet, Layer,
  SpriteData, FrameData, LayerData,
  DrawRequest, DrawOperation,
  ImportRequest, ExportRequest,
  LayerRequest, FrameRequest, ResizeRequest,
  SpriteResponse, ErrorResponse,
} from './types.js';
import {
  pixelKey, parsePixelKey, createLayer, cloneLayer,
  flattenLayers, blendColor, TRANSPARENT,
  floodFill, getLinePixels, getRectPixels, getCirclePixels,
} from './spriteUtils.js';
import { renderFrameToPNG, renderSheetToPNG } from './render.js';

// ---- Serialization helpers ----

function layerFromData(data: LayerData): Layer {
  const pixels = new Map<string, Color>();
  for (const [key, [r, g, b, a]] of Object.entries(data.pixels)) {
    pixels.set(key, { r, g, b, a });
  }
  return {
    id: uuidv4(),
    name: data.name,
    pixels,
    visible: data.visible,
    opacity: data.opacity,
  };
}

function layerToData(layer: Layer): LayerData {
  const pixels: Record<string, [number, number, number, number]> = {};
  for (const [key, c] of layer.pixels) {
    pixels[key] = [c.r, c.g, c.b, c.a];
  }
  return {
    name: layer.name,
    visible: layer.visible,
    opacity: layer.opacity,
    pixels,
  };
}

function frameFromData(data: FrameData): SpriteFrame {
  const layers = data.layers.map(layerFromData);
  return {
    id: uuidv4(),
    name: data.name,
    layers,
    activeLayerId: layers[0]?.id ?? '',
  };
}

function frameToData(frame: SpriteFrame): FrameData {
  return {
    name: frame.name,
    layers: frame.layers.map(layerToData),
  };
}

function spriteFromData(data: SpriteData): SpriteSheet {
  return {
    width: data.width,
    height: data.height,
    frames: data.frames.map(frameFromData),
  };
}

function spriteToData(sheet: SpriteSheet): SpriteData {
  return {
    width: sheet.width,
    height: sheet.height,
    frames: sheet.frames.map(frameToData),
  };
}

function renderResponse(sheet: SpriteSheet, scale = 1): SpriteResponse {
  const framePNGs = sheet.frames.map(f =>
    `data:image/png;base64,${renderFrameToPNG(f, sheet.width, sheet.height, scale).toString('base64')}`
  );
  const sheetPNG = `data:image/png;base64,${renderSheetToPNG(sheet, scale).toString('base64')}`;

  return {
    success: true,
    sprite: spriteToData(sheet),
    frames: framePNGs,
    sheet: sheetPNG,
  };
}

function err(message: string): { status: number; body: ErrorResponse } {
  return { status: 400, body: { success: false, error: message } };
}

// ---- Validation helpers ----

function validateSpriteData(data: unknown): SpriteData {
  if (!data || typeof data !== 'object') throw new Error('"sprite" must be an object');
  const s = data as Record<string, unknown>;
  const width = Number(s.width);
  const height = Number(s.height);
  if (!Number.isInteger(width) || width < 1 || width > 128) throw new Error('"sprite.width" must be 1-128');
  if (!Number.isInteger(height) || height < 1 || height > 128) throw new Error('"sprite.height" must be 1-128');
  if (!Array.isArray(s.frames) || s.frames.length === 0) throw new Error('"sprite.frames" must be a non-empty array');
  if (s.frames.length > 64) throw new Error('"sprite.frames" max 64 frames');
  return { width, height, frames: s.frames as FrameData[] };
}

function toColor(arr: unknown): Color {
  if (!Array.isArray(arr) || arr.length !== 4) throw new Error('Color must be [r,g,b,a]');
  const [r, g, b, a] = arr.map(Number);
  if ([r, g, b, a].some(v => !Number.isFinite(v) || v < 0 || v > 255)) {
    throw new Error('Color values must be 0-255');
  }
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a: Math.round(a) };
}

// ---- Draw handler ----

export function handleDraw(body: unknown): { status: number; body: SpriteResponse | ErrorResponse } {
  try {
    if (!body || typeof body !== 'object') throw new Error('Request body must be a JSON object');
    const b = body as Record<string, unknown>;

    const spriteData = validateSpriteData(b.sprite);
    const sheet = spriteFromData(spriteData);

    const frameIndex = Number(b.frameIndex);
    if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= sheet.frames.length) {
      throw new Error(`"frameIndex" must be 0-${sheet.frames.length - 1}`);
    }

    const layerIndex = Number(b.layerIndex);
    const frame = sheet.frames[frameIndex];
    if (!Number.isInteger(layerIndex) || layerIndex < 0 || layerIndex >= frame.layers.length) {
      throw new Error(`"layerIndex" must be 0-${frame.layers.length - 1}`);
    }

    if (!Array.isArray(b.operations)) throw new Error('"operations" must be an array');
    if (b.operations.length > 1000) throw new Error('Max 1000 operations per request');

    const layer = frame.layers[layerIndex];

    for (const op of b.operations as DrawOperation[]) {
      applyDrawOperation(layer, op, sheet.width, sheet.height);
    }

    return { status: 200, body: renderResponse(sheet) };
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Draw failed');
  }
}

function applyDrawOperation(layer: Layer, op: DrawOperation, w: number, h: number): void {
  const tool = op.tool;
  const brushSize = Math.max(1, Math.min(op.brushSize ?? 1, 32));

  switch (tool) {
    case 'pencil': {
      if (!op.points || !Array.isArray(op.points)) throw new Error('pencil requires "points"');
      const colors = op.colorCycle && op.colorCycle.length > 0 ? op.colorCycle : null;
      let cycleIdx = 0;
      const offset = Math.floor(brushSize / 2);
      for (const [px, py] of op.points) {
        const color = colors ? toColor(colors[cycleIdx % colors.length]) : toColor(op.color);
        if (colors) cycleIdx++;
        for (let dy = 0; dy < brushSize; dy++) {
          for (let dx = 0; dx < brushSize; dx++) {
            const x = px - offset + dx, y = py - offset + dy;
            if (x >= 0 && x < w && y >= 0 && y < h) {
              layer.pixels.set(pixelKey(x, y), color);
            }
          }
        }
      }
      break;
    }
    case 'eraser': {
      if (!op.points || !Array.isArray(op.points)) throw new Error('eraser requires "points"');
      const offset = Math.floor(brushSize / 2);
      for (const [px, py] of op.points) {
        for (let dy = 0; dy < brushSize; dy++) {
          for (let dx = 0; dx < brushSize; dx++) {
            const x = px - offset + dx, y = py - offset + dy;
            if (x >= 0 && x < w && y >= 0 && y < h) {
              layer.pixels.delete(pixelKey(x, y));
            }
          }
        }
      }
      break;
    }
    case 'fill': {
      if (op.x === undefined || op.y === undefined) throw new Error('fill requires "x" and "y"');
      const color = toColor(op.color);
      const newPixels = floodFill(layer.pixels, op.x, op.y, color, w, h);
      layer.pixels = newPixels;
      break;
    }
    case 'line': {
      if (op.x1 === undefined || op.y1 === undefined || op.x2 === undefined || op.y2 === undefined) {
        throw new Error('line requires "x1", "y1", "x2", "y2"');
      }
      const color = toColor(op.color);
      for (const [x, y] of getLinePixels(op.x1, op.y1, op.x2, op.y2)) {
        if (x >= 0 && x < w && y >= 0 && y < h) {
          layer.pixels.set(pixelKey(x, y), color);
        }
      }
      break;
    }
    case 'rect': {
      if (op.x1 === undefined || op.y1 === undefined || op.x2 === undefined || op.y2 === undefined) {
        throw new Error('rect requires "x1", "y1", "x2", "y2"');
      }
      const color = toColor(op.color);
      for (const [x, y] of getRectPixels(op.x1, op.y1, op.x2, op.y2, op.filled ?? false)) {
        if (x >= 0 && x < w && y >= 0 && y < h) {
          layer.pixels.set(pixelKey(x, y), color);
        }
      }
      break;
    }
    case 'circle': {
      if (op.cx === undefined || op.cy === undefined || op.radius === undefined) {
        throw new Error('circle requires "cx", "cy", "radius"');
      }
      const color = toColor(op.color);
      for (const [x, y] of getCirclePixels(op.cx, op.cy, op.radius, op.filled ?? false)) {
        if (x >= 0 && x < w && y >= 0 && y < h) {
          layer.pixels.set(pixelKey(x, y), color);
        }
      }
      break;
    }
    default:
      throw new Error(`Unknown tool "${tool}". Use: pencil, eraser, fill, line, rect, circle`);
  }
}

// ---- Import handler ----

export async function handleImport(body: unknown): Promise<{ status: number; body: SpriteResponse | ErrorResponse }> {
  try {
    if (!body || typeof body !== 'object') throw new Error('Request body must be a JSON object');
    const b = body as Record<string, unknown>;

    if (!b.image || typeof b.image !== 'string') throw new Error('"image" must be a base64-encoded PNG string');

    // Strip data URI prefix if present
    let base64 = b.image as string;
    const match = base64.match(/^data:image\/\w+;base64,(.+)$/);
    if (match) base64 = match[1];

    // Validate base64 length (limit ~4MB decoded)
    if (base64.length > 5_500_000) throw new Error('Image too large (max ~4MB)');

    const buffer = Buffer.from(base64, 'base64');
    const img = await loadImage(buffer);

    const maxDim = Math.max(1, Math.min(Number(b.maxDim) || 128, 128));
    let w = img.width;
    let h = img.height;

    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    // Draw to canvas and extract pixels
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const pixels = new Map<string, Color>();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i], g = data[i + 1], b2 = data[i + 2], a = data[i + 3];
        if (a > 0) {
          pixels.set(pixelKey(x, y), { r, g, b: b2, a });
        }
      }
    }

    const layer: Layer = {
      id: uuidv4(),
      name: 'Imported',
      pixels,
      visible: true,
      opacity: 1,
    };

    const frame: SpriteFrame = {
      id: uuidv4(),
      name: 'Frame 1',
      layers: [layer],
      activeLayerId: layer.id,
    };

    const sheet: SpriteSheet = { width: w, height: h, frames: [frame] };
    return { status: 200, body: renderResponse(sheet) };
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Import failed');
  }
}

// ---- Export handler ----

export function handleExport(body: unknown): { status: number; body: SpriteResponse | ErrorResponse } {
  try {
    if (!body || typeof body !== 'object') throw new Error('Request body must be a JSON object');
    const b = body as Record<string, unknown>;

    const spriteData = validateSpriteData(b.sprite);
    const sheet = spriteFromData(spriteData);
    const scale = Math.max(1, Math.min(Number(b.scale) || 1, 4));
    const columns = b.columns ? Math.max(1, Number(b.columns)) : undefined;

    const framePNGs = sheet.frames.map(f =>
      `data:image/png;base64,${renderFrameToPNG(f, sheet.width, sheet.height, scale).toString('base64')}`
    );
    const sheetPNG = `data:image/png;base64,${renderSheetToPNG(sheet, scale, columns).toString('base64')}`;

    return {
      status: 200,
      body: {
        success: true,
        sprite: spriteData,
        frames: framePNGs,
        sheet: sheetPNG,
      },
    };
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Export failed');
  }
}

// ---- Layers handler ----

export function handleLayers(body: unknown): { status: number; body: SpriteResponse | ErrorResponse } {
  try {
    if (!body || typeof body !== 'object') throw new Error('Request body must be a JSON object');
    const b = body as Record<string, unknown>;

    const spriteData = validateSpriteData(b.sprite);
    const sheet = spriteFromData(spriteData);

    const frameIndex = Number(b.frameIndex);
    if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= sheet.frames.length) {
      throw new Error(`"frameIndex" must be 0-${sheet.frames.length - 1}`);
    }

    const frame = sheet.frames[frameIndex];
    const action = b.action as string;
    const layerIndex = Number(b.layerIndex);

    switch (action) {
      case 'add': {
        if (frame.layers.length >= 16) throw new Error('Max 16 layers per frame');
        const name = typeof b.name === 'string' ? b.name : `Layer ${frame.layers.length + 1}`;
        frame.layers.push(createLayer(name));
        break;
      }
      case 'delete': {
        if (!Number.isInteger(layerIndex) || layerIndex < 0 || layerIndex >= frame.layers.length) {
          throw new Error(`"layerIndex" must be 0-${frame.layers.length - 1}`);
        }
        if (frame.layers.length <= 1) throw new Error('Cannot delete the last layer');
        frame.layers.splice(layerIndex, 1);
        break;
      }
      case 'duplicate': {
        if (!Number.isInteger(layerIndex) || layerIndex < 0 || layerIndex >= frame.layers.length) {
          throw new Error(`"layerIndex" must be 0-${frame.layers.length - 1}`);
        }
        if (frame.layers.length >= 16) throw new Error('Max 16 layers per frame');
        const clone = cloneLayer(frame.layers[layerIndex]);
        frame.layers.splice(layerIndex + 1, 0, clone);
        break;
      }
      case 'merge': {
        if (!Number.isInteger(layerIndex) || layerIndex < 1 || layerIndex >= frame.layers.length) {
          throw new Error(`"layerIndex" must be 1-${frame.layers.length - 1} (merges down)`);
        }
        const upper = frame.layers[layerIndex];
        const lower = frame.layers[layerIndex - 1];
        for (const [key, color] of upper.pixels) {
          const existing = lower.pixels.get(key) || TRANSPARENT;
          lower.pixels.set(key, blendColor(existing, color));
        }
        frame.layers.splice(layerIndex, 1);
        break;
      }
      case 'reorder': {
        if (!Number.isInteger(layerIndex) || layerIndex < 0 || layerIndex >= frame.layers.length) {
          throw new Error(`"layerIndex" must be 0-${frame.layers.length - 1}`);
        }
        const targetIndex = Number(b.targetIndex);
        if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= frame.layers.length) {
          throw new Error(`"targetIndex" must be 0-${frame.layers.length - 1}`);
        }
        const [moved] = frame.layers.splice(layerIndex, 1);
        frame.layers.splice(targetIndex, 0, moved);
        break;
      }
      case 'rename': {
        if (!Number.isInteger(layerIndex) || layerIndex < 0 || layerIndex >= frame.layers.length) {
          throw new Error(`"layerIndex" must be 0-${frame.layers.length - 1}`);
        }
        if (typeof b.name !== 'string') throw new Error('"name" is required for rename');
        frame.layers[layerIndex].name = b.name;
        break;
      }
      case 'visibility': {
        if (!Number.isInteger(layerIndex) || layerIndex < 0 || layerIndex >= frame.layers.length) {
          throw new Error(`"layerIndex" must be 0-${frame.layers.length - 1}`);
        }
        frame.layers[layerIndex].visible = b.visible !== false;
        break;
      }
      case 'opacity': {
        if (!Number.isInteger(layerIndex) || layerIndex < 0 || layerIndex >= frame.layers.length) {
          throw new Error(`"layerIndex" must be 0-${frame.layers.length - 1}`);
        }
        const opacity = Number(b.opacity);
        if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
          throw new Error('"opacity" must be 0-1');
        }
        frame.layers[layerIndex].opacity = opacity;
        break;
      }
      default:
        throw new Error(`Unknown action "${action}". Use: add, delete, duplicate, merge, reorder, rename, visibility, opacity`);
    }

    return { status: 200, body: renderResponse(sheet) };
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Layer operation failed');
  }
}

// ---- Frames handler ----

export function handleFrames(body: unknown): { status: number; body: SpriteResponse | ErrorResponse } {
  try {
    if (!body || typeof body !== 'object') throw new Error('Request body must be a JSON object');
    const b = body as Record<string, unknown>;

    const spriteData = validateSpriteData(b.sprite);
    const sheet = spriteFromData(spriteData);
    const action = b.action as string;

    switch (action) {
      case 'add': {
        if (sheet.frames.length >= 64) throw new Error('Max 64 frames');
        const name = typeof b.name === 'string' ? b.name : `Frame ${sheet.frames.length + 1}`;
        const layer = createLayer();
        sheet.frames.push({
          id: uuidv4(),
          name,
          layers: [layer],
          activeLayerId: layer.id,
        });
        break;
      }
      case 'delete': {
        const frameIndex = Number(b.frameIndex);
        if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= sheet.frames.length) {
          throw new Error(`"frameIndex" must be 0-${sheet.frames.length - 1}`);
        }
        if (sheet.frames.length <= 1) throw new Error('Cannot delete the last frame');
        sheet.frames.splice(frameIndex, 1);
        break;
      }
      case 'duplicate': {
        const frameIndex = Number(b.frameIndex);
        if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= sheet.frames.length) {
          throw new Error(`"frameIndex" must be 0-${sheet.frames.length - 1}`);
        }
        if (sheet.frames.length >= 64) throw new Error('Max 64 frames');
        const src = sheet.frames[frameIndex];
        const newLayers = src.layers.map(cloneLayer);
        sheet.frames.splice(frameIndex + 1, 0, {
          id: uuidv4(),
          name: `${src.name} (copy)`,
          layers: newLayers,
          activeLayerId: newLayers[0]?.id ?? '',
        });
        break;
      }
      default:
        throw new Error(`Unknown action "${action}". Use: add, delete, duplicate`);
    }

    return { status: 200, body: renderResponse(sheet) };
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Frame operation failed');
  }
}

// ---- Resize handler ----

export function handleResize(body: unknown): { status: number; body: SpriteResponse | ErrorResponse } {
  try {
    if (!body || typeof body !== 'object') throw new Error('Request body must be a JSON object');
    const b = body as Record<string, unknown>;

    const spriteData = validateSpriteData(b.sprite);
    const sheet = spriteFromData(spriteData);

    const newWidth = Number((b as Record<string, unknown>).width);
    const newHeight = Number((b as Record<string, unknown>).height);
    if (!Number.isInteger(newWidth) || newWidth < 1 || newWidth > 128) throw new Error('"width" must be 1-128');
    if (!Number.isInteger(newHeight) || newHeight < 1 || newHeight > 128) throw new Error('"height" must be 1-128');

    // Crop pixels that fall outside the new bounds
    for (const frame of sheet.frames) {
      for (const layer of frame.layers) {
        for (const key of layer.pixels.keys()) {
          const [x, y] = parsePixelKey(key);
          if (x >= newWidth || y >= newHeight) {
            layer.pixels.delete(key);
          }
        }
      }
    }

    sheet.width = newWidth;
    sheet.height = newHeight;

    return { status: 200, body: renderResponse(sheet) };
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Resize failed');
  }
}
