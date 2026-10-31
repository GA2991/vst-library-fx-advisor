import path from 'node:path';
import { Router } from 'express';
import { detectDefaultFolders } from '../scanner/defaultFolders.js';

export function settingsRoutes({ store }) {
  const router = Router();

  router.get('/settings', async (req, res) => {
    res.json({ ...store.getSettings(), defaultFolders: await detectDefaultFolders() });
  });

  router.put('/settings/folders', async (req, res, next) => {
    const { folders } = req.body ?? {};
    if (!Array.isArray(folders) || folders.some((f) => typeof f !== 'string')) {
      return res.status(400).json({ error: 'folders debe ser una lista de rutas' });
    }
    const cleaned = [...new Set(folders.map((f) => f.trim()).filter(Boolean))];
    const invalid = cleaned.find((f) => !path.win32.isAbsolute(f) || !/^[a-zA-Z]:[\\/]|^\\\\/.test(f));
    if (invalid) return res.status(400).json({ error: `Ruta no válida (debe ser absoluta, p. ej. D:\\Plugins): ${invalid}` });
    try {
      await store.setFolders(cleaned);
      res.json({ folders: cleaned });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
