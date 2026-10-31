// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { RepositoryRuntimeService } from './RepositoryRuntimeService';
import type { IRepositoryTrustRepository } from './ports/IRepositoryTrustRepository';
import type { IVerificationRepository } from '@symphony/application-ci';
import type { IApplicationSettings } from '@symphony/configuration-composition';
import type {
  IPreparedRepository,
  IRepositoryBinding,
  IRepositoryTrustGrant,
} from '@symphony/domain-workspace';
import type { IVerificationPlan, IVerificationRun, IVerificationStep } from '@symphony/domain-ci';
import type { IWorkItem } from '@symphony/domain-work';
import { createDefaultApplicationSettings } from '@symphony/configuration-composition';

// #endregion

const repository: IRepositoryBinding = {
  id: 'repository-1',
  workspaceId: 'workspace-1',
  sourceControlConnectionId: 'github-1',
  displayName: 'Platform',
  provider: 'github',
  host: 'github.com',
  owner: 'example',
  name: 'platform',
  defaultBranch: 'main',
  localPath: '/managed/platform',
  enabled: true,
};

const prepared: IPreparedRepository = {
  path: repository.localPath,
  revision: '0123456789abcdef',
  managed: true,
};

function fixture(steps?: readonly IVerificationStep[]) {
  let settings: IApplicationSettings = {
    ...createDefaultApplicationSettings('/tmp'),
    workspaces: [
      {
        id: 'workspace-1',
        displayName: 'Workspace',
        shortCode: 'W',
        color: '#000000',
        enabled: true,
        isolation: 'strict',
        storageLimitGiB: 20,
        localCiEnabled: false,
      },
    ],
    repositoryBindings: [repository],
  };
  const grants = new Map<string, IRepositoryTrustGrant>();
  const plans = new Map<string, IVerificationPlan>();
  const runs: IVerificationRun[] = [];
  let sequence = 0;
  const executor = vi.fn(async () => [
    {
      stepId: 'node-test',
      state: 'succeeded' as const,
      startedAt: '2026-08-13T10:00:00.000Z',
      finishedAt: '2026-08-13T10:00:01.000Z',
      exitCode: 0,
      output: 'passed',
    },
  ]);
  const persistence: IRepositoryTrustRepository & IVerificationRepository = {
    trustGrant: (id) => grants.get(id),
    saveTrustGrant: (grant) => grants.set(grant.repositoryBindingId, grant),
    revokeTrustGrant: (id) => grants.delete(id),
    saveVerificationPlan: (plan) => plans.set(plan.id, plan),
    verificationPlan: (id) => plans.get(id),
    saveVerificationRun: (run) => runs.push(run),
  };
  const service = new RepositoryRuntimeService({
    settings: () => settings,
    saveRepositoryPath: async (repositoryBindingId, path) => {
      settings = {
        ...settings,
        repositoryBindings: settings.repositoryBindings.map((candidate) =>
          candidate.id === repositoryBindingId ? { ...candidate, localPath: path } : candidate,
        ),
      };
    },
    managedRepositoryRoot: () => '/managed',
    verificationRuntimeRoot: () => '/runtime',
    acquisition: {
      inspect: async () => prepared,
      prepare: async () => prepared,
    },
    verificationWorkspace: {
      prepareVerification: async () => '/worktree',
      release: async () => true,
    },
    planner: {
      plan: async () => ({
        technologies: ['Node.js'],
        evidence: [{ path: 'package.json', reason: 'Node.js package manifest' }],
        steps: steps ?? [
          {
            id: 'node-test',
            kind: 'unit-test',
            label: 'Run unit tests',
            executable: 'npm',
            arguments: ['run', 'test'],
            workingDirectory: '.',
            timeoutSeconds: 60,
            network: 'none',
            artifactPaths: ['coverage'],
          },
        ],
      }),
    },
    executor: { execute: executor },
    trust: persistence,
    verification: persistence,
    clock: { now: () => '2026-08-13T10:00:00.000Z' },
    ids: { next: (prefix) => `${prefix}-${++sequence}` },
  });
  return { service, grants, plans, runs, executor };
}

