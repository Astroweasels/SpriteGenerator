import http from 'node:http';
import { handler } from './handler.js';

const PORT = Number(process.env.PORT) || 3001;

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    });
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/generate') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found. POST to /generate' }));
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const body = Buffer.concat(chunks).toString('utf-8');

  const result = await handler({
    body,
    requestContext: { http: { method: 'POST' } },
  } as any);

  const statusCode = typeof result === 'object' && 'statusCode' in result ? result.statusCode ?? 200 : 200;
  const headers = typeof result === 'object' && 'headers' in result ? (result.headers as Record<string, string>) : {};
  const responseBody = typeof result === 'object' && 'body' in result ? result.body as string : '';

  res.writeHead(statusCode, headers);
  res.end(responseBody);
});

server.listen(PORT, () => {
  console.log(`SpriteForge API running locally at http://localhost:${PORT}`);
  console.log(`POST http://localhost:${PORT}/generate`);
});
