import esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });

await esbuild.build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  format: 'esm',
  target: 'es2022',
  sourcemap: 'inline',
  external: ['gi://*', 'resource://*'],
});

copyFileSync('metadata.json', 'dist/metadata.json');
