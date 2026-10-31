import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { createStore } from '../src/store/libraryStore.js';

let dir;
let store;

const FILES = [
  { path: 'C:\\VST3\\FabFilter\\Pro-Q 3.vst3', fileName: 'Pro-Q 3.vst3', format: 'VST3', size: 10, mtime: '2024-01-01T00:00:00.000Z', parentDir: 'C:\\VST3\\FabFilter' },
  { path: 'C:\\VST3\\TDR Nova.vst3', fileName: 'TDR Nova.vst3', format: 'VST3', size: 5, mtime: '2024-01-01T00:00:00.000Z', parentDir: 'C:\\VST3' },
];

function fakeScanner(result = { files: FILES, errors: [] }) {
  return async () => result;
}

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vstapi-'));
  store = createStore(path.join(dir, 'library.json'));
  await store.load();
  await store.setFolders(['C:\\VST3']);
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('scan and plugins', () => {
  it('POST /api/scan classifies and stores plugins', async () => {
    const app = createApp({ store, scanFolders: fakeScanner({ files: FILES, errors: [{ path: 'X:\\nope', message: 'La carpeta no existe' }] }) });
    const res = await request(app).post('/api/scan');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ added: 2, updated: 0, missing: 0, total: 2 });
    expect(res.body.errors).toHaveLength(1);
    expect(typeof res.body.scannedAt).toBe('string');

    const list = await request(app).get('/api/plugins');
    expect(list.status).toBe(200);
    expect(list.body.lastScanAt).toBe(res.body.scannedAt);
    const proq = list.body.plugins.find((p) => p.name === 'Pro-Q 3');
    expect(proq).toMatchObject({ vendor: 'FabFilter', category: 'EQs', license: 'Paid' });
    expect(proq.description).toMatch(/EQ/);
  });

  it('second concurrent scan returns 409', async () => {
    let release;
    const gate = new Promise((r) => { release = r; });
    const app = createApp({ store, scanFolders: async () => { await gate; return { files: FILES, errors: [] }; } });
    const first = request(app).post('/api/scan').then((r) => r);
    await new Promise((r) => setTimeout(r, 20));
    const second = await request(app).post('/api/scan');
    expect(second.status).toBe(409);
    expect(second.body).toEqual({ error: 'scan_in_progress' });
    release();
    expect((await first).status).toBe(200);
  });

  it('PATCH /api/plugins/:id updates overrides', async () => {
    const app = createApp({ store, scanFolders: fakeScanner() });
    await request(app).post('/api/scan');
    const res = await request(app).patch('/api/plugins/proq3').send({ category: 'Utilities', notes: 'para mastering', description: 'Mi EQ.' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ category: 'Utilities', notes: 'para mastering', description: 'Mi EQ.' });
    const reset = await request(app).patch('/api/plugins/proq3').send({ category: null });
    expect(reset.body.category).toBe('EQs');
  });

  it('PATCH rejects invalid category or license', async () => {
    const app = createApp({ store, scanFolders: fakeScanner() });
    await request(app).post('/api/scan');
    expect((await request(app).patch('/api/plugins/proq3').send({ category: 'Banana' })).status).toBe(400);
    expect((await request(app).patch('/api/plugins/proq3').send({ license: 'Gratis' })).status).toBe(400);
    expect((await request(app).patch('/api/plugins/proq3').send({ notes: 42 })).status).toBe(400);
  });

  it('PATCH unknown id returns 404', async () => {
    const app = createApp({ store, scanFolders: fakeScanner() });
    expect((await request(app).patch('/api/plugins/nope').send({ notes: 'x' })).status).toBe(404);
  });
});

describe('settings and meta', () => {
  it('GET /api/settings returns folders and defaults', async () => {
    const app = createApp({ store, scanFolders: fakeScanner() });
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.folders).toEqual(['C:\\VST3']);
    expect(res.body.defaultFolders).toContain('C:\\Program Files\\Common Files\\VST3');
  });

  it('PUT /api/settings/folders trims, dedupes and validates', async () => {
    const app = createApp({ store, scanFolders: fakeScanner() });
    const ok = await request(app).put('/api/settings/folders').send({ folders: [' D:\\Plugins ', 'D:\\Plugins', 'C:\\VST3'] });
    expect(ok.status).toBe(200);
    expect(ok.body.folders).toEqual(['D:\\Plugins', 'C:\\VST3']);
    expect(store.getSettings().folders).toEqual(['D:\\Plugins', 'C:\\VST3']);
    expect((await request(app).put('/api/settings/folders').send({ folders: ['plugins'] })).status).toBe(400);
    expect((await request(app).put('/api/settings/folders').send({ folders: 'C:\\VST3' })).status).toBe(400);
  });

  it('GET /api/meta lists categories and licenses', async () => {
    const app = createApp({ store, scanFolders: fakeScanner() });
    const res = await request(app).get('/api/meta');
    expect(res.body.categories).toEqual(['Synths', 'Samplers', 'EQs', 'Compressors', 'Reverbs/Delays', 'Saturators/Distortion', 'Modulation', 'Utilities', 'Uncategorized']);
    expect(res.body.licenses).toEqual(['Free', 'Paid', 'Unknown']);
  });
});
