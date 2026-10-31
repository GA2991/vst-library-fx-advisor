import express from 'express';

export function createApp({ store, scanner } = {}) {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  return app;
}
