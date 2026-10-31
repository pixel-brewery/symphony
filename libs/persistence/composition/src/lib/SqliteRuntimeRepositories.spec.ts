// #region Imports

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SqliteRuntimeRepositories } from './SqliteRuntimeRepositories';

// #endregion

const directories: string[] = [];
const repositories: SqliteRuntimeRepositories[] = [];

afterEach(() => {
  for (const repository of repositories.splice(0)) repository.close();
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('SqliteRuntimeRepositories', () => {
  it('persists machine-local trust and revokes it independently from plans', () => {
    // arrange
    const directory = mkdtempSync(join(tmpdir(), 'symphony-repository-runtime-state-'));
    directories.push(directory);
    const repository = createRepository(join(directory, 'state.sqlite'));
    repository.initialize();
    repository.trust.saveTrustGrant({
      id: 'grant-1',
      workspaceId: 'workspace-1',
      repositoryBindingId: 'repository-1',
      repositoryIdentity: 'github.com/example/platform',
      capabilities: ['agent-execution'],
      grantedAt: '2026-08-13T10:00:00.000Z',
    });
    // act
    repository.verification.saveVerificationPlan({
      id: 'plan-1',
      workspaceId: 'workspace-1',
      repositoryBindingId: 'repository-1',
      repositoryIdentity: 'github.com/example/platform',
      revision: 'abc',
      createdAt: '2026-08-13T10:00:00.000Z',
      technologies: ['Node.js'],
      evidence: [{ path: 'package.json', reason: 'Node.js package manifest' }],
      capabilities: ['host-execution'],
      steps: [
        {
          id: 'node-test',
          kind: 'unit-test',
          label: 'Run unit tests',
          executable: 'npm',
          arguments: ['run', 'test'],
          workingDirectory: '.',
          timeoutSeconds: 60,
          network: 'none',
          artifactPaths: [],
        },
      ],
    });

    // assert
    expect(repository.trust.trustGrant('repository-1')?.capabilities).toEqual(['agent-execution']);
    repository.trust.revokeTrustGrant('repository-1');
    expect(repository.trust.trustGrant('repository-1')).toBeUndefined();
    expect(repository.verification.verificationPlan('plan-1')?.revision).toBe('abc');
  }, 30_000);
});

function createRepository(path: string): SqliteRuntimeRepositories {
  const repository = new SqliteRuntimeRepositories(path);
  repositories.push(repository);
  return repository;
}
