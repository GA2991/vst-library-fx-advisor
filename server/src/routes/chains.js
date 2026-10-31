import { Router } from 'express';
import { buildChain, CHAINS } from '../chains/buildChain.js';

export function chainRoutes({ store }) {
  const router = Router();

  router.get('/chains', (req, res) => {
    res.json(CHAINS.map(({ id, name, description, icon, steps }) => ({ id, name, description, icon, stepCount: steps.length })));
  });

  router.get('/chains/:id', (req, res) => {
    const chain = CHAINS.find((c) => c.id === req.params.id);
    if (!chain) return res.status(404).json({ error: 'Cadena no encontrada' });
    res.json(buildChain(chain, store.listPlugins(), { freeOnly: req.query.freeOnly === 'true' }));
  });

  return router;
}
