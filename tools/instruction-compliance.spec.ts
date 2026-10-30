// #region Imports

import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// #endregion

const run = promisify(execFile);
const checker = resolve('tools/instruction-compliance.mjs');
const windowsPaths = `data:text/javascript,${encodeURIComponent(String.raw`
  import path from 'node:path';
  import { syncBuiltinESMExports } from 'node:module';
  const relative = path.relative;
  path.relative = (...arguments_) => relative(...arguments_).replaceAll('/', '\\');
  path.sep = '\\';
  syncBuiltinESMExports();
`)}`;
const platforms = [
  { name: 'native', arguments_: [] },
  { name: 'Windows', arguments_: ['--import', windowsPaths] },
];

describe('instruction-compliance', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'instruction compliance '));
    const spec = '// arrange\n// act\n// assert\n';
    const files = {
      'apps/renderer-e2e/journey.spec.ts': spec,
      'libs/feature/Thing.ts': 'export function Thing() {}\n',
      'libs/feature/Thing.spec.ts': spec,
      'libs/feature/Scenario.spec.ts': spec,
      'libs/feature/feature.policy.spec.ts': spec,
      'tools/repository.policy.spec.ts': spec,
      'tools/nested/repository.policy.spec.ts': spec,
      'tools/unit.spec.ts': spec,
      'tools/test-tool.ts': 'export const VALUE = 1;\n',
    };
    for (const [relativePath, source] of Object.entries(files)) {
      const path = join(root, relativePath);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, source);
    }
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it.each(platforms)(
    'preserves E2E and tooling policy while reporting genuine orphan specs with $name paths',
    async ({ arguments_ }) => {
      // arrange
      const command = [...arguments_, checker, '--json'];

      // act
      const result = await run(process.execPath, command, { cwd: root });
      const findings = JSON.parse(result.stdout) as Record<
        string,
        { file: string; line: number; detail: string }[]
      >;

      // assert
      expect(findings['spec-file-matches-source']).toEqual([
        {
          file: 'libs/feature/Scenario.spec.ts',
          line: 1,
          detail: 'no adjacent production file named Scenario.{ts,tsx,js,mjs,cjs}',
        },
        {
          file: 'libs/feature/feature.policy.spec.ts',
          line: 1,
          detail: 'no adjacent production file named feature.policy.{ts,tsx,js,mjs,cjs}',
        },
        {
          file: 'tools/nested/repository.policy.spec.ts',
          line: 1,
          detail: 'no adjacent production file named repository.policy.{ts,tsx,js,mjs,cjs}',
        },
        {
          file: 'tools/unit.spec.ts',
          line: 1,
          detail: 'no adjacent production file named unit.{ts,tsx,js,mjs,cjs}',
        },
      ]);
      expect(Object.values(findings).flat()).toHaveLength(4);
    },
  );

  it.each(platforms)(
    'fails strict mode for a genuine orphan spec with $name paths',
    async ({ arguments_ }) => {
      // arrange
      const command = [...arguments_, checker, '--strict'];

      // act + assert
      await expect(run(process.execPath, command, { cwd: root })).rejects.toMatchObject({
        code: 1,
        stdout: expect.stringContaining(
          'spec-file-matches-source: 4 violations, at most 0 allowed',
        ),
      });
    },
  );
});
