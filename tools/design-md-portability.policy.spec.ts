// #region Imports

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

// #endregion

const run = promisify(execFile);
const cli = fileURLToPath(import.meta.resolve('@pixel-brewery/mosaik-themes/design-md'));
const windowsPaths = `data:text/javascript,${encodeURIComponent(String.raw`
  import path from 'node:path';
  import { syncBuiltinESMExports } from 'node:module';
  const relative = path.relative;
  path.relative = (...arguments_) => relative(...arguments_).replaceAll('/', '\\');
  path.sep = '\\';
  syncBuiltinESMExports();
`)}`;

describe('installed Mosaik design CLI portability', () => {
  it.each([
    { name: 'native', arguments_: [] },
    { name: 'Windows', arguments_: ['--import', windowsPaths] },
  ])(
    'validates the committed projections without changing them with $name paths',
    async ({ arguments_ }) => {
      // arrange
      const design = await readFile('DESIGN.md');
      const components = await readFile('COMPONENTS.md');

      // act: invoke the package's actual public CLI entrypoint and complete design validation.
      const result = await run(process.execPath, [...arguments_, cli, 'check'], {
        timeout: 30_000,
        killSignal: 'SIGKILL',
      });

      // assert
      expect(result.stdout).toContain('DESIGN.md is up to date.');
      expect(result.stdout).toContain('COMPONENTS.md is up to date.');
      expect(await readFile('DESIGN.md')).toEqual(design);
      expect(await readFile('COMPONENTS.md')).toEqual(components);
    },
    45_000,
  );
});
