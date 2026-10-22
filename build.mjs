// Build: bundle src/app.ts (with Firebase) into dist/app.js, copy the static files.
import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
for (const f of ['style.css', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', '.nojekyll', 'voice.mp3']) {
  cpSync(`src/${f}`, `dist/${f}`);
}
// The phone keeps an old copy of app.js and style.css for a while (GitHub Pages: 10 minutes), and an old script with
// a new page breaks the tabs (2026-10-22). A version in the address makes the phone fetch the new files with the new page.
const v = Date.now().toString(36);
writeFileSync('dist/index.html', readFileSync('src/index.html', 'utf8')
  .replace('href="style.css"', `href="style.css?v=${v}"`).replace('src="app.js"', `src="app.js?v=${v}"`));
const r = await build({
  entryPoints: ['src/app.ts'],
  bundle: true,
  minify: true,
  sourcemap: false,
  format: 'esm',
  target: ['es2022'],
  outfile: 'dist/app.js',
  logLevel: 'info',
});
if (r.errors.length) process.exit(1);
