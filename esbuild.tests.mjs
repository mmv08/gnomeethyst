import esbuild from 'esbuild';
import { mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const testDir = 'src/tests';
const entryPoints = readdirSync(testDir)
  .filter((file) => file.endsWith('.test.ts'))
  .map((file) => join(testDir, file));

mkdirSync('dist-tests', { recursive: true });

await Promise.all(
  entryPoints.map((entryPoint) =>
    esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      outfile: join('dist-tests', entryPoint.split('/').pop().replace(/\.ts$/, '.mjs')),
      format: 'esm',
      platform: 'node',
      target: 'node24',
      external: ['node:*'],
    }),
  ),
);
