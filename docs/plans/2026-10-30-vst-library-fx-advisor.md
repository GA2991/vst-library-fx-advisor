# VST Library & FX Chain Advisor — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** App local (Windows) que escanea carpetas de plugins VST, los clasifica por tipo y licencia, guarda las correcciones del usuario y propone cadenas de efectos emparejadas con los plugins instalados.

**Arquitectura:** Monorepo con npm workspaces: `server/` (Express, lógica pura en módulos testeables + rutas finas) y `client/` (React + Vite + Tailwind + Lucide). Persistencia en `data/library.json` con datos detectados y `overrides` del usuario separados. Diccionarios (categorías, fabricantes, cadenas) en JSON dentro de `server/data/`.

**Stack:** Node ≥ 20 (ESM), Express 4, Vitest + Supertest, React 18, Vite 5, Tailwind CSS 3, lucide-react, concurrently.

**Spec:** `docs/specs/2026-10-30-vst-library-fx-advisor-design.md`

## Restricciones globales

- Solo Windows; rutas con `node:path` (nunca concatenar `\`).
- Sin llamadas de red; el servidor escucha solo en `127.0.0.1:4317`. Vite en `5173` con proxy `/api` → `4317`.
- Arranque: `npm install` y `npm run dev` en la raíz.
- Extensiones: `.vst3` → `VST3`; `.dll` y `.vst` → `VST2`. Un `.vst3` que es directorio es un plugin y no se recorre.
- Categorías exactas: `Synths`, `Samplers`, `EQs`, `Compressors`, `Reverbs/Delays`, `Saturators/Distortion`, `Modulation`, `Utilities`, `Uncategorized`.
- Licencias exactas: `Free`, `Paid`, `Unknown`.
- Prioridad de licencia: override > producto > etiqueta en el nombre > fabricante > `Unknown`.
- Un re-escaneo nunca borra overrides ni notas; los plugins ausentes quedan con `missing: true`.
- Textos de la interfaz en español. Tema oscuro.
- Mensajes de commit en inglés con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Puntos de revisión

1. **Subcarpetas sin permiso (EPERM/EACCES) dentro de Program Files:** el escaneo continúa y devuelve la ruta en `errors[]`; nunca aborta. → test en Tarea 2.
2. **Carpeta configurada que no existe:** se informa en `errors[]` y el resto se escanea. → test en Tarea 2.
3. **`library.json` corrupto o vacío:** se renombra a `library.corrupt-<timestamp>.json` y se arranca con biblioteca vacía, sin crash. → test en Tarea 3.
4. **Bundle `.vst3` con `.vst3`/`.dll` dentro de `Contents/`:** cuenta como un solo plugin. → test en Tarea 2.
5. **Dos peticiones de escaneo simultáneas:** la segunda recibe `409`. → test en Tarea 5.

---

### Tarea 1: Estructura del monorepo y servidor base

**Archivos:**
- Crear: `package.json` (workspaces `server`, `client`; scripts `dev` = `concurrently "npm:dev -w server" "npm:dev -w client"`, `test` = `npm test -w server`), `.gitignore` (`node_modules`, `data/`, `dist`)
- Crear: `server/package.json` (`"type": "module"`, scripts `dev` = `node --watch src/index.js`, `test` = `vitest run`), `server/src/app.js`, `server/src/index.js`
- Test: `server/test/app.test.js`

**Interfaces:**
- Produce: `createApp({ store, scanner }) -> express.Application` en `server/src/app.js` (las dependencias se inyectan para los tests); `index.js` crea las dependencias reales y llama a `listen(4317, '127.0.0.1')`.

- [ ] **Paso 1:** `git init` en la raíz, crear los `package.json` e instalar `express`, `vitest`, `supertest`, `concurrently`.
- [ ] **Paso 2: Test que falla** — `GET /api/health` responde `200` con `{ ok: true }`.
- [ ] **Paso 3:** Ejecutar `npm test` → FALLA (no existe `createApp`).
- [ ] **Paso 4:** Implementar `createApp` con `express.json()` y la ruta de health.
- [ ] **Paso 5:** `npm test` → PASA. Commit `chore: scaffold monorepo and express server`.

### Tarea 2: Escáner de archivos

**Archivos:**
- Crear: `server/src/scanner/scanFolders.js`, `server/src/scanner/normalize.js`, `server/src/scanner/defaultFolders.js`
- Test: `server/test/scanner.test.js` (fixtures creados en un directorio temporal con `fs.mkdtemp`)

**Interfaces:**
- Produce:
  - `scanFolders(folders: string[]) -> Promise<{ files: RawFile[], errors: {path, message}[] }>` donde `RawFile = { path, fileName, format: 'VST3'|'VST2', size: number, mtime: string /*ISO*/, parentDir: string }`.
  - `normalizeName(fileName: string) -> { key: string, displayName: string }`.
  - `groupPlugins(files: RawFile[]) -> PluginGroup[]` donde `PluginGroup = { id: key, name: displayName, formats: string[], files: RawFile[], size: number /*máx.*/, mtime: string /*la más reciente*/ }`.
  - `DEFAULT_FOLDERS: string[]` y `detectDefaultFolders() -> Promise<string[]>` (solo las que existen).

- [ ] **Paso 1: Tests que fallan:**
  - `finds vst3, dll and vst files recursively` — fixture con `A.vst3` (archivo), `sub/B.dll`, `C.vst`, `readme.txt` → 3 archivos, con formatos `VST3`, `VST2`, `VST2`.
  - `treats a .vst3 directory as one plugin` — `Bundle.vst3/Contents/x86_64-win/Bundle.vst3` → 1 archivo, `size` = suma del contenido.
  - `ignores helper dlls` — `vcruntime140.dll`, `msvcp140.dll`, `uninstall.dll` → 0 archivos.
  - `reports missing folders without throwing` — carpeta inexistente → `files` del resto, `errors[0].path` igual a esa carpeta.
  - `continues past unreadable subfolders` — simular con `vi.spyOn(fs.promises, 'readdir')` lanzando `EPERM` para una subruta → el escaneo termina y `errors` la contiene.
  - `normalizeName` — `'Serum_x64.dll'` y `'Serum.vst3'` → misma `key` `'serum'`; `'FabFilter Pro-Q 3 (x64).dll'` → `displayName` `'FabFilter Pro-Q 3'`.
  - `groupPlugins merges formats` — `Serum.vst3` + `Serum_x64.dll` → 1 grupo con `formats` `['VST2','VST3']` (ordenados).
- [ ] **Paso 2:** `npm test` → FALLA.
- [ ] **Paso 3:** Implementar. Recorrido con `fs.promises.readdir(dir, { withFileTypes: true })` recursivo propio (sin seguir symlinks). `normalizeName` quita la extensión y sufijos `x64`, `_64`, `64bit`, `(x64)`, `VST3`, `VST` al final, y colapsa `_`, `-` repetidos y espacios; `key` en minúsculas sin espacios. Lista de ignorados: regex `/^(msvc|vcruntime|ucrtbase|api-ms-|uninst|unins)/i`.
- [ ] **Paso 4:** `npm test` → PASA. Commit `feat: add plugin folder scanner`.

### Tarea 3: Almacén JSON con overrides

**Archivos:**
- Crear: `server/src/store/libraryStore.js`
- Test: `server/test/store.test.js`

**Interfaces:**
- Consume: `PluginGroup` (Tarea 2); `Detected = { category, license, vendor }` (Tarea 4 lo calcula; aquí llega ya resuelto).
- Produce: `createStore(filePath) -> Store` con:
  - `load() -> Promise<void>`; `getSettings() -> { folders: string[] }`; `setFolders(folders: string[]) -> Promise<void>`
  - `applyScan(entries: (PluginGroup & { detected: Detected })[], scannedAt: string) -> Promise<{ added, updated, missing }>`
  - `listPlugins() -> Plugin[]`; `updateOverrides(id, patch: { category?, license?, vendor?, notes? }) -> Promise<Plugin>` (`null` en un campo borra ese override; id inexistente → lanza `NotFoundError`).
  - `Plugin = PluginGroup & { detected, overrides, missing: boolean, category, license, vendor, notes }` (los últimos cuatro ya resueltos: override ?? detected; `notes` por defecto `''`).
- Formato en disco: `{ version: 1, settings: { folders }, lastScanAt, plugins: { [id]: { ...PluginGroup, detected, overrides, missing } } }`. Escritura atómica: escribir `*.tmp` y luego `rename`.

- [ ] **Paso 1: Tests que fallan:**
  - `preserves overrides across rescans` — override `{ category: 'EQs', notes: 'favorito' }`, después `applyScan` con `detected.category: 'Utilities'` → `category === 'EQs'`, `notes === 'favorito'`, `detected.category === 'Utilities'`.
  - `marks vanished plugins as missing` — escaneo con A y B, después solo A → B `missing: true` y conserva sus notas; si vuelve a aparecer, `missing: false`.
  - `recovers from a corrupt file` — escribir `'{oops'` en el archivo → `load()` no lanza, `listPlugins()` es `[]` y existe un archivo `library.corrupt-*.json` en el directorio.
  - `null clears an override` — `updateOverrides(id, { license: null })` → `license === detected.license`.
  - `persists settings` — `setFolders([...])`, nuevo store sobre el mismo archivo → `getSettings().folders` igual.
- [ ] **Paso 2:** `npm test` → FALLA.
- [ ] **Paso 3:** Implementar. Si el archivo no existe, `folders` arranca con `await detectDefaultFolders()`.
- [ ] **Paso 4:** `npm test` → PASA. Commit `feat: add json library store with overrides`.

### Tarea 4: Clasificador de categoría, fabricante y licencia

**Archivos:**
- Crear: `server/data/categories.json`, `server/data/vendors.json`, `server/src/classifier/classify.js`
- Test: `server/test/classify.test.js`

**Interfaces:**
- Produce: `classify(group: PluginGroup) -> Detected` y las funciones auxiliares `detectVendor(group)`, `detectCategory(name, vendor)`, `detectLicense(name, vendor)`.
- `categories.json`: lista **ordenada** `[{ category, keywords: string[] }]`; gana la primera categoría con coincidencia (por eso `Samplers` y `Synths` van antes que `EQs` para que "Kontakt EQ" no caiga en EQ). Coincidencia por palabra/token, sin distinguir mayúsculas.
- `vendors.json`: `{ vendors: [{ name, aliases: string[], prefixes: string[], defaultLicense: 'Free'|'Paid', products?: { [productKeyword]: { license?, category? } } }], freeTags: string[] }`. `freeTags` incluye `free`, `lite`, `le`, `ce`, `(free)`. Al menos 60 fabricantes comunes (FabFilter, Valhalla DSP, Xfer, u-he, Native Instruments, Waves, iZotope, Soundtoys, TDR, Melda, Airwindows, Voxengo, Vital, Spitfire, Arturia, Plugin Alliance/brainworx, Slate Digital, Kilohearts, Baby Audio, Analog Obsession, Klevgrand, etc.), con excepciones por producto donde se mezclan gratis y de pago (TDR Nova → Free, Nova GE → Paid; Vital → Free; Kilohearts Essentials → Free).

- [ ] **Paso 1: Tests que fallan** (tabla `it.each`):
  - categoría: `Pro-Q 3` → `EQs`; `Pro-C 2` → `Compressors`; `ValhallaVintageVerb` → `Reverbs/Delays`; `EchoBoy` → `Reverbs/Delays`; `Decapitator` → `Saturators/Distortion`; `Serum` → `Synths`; `Kontakt 7` → `Samplers`; `MicroShift` → `Modulation`; `MCompressor` → `Compressors`; `Youlean Loudness Meter` → `Utilities`; `Zxqwv` → `Uncategorized`.
  - fabricante: grupo con `parentDir` que termina en `VST3\FabFilter` → `FabFilter`; `ValhallaRoom.dll` sin carpeta de fabricante → `Valhalla DSP` (por prefijo); desconocido → `''`.
  - licencia: `TDR Nova` → `Free`; `TDR Nova GE` → `Paid`; `Pro-Q 3` → `Paid`; `Something Free.dll` (fabricante desconocido) → `Free`; `Vital` → `Free`; desconocido sin etiqueta → `Unknown`.
- [ ] **Paso 2:** `npm test` → FALLA.
- [ ] **Paso 3:** Implementar con el orden de prioridad de las Restricciones globales; los overrides se aplican en el store, no aquí.
- [ ] **Paso 4:** `npm test` → PASA. Commit `feat: add keyword and vendor based classifier`.

### Tarea 5: API REST de escaneo, biblioteca y ajustes

**Archivos:**
- Crear: `server/src/routes/plugins.js`, `server/src/routes/settings.js`, `server/src/scanService.js`
- Modificar: `server/src/app.js`, `server/src/index.js`
- Test: `server/test/api.test.js` (store sobre un archivo temporal y un escáner falso inyectado)

**Interfaces:**
- Consume: `scanFolders`, `groupPlugins` (T2), `createStore` (T3), `classify` (T4).
- Produce: `createScanService({ store, scanFolders }) -> { run() -> Promise<ScanResult>, isRunning() }` con `ScanResult = { added, updated, missing, total, errors, scannedAt }`. Rutas:
  - `GET /api/plugins` → `{ plugins: Plugin[], lastScanAt }`
  - `PATCH /api/plugins/:id` body `{ category?, license?, vendor?, notes? }` → `Plugin`; `400` si la categoría o licencia no está en las listas exactas; `404` si no existe.
  - `POST /api/scan` → `ScanResult`; `409 { error: 'scan_in_progress' }` si ya hay uno en curso.
  - `GET /api/settings` → `{ folders, defaultFolders }`; `PUT /api/settings/folders` body `{ folders: string[] }` → `{ folders }` (se recortan, deduplican y deben ser rutas absolutas; si no, `400`).
  - `GET /api/meta` → `{ categories, licenses }`.

- [ ] **Paso 1: Tests que fallan:** un test por ruta con los códigos de arriba, más `second concurrent scan returns 409` (el escáner falso espera una promesa que el test resuelve después de lanzar la segunda petición).
- [ ] **Paso 2:** `npm test` → FALLA.
- [ ] **Paso 3:** Implementar las rutas y cablear las dependencias reales en `index.js`; ruta de datos `path.resolve(repoRoot, 'data/library.json')`.
- [ ] **Paso 4:** `npm test` → PASA. Prueba manual: `npm run dev -w server` y `curl -X POST http://127.0.0.1:4317/api/scan` contra las carpetas reales → `total` > 0. Commit `feat: expose scan, library and settings api`.

### Tarea 6: Motor de cadenas de efectos

**Archivos:**
- Crear: `server/data/chains.json`, `server/src/chains/buildChain.js`, `server/src/routes/chains.js`
- Modificar: `server/src/app.js`
- Test: `server/test/chains.test.js`

**Interfaces:**
- `chains.json`: `[{ id, name, description, icon /*nombre de lucide*/, steps: [{ id, label, category, keywords?: string[], why }] }]` con 8 cadenas: `lead-vocal` (Voz principal limpia), `backing-vocals` (Coros/Voces de fondo), `bass-di` (Bajo directo), `kick`, `snare-punchy` (Snare punchy), `electric-guitar` (Guitarra eléctrica), `ambient-pads` (Pads ambientales), `mix-bus` (Bus de mezcla); entre 3 y 6 pasos cada una. Ejemplo `lead-vocal`: Utility/ganancia → EQ sustractiva → Compresor → De-esser (`Compressors`, keywords `['de-ess','deess','sibil']`) → Saturación suave → Reverb/Delay en envío.
- Produce: `buildChain(chain, plugins: Plugin[], { freeOnly: boolean }) -> { ...chain, unknownCount, steps: [{ ...step, candidates: Plugin[] }] }`. Los candidatos excluyen `missing`; con `freeOnly` solo entran los `Free`, y `unknownCount` cuenta los `Unknown` de las categorías de la cadena. Orden: coincidencia por keyword del paso → con override del usuario → alfabético. El cliente muestra `candidates[0]` como sugerencia; la rotación ocurre en el cliente.
- Rutas: `GET /api/chains` → lista `{ id, name, description, icon, stepCount }`; `GET /api/chains/:id?freeOnly=true` → resultado de `buildChain`; `404` si no existe.

- [ ] **Paso 1: Tests que fallan:**
  - `ranks keyword matches first` — compresores `Pro-C 2` y `Pro-DS` (keyword deess) → en el paso De-esser, `candidates[0].name === 'Pro-DS'`.
  - `freeOnly filters to Free` — un EQ `Paid` y otro `Free` → con `freeOnly` solo el `Free`.
  - `empty step has no candidates` — sin reverbs → `candidates` `[]` (nunca se rellena con otra categoría).
  - `excludes missing plugins`.
  - `chains.json is valid` — cada `step.category` está en la lista exacta y cada cadena tiene de 3 a 6 pasos.
- [ ] **Paso 2:** `npm test` → FALLA.
- [ ] **Paso 3:** Implementar.
- [ ] **Paso 4:** `npm test` → PASA. Commit `feat: add fx chain recommender`.

### Tarea 7: Cliente base (Vite + Tailwind + layout)

**Archivos:**
- Crear: `client/package.json` (script `dev` = `vite`), `client/vite.config.js` (proxy `/api` → `http://127.0.0.1:4317`), `client/tailwind.config.js`, `client/postcss.config.js`, `client/index.html`, `client/src/main.jsx`, `client/src/App.jsx`, `client/src/index.css`, `client/src/api.js`, `client/src/components/Sidebar.jsx`

**Interfaces:**
- Produce: `api.js` con `getPlugins()`, `patchPlugin(id, patch)`, `scan()`, `getSettings()`, `putFolders(folders)`, `getMeta()`, `listChains()`, `getChain(id, freeOnly)`; todas lanzan `Error(message)` si `!res.ok`. `App` mantiene la vista activa (`'library' | 'chains' | 'settings'`) en estado, sin router.
- Estilo: fondo `zinc-950`, paneles `zinc-900`, bordes `zinc-800`, acento `violet-500`; barra lateral con iconos Lucide `Library`, `Workflow`, `Settings`.

- [ ] **Paso 1:** Crear el proyecto e instalar `react`, `react-dom`, `lucide-react`, `vite`, `@vitejs/plugin-react`, `tailwindcss@3`, `postcss`, `autoprefixer`.
- [ ] **Paso 2:** Implementar el layout con tres vistas de marcador de posición.
- [ ] **Paso 3:** Verificar: `npm run dev` en la raíz levanta los dos procesos, `http://localhost:5173` muestra la barra lateral y la consola del navegador no tiene errores. Commit `feat: scaffold react client`.

### Tarea 8: Vista Biblioteca

**Archivos:**
- Crear: `client/src/views/LibraryView.jsx`, `client/src/components/PluginRow.jsx`, `client/src/components/StatsBar.jsx`
- Modificar: `client/src/App.jsx`

**Interfaces:** Consume `getPlugins`, `patchPlugin`, `scan`, `getMeta` (T7).

- [ ] **Paso 1:** Barra superior: buscador (nombre y fabricante), filtro de categoría, filtro de licencia, conmutador "Mostrar no encontrados" (desactivado por defecto) y botón "Escanear" con spinner (si devuelve 409 muestra "Ya hay un escaneo en curso"). `StatsBar` con el total y el conteo por categoría como chips clicables que aplican el filtro.
- [ ] **Paso 2:** Tabla: nombre, fabricante, formatos (badges), categoría (`<select>`), licencia (`<select>`), tamaño (MB), fecha, notas (input que guarda al perder el foco). Las celdas con override se marcan con un punto de acento y tienen la opción "Restablecer" (envía `null`). Actualización optimista con revertido si falla.
- [ ] **Paso 3:** Estado vacío: "Aún no hay plugins. Revisa tus carpetas en Ajustes y pulsa Escanear."
- [ ] **Paso 4:** Verificar en el navegador contra el escaneo real: filtrar, editar categoría y notas, recargar la página → los cambios persisten; volver a escanear → siguen ahí. Commit `feat: add library view`.

### Tarea 9: Vista Cadenas

**Archivos:**
- Crear: `client/src/views/ChainsView.jsx`, `client/src/components/ChainStep.jsx`
- Modificar: `client/src/App.jsx`

**Interfaces:** Consume `listChains`, `getChain` (T7).

- [ ] **Paso 1:** Rejilla de tarjetas de situación (icono, nombre, descripción); al elegir una se carga su cadena.
- [ ] **Paso 2:** Interruptor segmentado "Recomendación general" / "Solo plugins Free" que vuelve a pedir `getChain(id, freeOnly)`. Con `freeOnly` y `unknownCount > 0` muestra "N plugins con licencia desconocida no se incluyen — revísalos en Biblioteca".
- [ ] **Paso 3:** `ChainStep`: número, etiqueta, `why`, plugin sugerido destacado, desplegable de alternativas y botón "Otra sugerencia" (icono `Shuffle`) que avanza el índice de forma circular sobre `candidates`. Sin candidatos → "Sin plugin en tu biblioteca para este paso". Pasos conectados verticalmente con una línea.
- [ ] **Paso 4:** Verificar en el navegador: las 8 cadenas cargan, el interruptor cambia los resultados y la rotación recorre las alternativas. Commit `feat: add fx chains view`.

### Tarea 10: Vista Ajustes

**Archivos:**
- Crear: `client/src/views/SettingsView.jsx`
- Modificar: `client/src/App.jsx`

**Interfaces:** Consume `getSettings`, `putFolders`, `scan` (T7).

- [ ] **Paso 1:** Lista de carpetas con botón eliminar, input para añadir una ruta (validación en el servidor; muestra el error del 400), botón "Restaurar rutas por defecto" (usa `defaultFolders`) y "Guardar y escanear". Los `errors` del último escaneo se listan debajo ("No se pudo leer: …").
- [ ] **Paso 2:** Verificar: añadir `C:\Program Files\Common Files\PluginsVSt`, quitar una, guardar y escanear → el conteo de la Biblioteca cambia en consecuencia. Commit `feat: add settings view`.

### Tarea 11: README y verificación final

**Archivos:**
- Crear: `README.md` (requisitos, `npm install`, `npm run dev`, cómo ampliar `vendors.json`, `categories.json` y `chains.json`, dónde se guarda `data/library.json`).

- [ ] **Paso 1:** Escribir el README.
- [ ] **Paso 2:** Desde un clon limpio: `npm install`, `npm test` (todo verde) y `npm run dev`; escaneo real de las tres carpetas del autor y revisión de la lista `Uncategorized`/`Unknown` para ampliar los diccionarios con lo que aparezca a menudo.
- [ ] **Paso 3:** Commit `docs: add readme`.
