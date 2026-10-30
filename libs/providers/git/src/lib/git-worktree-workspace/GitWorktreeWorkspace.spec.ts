// #region Imports

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { IWorkspacePort } from '@symphony/application-workspace';
import type { IRepositoryBinding } from '@symphony/domain-workspace';
import type { IWorkItem } from '@symphony/domain-work';
import { GitWorktreeWorkspace } from './GitWorktreeWorkspace';

// #endregion

describe('GitWorktreeWorkspace', () => {
  it('keeps analysis detached and creates named implementation branches', async () => {
    // arrange
    const directory = mkdtempSync(join(tmpdir(), 'symphony-worktree-'));
    const sourcePath = join(directory, 'source');
    const workspaceRoot = join(directory, 'workspaces');
    execFileSync('git', ['init', sourcePath]);
    execFileSync('git', ['-C', sourcePath, 'checkout', '-b', 'main']);
    writeFileSync(join(sourcePath, 'README.md'), '# Source\n');
    execFileSync('git', ['-C', sourcePath, 'add', 'README.md']);
    execFileSync(
      'git',
      [
        '-C',
        sourcePath,
        '-c',
        'user.name=Symphony Test',
        '-c',
        'user.email=symphony@example.invalid',
        'commit',
        '-m',
        'Initial commit',
      ],
      { stdio: 'ignore' },
    );
    const repository: IRepositoryBinding = {
      id: 'repository',
      workspaceId: 'workspace',
      sourceControlConnectionId: 'github',
      displayName: 'example/source',
      provider: 'github',
      host: 'github.com',
      owner: 'example',
      name: 'source',
      defaultBranch: 'main',
      localPath: sourcePath,
      enabled: true,
    };
    const workItem: IWorkItem = {
      id: 'item-1',
      workspaceId: 'workspace',
      sourceId: 'project',
      externalId: '#1',
      title: 'Analyze source',
      body: 'Use an isolated worktree.',
      stageId: 'backlog',
      provider: 'Test',
      repository: 'example/source',
      labels: [],
      assignees: [],
      updatedAt: '2026-08-08T00:00:00.000Z',
    };
    const adapter: IWorkspacePort = new GitWorktreeWorkspace({
      workspaceRoot: () => workspaceRoot,
      repository: () => repository,
    });
    // act
    const workspacePaths: string[] = [];

    // assert
    try {
      const analysisWorkspace = await adapter.prepare('execution-1', workItem, 'analysis');
      const workspacePath = analysisWorkspace.path;
      workspacePaths.push(workspacePath);

      expect(analysisWorkspace.reference).toBeUndefined();
      expect(workspacePath).toBe(join(workspaceRoot, 'execution-1'));
      expect(readFileSync(join(workspacePath, 'README.md'), 'utf8')).toBe('# Source\n');
      expect(existsSync(join(workspacePath, '.git'))).toBe(true);
      await expect(adapter.isAvailable(workspacePath)).resolves.toBe(true);
      expect(
        execFileSync('git', ['-C', workspacePath, 'branch', '--show-current'], {
          encoding: 'utf8',
        }).trim(),
      ).toBe('');
      writeFileSync(join(workspacePath, 'solver-output.txt'), 'uncommitted implementation\n');
      mkdirSync(join(workspaceRoot, 'not-managed'));
      expect(await adapter.listManaged()).toEqual([realpathSync(workspacePath)]);

      await expect(adapter.release(workspacePath)).resolves.toBe(true);
      expect(existsSync(workspacePath)).toBe(false);
      expect(
        execFileSync('git', ['-C', sourcePath, 'worktree', 'list', '--porcelain'], {
          encoding: 'utf8',
        }),
      ).not.toContain(workspacePath);
      await expect(adapter.release(workspacePath)).resolves.toBe(false);
      await expect(adapter.isAvailable(workspacePath)).resolves.toBe(false);

      const implementationWorkspace = await adapter.prepare(
        'execution-2',
        workItem,
        'implementation',
      );
      workspacePaths.push(implementationWorkspace.path);
      expect(implementationWorkspace).toEqual({
        path: join(workspaceRoot, 'execution-2'),
        reference: 'codex/work-1-analyze-source',
      });
      expect(
        execFileSync('git', ['-C', implementationWorkspace.path, 'branch', '--show-current'], {
          encoding: 'utf8',
        }).trim(),
      ).toBe('codex/work-1-analyze-source');
      expect(
        execFileSync('git', ['-C', sourcePath, 'branch', '--show-current'], {
          encoding: 'utf8',
        }).trim(),
      ).toBe('main');
      await expect(adapter.release(implementationWorkspace.path)).resolves.toBe(true);

      const retryWorkspace = await adapter.prepare('execution-3', workItem, 'implementation');
      workspacePaths.push(retryWorkspace.path);
      expect(retryWorkspace.reference).toBe('codex/work-1-analyze-source-3');
      await expect(adapter.release(retryWorkspace.path)).resolves.toBe(true);
      await expect(adapter.release(join(directory, 'execution-outside'))).rejects.toThrow(
        'inside the configured root',
      );
    } finally {
      for (const workspacePath of workspacePaths) {
        if (existsSync(workspacePath)) {
          execFileSync('git', ['-C', sourcePath, 'worktree', 'remove', '--force', workspacePath]);
        }
      }
      rmSync(directory, { force: true, recursive: true });
    }
  });
});
