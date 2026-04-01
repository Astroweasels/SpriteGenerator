# AstroSprite API

Headless sprite generation service for AI agents and automated pipelines. Generates pixel art characters with weapons, per-region color control, and named animation sequences via a single REST endpoint.

## Quick Start (Local)

```bash
cd api
npm install
npm run build
npm start
```

The API runs at `https://astrosprite.com`. Open `https://astrosprite.com/docs` for interactive Swagger UI.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/generate` | Generate a sprite |
| GET | `/docs` | Swagger UI (local only) |
| GET | `/openapi.yaml` | Raw OpenAPI 3.1 spec |

---

## `POST /generate`

### Request Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `style` | string | **yes** | — | `humanoid`, `creature`, `mech`, `abstract`, or `object` |
| `size` | integer | **yes** | — | Frame size in pixels (8–128, always square) |
| `symmetrical` | boolean | no | `true` | Mirror the sprite horizontally |
| `colorScheme` | string | no | `random` | Palette strategy: `random`, `warm`, `cool`, `monochrome`, `complementary`, `earth`, `neon`, `pastel` |
| `complexity` | string | no | `medium` | `simple` (4 colors), `medium` (6), `complex` (8) |
| `template` | string | no | — | Character preset (see Templates below) |
| `weapon` | string | no | — | `sword`, `dagger`, `bow`, `staff`, or `none` |
| `colorOverrides` | object | no | — | Per-region color control (see Color Overrides below) |
| `selectedSequences` | string[] | no | — | Named animation sequences to generate |

### Templates

Applying a template sets themed region colors and a default weapon. Color overrides still take priority.

| Template | Default Weapon | Style |
|----------|---------------|-------|
| `adventurer` | sword | Green-clad explorer |
| `knight` | sword | Silver-armored warrior |
| `mage` | staff | Blue-robed spellcaster |
| `rogue` | dagger | Dark-cloaked thief |
| `warrior` | sword | Red battle-scarred fighter |
| `ranger` | bow | Brown-cloaked archer |
| `paladin` | sword | Gold-plated holy knight |
| `necromancer` | staff | Dark-robed dark mage |
| `pirate` | sword | Weathered sea raider |
| `robot` | none | Chrome/neon mechanical |

### Animation Sequences

Use `selectedSequences` to pick which animations to generate:

| Sequence | Frames | Description |
|----------|--------|-------------|
| `Idle` | 2 | Breathing / weight shift |
| `Walk` | 4 | Walk cycle |
| `Jump` | 3 | Crouch → jump → land |
| `Attack Slash` | 3 | Wind-up → horizontal slash → follow-through |
| `Attack Thrust` | 3 | Wind-up → forward thrust → recover |
| `Attack Overhead` | 3 | Raise → overhead slam → recover |

### Color Overrides

Override individual body regions to match a character description. Each palette region accepts 1–3 RGB values (dark → medium → light gradient). The `outline` region is a single color.

```json
{
  "colorOverrides": {
    "hair":   [{"r":60,"g":30,"b":10}, {"r":120,"g":60,"b":30}],
    "skin":   [{"r":180,"g":140,"b":100}, {"r":220,"g":180,"b":140}],
    "tunic":  [{"r":20,"g":40,"b":100}, {"r":40,"g":80,"b":160}, {"r":80,"g":120,"b":200}],
    "arms":   [{"r":40,"g":40,"b":40}, {"r":80,"g":80,"b":80}],
    "legs":   [{"r":50,"g":30,"b":20}, {"r":90,"g":60,"b":40}],
    "feet":   [{"r":40,"g":30,"b":20}, {"r":70,"g":50,"b":30}],
    "accent": [{"r":200,"g":180,"b":40}, {"r":240,"g":220,"b":80}],
    "outline": {"r":20,"g":10,"b":5}
  }
}
```

**Region map (humanoid):**

| Region | Body area |
|--------|-----------|
| `hair` | Top-of-head pixels |
| `skin` | Face and exposed skin |
| `tunic` | Main chest / torso armor |
| `arms` | Sleeves / arm guards |
| `legs` | Trousers / leg armor |
| `feet` | Boots / shoes |
| `accent` | Belt, trim, decorations |
| `outline` | Single outline color |

---

## Example Requests

### Purple-robed mage with staff

```bash
curl -X POST https://astrosprite.com/generate \
  -H "Content-Type: application/json" \
  -d '{
    "style": "humanoid",
    "size": 32,
    "symmetrical": true,
    "complexity": "medium",
    "template": "mage",
    "weapon": "staff",
    "selectedSequences": ["Idle", "Walk", "Attack Slash"],
    "colorOverrides": {
      "tunic": [{"r":60,"g":20,"b":90}, {"r":100,"g":40,"b":140}, {"r":160,"g":80,"b":200}],
      "hair": [{"r":200,"g":200,"b":220}, {"r":240,"g":240,"b":255}],
      "accent": [{"r":200,"g":180,"b":40}, {"r":240,"g":220,"b":80}],
      "outline": {"r":30,"g":10,"b":50}
    }
  }'
