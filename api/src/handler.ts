import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import type { GenerateRequest, GenerateResponse, ErrorResponse, WeaponType, RegionColorOverrides, ColorRGB, SpriteSheetManifest } from './types.js';
import { generateRandomSprite, POSE_SEQUENCE_NAMES } from './generate.js';
import { renderFrameToPNG, renderSheetToPNG } from './render.js';
import { TEMPLATE_NAMES } from './templates.js';
import { handleDraw, handleImport, handleExport, handleLayers, handleFrames, handleResize } from './editHandler.js';

// ---- Constants & validation ----

const VALID_STYLES = ['humanoid', 'creature', 'mech', 'abstract', 'object'] as const;
const VALID_SCHEMES = ['random', 'warm', 'cool', 'monochrome', 'complementary', 'earth', 'neon', 'pastel'] as const;
const VALID_COMPLEXITY = ['simple', 'medium', 'complex'] as const;
const VALID_WEAPONS = ['sword', 'dagger', 'bow', 'staff', 'none'] as const;
const MAX_SIZE = 128;
const MIN_SIZE = 8;
const MAX_POSES = 7;

const S3_BUCKET = process.env.SPRITE_BUCKET;
const S3_REGION = process.env.AWS_REGION || 'us-east-1';
const URL_EXPIRY = 900; // 15 minutes

function validateColorRGB(c: unknown, label: string): ColorRGB {
  if (!c || typeof c !== 'object') throw new Error(`${label} must be an object with r, g, b`);
  const o = c as Record<string, unknown>;
  const r = Number(o.r), g = Number(o.g), b = Number(o.b);
  if ([r, g, b].some(v => !Number.isFinite(v) || v < 0 || v > 255)) {
    throw new Error(`${label} r/g/b must be 0-255`);
  }
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

function validateRequest(body: unknown): GenerateRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const b = body as Record<string, unknown>;

  const style = b.style;
  if (!style || !VALID_STYLES.includes(style as typeof VALID_STYLES[number])) {
    throw new Error(`"style" must be one of: ${VALID_STYLES.join(', ')}`);
  }

  const size = Number(b.size);
  if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) {
    throw new Error(`"size" must be an integer between ${MIN_SIZE} and ${MAX_SIZE}`);
  }

  const symmetrical = b.symmetrical !== undefined ? Boolean(b.symmetrical) : true;

  const colorScheme = b.colorScheme || 'random';
  if (!VALID_SCHEMES.includes(colorScheme as typeof VALID_SCHEMES[number])) {
    throw new Error(`"colorScheme" must be one of: ${VALID_SCHEMES.join(', ')}`);
  }

  const complexity = b.complexity || 'medium';
  if (!VALID_COMPLEXITY.includes(complexity as typeof VALID_COMPLEXITY[number])) {
    throw new Error(`"complexity" must be one of: ${VALID_COMPLEXITY.join(', ')}`);
  }

  const generatePoses = b.generatePoses !== undefined ? Boolean(b.generatePoses) : false;
  const poseCount = generatePoses ? Math.min(Number(b.poseCount) || 4, MAX_POSES) : 0;

  // Template
  let template: string | undefined;
  if (b.template) {
    if (typeof b.template !== 'string' || !TEMPLATE_NAMES.includes(b.template)) {
      throw new Error(`"template" must be one of: ${TEMPLATE_NAMES.join(', ')}`);
    }
    template = b.template;
  }

  // Weapon
  let weapon: WeaponType | undefined;
  if (b.weapon !== undefined) {
    if (!VALID_WEAPONS.includes(b.weapon as typeof VALID_WEAPONS[number])) {
      throw new Error(`"weapon" must be one of: ${VALID_WEAPONS.join(', ')}`);
    }
    weapon = b.weapon as WeaponType;
  }

  // Color overrides
  let colorOverrides: RegionColorOverrides | undefined;
  if (b.colorOverrides && typeof b.colorOverrides === 'object') {
    const co = b.colorOverrides as Record<string, unknown>;
    colorOverrides = {};
    const regionKeys = ['hair', 'skin', 'tunic', 'arms', 'legs', 'feet', 'accent'] as const;
    for (const key of regionKeys) {
      if (co[key] && Array.isArray(co[key])) {
        colorOverrides[key] = (co[key] as unknown[]).map((c, i) =>
          validateColorRGB(c, `colorOverrides.${key}[${i}]`)
        );
      }
    }
    if (co.outline) {
      colorOverrides.outline = validateColorRGB(co.outline, 'colorOverrides.outline');
    }
  }

  // Selected sequences
  let selectedSequences: string[] | undefined;
  if (b.selectedSequences && Array.isArray(b.selectedSequences)) {
    const valid = b.selectedSequences.filter(
      (s): s is string => typeof s === 'string' && POSE_SEQUENCE_NAMES.includes(s)
    );
    if (valid.length > 0) selectedSequences = valid;
  }

  // Object variant
  let objectVariant: number | undefined;
  if (b.objectVariant !== undefined) {
    const v = Number(b.objectVariant);
    if (!Number.isInteger(v) || v < 0 || v > 9) {
      throw new Error('"objectVariant" must be an integer 0-9');
    }
    objectVariant = v;
  }

  return {
    style: style as GenerateRequest['style'],
    size,
    symmetrical,
    colorScheme: colorScheme as GenerateRequest['colorScheme'],
    complexity: complexity as GenerateRequest['complexity'],
    generatePoses,
    poseCount,
    ...(template ? { template } : {}),
    ...(weapon ? { weapon } : {}),
    ...(colorOverrides ? { colorOverrides } : {}),
    ...(selectedSequences ? { selectedSequences } : {}),
    ...(objectVariant !== undefined ? { objectVariant } : {}),
  };
}

