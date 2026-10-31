import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scanFolders } from '../src/scanner/scanFolders.js';
import { normalizeName, groupPlugins } from '../src/scanner/normalize.js';

let root;

function touch(rel, bytes = 10) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, Buffer.alloc(bytes));
  return p;
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'vstscan-'));
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(root, { recursive: true, force: true });
});

describe('scanFolders', () => {
  it('finds vst3, dll and vst files recursively', async () => {
    touch('A.vst3');
    touch('sub/B.dll');
    touch('C.vst');
    touch('readme.txt');
    const { files, errors } = await scanFolders([root]);
    expect(errors).toEqual([]);
    const byName = Object.fromEntries(files.map((f) => [f.fileName, f.format]));
    expect(byName).toEqual({ 'A.vst3': 'VST3', 'B.dll': 'VST2', 'C.vst': 'VST2' });
    const b = files.find((f) => f.fileName === 'B.dll');
    expect(b.size).toBe(10);
    expect(b.parentDir).toBe(path.join(root, 'sub'));
    expect(new Date(b.mtime).toISOString()).toBe(b.mtime);
  });

  it('treats a .vst3 directory as one plugin', async () => {
    touch('Bundle.vst3/Contents/x86_64-win/Bundle.vst3', 100);
    touch('Bundle.vst3/Contents/Resources/moduleinfo.json', 20);
    const { files } = await scanFolders([root]);
    expect(files).toHaveLength(1);
    expect(files[0].fileName).toBe('Bundle.vst3');
    expect(files[0].format).toBe('VST3');
    expect(files[0].size).toBe(120);
  });

  it('ignores helper dlls', async () => {
    touch('vcruntime140.dll');
    touch('msvcp140.dll');
    touch('uninstall.dll');
    const { files } = await scanFolders([root]);
    expect(files).toEqual([]);
  });

  it('reports missing folders without throwing', async () => {
    touch('Real.dll');
    const missing = path.join(root, 'nope');
    const { files, errors } = await scanFolders([missing, root]);
    expect(files.map((f) => f.fileName)).toEqual(['Real.dll']);
    expect(errors[0].path).toBe(missing);
  });

  it('continues past unreadable subfolders', async () => {
    touch('ok/Good.dll');
    touch('locked/Hidden.dll');
    const locked = path.join(root, 'locked');
    const real = fs.promises.readdir.bind(fs.promises);
    vi.spyOn(fs.promises, 'readdir').mockImplementation((dir, opts) => {
      if (path.resolve(dir) === locked) {
        const err = new Error('EPERM: operation not permitted');
        err.code = 'EPERM';
        return Promise.reject(err);
      }
      return real(dir, opts);
    });
    const { files, errors } = await scanFolders([root]);
    expect(files.map((f) => f.fileName)).toEqual(['Good.dll']);
    expect(errors.map((e) => e.path)).toContain(locked);
  });
});

describe('normalizeName', () => {
  it('maps format variants to the same key', () => {
    expect(normalizeName('Serum_x64.dll').key).toBe('serum');
    expect(normalizeName('Serum.vst3').key).toBe('serum');
  });

  it('strips architecture suffixes from the display name', () => {
    expect(normalizeName('FabFilter Pro-Q 3 (x64).dll').displayName).toBe('FabFilter Pro-Q 3');
  });
});

describe('groupPlugins', () => {
  it('merges formats of the same plugin', () => {
    const files = [
      { path: 'a/Serum.vst3', fileName: 'Serum.vst3', format: 'VST3', size: 5, mtime: '2024-01-02T00:00:00.000Z', parentDir: 'a' },
      { path: 'b/Serum_x64.dll', fileName: 'Serum_x64.dll', format: 'VST2', size: 9, mtime: '2023-01-01T00:00:00.000Z', parentDir: 'b' },
    ];
    const groups = groupPlugins(files);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      id: 'serum',
      name: 'Serum',
      formats: ['VST2', 'VST3'],
      size: 9,
      mtime: '2024-01-02T00:00:00.000Z',
    });
    expect(groups[0].files).toHaveLength(2);
  });
});

describe('real-world names', () => {
  it('strips a "(64)" suffix', () => {
    expect(normalizeName('epicPLATEmkII (64).dll').displayName).toBe('epicPLATEmkII');
  });

  it('ignores Waves shells and numeric helper dlls', async () => {
    touch('WaveShell1-VST3 14.25_x64.vst3');
    touch('WavesLib1.3_11.0_Win64.dll');
    touch('1347439954.dll');
    touch('AVX512Processor.dll');
    touch('C1.dll');
    const { files } = await scanFolders([root]);
    expect(files.map((f) => f.fileName)).toEqual(['C1.dll']);
  });
});
