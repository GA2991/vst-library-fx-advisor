import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('app', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(createApp({})).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('serving the built client', () => {
  it('serves index.html, assets and an SPA fallback, without hiding the API', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const clientDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vstclient-'));
    try {
      fs.writeFileSync(path.join(clientDir, 'index.html'), '<!doctype html><title>VST</title>');
      fs.mkdirSync(path.join(clientDir, 'assets'));
      fs.writeFileSync(path.join(clientDir, 'assets', 'app.js'), 'console.log(1)');
      const app = createApp({ clientDir });
      const home = await request(app).get('/');
      expect(home.status).toBe(200);
      expect(home.text).toContain('<title>VST</title>');
      expect((await request(app).get('/assets/app.js')).text).toBe('console.log(1)');
      expect((await request(app).get('/cadenas')).text).toContain('<title>VST</title>');
      expect((await request(app).get('/api/health')).body).toEqual({ ok: true });
      expect((await request(app).get('/api/nope')).status).toBe(404);
    } finally {
      fs.rmSync(clientDir, { recursive: true, force: true });
    }
  });
});
