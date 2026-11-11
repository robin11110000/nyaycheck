import './env.js';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Otari } from './otari.js';
import { check } from './pipeline.js';
import { DISCLAIMER } from './types.js';
const inputSchema = z.object({
  story: z.string().min(20).max(16000),
  attachments: z
    .array(
      z.object({
        name: z.string().max(200),
        mime: z.enum(['image/png', 'image/jpeg', 'application/pdf']),
        data: z.string().max(1400000),
      }),
    )
    .max(3)
    .default([]),
  simulateFailure: z.boolean().default(false),
});
const active = new Set<string>();
export const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  );
  const json = (status: number, data: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };
  try {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(await readFile('public/index.html'));
      return;
    }
    if (req.method === 'GET' && req.url === '/api/health') {
      json(200, { ok: true, configured: !!process.env.OTARI_API_KEY });
      return;
    }
    if (req.method !== 'POST' || !['/api/check', '/api/switch-user'].includes(req.url ?? '')) {
      json(404, { error: 'Not found' });
      return;
    }
    const origin = req.headers.origin;
    if (origin && new URL(origin).host !== req.headers.host) {
      json(403, { error: 'Cross-origin request refused' });
      return;
    }
    if (req.url === '/api/switch-user') {
      res.setHeader(
        'Set-Cookie',
        'nyay_user=' + randomUUID() + '; Path=/; HttpOnly; SameSite=Strict',
      );
      json(200, {
        ok: true,
        message: 'New anonymous demo identity. Budgets are enforced by Otari.',
      });
      return;
    }
    if (!req.headers['content-type']?.startsWith('application/json')) {
      json(415, { error: 'Expected JSON' });
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 4500000) {
        json(413, { error: 'Upload is too large' });
        return;
      }
      chunks.push(chunk);
    }
    let input;
    try {
      input = inputSchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    } catch {
      json(400, {
        error:
          'Describe your case in at least twenty characters. Maximum story length is sixteen thousand characters.',
      });
      return;
    }
    const raw = req.headers.cookie?.match(/(?:^|;\s*)nyay_user=([^;]+)/)?.[1];
    const user = raw && /^[0-9a-f-]{36}$/.test(raw) ? raw : randomUUID();
    if (!raw) res.setHeader('Set-Cookie', `nyay_user=${user}; Path=/; HttpOnly; SameSite=Strict`);
    if (active.has(user) || active.size >= 8) {
      json(429, { error: 'A check is already running or the server is busy.' });
      return;
    }
    active.add(user);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    const emit = (event: string, data: unknown) => {
      if (!res.destroyed) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    const heartbeat = setInterval(() => {
      if (!res.destroyed) res.write(': heartbeat\n\n');
    }, 15000);
    try {
      const result = await check(new Otari(user, randomUUID()), input, emit);
      emit('result', result);
    } catch {
      emit('result', {
        status: 'partial',
        message: 'This check could not complete. No result has been invented. Try again later.',
        disclaimer: DISCLAIMER,
      });
    } finally {
      clearInterval(heartbeat);
      active.delete(user);
      res.end();
    }
  } catch {
    if (!res.headersSent) json(500, { error: 'Request could not be processed' });
    else res.end();
  }
});
server.requestTimeout = 30000;
if (process.env.NODE_ENV !== 'test')
  server.listen(Number(process.env.PORT ?? 3000), '127.0.0.1', () =>
    console.log(`NyayCheck: http://localhost:${process.env.PORT ?? 3000}`),
  );
