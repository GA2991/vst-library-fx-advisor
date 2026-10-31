import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createStore } from './store/libraryStore.js';
import { scanFolders } from './scanner/scanFolders.js';

const PORT = 4317;
const HOST = '127.0.0.1';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const store = createStore(path.join(repoRoot, 'data', 'library.json'));
await store.load();

const app = createApp({ store, scanFolders });
app.listen(PORT, HOST, () => {
  console.log(`API escuchando en http://${HOST}:${PORT}`);
});
