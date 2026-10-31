# VST Library & FX Chain Advisor — Documento de diseño

Fecha: 2026-10-30

## Intención y porqué

Los productores con colecciones grandes de plugins (el autor tiene ~500) pierden de vista herramientas muy buenas y terminan usando siempre las mismas. La app ordena la colección por tipo y propone cadenas de efectos para situaciones comunes, emparejando cada paso con plugins que el usuario **ya tiene instalados**, para que vuelvan a aparecer las herramientas olvidadas.

Empieza como herramienta personal, pero la intención es **compartirla** con otros productores: nada puede depender de la colección del autor.

## Objetivos

- Escanear una o varias carpetas de plugins configurables por el usuario.
- Clasificar automáticamente cada plugin por tipo y por licencia (Free/Paid).
- Permitir corregir manualmente la categoría, la licencia y las notas, de forma persistente.
- Proponer cadenas de efectos paso a paso emparejadas con los plugins reales.
- Ofrecer un modo "Solo Free".

## No-objetivos (por ahora)

- macOS/Linux y formatos AU/CLAP (solo Windows; el autor no tiene Mac para probar).
- Leer metadatos internos de los binarios ni cargar plugins (solo nombre de archivo, tamaño y fecha).
- Integración con el DAW, seguimiento de uso o sistema de puntuaciones de calidad.
- Editor de cadenas personalizadas (las cadenas son predefinidas).
- Instalador o empaquetado como .exe.

## Anti-objetivos (sería un fracaso aunque funcione)

- Que un nuevo escaneo borre las correcciones manuales del usuario.
- Que el recomendador "invente" plugins que el usuario no tiene.
- Que la misma colección aparezca duplicada (VST2 + VST3 del mismo plugin = 2–3 entradas).
- Que sea complicado de arrancar para otra persona.
- Que la interfaz se vuelva compleja: "sin volverse locos".

## Restricciones

- Windows 10/11. Node.js LTS (≥ 20).
- Corre 100 % en local; no hace llamadas de red.
- Stack decidido por el usuario: Node.js + Express (backend) y React + Tailwind CSS + Lucide Icons (frontend).
- Debe arrancar con `npm install` + `npm run dev` en la raíz.

## Decisiones tomadas

### Escaneo
- Rutas por defecto: `C:\Program Files\Common Files\VST3`, `C:\Program Files\Common Files\VST2`, `C:\Program Files\Common Files\PluginsVSt`, más las comunes (`C:\Program Files\VSTPlugins`, `C:\Program Files\Steinberg\VSTPlugins`, `C:\Program Files\Common Files\Steinberg\VST2`). Solo se usan las que existen.
- El usuario puede añadir/quitar carpetas desde Ajustes.
- Escaneo recursivo de `.vst3`, `.dll` y `.vst`. Se extrae nombre, tamaño y fecha de modificación.

### Categorías
`Synths`, `Samplers`, `EQs`, `Compressors`, `Reverbs/Delays`, `Saturators/Distortion`, `Modulation`, `Utilities` y `Uncategorized`.

### Licencias
Detección `Free` / `Paid` / `Unknown` a partir de una lista interna de fabricantes conocidos y de etiquetas en el nombre (p. ej. "Free", "Lite", "CE"). Editable en la interfaz.

### Cadenas
- ~8 situaciones predefinidas: Voz principal limpia, Coros/Voces de fondo, Bajo directo, Kick, Snare punchy, Guitarra eléctrica, Pads ambientales, Bus de mezcla.
- Cada una con 3–6 pasos ordenados, cada paso con una categoría (y palabras clave opcionales para afinar, p. ej. "de-esser") y una línea de explicación.
- Cada paso muestra **un plugin sugerido** y un desplegable con las alternativas de esa categoría.
- Botón "otra sugerencia" que rota entre alternativas (para hacer aflorar plugins olvidados).
- Si no hay plugin para un paso: se marca "sin plugin", nunca se inventa.
- Interruptor "Recomendación general" / "Solo plugins Free".

### Interfaz
Dashboard oscuro y minimalista con tres vistas: **Biblioteca** (tabla con búsqueda, filtros por categoría y licencia, edición en línea de categoría/licencia/notas), **Cadenas** y **Ajustes** (carpetas de escaneo, botón de escanear).

### Persistencia
Un archivo JSON local (`data/library.json`). Elegido frente a SQLite por simplicidad (500 entradas) y por ser fácil de respaldar.

## Decisiones del constructor (marcadas como mías, revisables)

- **Bundles `.vst3`:** un `.vst3` que es carpeta cuenta como un plugin; no se recorre por dentro. Tamaño = suma de su contenido.
- **Deduplicación:** el mismo plugin en varios formatos se agrupa en una sola entrada con una lista de formatos y rutas. Clave = nombre normalizado (minúsculas, sin sufijos como `x64`, `_64`, `(x64)`, `VST3`, espacios/guiones colapsados).
- **`.dll` que no son plugins:** se ignoran nombres conocidos de librerías auxiliares (p. ej. `msvcp*`, `vcruntime*`, `*uninstall*`) para no llenar la biblioteca de basura.
- **Fabricante:** se infiere de la carpeta padre cuando la estructura es `VST3\<Fabricante>\Plugin.vst3`, y si no, de prefijos conocidos del nombre (p. ej. `FabFilter Pro-Q 3` → FabFilter, `Valhalla*` → Valhalla DSP). Editable.
- **Correcciones del usuario:** se guardan como `overrides` separados de los datos detectados y se aplican encima; un re-escaneo actualiza los datos detectados pero conserva los overrides. Los plugins que desaparecen del disco se marcan como "no encontrado" en lugar de borrarse (para no perder notas).
- **Orden de sugerencia:** dentro de un paso se prefieren las coincidencias por palabra clave del paso, después las corregidas manualmente por el usuario y después el resto alfabéticamente; "otra sugerencia" avanza por esa lista.
- **Licencias por producto además de fabricante:** muchos fabricantes tienen productos gratis y de pago (p. ej. TDR Nova vs Nova GE), así que la lista interna admite entradas por fabricante (Free/Paid por defecto) y excepciones por producto. Prioridad: override del usuario > producto > etiqueta en el nombre > fabricante > `Unknown`.
- **Modo "Solo Free":** solo entran plugins `Free`; los `Unknown` quedan fuera y la vista indica cuántos `Unknown` hay para que el usuario los revise.
- **Diccionarios como datos:** las palabras clave de categoría, la lista de fabricantes y las cadenas viven en archivos JSON dentro de `server/data/`, para que otros puedan ampliarlos sin tocar código.
- **Puertos:** API en `localhost:4317`, frontend Vite en `localhost:5173` con proxy hacia `/api`. El servidor solo escucha en `127.0.0.1`.
- **Interfaz en español.**

## Lo que queda al constructor

Estructura exacta de carpetas, diseño visual concreto dentro de "oscuro y minimalista", contenido exacto de los diccionarios y de las cadenas, y estrategia de tests (se espera cobertura unitaria del escáner y del clasificador).
