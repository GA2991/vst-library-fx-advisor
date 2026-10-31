const EXTENSION = /\.(vst3|dll|vst)$/i;
// Sufijos de arquitectura/formato que no forman parte del nombre real del plugin.
const SUFFIX = /(?:[\s_.-]*\((?:x64|x86_64|64|64[\s-]?bit|vst3?|vst2)\)|[\s_.-]*(?:x64|x86_64|64[\s-]?bit|vst3|vst2|vst)|[\s_.-]+64)$/i;

export function normalizeName(fileName) {
  let name = fileName.replace(EXTENSION, '');
  let previous;
  do {
    previous = name;
    name = name.replace(SUFFIX, '').trim();
  } while (name !== previous && name.length > 0);
  if (!name) name = fileName.replace(EXTENSION, '');

  const displayName = name.replace(/_+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const key = displayName.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  return { key, displayName };
}

export function groupPlugins(files) {
  const groups = new Map();
  for (const file of files) {
    const { key, displayName } = normalizeName(file.fileName);
    let group = groups.get(key);
    if (!group) {
      group = { id: key, name: displayName, formats: [], files: [], size: 0, mtime: file.mtime };
      groups.set(key, group);
    }
    group.files.push(file);
    if (!group.formats.includes(file.format)) group.formats.push(file.format);
    group.size = Math.max(group.size, file.size);
    if (file.mtime > group.mtime) group.mtime = file.mtime;
    // Preferimos el nombre del VST3, que suele venir sin sufijos raros.
    if (file.format === 'VST3') group.name = displayName;
  }
  // "fbvc64.dll" junto a "fbvc.dll" es la versión de 64 bits del mismo plugin.
  for (const [key, group] of groups) {
    const base = key.endsWith('64') ? groups.get(key.slice(0, -2)) : null;
    if (!base || base === group) continue;
    for (const file of group.files) {
      base.files.push(file);
      if (!base.formats.includes(file.format)) base.formats.push(file.format);
    }
    base.size = Math.max(base.size, group.size);
    if (group.mtime > base.mtime) base.mtime = group.mtime;
    groups.delete(key);
  }
  for (const group of groups.values()) group.formats.sort();
  return [...groups.values()];
}