describe('RepositoryRuntimeService', () => {
  it('keeps a prepared repository restricted until a local approval is recorded', async () => {
    // act
    // arrange
    const test = fixture();

    // assert
    await expect(test.service.statuses('repository-1')).resolves.toEqual([
      expect.objectContaining({
        preparation: expect.objectContaining({ state: 'prepared', revision: prepared.revision }),
        trust: { state: 'restricted', capabilities: [] },
      }),
    ]);

    const plan = await test.service.createVerificationPlan(
      'repository-1',
      new AbortController().signal,
    );
    expect(plan.capabilities).toEqual(['host-execution']);
    await expect(
      test.service.runVerification('repository-1', plan.id, 'stored', new AbortController().signal),
    ).rejects.toThrow('requires explicit approval');
    expect(test.executor).not.toHaveBeenCalled();
  });

  it('asks for dependency-build trust when a restore keeps dependency build scripts enabled', async () => {
    // Native modules stay unbuilt when the restore skips build scripts, so the capability is what
    // lets an operator allow that dependency code to run for one repository.
    // arrange
    const building = fixture([restoreStep(['install', '--immutable'])]);
    // act
    const skipping = fixture([restoreStep(['install', '--immutable', '--mode=skip-build'])]);

    // assert
    await expect(
      building.service
        .createVerificationPlan('repository-1', new AbortController().signal)
        .then((plan) => plan.capabilities),
    ).resolves.toContain('dependency-build');
    await expect(
      skipping.service
        .createVerificationPlan('repository-1', new AbortController().signal)
        .then((plan) => plan.capabilities),
    ).resolves.not.toContain('dependency-build');
  });

  it('supports one-time verification without persisting trust', async () => {
    // arrange
    const test = fixture();
    const plan = await test.service.createVerificationPlan(
      'repository-1',
      new AbortController().signal,
    );

    // act
    const run = await test.service.runVerification(
      'repository-1',
      plan.id,
      'once',
      new AbortController().signal,
    );

    // assert
    expect(run.state).toBe('succeeded');
    expect(run.approval).toBe('once');
    expect(test.grants.size).toBe(0);
    expect(test.runs).toEqual([run]);
  });

  it('persists only the approved verification capabilities for repository-wide reuse', async () => {
    // arrange
    const test = fixture();
    const plan = await test.service.createVerificationPlan(
      'repository-1',
      new AbortController().signal,
    );
    // act
    await test.service.runVerification(
      'repository-1',
      plan.id,
      'repository',
      new AbortController().signal,
    );

    // assert
    expect(test.grants.get('repository-1')?.capabilities).toEqual(['host-execution']);
    await expect(
      test.service.runVerification('repository-1', plan.id, 'stored', new AbortController().signal),
    ).resolves.toMatchObject({ approval: 'stored', state: 'succeeded' });
  });

  it('authorizes AI execution for an enabled configured repository without another grant', async () => {
    // act
    // arrange
    const test = fixture();

    // assert
    await expect(
      test.service.authorizeAgentExecution(workItem(), undefined),
    ).resolves.toBeUndefined();
    expect(test.grants.size).toBe(0);
  });

  it('uses the only enabled workspace repository for legacy work items without a binding', async () => {
    // act
    // arrange
    const test = fixture();

    // assert
    await expect(
      test.service.authorizeAgentExecution(
        { ...workItem(), repository: 'legacy/imported-name', repositoryBindingIds: [] },
        'once',
      ),
    ).resolves.toBeUndefined();
  });

  it('rejects a plan after the repository revision changes', async () => {
    // arrange
    const test = fixture();
    const plan = await test.service.createVerificationPlan(
      'repository-1',
      new AbortController().signal,
    );
    // act
    (plan as { revision: string }).revision = 'different';

    // assert
    await expect(
      test.service.runVerification('repository-1', plan.id, 'once', new AbortController().signal),
    ).rejects.toThrow('changed after the verification plan');
  });
});

function workItem(): IWorkItem {
  return {
    id: 'item-1',
    workspaceId: 'workspace-1',
    sourceId: 'source-1',
    externalId: '#1',
    title: 'Verify locally',
    body: '',
    provider: 'github-projects',
    repository: 'example/platform',
    repositoryBindingIds: ['repository-1'],
    stageId: 'qualified',
    labels: [],
    assignees: [],
  };
}

function restoreStep(arguments_: readonly string[]): IVerificationStep {
  return {
    id: 'node-restore',
    kind: 'restore',
    label: 'yarn dependencies',
    executable: 'yarn',
    arguments: arguments_,
    workingDirectory: '.',
    timeoutSeconds: 600,
    network: 'dependencies',
    artifactPaths: [],
  };
}