// ---- S3 upload helper ----

async function uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
  const client = new S3Client({ region: S3_REGION });
  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  const url = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    { expiresIn: URL_EXPIRY }
  );
  // Return a GET-compatible pre-signed URL
  return url.split('?')[0] + '?' + new URL(url).searchParams.toString();
}

// ---- Sequence grouping helper ----

function buildSequences(frameNames: string[]): { name: string; frameIndices: number[] }[] {
  const seqMap = new Map<string, number[]>();
  for (let i = 0; i < frameNames.length; i++) {
    // Frame names are like "Walk 1", "Walk 2", "Attack Slash 1" etc.
    // Sequence name = everything before the trailing number
    const match = frameNames[i].match(/^(.+?)\s+\d+$/);
    const seqName = match ? match[1] : frameNames[i];
    if (!seqMap.has(seqName)) seqMap.set(seqName, []);
    seqMap.get(seqName)!.push(i);
  }
  return Array.from(seqMap.entries()).map(([name, frameIndices]) => ({ name, frameIndices }));
}

// ---- Engine format builders ----

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
    meta: { app: 'AstroSprite', version: '1.0' },
  };
  return JSON.stringify(atlas, null, 2);
}

function buildGodotSpriteFrames(manifest: SpriteSheetManifest, name: string): string {
  const animations = Object.entries(manifest.animations);
  const texturePath = `res://${name}_sheet.png`;

  let tres = `[gd_resource type="SpriteFrames" load_steps=${animations.length + 2} format=3]\n\n`;
  tres += `[ext_resource type="Texture2D" path="${texturePath}" id="1"]\n\n`;

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

  tres += `[resource]\nanimations = [`;
  animations.forEach(([seqName, frameNames], idx) => {
    if (idx > 0) tres += `, `;
    tres += `{\n"loop": true,\n"name": &"${seqName}",\n"speed": 8.0,\n"frames": [`;
    frameNames.forEach((fn, fi) => {
      if (fi > 0) tres += `, `;
      const sid = frameSubIds[fn];
      if (sid) tres += `{\n"duration": 1.0,\n"texture": SubResource("${sid}")\n}`;
    });
    tres += `]\n}`;
  });
  tres += `]\n`;
  return tres;
}

function buildCssSpriteSheet(manifest: SpriteSheetManifest, name: string): string {
  const { w, h } = manifest.meta.size;
  let css = `/* AstroSprite CSS Sprite Sheet */\n/* Image: ${name}_sheet.png (${w}x${h}) */\n\n`;
  css += `.${name}-sprite {\n  background-image: url('${name}_sheet.png');\n  background-repeat: no-repeat;\n  display: inline-block;\n}\n\n`;

  for (const [frameName, data] of Object.entries(manifest.frames)) {
    const { x, y, w: fw, h: fh } = data.frame;
    css += `.${name}-${frameName} { width: ${fw}px; height: ${fh}px; background-position: -${x}px -${y}px; }\n`;
  }
  css += `\n`;

  for (const [seqName, frameNames] of Object.entries(manifest.animations)) {
    if (frameNames.length < 2) continue;
    const safeSeqName = seqName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const stepPercent = 100 / frameNames.length;
    css += `@keyframes ${name}-${safeSeqName} {\n`;
    frameNames.forEach((fn, i) => {
      const data = manifest.frames[fn];
      if (!data) return;
      css += `  ${Math.round(i * stepPercent)}% { background-position: -${data.frame.x}px -${data.frame.y}px; }\n`;
    });
    css += `  100% { background-position: -${manifest.frames[frameNames[0]].frame.x}px -${manifest.frames[frameNames[0]].frame.y}px; }\n}\n`;
    css += `.${name}-anim-${safeSeqName} { animation: ${name}-${safeSeqName} ${frameNames.length * 0.15}s steps(1) infinite; }\n\n`;
  }
  return css;
}

