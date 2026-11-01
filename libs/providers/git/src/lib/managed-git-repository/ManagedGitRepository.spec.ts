// #region Imports

import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { IRepositoryBinding } from '@symphony/domain-workspace';
import { ManagedGitRepository } from './ManagedGitRepository';

// #endregion

const directories: string[] = [];

afterAll(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('ManagedGitRepository', () => {
  let existingCheckout: string;
  let unrelatedCheckout: string;

  beforeAll(() => {
    existingCheckout = repositoryDirectory('https://github.com/example/platform.git');
    unrelatedCheckout = repositoryDirectory('https://github.com/other/project.git');
  });

  it('inspects an existing checkout without executing hooks or requiring credentials', async () => {
    // arrange
    const root = existingCheckout;
    const adapter = new ManagedGitRepository({ token: async () => undefined });

    // act
    const prepared = await adapter.inspect(repository(root), join(root, '..', 'managed'));

    // assert
    expect(prepared).toMatchObject({ path: realpathSync.native(root), managed: false });
    expect(prepared?.revision).toMatch(/^[a-f0-9]{40}$/u);
  });

  it('rejects a configured checkout whose origin belongs to another repository', async () => {
    // arrange
    const root = unrelatedCheckout;
    // act
    const adapter = new ManagedGitRepository({ token: async () => undefined });

    // assert
    await expect(adapter.inspect(repository(root), join(root, '..', 'managed'))).rejects.toThrow(
      'does not belong to example/platform',
    );
  });
});

function repositoryDirectory(remote: string): string {
  const root = mkdtempSync(join(tmpdir(), 'symphony-managed-repository-'));
  directories.push(root);
  const hooksPath = join(root, '.disabled-hooks');
  mkdirSync(hooksPath);
  execFileSync('git', ['init', `--template=${hooksPath}`, '-b', 'main', root]);
  execFileSync('git', [
    '-C',
    root,
    '-c',
    'user.name=Symphony Test',
    '-c',
    'user.email=symphony@example.invalid',
    '-c',
    `core.hooksPath=${hooksPath}`,
    '-c',
    'commit.gpgsign=false',
    'commit',
    '--allow-empty',
    '-m',
    'Initial',
  ]);
  execFileSync('git', ['-C', root, 'remote', 'add', 'origin', remote]);
  return root;
}

function repository(localPath: string): IRepositoryBinding {
  return {
    id: 'repository-1',
    workspaceId: 'workspace-1',
    sourceControlConnectionId: 'github-1',
    displayName: 'Platform',
    provider: 'github',
    host: 'github.com',
    owner: 'example',
    name: 'platform',
    defaultBranch: 'main',
    localPath,
    enabled: true,
  };
}
