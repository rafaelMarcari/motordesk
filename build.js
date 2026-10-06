import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const publicDir = path.join(__dirname, 'public');

let esbuild = null;
try {
  const mod = await import('esbuild');
  esbuild = mod.default || mod;
} catch (e) {
  console.warn('[Build] esbuild não encontrado no ambiente, pulando compilação opcional de bundles.');
}

// 1. Ensure dist directory exists
fs.mkdirSync(distDir, { recursive: true });

// 1.5. Compile report exporter bundle to public if source exists
const reportExporterSource = path.join(__dirname, 'src', 'utils', 'reportExporter.ts');
if (esbuild && fs.existsSync(reportExporterSource)) {
  try {
    console.log('Compiling report exporter bundle...');
    await esbuild.build({
      entryPoints: [reportExporterSource],
      bundle: true,
      format: 'iife',
      globalName: 'ReportExporterBundle',
      platform: 'browser',
      outfile: path.join(publicDir, 'report-exporter-bundle.js'),
      minify: true
    });
  } catch (err) {
    console.warn('[Build] Aviso ao compilar report exporter bundle:', err.message);
  }
}

// Ensure firestoreSync.js is built from firestoreSync.ts
const firestoreSyncSource = path.join(__dirname, 'src', 'services', 'firestoreSync.ts');
if (esbuild && fs.existsSync(firestoreSyncSource)) {
  try {
    await esbuild.build({
      entryPoints: [firestoreSyncSource],
      bundle: false,
      format: 'esm',
      platform: 'node',
      outfile: path.join(__dirname, 'src', 'services', 'firestoreSync.js')
    });
  } catch (err) {
    console.warn('[Build] Aviso ao compilar firestoreSync.js:', err.message);
  }
}

// Compile firebaseDirectSync for browser direct access
const firebaseDirectSyncSource = path.join(__dirname, 'src', 'services', 'firebaseDirectSync.ts');
if (esbuild && fs.existsSync(firebaseDirectSyncSource)) {
  try {
    console.log('Compiling firebase direct portal bundle for browser...');
    await esbuild.build({
      entryPoints: [firebaseDirectSyncSource],
      bundle: true,
      format: 'iife',
      globalName: 'MotorDeskFirestorePortal',
      platform: 'browser',
      outfile: path.join(publicDir, 'firebase-direct-portal.js'),
      minify: true
    });
  } catch (err) {
    console.warn('[Build] Aviso ao compilar firebase-direct-portal.js:', err.message);
  }
}

// 1.9. Integrate All Features (Fiscal XML, Representative Orders, Expedition, Boleto Notifications)
await import('./scripts/integrate-all.js');

// 2. Copy public directory contents to dist
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, distDir, { recursive: true });
}

// 3. Copy index.html to dist/index.html
const indexHtml = path.join(__dirname, 'index.html');
if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, path.join(distDir, 'index.html'));
}

// 4. Bundle server.ts with esbuild for production
if (esbuild) {
  try {
    console.log('Building server with esbuild...');
    await esbuild.build({
      entryPoints: [path.join(__dirname, 'server.ts')],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      packages: 'external',
      sourcemap: true,
      outfile: path.join(distDir, 'server.cjs'),
    });
  } catch (err) {
    console.warn('[Build] Aviso ao empacotar server.ts:', err.message);
  }
}

console.log('Build completed successfully.');
