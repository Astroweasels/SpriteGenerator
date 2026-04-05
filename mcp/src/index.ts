#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = process.env.ASTROSPRITE_API_URL ?? 'https://api.astrosprite.com';

// ---- Helper ----

async function callApi(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

// ---- Shared sub-schemas ----

const ColorRGB = z.object({ r: z.number().int().min(0).max(255), g: z.number().int().min(0).max(255), b: z.number().int().min(0).max(255) });

const ColorOverrides = z.object({
  hair:    z.array(ColorRGB).optional(),
  skin:    z.array(ColorRGB).optional(),
  tunic:   z.array(ColorRGB).optional(),
  arms:    z.array(ColorRGB).optional(),
  legs:    z.array(ColorRGB).optional(),
  feet:    z.array(ColorRGB).optional(),
  accent:  z.array(ColorRGB).optional(),
  outline: ColorRGB.optional(),
}).optional();

// SpriteData is passed through opaquely between calls — accept any object
const SpriteData = z.record(z.unknown());

// ---- Server ----

const server = new McpServer({
  name: 'astrosprite',
  version: '1.0.0',
});

// ---- Tool: generate_sprite ----

server.tool(
  'generate_sprite',
  'Generate a pixel art sprite with optional animations and weapons. Returns frame PNGs as base64 data URIs and a sprite data object you can pass to other tools.',
  {
    style: z.enum(['humanoid', 'creature', 'mech', 'abstract', 'object'])
      .describe('The visual style of the sprite'),
    size: z.number().int().min(8).max(128).default(32)
      .describe('Canvas size in pixels (square). 32 is the recommended default for game sprites'),
    symmetrical: z.boolean().default(true)
      .describe('Mirror the sprite horizontally for a clean look'),
    colorScheme: z.enum(['random', 'warm', 'cool', 'monochrome', 'complementary', 'earth', 'neon', 'pastel']).default('random')
      .describe('Overall color palette'),
    complexity: z.enum(['simple', 'medium', 'complex']).default('medium')
      .describe('Level of detail in the generated sprite'),
    template: z.string().optional()
      .describe('Named character template. Humanoid options: adventurer, knight, mage, ranger, rogue, soldier, paladin, necromancer, barbarian. Mech options: robot, tank, scout'),
    weapon: z.enum(['sword', 'dagger', 'bow', 'staff', 'none']).optional()
      .describe('Weapon to add to humanoid sprites'),
    selectedSequences: z.array(z.string()).optional()
      .describe('Animation sequences to generate. Options: Idle, Walk, Jump, Attack Slash, Attack Thrust, Attack Overhead, Death. Omit for a single static frame'),
    colorOverrides: ColorOverrides
      .describe('Per-region color overrides. Each region takes an array of colors for variety'),
    objectVariant: z.number().int().min(0).max(9).optional()
      .describe('For style=object only. 0=Pine Tree, 1=Oak Tree, 2=Bush, 3=Rock, 4=House, 5=Chest, 6=Barrel, 7=Potion, 8=Crystal, 9=Campfire'),
  },
  async (params) => {
    const result = await callApi('/generate', params);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ---- Tool: draw_on_sprite ----

const DrawOperation = z.object({
  tool: z.enum(['pencil', 'eraser', 'fill', 'line', 'rect', 'circle'])
    .describe('Drawing tool to use'),
  color: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional()
    .describe('RGBA color as [r, g, b, a] with values 0-255'),
  colorCycle: z.array(z.tuple([z.number(), z.number(), z.number(), z.number()])).optional()
    .describe('Array of RGBA colors — pencil cycles through them per point. Use for rainbow or fire effects'),
  points: z.array(z.tuple([z.number(), z.number()])).optional()
    .describe('Array of [x, y] pixel coordinates (pencil tool)'),
  x: z.number().int().optional().describe('X coordinate (fill tool)'),
  y: z.number().int().optional().describe('Y coordinate (fill tool)'),
  x1: z.number().int().optional().describe('Start X (line, rect, circle)'),
  y1: z.number().int().optional().describe('Start Y (line, rect, circle)'),
  x2: z.number().int().optional().describe('End X (line, rect)'),
  y2: z.number().int().optional().describe('End Y (line, rect)'),
  cx: z.number().int().optional().describe('Center X (circle)'),
  cy: z.number().int().optional().describe('Center Y (circle)'),
  radius: z.number().int().optional().describe('Radius (circle)'),
  filled: z.boolean().optional().describe('Fill the shape solid (rect, circle)'),
  brushSize: z.number().int().min(1).optional().describe('Brush size in pixels'),
});

server.tool(
  'draw_on_sprite',
  'Apply drawing operations to a sprite. Use pencil, fill, line, rect, or circle to paint pixels. Pass the sprite object returned from generate_sprite or a previous draw call.',
  {
    sprite: SpriteData.describe('The sprite data object from a previous generate_sprite or draw_on_sprite call'),
    frameIndex: z.number().int().min(0).default(0).describe('Which animation frame to draw on (0-indexed)'),
    layerIndex: z.number().int().min(0).default(0).describe('Which layer to draw on (0-indexed)'),
    operations: z.array(DrawOperation).describe('List of drawing operations to apply in order'),
  },
  async (params) => {
    const result = await callApi('/draw', params);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ---- Tool: import_image ----

server.tool(
  'import_image',
  'Import a PNG image as a sprite by providing its base64-encoded data. The image will be scaled down to fit within maxDim pixels.',
  {
    imageData: z.string().describe('Base64-encoded PNG image, optionally prefixed with data:image/png;base64,'),
    maxDim: z.number().int().min(8).max(128).default(64).describe('Maximum width or height of the imported sprite in pixels'),
  },
  async (params) => {
    const result = await callApi('/import', params);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ---- Tool: export_sprite ----

server.tool(
  'export_sprite',
  'Render a sprite to PNG images. Returns individual frame PNGs and a combined sprite sheet as base64 data URIs, plus a JSON manifest for game engines.',
  {
    sprite: SpriteData.describe('The sprite data object to export'),
    scale: z.number().int().min(1).max(8).default(2).describe('Scale factor — 2 means each pixel becomes a 2×2 block'),
    columns: z.number().int().min(1).default(4).describe('Number of columns in the sprite sheet'),
    fileName: z.string().default('sprite').describe('Base name for the exported files'),
    perSequence: z.boolean().default(false).describe('If true, export one sheet per animation sequence'),
  },
  async (params) => {
    const result = await callApi('/export', params);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ---- Tool: manage_layers ----

server.tool(
  'manage_layers',
  'Add, delete, duplicate, reorder, merge, or rename layers in a sprite frame.',
  {
    sprite: SpriteData.describe('The sprite data object'),
    frameIndex: z.number().int().min(0).default(0).describe('Which animation frame to operate on'),
    action: z.enum(['add', 'delete', 'duplicate', 'move', 'merge', 'rename', 'setOpacity', 'setVisible'])
      .describe('Layer operation to perform'),
    layerIndex: z.number().int().min(0).optional().describe('Index of the layer to operate on'),
    targetIndex: z.number().int().min(0).optional().describe('Destination index for move action'),
    name: z.string().optional().describe('New name for rename action'),
    opacity: z.number().min(0).max(1).optional().describe('Opacity 0-1 for setOpacity action'),
    visible: z.boolean().optional().describe('Visibility flag for setVisible action'),
  },
  async (params) => {
    const result = await callApi('/layers', params);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ---- Tool: manage_frames ----

server.tool(
  'manage_frames',
  'Add, delete, duplicate, or reorder animation frames in a sprite.',
  {
    sprite: SpriteData.describe('The sprite data object'),
    action: z.enum(['add', 'delete', 'duplicate', 'move', 'rename'])
      .describe('Frame operation to perform'),
    frameIndex: z.number().int().min(0).optional().describe('Index of the frame to operate on'),
    targetIndex: z.number().int().min(0).optional().describe('Destination index for move action'),
    name: z.string().optional().describe('New name for add or rename action'),
  },
  async (params) => {
    const result = await callApi('/frames', params);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ---- Tool: resize_canvas ----

server.tool(
  'resize_canvas',
  'Change the canvas dimensions of a sprite. Pixels are anchored to the top-left by default.',
  {
    sprite: SpriteData.describe('The sprite data object'),
    width: z.number().int().min(8).max(128).describe('New canvas width in pixels'),
    height: z.number().int().min(8).max(128).describe('New canvas height in pixels'),
    anchor: z.enum(['top-left', 'center']).default('top-left')
      .describe('Where to anchor existing pixels when resizing'),
  },
  async (params) => {
    const result = await callApi('/resize', params);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ---- Start ----

const transport = new StdioServerTransport();
await server.connect(transport);
