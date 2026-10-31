import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createStore } from './store/libraryStore.js';
import { scanFolders } from './scanner/scanFolders.js';

const PORT = 4317;
const HOST = '127.0.0.1';
const URL = `http://${HOST}:${PORT}`;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// La versión portable guarda los datos junto a Iniciar.bat (VST_DATA_DIR) y sirve la interfaz compilada.
const dataDir = process.env.VST_DATA_DIR ? path.resolve(process.env.VST_DATA_DIR) : path.join(repoRoot, 'data');
const builtClient = path.join(repoRoot, 'client', 'dist');
const clientDir = fs.existsSync(path.join(builtClient, 'index.html')) ? builtClient : undefined;
const openBrowser = process.env.VST_OPEN_BROWSER === '1';

function open(url) {
  spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
}

const store = createStore(path.join(dataDir, 'library.json'));
await store.load();

const app = createApp({ store, scanFolders, clientDir });
const server = app.listen(PORT, HOST, () => {
  console.log(`VST Library & FX Chain Advisor listo en ${URL}`);
  if (clientDir) console.log('Deja esta ventana abierta mientras uses la app; ciérrala para salir.');
  if (openBrowser) open(URL);
});

server.on('error', async (err) => {
  if (err.code !== 'EADDRINUSE') throw err;
  // ¿El puerto lo tiene otra copia de la app o un programa distinto?
  const ours = await fetch(`${URL}/api/health`).then((r) => r.ok).catch(() => false);
  if (ours) {
    console.log(`La app ya está abierta en ${URL}`);
    if (openBrowser) open(URL);
    process.exit(0);
  }
  console.error(`El puerto ${PORT} está ocupado por otro programa. Ciérralo y vuelve a intentarlo.`);
  process.exit(1);
});
