import { createApp } from './app.js';

const PORT = 4317;
const HOST = '127.0.0.1';

const app = createApp({});
app.listen(PORT, HOST, () => {
  console.log(`API escuchando en http://${HOST}:${PORT}`);
});