// ---- Lambda handler ----

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  // CORS headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
  };

  // Handle preflight
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    // Parse body
    let body: unknown;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      throw new Error('Invalid JSON in request body');
    }

    // Route by path
    const path = event.requestContext?.http?.path || event.rawPath || '/generate';

    if (path === '/draw') {
      const result = handleDraw(body);
      return { statusCode: result.status, headers, body: JSON.stringify(result.body) };
    }

    if (path === '/import') {
      const result = await handleImport(body);
      return { statusCode: result.status, headers, body: JSON.stringify(result.body) };
    }

    if (path === '/export') {
      const result = handleExport(body);
      return { statusCode: result.status, headers, body: JSON.stringify(result.body) };
    }

    if (path === '/layers') {
      const result = handleLayers(body);
      return { statusCode: result.status, headers, body: JSON.stringify(result.body) };
    }

    if (path === '/frames') {
      const result = handleFrames(body);
      return { statusCode: result.status, headers, body: JSON.stringify(result.body) };
    }

    if (path === '/resize') {
      const result = handleResize(body);
      return { statusCode: result.status, headers, body: JSON.stringify(result.body) };
    }

    // Default: /generate
    const request = validateRequest(body);

    // Generate sprite
    const spriteSheet = generateRandomSprite(request);

    // Render PNGs
    const scale = Math.max(1, Math.min(4, Math.floor(256 / request.size)));
    const framePNGs = spriteSheet.frames.map((frame) =>
      renderFrameToPNG(frame, spriteSheet.width, spriteSheet.height, scale)
    );
    const sheetPNG = renderSheetToPNG(spriteSheet, scale);

    // Build frame base64 data URIs
    const frameDataURIs = framePNGs.map(
      (buf) => `data:image/png;base64,${buf.toString('base64')}`
    );
    const sheetDataURI = `data:image/png;base64,${sheetPNG.toString('base64')}`;

    // Build sprite sheet manifest (TexturePacker-compatible)
    const fw = spriteSheet.width * scale;
    const fh = spriteSheet.height * scale;
    const cols = spriteSheet.frames.length;
    const manifest: SpriteSheetManifest = {
      frames: {},
      animations: {},
      meta: {
        app: 'AstroSprite',
        version: '1.0',
        image: 'sprite_sheet.png',
        format: 'RGBA8888',
        size: { w: cols * fw, h: fh },
        scale,
      },
    };

    const sequenceData = buildSequences(spriteSheet.frames.map((f) => f.name));
    spriteSheet.frames.forEach((frame, i) => {
      const frameName = frame.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      manifest.frames[frameName] = {
        frame: { x: i * fw, y: 0, w: fw, h: fh },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: fw, h: fh },
        sourceSize: { w: fw, h: fh },
      };
    });
    sequenceData.forEach(seq => {
      manifest.animations[seq.name] = seq.frameIndices.map(
        i => spriteSheet.frames[i].name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()
      );
    });

    // Optionally upload to S3
    let sheetUrl: string | undefined;
    if (S3_BUCKET) {
      const key = `sprites/${uuidv4()}.png`;
      sheetUrl = await uploadToS3(sheetPNG, key, 'image/png');
    }

    const response: GenerateResponse = {
      success: true,
      spriteSheet: {
        width: spriteSheet.width,
        height: spriteSheet.height,
        frameCount: spriteSheet.frames.length,
        frameNames: spriteSheet.frames.map((f) => f.name),
        sequences: buildSequences(spriteSheet.frames.map((f) => f.name)),
      },
      frames: frameDataURIs,
      sheet: sheetDataURI,
      manifest,
      engineFormats: {
        phaserAtlas: buildPhaserAtlas(manifest, 'sprite'),
        godotTres: buildGodotSpriteFrames(manifest, 'sprite'),
        cssSpriteSheet: buildCssSpriteSheet(manifest, 'sprite'),
      },
      ...(sheetUrl ? { sheetUrl } : {}),
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const statusCode = message.includes('must be') || message.includes('Invalid JSON') ? 400 : 500;

    const response: ErrorResponse = {
      success: false,
      error: message,
    };

    return {
      statusCode,
      headers,
      body: JSON.stringify(response),
    };
  }
}
