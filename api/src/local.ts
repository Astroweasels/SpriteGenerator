import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handler } from './handler.js';

const PORT = Number(process.env.PORT) || 3001;

const SWAGGER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>AstroSprite API – Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({ url: '/openapi.yaml', dom_id: '#swagger-ui', deepLinking: true });
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    });
    res.end();
    return;
  }

  // Swagger UI
  if (req.method === 'GET' && (req.url === '/docs' || req.url === '/docs/')) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(SWAGGER_HTML);
    return;
  }

  // Serve OpenAPI spec
  if (req.method === 'GET' && req.url === '/openapi.yaml') {
    const specPath = path.resolve(import.meta.dirname ?? '.', '..', 'openapi.yaml');
    try {
      const spec = fs.readFileSync(specPath, 'utf-8');
      res.writeHead(200, {
        'Content-Type': 'text/yaml',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(spec);
    } catch {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'openapi.yaml not found' }));
    }
    return;
  }

  const validPostPaths = ['/generate', '/draw', '/import', '/export', '/layers', '/frames', '/resize'];
  if (req.method !== 'POST' || !validPostPaths.includes(req.url ?? '')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Not found. POST to: ${validPostPaths.join(', ')}  |  GET /docs for Swagger UI` }));
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const body = Buffer.concat(chunks).toString('utf-8');

  const result = await handler({
    body,
    requestContext: { http: { method: 'POST', path: req.url } },
    rawPath: req.url,
  } as any);

  const statusCode = typeof result === 'object' && 'statusCode' in result ? result.statusCode ?? 200 : 200;
  const headers = typeof result === 'object' && 'headers' in result ? (result.headers as Record<string, string>) : {};
  const responseBody = typeof result === 'object' && 'body' in result ? result.body as string : '';

  res.writeHead(statusCode, headers);
  res.end(responseBody);
});

server.listen(PORT, () => {
  console.log(`AstroSprite API running locally at http://localhost:${PORT}`);
  console.log(`POST endpoints: /generate /draw /import /export /layers /frames /resize`);
  console.log(`Swagger UI: http://localhost:${PORT}/docs`);
});
