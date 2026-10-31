import path from 'node:path';
import express from 'express';
import { createScanService } from './scanService.js';
import { pluginRoutes } from './routes/plugins.js';
import { settingsRoutes } from './routes/settings.js';
import { chainRoutes } from './routes/chains.js';

export function createApp({ store, scanFolders, clientDir } = {}) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  if (store) {
    const scanService = createScanService({ store, scanFolders });
    app.use('/api', pluginRoutes({ store, scanService }));
    app.use('/api', settingsRoutes({ store }));
    app.use('/api', chainRoutes({ store }));
  }

  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  // Interfaz ya compilada (versión portable): un solo puerto para API e interfaz.
  if (clientDir) {
    app.use(express.static(clientDir));
    app.get(/.*/, (req, res) => res.sendFile(path.join(clientDir, 'index.html')));
  }

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}
