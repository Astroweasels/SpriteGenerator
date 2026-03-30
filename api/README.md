# SpriteForge API

Headless sprite generation service for AI agents and automated pipelines. Generates pixel art characters and sprite sheets via a single REST endpoint.

## Quick Start (Local)

```bash
cd api
npm install
npm run build
npm start
```

The API runs at `http://localhost:3001`. No AWS account needed for local use.

## Endpoint

### `POST /generate`

Generate a random pixel art sprite with optional animation poses.

#### Request Body

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `style` | string | **yes** | — | `humanoid`, `creature`, `mech`, or `abstract` |
| `size` | integer | **yes** | — | Sprite dimensions in pixels (8–128, square) |
| `symmetrical` | boolean | no | `true` | Mirror the sprite horizontally |
| `colorScheme` | string | no | `random` | `random`, `warm`, `cool`, `monochrome`, `complementary`, `earth`, `neon`, `pastel` |
| `complexity` | string | no | `medium` | `simple`, `medium`, `complex` |
| `generatePoses` | boolean | no | `false` | Generate animation pose frames |
| `poseCount` | integer | no | `0` | Number of poses (0–7): Walk 1, Walk 2, Arms Up, Crouch, Jump, Attack R, Attack L |

#### Example Request

```bash
curl -X POST http://localhost:3001/generate \
  -H "Content-Type: application/json" \
  -d '{
    "style": "humanoid",
    "size": 32,
    "symmetrical": true,
    "colorScheme": "cool",
    "complexity": "medium",
    "generatePoses": true,
    "poseCount": 4
  }'
```

#### Response

```json
{
  "success": true,
  "spriteSheet": {
    "width": 32,
    "height": 32,
    "frameCount": 5,
    "frameNames": ["Idle", "Walk 1", "Walk 2", "Arms Up", "Crouch"]
  },
  "frames": [
    "data:image/png;base64,iVBORw0KGgo...",
    "data:image/png;base64,iVBORw0KGgo...",
    "..."
  ],
  "sheet": "data:image/png;base64,iVBORw0KGgo...",
  "sheetUrl": "https://spriteforge-sprites-123456.s3.amazonaws.com/sprites/abc.png?..."
}
```

- **`frames`**: Individual animation frame PNGs as base64 data URIs. Decode and save directly.
- **`sheet`**: All frames combined into a horizontal sprite sheet (data URI).
- **`sheetUrl`**: Pre-signed S3 download link, expires in 15 minutes. Only present when deployed to AWS with S3 configured.

#### Using the Response

**Save a frame to a file (Node.js):**
```js
const base64 = response.frames[0].replace('data:image/png;base64,', '');
fs.writeFileSync('idle.png', Buffer.from(base64, 'base64'));
```

**Download from S3 URL:**
```bash
curl -o spritesheet.png "SHEET_URL_HERE"
```

**Use in Godot:**
1. Save the PNG file(s) to your project's `res://assets/` folder
2. Load as `Texture2D` or split the sprite sheet using `AtlasTexture`

## Deployment to AWS

The API deploys as a single Lambda function behind API Gateway, with an S3 bucket for generated PNGs.

### Prerequisites

- AWS CLI configured (`aws configure`)
- AWS SAM CLI installed

### Deploy

```bash
cd api
npm install
npm run build
sam build
sam deploy --guided
```

SAM will prompt you for stack name, region, etc. After deployment, it outputs the API URL.

### Infrastructure Created

| Resource | Purpose | Cost |
|----------|---------|------|
| Lambda Function | Runs sprite generation | Free tier: 1M requests/mo |
| API Gateway (HTTP) | Routes requests, rate limiting | Free tier: 1M requests/mo |
| S3 Bucket | Temporary PNG storage | ~$0.023/GB, auto-deletes after 24h |

**Estimated monthly cost for moderate use (10K generations): under $5, likely free tier.**

## Security

- **Rate limiting** is configured in the SAM template (default: 10 req/sec, 20 burst)
- **Input validation** caps size at 128×128 and poses at 7
- **S3 objects auto-delete** after 24 hours via lifecycle policy
- **S3 bucket blocks all public access** — files are only reachable via time-limited pre-signed URLs
- **CORS** is configured to allow cross-origin requests

### Adding API Key Protection

API Gateway v2 (HTTP API) doesn't natively support API keys. To add authentication:

1. **Lambda Authorizer** — add a simple token check (recommended, see AWS docs)
2. **Migrate to REST API** (v1) — supports native API key + usage plan throttling
3. **Cognito** — full OAuth2 flow (overkill for agent use)

## OpenAPI Spec

The full OpenAPI 3.1 specification is at [`openapi.yaml`](./openapi.yaml). AI agents can use this spec to discover and call the API automatically.

## For AI Agent Integration (MCP / Tool Use)

An AI agent can call this API as an external tool. Provide the agent with:

1. The API URL
2. The OpenAPI spec (or describe the endpoint in the tool definition)
3. Instructions to save the base64 frames as PNG files

Example tool definition for an AI agent:
```
Tool: generate_sprite
Description: Generate pixel art sprite assets for a 2D game
Parameters: style, size, colorScheme, complexity, symmetrical, generatePoses, poseCount
Returns: PNG images as base64 data URIs and a sprite sheet download URL
```
