import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import { errorHandler, installAsyncErrorHandling } from './errors';

let server: Server;
let base: string;

before(async () => {
  installAsyncErrorHandling();
  const app = express();
  app.use(express.json());
  app.get('/reject', async () => {
    throw Object.assign(new Error('boom'), {});
  });
  app.get('/http-error', async () => {
    throw Object.assign(new Error('Store does not belong to your tenant'), { status: 403 });
  });
  app.get('/unique', async () => {
    throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
  });
  app.get('/missing', async () => {
    throw Object.assign(new Error('No record'), { code: 'P2025' });
  });
  app.get('/sync-throw', () => {
    throw new Error('sync');
  });
  app.post('/json', (_req, res) => res.json({ ok: true }));
  app.get('/ok', async (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

test('a rejected async handler returns 500 instead of crashing the process', async () => {
  const res = await fetch(`${base}/reject`);
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: 'Internal server error' });
  // The server is still alive for the next request.
  assert.equal((await fetch(`${base}/ok`)).status, 200);
});

test('errors carrying a status keep it and their message', async () => {
  const res = await fetch(`${base}/http-error`);
  assert.equal(res.status, 403);
  assert.deepEqual(await res.json(), { error: 'Store does not belong to your tenant' });
});

test('Prisma unique/not-found errors map to 409/404', async () => {
  assert.equal((await fetch(`${base}/unique`)).status, 409);
  assert.equal((await fetch(`${base}/missing`)).status, 404);
});

test('synchronous throws and malformed JSON are handled too', async () => {
  assert.equal((await fetch(`${base}/sync-throw`)).status, 500);
  const res = await fetch(`${base}/json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(res.status, 400);
});

test('500 responses never leak internal error messages', async () => {
  const body = (await (await fetch(`${base}/reject`)).json()) as { error: string };
  assert.ok(!body.error.includes('boom'));
});
