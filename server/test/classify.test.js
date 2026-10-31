import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { classify, describe as describePlugin, detectCategory, detectLicense, detectVendor } from '../src/classifier/classify.js';

function group(fileName, parentDir = path.join('C:', 'Plugins')) {
  const name = fileName.replace(/\.(vst3|dll|vst)$/i, '');
  return {
    id: name.toLowerCase(),
    name,
    formats: ['VST3'],
    files: [{ path: path.join(parentDir, fileName), fileName, format: 'VST3', size: 1, mtime: '2024-01-01T00:00:00.000Z', parentDir }],
    size: 1,
    mtime: '2024-01-01T00:00:00.000Z',
  };
}

describe('detectCategory', () => {
  it.each([
    ['Pro-Q 3', 'EQs'],
    ['Pro-C 2', 'Compressors'],
    ['ValhallaVintageVerb', 'Reverbs/Delays'],
    ['EchoBoy', 'Reverbs/Delays'],
    ['Decapitator', 'Saturators/Distortion'],
    ['Serum', 'Synths'],
    ['Kontakt 7', 'Samplers'],
    ['MicroShift', 'Modulation'],
    ['MCompressor', 'Compressors'],
    ['Youlean Loudness Meter', 'Utilities'],
    ['Zxqwv', 'Uncategorized'],
    ['MDynamicEq', 'EQs'],
    ['T-De-Esser 2', 'Compressors'],
    ['kHs Tape Stop', 'Modulation'],
    ['GenericMultiCoreProcessor', 'Uncategorized'],
  ])('%s → %s', (name, expected) => {
    expect(detectCategory(name, '')).toBe(expected);
  });
});

describe('detectVendor', () => {
  it('uses the vendor folder', () => {
    expect(detectVendor(group('Pro-Q 3.vst3', path.join('C:', 'VST3', 'FabFilter')))).toBe('FabFilter');
  });

  it('walks up nested vendor folders', () => {
    expect(detectVendor(group('MCompressor.vst3', path.join('C:', 'VST3', 'MeldaProduction', 'Dynamics')))).toBe('MeldaProduction');
  });

  it('falls back to name prefixes', () => {
    expect(detectVendor(group('ValhallaRoom.dll'))).toBe('Valhalla DSP');
  });

  it('returns an empty string when unknown', () => {
    expect(detectVendor(group('Zxqwv.dll'))).toBe('');
  });
});

describe('detectLicense', () => {
  it.each([
    ['TDR Nova', 'Free'],
    ['TDR Nova GE', 'Paid'],
    ['Pro-Q 3', 'Paid'],
    ['Something Free', 'Free'],
    ['RetroVerse Lite', 'Free'],
    ['Vital', 'Free'],
    ['Zxqwv', 'Unknown'],
  ])('%s → %s', (name, expected) => {
    expect(detectLicense(name, '')).toBe(expected);
  });
});

describe('classify', () => {
  it('combines vendor, category and license', () => {
    expect(classify(group('Pro-C 2.vst3', path.join('C:', 'VST3', 'FabFilter')))).toMatchObject({
      vendor: 'FabFilter',
      category: 'Compressors',
      license: 'Paid',
    });
  });
});

describe('describe', () => {
  it('uses the dictionary review', () => {
    expect(describePlugin('TDR Nova', '', 'EQs')).toMatch(/EQ dinámica/);
  });

  it('falls back to category and vendor', () => {
    expect(describePlugin('Zxqwv', 'Acme', 'Compressors')).toBe('Compresor de Acme. Sin reseña todavía.');
    expect(describePlugin('Zxqwv', '', 'Uncategorized')).toBe('Plugin de fabricante desconocido. Sin reseña todavía.');
  });

  it('classify includes a description', () => {
    expect(classify(group('Pro-C 2.vst3')).description).toMatch(/Compresor/);
  });
});

describe('exact product keys', () => {
  it('does not match "=labs" inside a longer name', () => {
    expect(detectVendor(group('Punk Labs OneTrick SIMIAN.vst3'))).not.toBe('Spitfire Audio');
  });

  it('does not treat a generic dictionary as a vendor', () => {
    expect(detectVendor(group('Dexed.dll'))).toBe('');
    expect(detectLicense('Dexed', '')).toBe('Free');
  });
});