```

### Quick knight with all animations

```bash
curl -X POST https://astrosprite.com/generate \
  -H "Content-Type: application/json" \
  -d '{
    "style": "humanoid",
    "size": 32,
    "template": "knight",
    "weapon": "sword",
    "selectedSequences": ["Idle","Walk","Jump","Attack Slash","Attack Thrust","Attack Overhead"]
  }'
```

### Simple creature — no template

```bash
curl -X POST https://astrosprite.com/generate \
  -H "Content-Type: application/json" \
  -d '{"style":"creature","size":32,"colorScheme":"neon","complexity":"complex"}'
```

---

## Response Format

```json
{
  "success": true,
  "spriteSheet": {
    "width": 32,
    "height": 32,
    "frameCount": 8,
    "frameNames": ["Idle 1","Idle 2","Walk 1","Walk 2","Walk 3","Walk 4","Attack Slash 1","Attack Slash 2"],
    "sequences": [
      { "name": "Idle", "frameIndices": [0, 1] },
      { "name": "Walk", "frameIndices": [2, 3, 4, 5] },
      { "name": "Attack Slash", "frameIndices": [6, 7] }
    ]
  },
  "frames": [
    "data:image/png;base64,iVBORw0KGgo...",
    "..."
  ],
  "sheet": "data:image/png;base64,iVBORw0KGgo...",
  "manifest": {
    "frames": {
      "idle_1": { "frame": {"x":0,"y":0,"w":64,"h":64}, "rotated": false, "trimmed": false, "spriteSourceSize": {"x":0,"y":0,"w":64,"h":64}, "sourceSize": {"w":64,"h":64} },
      "walk_1": { "frame": {"x":64,"y":0,"w":64,"h":64}, "rotated": false, "trimmed": false, "spriteSourceSize": {"x":0,"y":0,"w":64,"h":64}, "sourceSize": {"w":64,"h":64} }
    },
    "animations": {
      "Idle": ["idle_1", "idle_2"],
      "Walk": ["walk_1", "walk_2", "walk_3", "walk_4"],
      "Attack Slash": ["attack_slash_1", "attack_slash_2"]
    },
    "meta": { "app": "AstroSprite", "version": "1.0", "image": "sprite_sheet.png", "format": "RGBA8888", "size": {"w":512,"h":64}, "scale": 2 }
  },
  "engineFormats": {
    "phaserAtlas": "{ \"textures\": [{ \"image\": \"sprite_sheet.png\", ... }] }",
    "godotTres": "[gd_resource type=\"SpriteFrames\" ...] ...",
    "cssSpriteSheet": ".sprite-sprite { background-image: url('sprite_sheet.png'); ... }"
  },
  "sheetUrl": "https://spriteforge-sprites.s3.amazonaws.com/sprites/abc.png?..."
}
```

- **`frames`**: Each animation frame as a base64 PNG data URI.
- **`sheet`**: All frames in a horizontal strip (data URI).
- **`manifest`**: TexturePacker-compatible JSON manifest. Save alongside the sheet PNG and import directly into Phaser, PixiJS, Godot, or any engine that reads this format.
- **`engineFormats`**: Pre-rendered format strings for specific engines:
  - `phaserAtlas` — Phaser 3 multi-atlas JSON. Save as `.json`, load with `this.load.atlas()`.
  - `godotTres` — Godot 4 SpriteFrames `.tres`. Save as `.tres`, assign to an `AnimatedSprite2D`.
  - `cssSpriteSheet` — CSS with background-position rules and `@keyframes` animations for web.
- **`sequences`**: Maps animation names to indices in the `frames` array. Use this to split frames into individual animations in your game engine.
- **`sheetUrl`**: Pre-signed S3 URL (15 min expiry). Only present when deployed to AWS with S3 configured.

### Saving frames (Node.js)

```js
const base64 = response.frames[0].replace('data:image/png;base64,', '');
fs.writeFileSync('idle_1.png', Buffer.from(base64, 'base64'));
```

### Using in a game engine

**Phaser 3:**
```js
// Save engineFormats.phaserAtlas as sprite_atlas.json
// Save sheet PNG as sprite_sheet.png
this.load.atlas('hero', 'sprite_sheet.png', 'sprite_atlas.json');
// Then create animations from the atlas frames
```

**Godot 4:**
```
# Save engineFormats.godotTres as hero.tres
# Save sheet PNG as hero_sheet.png in your project
# Assign hero.tres to an AnimatedSprite2D's sprite_frames property
# All animations (Idle, Walk, Attack, etc.) are pre-configured
```

**CSS / Web:**
```html
<!-- Save engineFormats.cssSpriteSheet as sprites.css -->
<link rel="stylesheet" href="sprites.css">
<div class="sprite-sprite sprite-idle_1"></div>
<!-- Or use animated: -->
<div class="sprite-sprite sprite-anim-walk"></div>
```

**Generic (any engine):**
1. Save the `manifest` JSON and `sheet` PNG in the same directory
2. The `animations` field maps sequence names to frame names
3. Each frame's `x, y, w, h` tells you where to crop from the sheet

---

## For AI Agent Integration

An AI agent can call this API as a tool to translate natural language character descriptions into pixel art assets.

### Recommended tool definition

```
Tool: generate_sprite
Description: Generate pixel art character sprites with animations for a 2D game.
  Supports 10 character archetypes, 4 weapon types, 6 animation sequences,
  and per-region color customization.
