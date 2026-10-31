import { describe, it, expect } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildChain, CHAINS } from '../src/chains/buildChain.js';
import { CATEGORIES } from '../src/constants.js';
import { createApp } from '../src/app.js';
import { createStore } from '../src/store/libraryStore.js';

function plugin(name, category, license = 'Paid', extra = {}) {
  return { id: name.toLowerCase().replace(/\W/g, ''), name, category, license, missing: false, overrides: {}, ...extra };
}

const deEssChain = {
  id: 't',
  name: 'Test',
  steps: [
    { id: 'comp', label: 'Compresor', category: 'Compressors', why: 'x' },
    { id: 'deess', label: 'De-esser', category: 'Compressors', keywords: ['de-ess', 'deess', 'sibil'], why: 'y' },
    { id: 'verb', label: 'Reverb', category: 'Reverbs/Delays', why: 'z' },
  ],
};

describe('buildChain', () => {
  it('ranks keyword matches first', () => {
    const result = buildChain(deEssChain, [plugin('Pro-C 2', 'Compressors'), plugin('Pro-DS', 'Compressors'), plugin('DeEsser', 'Compressors')], { freeOnly: false });
    expect(result.steps[1].candidates[0].name).toBe('DeEsser');
  });

  it('ranks user-edited plugins before the rest, then alphabetically', () => {
    const plugins = [plugin('Zeta Comp', 'Compressors'), plugin('Alpha Comp', 'Compressors'), plugin('Mid Comp', 'Compressors', 'Paid', { overrides: { category: 'Compressors' } })];
    const names = buildChain(deEssChain, plugins, { freeOnly: false }).steps[0].candidates.map((p) => p.name);
    expect(names).toEqual(['Mid Comp', 'Alpha Comp', 'Zeta Comp']);
  });

  it('freeOnly filters to Free and counts Unknown', () => {
    const plugins = [plugin('Paid Comp', 'Compressors', 'Paid'), plugin('Free Comp', 'Compressors', 'Free'), plugin('Mystery Verb', 'Reverbs/Delays', 'Unknown')];
    const result = buildChain(deEssChain, plugins, { freeOnly: true });
    expect(result.steps[0].candidates.map((p) => p.name)).toEqual(['Free Comp']);
    expect(result.unknownCount).toBe(1);
  });

  it('empty step has no candidates', () => {
    const result = buildChain(deEssChain, [plugin('Comp', 'Compressors')], { freeOnly: false });
    expect(result.steps[2].candidates).toEqual([]);
  });

  it('excludes missing plugins', () => {
    const result = buildChain(deEssChain, [plugin('Gone', 'Compressors', 'Paid', { missing: true })], { freeOnly: false });
    expect(result.steps[0].candidates).toEqual([]);
  });

  it('chains.json is valid', () => {
    expect(CHAINS).toHaveLength(8);
    expect(CHAINS.map((c) => c.id)).toEqual(['lead-vocal', 'backing-vocals', 'bass-di', 'kick', 'snare-punchy', 'electric-guitar', 'ambient-pads', 'mix-bus']);
    for (const chain of CHAINS) {
      expect(chain.steps.length).toBeGreaterThanOrEqual(3);
      expect(chain.steps.length).toBeLessThanOrEqual(6);
      for (const step of chain.steps) {
        expect(CATEGORIES).toContain(step.category);
        expect(step.why.length).toBeGreaterThan(10);
      }
    }
  });
});

describe('chain routes', () => {
  it('lists chains and builds one', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vstchain-'));
    try {
      const store = createStore(path.join(dir, 'library.json'));
      await store.load();
      const app = createApp({ store, scanFolders: async () => ({ files: [], errors: [] }) });
      const list = await request(app).get('/api/chains');
      expect(list.status).toBe(200);
      expect(list.body[0]).toEqual({ id: 'lead-vocal', name: 'Voz principal limpia', description: expect.any(String), icon: expect.any(String), stepCount: expect.any(Number) });
      const one = await request(app).get('/api/chains/lead-vocal?freeOnly=true');
      expect(one.status).toBe(200);
      expect(one.body.steps.length).toBe(one.body.steps.filter((s) => Array.isArray(s.candidates)).length);
      expect((await request(app).get('/api/chains/nope')).status).toBe(404);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('ranking details', () => {
  it('earlier keywords rank higher', () => {
    const chain = { id: 'k', name: 'K', steps: [{ id: 'eq', label: 'EQ', category: 'EQs', keywords: ['pultec', 'eq'], why: 'xxxxxxxxxxxx' }] };
    const names = buildChain(chain, [plugin('Alpha EQ', 'EQs'), plugin('uaudio pultec eqp-1a', 'EQs')], { freeOnly: false }).steps[0].candidates.map((p) => p.name);
    expect(names).toEqual(['uaudio pultec eqp-1a', 'Alpha EQ']);
  });

  it('ignores auto-generated descriptions when matching keywords', () => {
    const chain = { id: 'r', name: 'R', steps: [{ id: 'v', label: 'Verb', category: 'Reverbs/Delays', keywords: ['plate', 'delay'], why: 'xxxxxxxxxxxx' }] };
    const plugins = [
      plugin('ADverb', 'Reverbs/Delays', 'Unknown', { description: 'Reverb/delay de fabricante desconocido. Sin reseña todavía.' }),
      plugin('Zed Plate', 'Reverbs/Delays'),
    ];
    expect(buildChain(chain, plugins, { freeOnly: false }).steps[0].candidates[0].name).toBe('Zed Plate');
  });
});
