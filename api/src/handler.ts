import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import type { GenerateRequest, GenerateResponse, ErrorResponse } from './types.js';
import { generateRandomSprite } from './generate.js';
import { renderFrameToPNG, renderSheetToPNG } from './render.js';

// ---- Constants & validation ----

const VALID_STYLES = ['humanoid', 'creature', 'mech', 'abstract'] as const;
const VALID_SCHEMES = ['random', 'warm', 'cool', 'monochrome', 'complementary', 'earth', 'neon', 'pastel'] as const;
const VALID_COMPLEXITY = ['simple', 'medium', 'complex'] as const;
const MAX_SIZE = 128;
const MIN_SIZE = 8;
const MAX_POSES = 7;

const S3_BUCKET = process.env.SPRITE_BUCKET;
const S3_REGION = process.env.AWS_REGION || 'us-east-1';
const URL_EXPIRY = 900; // 15 minutes

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

  return {
    style: style as GenerateRequest['style'],
    size,
    symmetrical,
    colorScheme: colorScheme as GenerateRequest['colorScheme'],
    complexity: complexity as GenerateRequest['complexity'],
    generatePoses,
    poseCount,
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

// ---- Lambda handler ----

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  // CORS headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
  };

  // Handle preflight
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    // Parse and validate
    let body: unknown;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      throw new Error('Invalid JSON in request body');
    }

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
      },
      frames: frameDataURIs,
      sheet: sheetDataURI,
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
