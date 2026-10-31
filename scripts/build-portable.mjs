// Arma la versión portable para Windows: dist-portable/<nombre>/ y su .zip.
// Uso: npm run build:portable
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const NAME = 'VST-Library-FX-Advisor';
const outRoot = path.join(root, 'dist-portable');
const out = path.join(outRoot, NAME);
const zipPath = path.join(outRoot, `${NAME}-v${version}-win-x64.zip`);
// npm se lanza con el mismo Node, sin pasar por la shell.
const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');

function npm(args, cwd) {
  const result = spawnSync(process.execPath, [npmCli, ...args], { cwd, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Falló: npm ${args.join(' ')}`);
}

const copy = (from, to) => fs.cpSync(path.join(root, from), path.join(out, to), { recursive: true });
const write = (to, text) => fs.writeFileSync(path.join(out, to), text.replace(/\r?\n/g, '\r\n'), 'utf8');

console.log('1/5 Compilando la interfaz…');
npm(['run', 'build', '-w', 'client'], root);

console.log('2/5 Copiando la app…');
fs.rmSync(outRoot, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'data'), { recursive: true });
copy('server/src', 'app/server/src');
copy('server/data', 'app/server/data');
copy('server/package.json', 'app/server/package.json');
copy('client/dist', 'app/client/dist');

console.log('3/5 Instalando dependencias de producción…');
npm(['install', '--omit=dev', '--no-package-lock', '--no-audit', '--no-fund', '--loglevel=error'], path.join(out, 'app', 'server'));

console.log('4/5 Copiando Node.js…');
fs.mkdirSync(path.join(out, 'node'));
fs.copyFileSync(process.execPath, path.join(out, 'node', 'node.exe'));

write(
  'Iniciar.bat',
  `@echo off
title VST Library ^& FX Chain Advisor
cd /d "%~dp0"
set "VST_DATA_DIR=%~dp0data"
set "VST_OPEN_BROWSER=1"
"%~dp0node\\node.exe" "%~dp0app\\server\\src\\index.js"
if errorlevel 1 pause
`,
);

write(
  'LEEME.txt',
  `VST Library & FX Chain Advisor v${version}
=========================================

Cómo usarla
-----------
1. Haz doble clic en "Iniciar.bat".
2. Se abre una ventana negra y, a los pocos segundos, la app en tu navegador
   (http://127.0.0.1:4317).
3. Deja la ventana negra abierta mientras uses la app. Ciérrala para salir.

La primera vez, entra en Ajustes, revisa las carpetas de plugins y pulsa
"Guardar y escanear".

Si Windows muestra "Windows protegió tu PC", pulsa "Más información" y
"Ejecutar de todas formas": el .bat solo arranca la app incluida en esta carpeta.

Tus datos
---------
Todo se guarda en la carpeta "data" (data\\library.json): plugins detectados,
tus categorías, licencias, notas y reseñas. Para actualizar a una versión nueva,
copia tu carpeta "data" a la carpeta nueva.

Funciona sin internet y sin instalar nada. Solo Windows 10/11 de 64 bits.

Incluye Node.js ${process.version} (licencia MIT, https://nodejs.org).
`,
);

console.log('5/5 Comprimiendo…');
const tar = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe');
const zipped = spawnSync(tar, ['-a', '-cf', zipPath, '-C', outRoot, NAME], { stdio: 'inherit' });
if (zipped.status !== 0) throw new Error('No se pudo crear el .zip');

const mb = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(1);
console.log(`\nListo:\n  Carpeta: ${out}\n  Zip:     ${zipPath} (${mb} MB)`);
