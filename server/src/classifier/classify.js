import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data');
const CATEGORIES = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'categories.json'), 'utf8'));
const { vendors: VENDORS, freeTags: FREE_TAGS } = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'vendors.json'), 'utf8'));

// Cuántos niveles de carpeta se suben buscando una carpeta con nombre de fabricante.
const VENDOR_DIR_DEPTH = 3;

const SINGULAR = {
  Synths: 'Sintetizador',
  Samplers: 'Sampler',
  EQs: 'Ecualizador',
  Compressors: 'Compresor',
  'Reverbs/Delays': 'Reverb/delay',
  'Saturators/Distortion': 'Saturador',
  Modulation: 'Efecto de modulación',
  Utilities: 'Utilidad',
  Uncategorized: 'Plugin',
};

export const compact = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

export function tokens(name) {
  return name
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2')
    .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2')
    .replace(/(\p{L})(\p{N})/gu, '$1 $2')
    .replace(/(\p{N})(\p{L})/gu, '$1 $2')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

// Palabras cortas solo cuentan como palabra completa; las largas, como fragmento del nombre.
function keywordMatches(keyword, name) {
  const key = compact(keyword);
  if (key.length <= 3) return tokens(name).includes(key);
  return compact(name).includes(key);
}

// Posiciones del nombre compactado donde empieza una palabra ("CoreProcessor" → 0 y 4).
function wordStarts(name) {
  const starts = [];
  let offset = 0;
  for (const token of tokens(name)) {
    starts.push(offset);
    offset += token.length;
  }
  return starts;
}

// Claves de producto: "=clave" exige el nombre exacto, igual que las de ≤3 caracteres;
// el resto debe aparecer empezando en una palabra, para que "repro" no case con "CoreProcessor".
function productKeyMatches(rawKey, name) {
  const exact = rawKey.startsWith('=');
  const key = exact ? rawKey.slice(1) : rawKey;
  const target = compact(name);
  if (exact || key.length <= 3) return target === key;
  return wordStarts(name).some((start) => target.startsWith(key, start));
}

function vendorByName(vendorName) {
  if (!vendorName) return null;
  const key = compact(vendorName);
  return VENDORS.find((v) => compact(v.name) === key || v.aliases.some((a) => compact(a) === key)) ?? null;
}

function findProduct(name, vendorName) {
  const scoped = vendorByName(vendorName);
  const pools = scoped ? [[scoped], VENDORS] : [VENDORS];
  for (const pool of pools) {
    let best = null;
    for (const vendor of pool) {
      for (const [rawKey, product] of Object.entries(vendor.products ?? {})) {
        const length = rawKey.replace(/^=/, '').length;
        if (productKeyMatches(rawKey, name) && (!best || length > best.length)) {
          best = { vendor, product, length };
        }
      }
    }
    if (best) return best;
  }
  return null;
}

const publicName = (vendor) => (vendor && !vendor.anonymous ? vendor.name : '');

export function detectVendor(group) {
  for (const file of group.files ?? []) {
    let dir = file.parentDir;
    for (let i = 0; i < VENDOR_DIR_DEPTH && dir; i += 1) {
      const vendor = vendorByName(path.basename(dir));
      if (vendor) return publicName(vendor);
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  const product = findProduct(group.name, '');
  if (product) return publicName(product.vendor);
  const lower = group.name.toLowerCase();
  const byPrefix = VENDORS.find((v) => v.prefixes.some((p) => lower.startsWith(p)));
  return publicName(byPrefix);
}

export function detectCategory(name, vendorName) {
  const product = findProduct(name, vendorName);
  if (product?.product.category) return product.product.category;
  for (const { category, keywords } of CATEGORIES) {
    if (keywords.some((k) => keywordMatches(k, name))) return category;
  }
  return 'Uncategorized';
}

export function detectLicense(name, vendorName) {
  const product = findProduct(name, vendorName);
  if (product?.product.license) return product.product.license;
  const nameTokens = tokens(name);
  if (FREE_TAGS.some((tag) => nameTokens.includes(tag))) return 'Free';
  const vendor = vendorByName(vendorName) ?? product?.vendor;
  return vendor?.defaultLicense ?? 'Unknown';
}

export function describe(name, vendorName, category) {
  const product = findProduct(name, vendorName);
  if (product?.product.description) return product.product.description;
  const kind = SINGULAR[category] ?? 'Plugin';
  return `${kind} de ${vendorName || 'fabricante desconocido'}. Sin reseña todavía.`;
}

export function classify(group) {
  const vendor = detectVendor(group);
  const category = detectCategory(group.name, vendor);
  return {
    vendor,
    category,
    license: detectLicense(group.name, vendor),
    description: describe(group.name, vendor, category),
  };
}
