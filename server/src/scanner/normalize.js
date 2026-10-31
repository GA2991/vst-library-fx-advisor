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
  for (const group of groups.values()) group.formats.sort();
  return [...groups.values()];
}
