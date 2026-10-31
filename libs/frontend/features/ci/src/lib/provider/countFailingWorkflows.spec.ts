// #region Imports

import { describe, expect, it } from 'vitest';
import type { ICiRun, ICiWorkflow } from '@symphony/domain-ci';
import { countFailingWorkflows } from './countFailingWorkflows';

// #endregion

const workflow = (id: string): ICiWorkflow => ({
  id,
  workspaceId: 'workspace',
  ciBindingId: 'binding',
  repositoryBindingId: 'repository',
  name: id,
  path: `.github/workflows/${id}.yml`,
  state: 'active',
  defaultBranch: 'main',
  supportsManualDispatch: true,
});

const run = (overrides: Partial<ICiRun> & { id: string; workflowId: string }): ICiRun => ({
  workspaceId: 'workspace',
  ciBindingId: 'binding',
  repositoryBindingId: 'repository',
  name: overrides.workflowId,
  status: 'succeeded',
  ...overrides,
});

describe('countFailingWorkflows', () => {
  it('counts each workflow whose latest finished run failed, as the Actions screen does', () => {
    // arrange
    const input = {
      workflows: [workflow('deploy'), workflow('ci'), workflow('lint')],
      localExecutions: [],
      runs: [
        run({
          id: '1',
          workflowId: 'deploy',
          status: 'failed',
          startedAt: '2026-10-30T10:00:00Z',
          finishedAt: '2026-10-30T10:05:00Z',
        }),
        run({
          id: '2',
          workflowId: 'ci',
          status: 'failed',
          startedAt: '2026-10-30T09:00:00Z',
          finishedAt: '2026-10-30T09:05:00Z',
        }),
        run({
          id: '3',
          workflowId: 'ci',
          status: 'succeeded',
          startedAt: '2026-10-30T11:00:00Z',
          finishedAt: '2026-10-30T11:05:00Z',
        }),
        run({
          id: '4',
          workflowId: 'lint',
          status: 'in-progress',
          startedAt: '2026-10-30T12:00:00Z',
        }),
      ],
    };

    // act
    const count = countFailingWorkflows(input);

    // assert
    expect(count).toBe(1);
  });
});
