export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Pixel {
  x: number;
  y: number;
  color: Color;
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

export interface AnimationSequence {
  id: string;
  name: string;
  frameIds: string[];
}

export interface SpriteSheet {
  frames: SpriteFrame[];
  sequences: AnimationSequence[];
  width: number;
  height: number;
}

export type Tool = 'pencil' | 'eraser' | 'fill' | 'eyedropper' | 'line' | 'rect' | 'circle' | 'select' | 'move';

export interface EditorState {
  spriteSheet: SpriteSheet;
  activeFrameIndex: number;
  currentColor: Color;
  currentTool: Tool;
  gridVisible: boolean;
  zoom: number;
  undoStack: string[];
  redoStack: string[];
}

export interface PoseDefinition {
  name: string;
  description: string;
  transforms: PoseTransform[];
}

export interface PoseTransform {
  region: 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg' | 'torso' | 'head';
  offsetX: number;
  offsetY: number;
  flipX?: boolean;
  flipY?: boolean;
}

export interface RandomGenOptions {
  style: 'humanoid' | 'creature' | 'mech' | 'abstract';
  size: number;
  symmetrical: boolean;
  colorScheme: 'random' | 'warm' | 'cool' | 'monochrome' | 'complementary' | 'earth' | 'neon' | 'pastel';
  complexity: 'simple' | 'medium' | 'complex';
  generatePoses: boolean;
  poseCount: number;
  template?: string;
}
