import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isFallbackDescription, keywordMatches } from '../classifier/classify.js';

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data');
export const CHAINS = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'chains.json'), 'utf8'));

// Posición de la primera palabra clave que coincide (las primeras pesan más);
// después, los editados por el usuario y por último el resto.
function rank(plugin, keywords) {
  const description = plugin.description && !isFallbackDescription(plugin.description) ? plugin.description : '';
  const text = `${plugin.name} ${description}`;
  const hit = keywords.findIndex((k) => keywordMatches(k, text));
  if (hit !== -1) return hit;
  if (plugin.overrides && Object.keys(plugin.overrides).length > 0) return keywords.length;
  return keywords.length + 1;
}

export function buildChain(chain, plugins, { freeOnly }) {
  const available = plugins.filter((p) => !p.missing);
  const chainCategories = new Set(chain.steps.map((s) => s.category));
  const unknownCount = freeOnly
    ? available.filter((p) => p.license === 'Unknown' && chainCategories.has(p.category)).length
    : 0;

  const steps = chain.steps.map((step) => {
    const keywords = step.keywords ?? [];
    const candidates = available
      .filter((p) => p.category === step.category && (!freeOnly || p.license === 'Free'))
      .map((p) => ({ plugin: p, rank: rank(p, keywords) }))
      .sort((a, b) => a.rank - b.rank || a.plugin.name.localeCompare(b.plugin.name, 'es', { sensitivity: 'base' }))
      .map(({ plugin }) => plugin);
    return { ...step, candidates };
  });

  return { ...chain, unknownCount, steps };
}
