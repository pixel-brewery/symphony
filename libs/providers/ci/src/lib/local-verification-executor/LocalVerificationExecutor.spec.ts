// #region Imports

import { chmodSync, existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalVerificationExecutor } from './LocalVerificationExecutor';

// #endregion

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('LocalVerificationExecutor', () => {
  it('runs an approved repository wrapper without inheriting provider credentials', async () => {
    // arrange
    const root = temporaryDirectory();
    const runtime = temporaryDirectory();
    const wrapper = join(root, 'gradlew');
    writeFileSync(wrapper, '#!/bin/sh\nprintf "%s|%s" "${GH_TOKEN-unset}" "$HOME"\n');
    chmodSync(wrapper, 0o700);
    const previousToken = process.env['GH_TOKEN'];
    // act
    process.env['GH_TOKEN'] = 'secret-that-must-not-cross';
    // assert
    try {
      const results = await new LocalVerificationExecutor().execute(
        root,
        runtime,
        [
          {
            id: 'gradle-check',
            kind: 'unit-test',
            label: 'Run Gradle checks',
            executable: './gradlew',
            arguments: ['check', '--no-daemon'],
            workingDirectory: '.',
            timeoutSeconds: 10,
            network: 'dependencies',
            artifactPaths: [],
          },
        ],
        new AbortController().signal,
      );

      expect(results[0]).toMatchObject({ state: 'succeeded', exitCode: 0 });
      expect(results[0]?.output).toBe(`unset|${join(runtime, 'home')}`);
    } finally {
      if (previousToken === undefined) delete process.env['GH_TOKEN'];
      else process.env['GH_TOKEN'] = previousToken;
    }
  });

  it('reports a missing toolchain as a failed check instead of failing the whole run', async () => {
    // arrange
    const root = temporaryDirectory();
    const runtime = temporaryDirectory();

    // act
    const results = await new LocalVerificationExecutor({
      resolveExecutable: () => undefined,
    }).execute(root, runtime, [yarnStep()], new AbortController().signal);

    // assert
    expect(results[0]).toMatchObject({ state: 'failed' });
    expect(results[0]?.exitCode).toBeUndefined();
    expect(results[0]?.output).toContain('yarn was not found');
  });

  it('reports an executable that cannot be started as a failed check', async () => {
    // arrange
    const root = temporaryDirectory();
    const runtime = temporaryDirectory();

    // act
    const results = await new LocalVerificationExecutor({
      resolveExecutable: () => join(root, 'removed-package-manager'),
    }).execute(root, runtime, [yarnStep()], new AbortController().signal);

    // assert
    expect(results[0]).toMatchObject({ state: 'failed' });
    expect(results[0]?.output).toContain('yarn could not be started');
  });

  it('keeps package manager caches outside the discarded run directory', async () => {
    // arrange
    const root = temporaryDirectory();
    const runtime = temporaryDirectory();
    const cacheRoot = temporaryDirectory();
    const wrapper = join(root, 'gradlew');
    writeFileSync(wrapper, '#!/bin/sh\nprintf "%s|%s" "$HOME" "$YARN_GLOBAL_FOLDER"\n');
    chmodSync(wrapper, 0o700);

    // act
    const results = await new LocalVerificationExecutor({ cacheRoot }).execute(
      root,
      runtime,
      [
        {
          id: 'gradle-check',
          kind: 'unit-test',
          label: 'Run Gradle checks',
          executable: './gradlew',
          arguments: ['check', '--no-daemon'],
          workingDirectory: '.',
          timeoutSeconds: 10,
          network: 'dependencies',
          artifactPaths: [],
        },
      ],
      new AbortController().signal,
    );

    // assert
    expect(results[0]?.output).toBe(
      `${join(cacheRoot, 'home')}|${join(cacheRoot, 'cache', 'yarn')}`,
    );
    expect(existsSync(join(cacheRoot, 'home'))).toBe(true);
    expect(existsSync(runtime)).toBe(false);
  });

  it('gives a step a temporary directory short enough for a unix socket', async () => {
    // Regression: TMPDIR pointed inside the managed workspace, so every socket a toolchain opened
    // from it exceeded the ~100 character unix limit. Nx rejects anything over 95 and failed to
    // load its plugins, which turned `yarn lint` into an immediate failure in every managed run.
    // arrange
    const root = temporaryDirectory();
    const runtime = join(
      temporaryDirectory(),
      'workspaces',
      `workspace-source-${'9'.repeat(24)}`,
      'verification',
      `goal-${'a'.repeat(36)}`,
    );
    const wrapper = join(root, 'gradlew');
    writeFileSync(wrapper, '#!/bin/sh\nprintf "%s" "$TMPDIR"\n');
    chmodSync(wrapper, 0o700);

    const results = await new LocalVerificationExecutor().execute(
      root,
      runtime,
      [
        {
          id: 'gradle-check',
          kind: 'unit-test',
          label: 'Run Gradle checks',
          executable: './gradlew',
          arguments: ['check', '--no-daemon'],
          workingDirectory: '.',
          timeoutSeconds: 10,
          network: 'dependencies',
          artifactPaths: [],
        },
      ],
      new AbortController().signal,
    );

    // act
    const temporaryPath = results[0]?.output ?? '';
    // assert
    expect(results[0]).toMatchObject({ state: 'succeeded' });
    expect(runtime.length).toBeGreaterThan(95);
    expect(temporaryPath.length).toBeLessThan(48);
    expect(temporaryPath.startsWith(runtime)).toBe(false);
    expect(existsSync(temporaryPath)).toBe(false);
  });

  it('accepts the exact yarn restore invocation the planner emits', async () => {
    // arrange
    const root = temporaryDirectory();
    const runtime = temporaryDirectory();

    // Regression: the planner once emitted --mode=skip-builds, which Yarn 4 rejects with a usage
    // error, so every yarn repository failed its dependency restore before any check could run.
    // act
    const results = await new LocalVerificationExecutor({
      resolveExecutable: () => undefined,
    }).execute(
      root,
      runtime,
      [
        {
          id: 'node-restore',
          kind: 'restore',
          label: 'yarn dependencies',
          executable: 'yarn',
          arguments: ['install', '--immutable', '--mode=skip-build'],
          workingDirectory: '.',
          timeoutSeconds: 10,
          network: 'dependencies',
          artifactPaths: [],
        },
      ],
      new AbortController().signal,
    );

    // assert
    expect(results[0]?.output).toContain('yarn was not found');
  });

  it('rejects arguments outside the executable-specific policy before starting a process', async () => {
    // arrange
    const root = temporaryDirectory();
    // act
    const runtime = temporaryDirectory();
    // assert
    await expect(
      new LocalVerificationExecutor().execute(
        root,
        runtime,
        [
          {
            id: 'unsafe',
            kind: 'unit-test',
            label: 'Unsafe command',
            executable: 'python',
            arguments: ['-c', 'import os; os.system("anything")'],
            workingDirectory: '.',
            timeoutSeconds: 10,
            network: 'none',
            artifactPaths: [],
          },
        ],
        new AbortController().signal,
      ),
    ).rejects.toThrow('arguments are not allowed');
  });
  it('keeps a noisy but passing step green instead of killing it at the output limit', async () => {
    // arrange
    const root = temporaryDirectory();
    const runtime = temporaryDirectory();
    const wrapper = join(root, 'gradlew');
    // Real suites emit megabytes of dependency warnings before they report a green result.
    writeFileSync(wrapper, "#!/bin/sh\nhead -c 5000000 /dev/zero | tr '\\0' 'x'\nexit 0\n");
    chmodSync(wrapper, 0o700);

    // act
    const results = await new LocalVerificationExecutor().execute(
      root,
      runtime,
      [
        {
          id: 'node-test',
          kind: 'unit-test',
          label: 'yarn test',
          executable: './gradlew',
          arguments: ['check', '--no-daemon'],
          workingDirectory: '.',
          timeoutSeconds: 30,
          network: 'none',
          artifactPaths: [],
        },
      ],
      new AbortController().signal,
    );

    // assert
    expect(results[0]).toMatchObject({ state: 'succeeded', exitCode: 0 });
    expect(results[0]?.output).toContain('output truncated');
  });
});

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'symphony-local-verification-'));
  mkdirSync(directory, { recursive: true });
  directories.push(directory);
  return directory;
}

function yarnStep() {
  return {
    id: 'node-lint',
    kind: 'lint',
    label: 'yarn lint',
    executable: 'yarn',
    arguments: ['lint'],
    workingDirectory: '.',
    timeoutSeconds: 10,
    network: 'none',
    artifactPaths: [],
  } as const;
}
