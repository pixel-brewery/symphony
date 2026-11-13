// #region Imports

import { createDefaultApplicationSettings } from '@symphony/configuration-composition';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SimulatedCiQueries } from './SimulatedCiQueries';

// #endregion

function queries(): SimulatedCiQueries {
  const settings = createDefaultApplicationSettings();
  const repository = {
    id: 'repository-1',
    workspaceId: 'personal',
    sourceControlConnectionId: 'github-1',
    displayName: 'Example project',
    provider: 'github' as const,
    host: 'github.com',
    owner: 'example',
    name: 'project',
    defaultBranch: 'main',
    localPath: '',
    enabled: true,
  };
  return new SimulatedCiQueries(
    () => ({
      ...settings,
      repositoryBindings: [repository],
      ciBindings: [
        {
          id: 'ci-1',
          workspaceId: 'personal',
          repositoryBindingId: repository.id,
          sourceControlConnectionId: 'github-1',
          provider: 'github-actions',
          displayName: 'Example Actions',
          enabled: true,
          agenticDeliveryEnabled: false,
        },
      ],
    }),
    () => [],
  );
}

describe('SimulatedCiQueries', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('retains the normal catalog and queued run without the layout fixture', () => {
    // arrange
    vi.stubEnv('SYMPHONY_SIMULATED_CI_LAYOUT_FIXTURE', '');
    const provider = queries();

    // act
    const snapshot = provider.continuousIntegration();

    // assert
    expect(snapshot.ciRuns).toHaveLength(3);
    expect(snapshot.ciRuns.filter((run) => run.status === 'queued')).toHaveLength(1);
    expect(snapshot.ciWorkflows.every((workflow) => workflow.state === 'active')).toBe(true);
    expect(provider.runDetails('ci-1:7000').failureLog).toBeUndefined();
  });

  it('supplies bounded long history, failure details and a disabled workflow for Electron layout checks', () => {
    // arrange
    vi.stubEnv('SYMPHONY_SIMULATED_CI_LAYOUT_FIXTURE', '1');
    const provider = queries();

    // act
    const snapshot = provider.continuousIntegration();
    const failed = snapshot.ciRuns.find((run) => run.status === 'failed');
    const details = provider.runDetails(failed!.id);

    // assert
    expect(snapshot.ciRuns).toHaveLength(360);
    expect(new Set(snapshot.ciRuns.map((run) => run.id)).size).toBe(360);
    expect(snapshot.ciRuns.filter((run) => run.status === 'failed')).toHaveLength(1);
    expect(snapshot.ciRuns.filter((run) => run.workflowId === failed?.workflowId)).toHaveLength(
      120,
    );
    expect(snapshot.ciWorkflows.filter((workflow) => workflow.state === 'disabled')).toHaveLength(
      1,
    );
    expect(details.failureLog?.split('\n')).toHaveLength(40);
    expect(details.jobs[0]?.status).toBe('failed');
    expect(details.jobs[0]?.steps.at(-1)?.status).toBe('failed');
  });
});
