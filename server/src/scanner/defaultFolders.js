import fs from 'node:fs';

export const DEFAULT_FOLDERS = [
  'C:\\Program Files\\Common Files\\VST3',
  'C:\\Program Files\\Common Files\\VST2',
  'C:\\Program Files\\Common Files\\PluginsVSt',
  'C:\\Program Files\\Common Files\\Steinberg\\VST2',
  'C:\\Program Files\\VSTPlugins',
  'C:\\Program Files\\Steinberg\\VSTPlugins',
];

export async function detectDefaultFolders() {
  const found = [];
  for (const folder of DEFAULT_FOLDERS) {
    try {
      if ((await fs.promises.stat(folder)).isDirectory()) found.push(folder);
    } catch {
      // No existe en este equipo.
    }
  }
  return found;
}
