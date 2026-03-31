// Shared types for the AstroSprite API — mirrors the frontend types
// but kept independent so the API has zero frontend dependencies.

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Layer {
  id: string;
  name: string;
  pixels: Map<string, Color>;
  visible: boolean;
  opacity: number;
}

export interface SpriteFrame {
  id: string;
  name: string;
  layers: Layer[];
  activeLayerId: string;
}

export interface SpriteSheet {
  frames: SpriteFrame[];
  width: number;
  height: number;
}

export type SpriteStyle = 'humanoid' | 'creature' | 'mech' | 'abstract' | 'object';
export type ColorScheme = 'random' | 'warm' | 'cool' | 'monochrome' | 'complementary' | 'earth' | 'neon' | 'pastel';
export type Complexity = 'simple' | 'medium' | 'complex';
export type WeaponType = 'sword' | 'dagger' | 'bow' | 'staff' | 'none';

/** RGB color for region overrides (alpha always 255) */
export interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

/** Per-region color overrides. Each region accepts 1-3 colors. */
export interface RegionColorOverrides {
  hair?: ColorRGB[];
  skin?: ColorRGB[];
  tunic?: ColorRGB[];
  arms?: ColorRGB[];
  legs?: ColorRGB[];
  feet?: ColorRGB[];
  accent?: ColorRGB[];
  outline?: ColorRGB;
}

export interface GenerateRequest {
  style: SpriteStyle;
  size: number;
  symmetrical: boolean;
  colorScheme: ColorScheme;
  complexity: Complexity;
  /** @deprecated Use selectedSequences instead. Kept for backward compatibility. */
  generatePoses: boolean;
  /** @deprecated Use selectedSequences instead. */
  poseCount: number;
  /** Optional character template name for region-based coloring */
  template?: string;
  /** Override weapon type. If omitted, uses the template default (or 'none'). */
  weapon?: WeaponType;
  /** Per-region color overrides. Applied on top of template or random colors. */
  colorOverrides?: RegionColorOverrides;
  /** Which animation sequences to generate. If omitted, falls back to legacy generatePoses/poseCount. */
  selectedSequences?: string[];
  /** For style 'object': which object variant (0-9). If omitted, random. */
  objectVariant?: number;
}

export interface GenerateResponse {
  success: true;
  spriteSheet: {
    width: number;
    height: number;
    frameCount: number;
    frameNames: string[];
    sequences: { name: string; frameIndices: number[] }[];
  };
  /** Individual frame PNGs as base64 data URIs */
  frames: string[];
  /** Combined sprite sheet PNG as a base64 data URI */
  sheet: string;
  /** Pre-signed S3 URL for the sprite sheet (when S3 is configured) */
  sheetUrl?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

// ---- Sprite interchange format (JSON-safe) ----

/** A layer in JSON-serializable form (pixels as plain object instead of Map) */
export interface LayerData {
  name: string;
  visible: boolean;
  opacity: number;
  /** Pixel map: keys are "x,y", values are [r,g,b,a] */
  pixels: Record<string, [number, number, number, number]>;
}

/** A frame in JSON-serializable form */
export interface FrameData {
  name: string;
  layers: LayerData[];
}

/** Full sprite state for round-tripping through the API */
export interface SpriteData {
  width: number;
  height: number;
  frames: FrameData[];
}

// ---- Draw endpoint types ----

export type DrawTool = 'pencil' | 'eraser' | 'fill' | 'line' | 'rect' | 'circle';

export interface DrawOperation {
  tool: DrawTool;
  /** Color as [r,g,b,a]. Required for pencil, fill, line, rect, circle. */
  color?: [number, number, number, number];
  /** Points for pencil/eraser: [[x,y], ...] */
  points?: [number, number][];
  /** Brush size for pencil/eraser (default 1) */
  brushSize?: number;
  /** For fill: target pixel */
  x?: number;
  y?: number;
  /** For line/rect/circle: start/end coordinates */
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  /** For circle: center and radius */
  cx?: number;
  cy?: number;
  radius?: number;
  /** For rect/circle: filled or outline only (default false) */
  filled?: boolean;
  /** Color cycle: array of [r,g,b,a] colors to cycle through */
  colorCycle?: [number, number, number, number][];
}

export interface DrawRequest {
  sprite: SpriteData;
  frameIndex: number;
  layerIndex: number;
  operations: DrawOperation[];
}

export interface SpriteResponse {
  success: true;
  sprite: SpriteData;
  frames: string[];
  sheet: string;
}

// ---- Import endpoint types ----

export interface ImportRequest {
  /** Base64-encoded PNG (with or without data URI prefix) */
  image: string;
  /** Max dimension to clamp to (default 128) */
  maxDim?: number;
}

// ---- Export endpoint types ----

export interface ExportRequest {
  sprite: SpriteData;
  /** Scale multiplier (default 1, max 4) */
  scale?: number;
  /** Number of columns for the sheet layout */
  columns?: number;
}

// ---- Layer endpoint types ----

export type LayerAction = 'add' | 'delete' | 'duplicate' | 'merge' | 'reorder' | 'rename' | 'visibility' | 'opacity';

export interface LayerRequest {
  sprite: SpriteData;
  frameIndex: number;
  layerIndex: number;
  action: LayerAction;
  /** For reorder: target index */
  targetIndex?: number;
  /** For rename: new name */
  name?: string;
  /** For visibility: show/hide */
  visible?: boolean;
  /** For opacity: 0-1 */
  opacity?: number;
}

// ---- Frame endpoint types ----

export type FrameAction = 'add' | 'delete' | 'duplicate';

export interface FrameRequest {
  sprite: SpriteData;
  frameIndex?: number;
  action: FrameAction;
  /** For add: optional frame name */
  name?: string;
}

// ---- Resize endpoint types ----

export interface ResizeRequest {
  sprite: SpriteData;
  width: number;
  height: number;
}
