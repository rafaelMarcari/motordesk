import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const publicDir = path.join(__dirname, 'public');

// 1. Ensure dist directory exists
fs.mkdirSync(distDir, { recursive: true });

// 1.5. Compile report exporter bundle to public if source exists
const reportExporterSource = path.join(__dirname, 'src', 'utils', 'reportExporter.ts');
if (fs.existsSync(reportExporterSource)) {
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

console.log('Build completed successfully.');
