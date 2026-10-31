// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import { describe, expect, it } from 'vitest';
import type { ICiAgentExecution } from '../../../ports/ICiAgentExecution';
import type { IRepairPolicy } from './IRepairPolicy';
import { resolveFixWithAi } from './resolveFixWithAi';

// #endregion

const run: ICiRun = {
  id: 'ci:7000',
  workspaceId: 'personal',
  ciBindingId: 'ci',
  repositoryBindingId: 'repository',
  name: 'PR Quality',
  status: 'failed',
  branch: 'codex/cr-0589',
};

const delivered: ICiAgentExecution = {
  id: 'solution',
  workspaceId: 'personal',
  workItemId: 'work-item-589',
  kind: 'solution',
  state: 'succeeded',
  startedAt: '2026-10-30T08:00:00.000Z',
  workspaceReference: 'codex/cr-0589',
  pullRequest: { number: 712 },
  bindingSnapshot: { agentProfileId: 'codex', repositoryBindingIds: ['repository'] },
};

const repair: IRepairPolicy = {
  enabled: true,
  managedBranchUpdatesEnabled: true,
  sourceRepairEnabled: true,
  workflowRepairEnabled: false,
};

describe('resolveFixWithAi', () => {
  it('offers the revision of the work item whose pull request the run checked', () => {
    // act
    const fix = resolveFixWithAi({
      run,
      executions: [delivered],
      policy: repair,
      operationsAvailable: true,
    });

    // assert
    expect(fix).toEqual({ state: 'available', workItemId: 'work-item-589' });
  });

  it('explains why it cannot start', () => {
    // act
    const states = [
      resolveFixWithAi({
        run,
        executions: [delivered],
        policy: repair,
        operationsAvailable: false,
      }),
      resolveFixWithAi({
        run: { ...run, branch: 'main' },
        executions: [delivered],
        policy: repair,
        operationsAvailable: true,
      }),
      resolveFixWithAi({
        run,
        executions: [delivered],
        policy: { ...repair, managedBranchUpdatesEnabled: false },
        operationsAvailable: true,
      }),
      resolveFixWithAi({
        run,
        executions: [
          delivered,
          {
            ...delivered,
            id: 'revision',
            kind: 'revision',
            state: 'running',
            startedAt: '2026-10-30T09:00:00.000Z',
          },
        ],
        policy: repair,
        operationsAvailable: true,
      }),
    ].map((fix) => fix.state);

    // assert
    expect(states).toEqual(['unavailable', 'no-pull-request', 'policy', 'busy']);
  });
});
