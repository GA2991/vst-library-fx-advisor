import { Router } from 'express';
import { CATEGORIES, LICENSES } from '../constants.js';
import { NotFoundError } from '../store/libraryStore.js';
import { ScanInProgressError } from '../scanService.js';

const TEXT_FIELDS = ['vendor', 'notes', 'description'];

function validatePatch(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'El cuerpo debe ser un objeto';
  if ('category' in body && body.category !== null && !CATEGORIES.includes(body.category)) return 'Categoría no válida';
  if ('license' in body && body.license !== null && !LICENSES.includes(body.license)) return 'Licencia no válida';
  for (const field of TEXT_FIELDS) {
    if (field in body && body[field] !== null && typeof body[field] !== 'string') return `${field} debe ser texto`;
  }
  return null;
}

export function pluginRoutes({ store, scanService }) {
  const router = Router();

  router.get('/plugins', (req, res) => {
    res.json({ plugins: store.listPlugins(), lastScanAt: store.getLastScanAt() });
  });

  router.patch('/plugins/:id', async (req, res, next) => {
    const error = validatePatch(req.body);
    if (error) return res.status(400).json({ error });
    try {
      res.json(await store.updateOverrides(req.params.id, req.body));
    } catch (err) {
      if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
      next(err);
    }
  });

  router.post('/scan', async (req, res, next) => {
    try {
      res.json(await scanService.run());
    } catch (err) {
      if (err instanceof ScanInProgressError) return res.status(409).json({ error: 'scan_in_progress' });
      next(err);
    }
  });

  router.get('/meta', (req, res) => res.json({ categories: CATEGORIES, licenses: LICENSES }));

  return router;
}
