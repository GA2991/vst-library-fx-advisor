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
    try {
      if (entry.isDirectory()) total += await directorySize(full, errors);
      else if (entry.isFile()) total += (await fs.promises.stat(full)).size;
    } catch (err) {
      // Un archivo bloqueado dentro del bundle no debe descartar el plugin entero.
      errors.push({ path: full, message: err.message });
    }
  }
  return total;
}

async function toRawFile(full, name, isDirectory, errors) {
  const stat = await fs.promises.stat(full);
  return {
    path: full,
    fileName: name,
    format: FORMATS[path.extname(name).toLowerCase()],
    size: isDirectory ? await directorySize(full, errors) : stat.size,
    mtime: stat.mtime.toISOString(),
    parentDir: path.dirname(full),
  };
}

// `visited` guarda rutas reales para seguir junctions y symlinks sin entrar en bucles.
async function walk(dir, files, errors, visited) {
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
      let isDirectory = entry.isDirectory();
      let isFile = entry.isFile();
      if (entry.isSymbolicLink()) {
        const target = await fs.promises.stat(full);
        isDirectory = target.isDirectory();
        isFile = target.isFile();
      }
      if (isDirectory && ext === '.vst3') {
        files.push(await toRawFile(full, entry.name, true, errors));
      } else if (isDirectory) {
        const real = (await fs.promises.realpath(full)).toLowerCase();
        if (visited.has(real)) continue;
        visited.add(real);
        await walk(full, files, errors, visited);
      } else if (isFile && FORMATS[ext] && !IGNORED.test(entry.name)) {
        files.push(await toRawFile(full, entry.name, false, errors));
      }
    } catch (err) {
      errors.push({ path: full, message: err.message });
    }
  }
}

export async function scanFolders(folders) {
  const files = [];
  const errors = [];
  const visited = new Set();
  for (const folder of folders) {
    const resolved = path.resolve(folder);
    try {
      const stat = await fs.promises.stat(resolved);
      if (!stat.isDirectory()) throw new Error('No es una carpeta');
    } catch (err) {
      errors.push({ path: folder, message: err.code === 'ENOENT' ? 'La carpeta no existe' : err.message });
      continue;
    }
    const real = (await fs.promises.realpath(resolved)).toLowerCase();
    if (visited.has(real)) continue;
    visited.add(real);
    await walk(resolved, files, errors, visited);
  }
  return { files, errors };
}
