// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import { describe, expect, it } from 'vitest';
import type { ICiAgentExecution } from '../../../ports/ICiAgentExecution';
import { findAgenticRecovery } from './findAgenticRecovery';

// #endregion

const run: ICiRun = {
  id: 'ci:7000',
  workspaceId: 'personal',
  ciBindingId: 'ci',
  repositoryBindingId: 'repository',
  name: 'PR Quality',
  status: 'failed',
  runAttempt: 2,
};

function execution(
  id: string,
  skillFlowRole: string,
  agenticDeliveryId: string,
  startedAt: string,
): ICiAgentExecution {
  return {
    id,
    workItemId: 'item',
    state: 'succeeded',
    skillFlowRole,
    agenticDeliveryId,
    startedAt,
  };
}

describe('findAgenticRecovery', () => {
  it('finds the latest diagnosis and repair of the exact run attempt', () => {
    // arrange
    const deliveryId = 'agentic:personal:repository:ci:7000:2';
    const executions = [
      execution('old-diagnosis', 'ci-diagnosis', deliveryId, '2026-10-30T08:00:00.000Z'),
      execution('diagnosis', 'ci-diagnosis', deliveryId, '2026-10-30T09:00:00.000Z'),
      execution('repair', 'ci-repair', deliveryId, '2026-10-30T09:10:00.000Z'),
      execution(
        'earlier-attempt',
        'ci-diagnosis',
        'agentic:personal:repository:ci:7000:1',
        '2026-10-30T10:00:00.000Z',
      ),
    ];

    // act
    const recovery = findAgenticRecovery(executions, run);

    // assert
    expect(recovery.diagnosis?.id).toBe('diagnosis');
    expect(recovery.repair?.id).toBe('repair');
  });

  it('returns nothing without a run or a matching execution', () => {
    // act
    const results = [findAgenticRecovery([], run), findAgenticRecovery([], undefined)];

    // assert
    expect(results).toEqual([{}, {}]);
  });
});
