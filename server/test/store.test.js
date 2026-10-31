import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore, NotFoundError } from '../src/store/libraryStore.js';

let dir;
let file;

function entry(id, category = 'Utilities') {
  return {
    id,
    name: id.toUpperCase(),
    formats: ['VST3'],
    files: [{ path: `C:\\x\\${id}.vst3`, fileName: `${id}.vst3`, format: 'VST3', size: 1, mtime: '2024-01-01T00:00:00.000Z', parentDir: 'C:\\x' }],
    size: 1,
    mtime: '2024-01-01T00:00:00.000Z',
    detected: { category, license: 'Paid', vendor: 'Acme' },
  };
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vststore-'));
  file = path.join(dir, 'library.json');
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('libraryStore', () => {
  it('preserves overrides across rescans', async () => {
    const store = createStore(file);
    await store.load();
    await store.applyScan([entry('a', 'EQs')], '2024-01-01T00:00:00.000Z');
    await store.updateOverrides('a', { category: 'EQs', notes: 'favorito' });
    await store.applyScan([entry('a', 'Utilities')], '2024-02-01T00:00:00.000Z');
    const [a] = store.listPlugins();
    expect(a.category).toBe('EQs');
    expect(a.notes).toBe('favorito');
    expect(a.detected.category).toBe('Utilities');
  });

  it('marks vanished plugins as missing', async () => {
    const store = createStore(file);
    await store.load();
    await store.applyScan([entry('a'), entry('b')], 't1');
    await store.updateOverrides('b', { notes: 'nota' });
    const result = await store.applyScan([entry('a')], 't2');
    expect(result).toMatchObject({ missing: 1 });
    let b = store.listPlugins().find((p) => p.id === 'b');
    expect(b.missing).toBe(true);
    expect(b.notes).toBe('nota');
    await store.applyScan([entry('a'), entry('b')], 't3');
    b = store.listPlugins().find((p) => p.id === 'b');
    expect(b.missing).toBe(false);
  });

  it('counts added and updated plugins', async () => {
    const store = createStore(file);
    await store.load();
    expect(await store.applyScan([entry('a')], 't1')).toEqual({ added: 1, updated: 0, missing: 0 });
    expect(await store.applyScan([entry('a'), entry('b')], 't2')).toEqual({ added: 1, updated: 1, missing: 0 });
  });

  it('recovers from a corrupt file', async () => {
    fs.writeFileSync(file, '{oops');
    const store = createStore(file);
    await store.load();
    expect(store.listPlugins()).toEqual([]);
    expect(fs.readdirSync(dir).some((f) => /^library\.corrupt-.*\.json$/.test(f))).toBe(true);
  });

  it('null clears an override', async () => {
    const store = createStore(file);
    await store.load();
    await store.applyScan([entry('a')], 't1');
    await store.updateOverrides('a', { license: 'Free' });
    expect(store.listPlugins()[0].license).toBe('Free');
    const updated = await store.updateOverrides('a', { license: null });
    expect(updated.license).toBe('Paid');
    expect(updated.overrides).toEqual({});
  });

  it('throws NotFoundError for unknown ids', async () => {
    const store = createStore(file);
    await store.load();
    await expect(store.updateOverrides('zzz', { notes: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('persists settings and plugins', async () => {
    const store = createStore(file);
    await store.load();
    await store.setFolders(['D:\\Plugins']);
    await store.applyScan([entry('a')], 't1');
    await store.updateOverrides('a', { notes: 'hola' });
    const again = createStore(file);
    await again.load();
    expect(again.getSettings().folders).toEqual(['D:\\Plugins']);
    expect(again.listPlugins()[0].notes).toBe('hola');
    expect(again.getLastScanAt()).toBe('t1');
  });
});