Endpoint: POST /generate
Parameters: style, size, template, weapon, selectedSequences, colorOverrides, complexity, symmetrical, colorScheme
Returns: Base64 PNG frames, sprite sheet, and animation sequence metadata
```

### How an AI agent should use this

1. **Parse the user's description** → Extract character type, colors, weapon, desired animations
2. **Pick a template** matching the archetype (e.g. "dark wizard" → `necromancer`)
3. **Map described colors to regions** (e.g. "red cloak" → `tunic: [{r:120,g:20,b:20},{r:180,g:40,b:40}]`)
4. **Choose sequences** based on actions needed (e.g. "walking and attacking" → `["Walk","Attack Slash"]`)
5. **POST to `/generate`** with the assembled request body
6. **Save the base64 frames** as PNG files for the user

### Example: "Create a fire mage with orange robes"

The agent would translate this to:
```json
{
  "style": "humanoid",
  "size": 32,
  "template": "mage",
  "weapon": "staff",
  "selectedSequences": ["Idle", "Walk", "Attack Slash"],
  "colorOverrides": {
    "tunic": [{"r":140,"g":40,"b":10}, {"r":200,"g":80,"b":20}, {"r":240,"g":140,"b":40}],
    "accent": [{"r":200,"g":160,"b":20}, {"r":240,"g":200,"b":60}]
  }
}
```

### OpenAPI Spec

The full spec is at [`openapi.yaml`](./openapi.yaml). Feed it to any OpenAPI-compatible tool loader (LangChain, CrewAI, OpenAI function calling, etc.) to auto-generate the tool schema.

---

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

### Infrastructure Cost

| Resource | Purpose | Cost |
|----------|---------|------|
| Lambda Function | Runs sprite generation | Free tier: 1M requests/mo |
| API Gateway (HTTP) | Routes & rate limiting | Free tier: 1M requests/mo |
| S3 Bucket | Temporary PNG storage | ~$0.023/GB, auto-deletes after 24h |

**Estimated: under $5/mo for 10K generations, likely free tier.**

## Security

- Rate limiting via SAM template (10 req/sec, 20 burst)
- Input validation: size capped at 128×128, RGB values clamped 0–255
- S3 lifecycle auto-deletes after 24 hours
- S3 blocks all public access — files only via pre-signed URLs
- CORS enabled for cross-origin requests
