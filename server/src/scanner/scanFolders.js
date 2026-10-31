import fs from 'node:fs';
import path from 'node:path';

const FORMATS = { '.vst3': 'VST3', '.dll': 'VST2', '.vst': 'VST2' };
// Librerías auxiliares, contenedores de Waves y DLLs con nombre numérico que no son plugins.
const IGNORED = /^(msvc|vcruntime|ucrtbase|api-ms-|uninst|unins|waveshell|waveslib|avx\d*processor|\d+\.)/i;

async function directorySize(dir, errors) {
  let total = 0;
  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (err) {
    errors.push({ path: dir, message: err.message });
    return 0;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += await directorySize(full, errors);
    else if (entry.isFile()) total += (await fs.promises.stat(full)).size;
  }
  return total;
}

async function toRawFile(full, entry, errors) {
  const stat = await fs.promises.stat(full);
  const size = entry.isDirectory() ? await directorySize(full, errors) : stat.size;
  return {
    path: full,
    fileName: entry.name,
    format: FORMATS[path.extname(entry.name).toLowerCase()],
    size,
    mtime: stat.mtime.toISOString(),
    parentDir: path.dirname(full),
  };
}

async function walk(dir, files, errors) {
  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (err) {
    errors.push({ path: dir, message: err.message });
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const ext = path.extname(entry.name).toLowerCase();
    try {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory() && ext === '.vst3') {
        files.push(await toRawFile(full, entry, errors));
      } else if (entry.isDirectory()) {
        await walk(full, files, errors);
      } else if (entry.isFile() && FORMATS[ext] && !IGNORED.test(entry.name)) {
        files.push(await toRawFile(full, entry, errors));
      }
    } catch (err) {
      errors.push({ path: full, message: err.message });
    }
  }
}

export async function scanFolders(folders) {
  const files = [];
  const errors = [];
  for (const folder of folders) {
    const resolved = path.resolve(folder);
    try {
      const stat = await fs.promises.stat(resolved);
      if (!stat.isDirectory()) throw new Error('No es una carpeta');
    } catch (err) {
      errors.push({ path: folder, message: err.code === 'ENOENT' ? 'La carpeta no existe' : err.message });
      continue;
    }
    await walk(resolved, files, errors);
  }
  return { files, errors };
}
