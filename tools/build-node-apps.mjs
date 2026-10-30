import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';

const target = process.argv[2];
const configurations = {
  desktop: [
    {
      entryPoints: ['apps/desktop/src/main.ts'],
      outfile: 'dist/apps/desktop/main.mjs',
      format: 'esm',
    },
    {
      entryPoints: ['apps/desktop/src/preload.ts'],
      outfile: 'dist/apps/desktop/preload.cjs',
      format: 'cjs',
    },
  ],
  orchestrator: [
    {
      entryPoints: ['apps/orchestrator/src/main.ts'],
      outfile: 'dist/apps/orchestrator/main.mjs',
      format: 'esm',
    },
  ],
};

const builds = configurations[target];
if (!builds) {
  throw new Error(`Unknown build target: ${target ?? '<missing>'}`);
}

await mkdir(`dist/apps/${target}`, { recursive: true });
await Promise.all(
  builds.map((configuration) =>
    build({
      ...configuration,
      alias: { yaml: './node_modules/yaml/browser/index.js' },
      banner:
        configuration.format === 'esm'
          ? {
              js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
            }
          : undefined,
      bundle: true,
      define: {
        __SYMPHONY_UPDATE_BASE_URL__: JSON.stringify(process.env['SYMPHONY_UPDATE_BASE_URL'] ?? ''),
      },
      external: ['electron', 'electron-native-speech'],
      legalComments: 'none',
      logLevel: 'info',
      minify: false,
      platform: 'node',
      sourcemap: true,
      target: 'node24',
      tsconfig: 'tsconfig.base.json',
    }),
  ),
);
