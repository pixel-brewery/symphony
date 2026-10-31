// #region Imports

import { describe, expect, it } from 'vitest';
import { executionResponseSchemas as responseSchemas } from './ExecutionResponseSchemas';

// #endregion

describe('ExecutionResponseSchemas', () => {
  it('accepts an execution resumed by workflow maintenance', () => {
    // act
    // arrange
    const state = responseSchemas['execution-state.get'].parse({
      executions: [
        {
          id: 'execution-1',
          workItemId: 'work-1',
          workflowId: 'workflow-1',
          state: 'running',
          startedAt: '2026-08-20T08:00:00.000Z',
          automationOrigin: 'workflow',
        },
      ],
      events: [],
    });

    // assert
    expect(state.executions[0]?.automationOrigin).toBe('workflow');
  });

  it('accepts the single claim an execution outside a delivery group produces', () => {
    // Grouped fields carry a minimum of two members. The claim list is not one of them: every
    // execution normalizes its ownership into it, so a solo work item ships exactly one claim.
    // arrange
    const claim = {
      id: 'claim-1',
      workItemId: 'work-1',
      action: 'analyze',
      owner: 'test-user',
      acquiredAt: '2026-08-22T08:00:00.000Z',
    };

    // act
    const state = responseSchemas['execution-state.get'].parse({
      executions: [
        {
          id: 'execution-1',
          workItemId: 'work-1',
          workflowId: 'workflow-1',
          state: 'running',
          startedAt: '2026-08-22T08:00:00.000Z',
          workItemClaim: claim,
          workItemClaims: [claim],
        },
      ],
      events: [],
    });

    // assert
    expect(state.executions[0]?.workItemClaims).toHaveLength(1);
  });
});
