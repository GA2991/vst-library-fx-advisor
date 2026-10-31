# VST Library & FX Chain Advisor

App local para Windows que escanea tus carpetas de plugins VST, los clasifica por tipo y licencia, y te propone cadenas de efectos para situaciones de mezcla habituales usando **los plugins que ya tienes instalados**. Pensada para colecciones grandes en las que los buenos plugins acaban olvidados.

- **Biblioteca:** todos tus plugins agrupados (VST2 + VST3 del mismo plugin = una sola entrada), con filtros por categoría y licencia y búsqueda. Puedes corregir la categoría, la licencia, las notas y la reseña; tus cambios nunca los borra un nuevo escaneo.
- **Reseñas al pasar el cursor:** deja el cursor quieto sobre un plugin y verás qué hace.
- **Cadenas:** 8 situaciones (voz principal, coros, bajo, kick, snare, guitarra, pads y bus de mezcla). Cada paso propone un plugin tuyo; con el botón de mezclar vas rotando las alternativas. El modo **Solo plugins Free** filtra los gratuitos.
- **Ajustes:** las carpetas que se escanean (por defecto, las rutas habituales de VST2/VST3 que existan en tu equipo).

Todo funciona en local: no hay llamadas a internet y el servidor solo acepta conexiones desde tu propio equipo.

## Requisitos

- Windows 10 u 11
- [Node.js](https://nodejs.org) 20 o superior (LTS)

## Instalación y uso

```bash
npm install
npm run dev
```

Abre <http://localhost:5173>, entra en **Ajustes**, revisa las carpetas y pulsa **Guardar y escanear**.

Para ejecutar los tests:

```bash
npm test
```

## Dónde se guardan tus datos

En `data/library.json`, en la raíz del proyecto. Ahí están los plugins detectados, tus correcciones (`overrides`) y las carpetas configuradas. Puedes copiarlo para hacer una copia de seguridad. Si el archivo se daña, la app lo renombra a `library.corrupt-<fecha>.json` y empieza de cero sin perderlo.

## Ampliar los diccionarios

La clasificación es heurística: se basa en el nombre del archivo, la carpeta y una lista de fabricantes y productos conocidos. Todo vive en archivos JSON dentro de `server/data/`, así que puedes ampliarlos sin tocar código (reinicia `npm run dev` después de editarlos):

- **`categories.json`:** palabras clave por categoría, **en orden de prioridad** (gana la primera categoría que coincide). Las palabras de 3 letras o menos deben coincidir como palabra completa; las más largas, como fragmento del nombre.
- **`vendors.json`:** fabricantes con:
  - `aliases`: nombres de carpeta que identifican al fabricante (por ejemplo `MeldaProduction`).
  - `prefixes`: comienzos de nombre de archivo (por ejemplo `tal-`).
  - `defaultLicense`: `Free` o `Paid` para sus productos sin entrada propia.
  - `products`: entradas por producto con `category`, `license` y `description` (la reseña del tooltip). La clave es el nombre en minúsculas sin espacios ni signos (`tdrnovage` para "TDR Nova GE"); con `=` delante exige el nombre exacto (`=vital`). Gana la clave más larga.
  - Un fabricante con `"anonymous": true` agrupa productos sueltos: da categoría, licencia y reseña, pero no asigna fabricante.
- **`chains.json`:** las cadenas. Cada paso tiene una `category`, unas `keywords` opcionales (las primeras pesan más al elegir la sugerencia) y una explicación `why`.

Orden de prioridad de la licencia: tu corrección > producto > etiqueta en el nombre (`Free`, `Lite`, `LE`, `CE`) > fabricante > `Unknown`.

## Estructura

```
server/            API Express (puerto 4317, solo 127.0.0.1)
  src/scanner/     escaneo de carpetas y agrupado de formatos
  src/classifier/  categoría, fabricante, licencia y reseña
  src/store/       data/library.json con overrides del usuario
  src/chains/      recomendador de cadenas
  data/            diccionarios editables
client/            React + Vite + Tailwind + Lucide (puerto 5173)
```
