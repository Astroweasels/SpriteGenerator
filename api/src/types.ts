// Shared types for the SpriteForge API — mirrors the frontend types
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

export type SpriteStyle = 'humanoid' | 'creature' | 'mech' | 'abstract';
export type ColorScheme = 'random' | 'warm' | 'cool' | 'monochrome' | 'complementary' | 'earth' | 'neon' | 'pastel';
export type Complexity = 'simple' | 'medium' | 'complex';

export interface GenerateRequest {
  style: SpriteStyle;
  size: number;
  symmetrical: boolean;
  colorScheme: ColorScheme;
  complexity: Complexity;
  generatePoses: boolean;
  poseCount: number;
}

export interface GenerateResponse {
  success: true;
  spriteSheet: {
    width: number;
    height: number;
    frameCount: number;
    frameNames: string[];
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
