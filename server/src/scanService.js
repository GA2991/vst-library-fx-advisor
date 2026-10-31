import { groupPlugins } from './scanner/normalize.js';
import { classify } from './classifier/classify.js';

export class ScanInProgressError extends Error {}

export function createScanService({ store, scanFolders }) {
  let running = false;

  async function run() {
    if (running) throw new ScanInProgressError('Ya hay un escaneo en curso');
    running = true;
    try {
      const { files, errors } = await scanFolders(store.getSettings().folders);
      const groups = groupPlugins(files);
      const entries = groups.map((group) => ({ ...group, detected: classify(group) }));
      const scannedAt = new Date().toISOString();
      const counts = await store.applyScan(entries, scannedAt);
      return { ...counts, total: groups.length, errors, scannedAt };
    } finally {
      running = false;
    }
  }

  return { run, isRunning: () => running };
}
