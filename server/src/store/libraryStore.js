import fs from 'node:fs';
import path from 'node:path';
import { detectDefaultFolders } from '../scanner/defaultFolders.js';

export class NotFoundError extends Error {}

const OVERRIDE_FIELDS = ['category', 'license', 'vendor', 'notes'];

function emptyData(folders) {
  return { version: 1, settings: { folders }, lastScanAt: null, plugins: {} };
}

function resolve(record) {
  const { detected, overrides } = record;
  return {
    ...record,
    category: overrides.category ?? detected.category,
    license: overrides.license ?? detected.license,
    vendor: overrides.vendor ?? detected.vendor,
    notes: overrides.notes ?? '',
  };
}

export function createStore(filePath) {
  let data = null;
  // Las escrituras se encadenan para que dos peticiones seguidas no se pisen.
  let writing = Promise.resolve();

  function save() {
    const snapshot = JSON.stringify(data, null, 2);
    writing = writing.then(async () => {
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      const tmp = `${filePath}.tmp`;
      await fs.promises.writeFile(tmp, snapshot, 'utf8');
      await fs.promises.rename(tmp, filePath);
    });
    return writing;
  }

  async function load() {
    let raw;
    try {
      raw = await fs.promises.readFile(filePath, 'utf8');
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      data = emptyData(await detectDefaultFolders());
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.plugins !== 'object') throw new Error('Formato inválido');
      data = { ...emptyData([]), ...parsed, settings: { folders: [], ...parsed.settings } };
    } catch {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backup = path.join(path.dirname(filePath), `library.corrupt-${stamp}.json`);
      await fs.promises.rename(filePath, backup);
      console.warn(`library.json estaba dañado; se guardó una copia en ${backup}`);
      data = emptyData(await detectDefaultFolders());
    }
  }

  function getSettings() {
    return { folders: [...data.settings.folders] };
  }

  async function setFolders(folders) {
    data.settings.folders = [...folders];
    await save();
  }

  async function applyScan(entries, scannedAt) {
    const counts = { added: 0, updated: 0, missing: 0 };
    const seen = new Set();
    for (const { detected, ...group } of entries) {
      seen.add(group.id);
      const existing = data.plugins[group.id];
      if (existing) counts.updated += 1;
      else counts.added += 1;
      data.plugins[group.id] = {
        ...group,
        detected,
        overrides: existing?.overrides ?? {},
        missing: false,
      };
    }
    for (const [id, record] of Object.entries(data.plugins)) {
      if (!seen.has(id)) {
        record.missing = true;
        counts.missing += 1;
      }
    }
    data.lastScanAt = scannedAt;
    await save();
    return counts;
  }

  function listPlugins() {
    return Object.values(data.plugins)
      .map(resolve)
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }

  async function updateOverrides(id, patch) {
    const record = data.plugins[id];
    if (!record) throw new NotFoundError(`Plugin no encontrado: ${id}`);
    for (const field of OVERRIDE_FIELDS) {
      if (!(field in patch)) continue;
      if (patch[field] === null) delete record.overrides[field];
      else record.overrides[field] = patch[field];
    }
    await save();
    return resolve(record);
  }

  return {
    load,
    getSettings,
    setFolders,
    applyScan,
    listPlugins,
    updateOverrides,
    getLastScanAt: () => data.lastScanAt,
  };
}
