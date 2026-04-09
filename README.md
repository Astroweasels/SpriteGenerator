# SpriteForge

A pixel art sprite editor and procedural generator with a REST API. Create and animate game-ready sprites, parallax backgrounds, music loops, and sound effects — in the browser or via API.

## Features

- **Pixel editor** — pencil, eraser, fill, line, rect, circle tools with layer and frame support
- **Procedural generator** — humanoid, creature, mech, abstract, and object sprites with templates, color overrides, and animation sequences
- **Background generator** — parallax pixel-art backgrounds (forest, desert, cave, city, and more) with time-of-day and weather
- **Music generator** — procedural chiptune/ambient/orchestral loops as downloadable WAV files
- **SFX generator** — procedural sound effects (jump, hit, pickup, etc.)
- **Export** — sprite sheets with Phaser atlas JSON, Godot `.tres`, and CSS sprite sheet formats
- **REST API** — all generation and editing exposed as a JSON API, designed for AI agent workflows

## Project Structure

```
sprite-forge/
├── src/               # React frontend (Vite + TypeScript)
├── api/
│   ├── src/           # Lambda handler and generators (TypeScript)
│   └── template.yaml  # AWS SAM template (API Gateway + Lambda)
└── .github/workflows/ # CI/CD — deploys frontend to S3/CloudFront, API via SAM
```

## Local Development

```bash
# Frontend
npm install
npm run dev          # Vite dev server at http://localhost:5173

# API (local)
cd api
npm install
npm run build
npx ts-node src/local.ts   # Local express server at http://localhost:3001
```

Set `VITE_API_BASE=http://localhost:3001` in a `.env.local` file to point the frontend at your local API.

## API

Base URL: `https://api.astrosprite.com`

| Endpoint | Description |
|---|---|
| `POST /generate` | Generate a sprite |
| `POST /generate-background` | Generate parallax background layers |
| `POST /generate-music` | Generate a procedural music loop (WAV) |
| `POST /generate-sfx` | Generate a sound effect (WAV) |
| `POST /draw` | Apply drawing operations to a sprite |
| `POST /import` | Import a PNG as a sprite |
| `POST /export` | Render sprite data to PNGs |
| `POST /layers` | Add/delete/merge/reorder layers |
| `POST /frames` | Add/delete/duplicate animation frames |
| `POST /resize` | Resize the canvas |
| `POST /batch` | Run multiple operations in one request |
| `GET /openapi.yaml` | OpenAPI spec |

Full documentation: [api.astrosprite.com/docs](https://api.astrosprite.com/docs)

## Deployment

Push to `master` to trigger the GitHub Actions workflow, which:
1. Builds the frontend and syncs it to S3, then invalidates CloudFront
2. Builds the API and deploys it via `sam deploy`

Required GitHub secrets: `VITE_API_BASE`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`.
