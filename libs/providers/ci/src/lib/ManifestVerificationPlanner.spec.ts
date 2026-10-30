// #region Imports

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { IRepositoryBinding } from '@symphony/domain-workspace';
import { ManifestVerificationPlanner } from './ManifestVerificationPlanner';

// #endregion

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('ManifestVerificationPlanner', () => {
  it('uses the locked Node.js package manager and only declared verification scripts', async () => {
    // arrange
    const root = temporaryDirectory();
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({
        packageManager: 'pnpm@10.0.0',
        scripts: { lint: 'eslint .', test: 'vitest', e2e: 'playwright test', release: 'publish' },
      }),
    );
    writeFileSync(join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');

    // act
    const plan = await new ManifestVerificationPlanner().plan(
      repository(root),
      { path: root, revision: 'abc', managed: true },
      new AbortController().signal,
    );

    // assert
    expect(plan.technologies).toEqual(['Node.js']);
    expect(plan.steps.map((step) => [step.kind, step.executable, step.arguments])).toEqual([
      ['restore', 'pnpm', ['install', '--frozen-lockfile']],
      ['lint', 'pnpm', ['lint']],
      ['unit-test', 'pnpm', ['test']],
      ['e2e-test', 'pnpm', ['e2e']],
    ]);
    expect(plan.steps.flatMap((step) => step.arguments)).not.toContain('release');
  });

  it('restores yarn workspaces so native dependencies are actually built', async () => {
    // arrange
    const root = temporaryDirectory();
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({
        packageManager: 'yarn@4.10.3',
        scripts: { lint: 'nx run-many --target=lint', build: 'nx run-many --target=build' },
      }),
    );
    writeFileSync(join(root, 'yarn.lock'), '__metadata:\n  version: 8\n');

    // act
    const plan = await new ManifestVerificationPlanner().plan(
      repository(root),
      { path: root, revision: 'abc', managed: true },
      new AbortController().signal,
    );

    // Regression: --mode=skip-build left native modules unbuilt, so every suite that loaded one
    // failed inside the managed workspace while passing on a developer machine.
    // assert
    expect(plan.steps[0]).toMatchObject({
      kind: 'restore',
      executable: 'yarn',
      arguments: ['install', '--immutable'],
    });
  });

  it('composes independent plans for mixed .NET and Python repositories', async () => {
    // arrange
    const root = temporaryDirectory();
    writeFileSync(join(root, 'Platform.sln'), 'Microsoft Visual Studio Solution File');
    writeFileSync(join(root, 'pyproject.toml'), '[project]\nname = "worker"\n');
    writeFileSync(join(root, 'uv.lock'), 'version = 1\n');
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'src', 'Worker.csproj'), '<Project />');

    // act
    const plan = await new ManifestVerificationPlanner().plan(
      repository(root),
      { path: root, revision: 'abc', managed: true },
      new AbortController().signal,
    );

    // assert
    expect(plan.technologies).toEqual(['.NET', 'Python']);
    expect(plan.steps.map((step) => step.id)).toEqual([
      'dotnet-restore',
      'dotnet-build',
      'dotnet-test',
      'python-restore',
      'python-test',
    ]);
  });
});

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'symphony-verification-plan-'));
  directories.push(directory);
  return directory;
}

function repository(localPath: string): IRepositoryBinding {
  return {
    id: 'repository-1',
    workspaceId: 'workspace-1',
    sourceControlConnectionId: 'github-1',
    displayName: 'Repository',
    provider: 'github',
    host: 'github.com',
    owner: 'example',
    name: 'repository',
    defaultBranch: 'main',
    localPath,
    enabled: true,
  };
}
