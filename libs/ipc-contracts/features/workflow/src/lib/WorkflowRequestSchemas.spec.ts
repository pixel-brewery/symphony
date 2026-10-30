// #region Imports

import { describe, expect, it } from 'vitest';
import { workflowRequestSchemas as requestSchemas } from './WorkflowRequestSchemas';

// #endregion

describe('WorkflowRequestSchemas', () => {
  it('accepts a request with and without an audit limit', () => {
    // arrange
    // act
    const actual = requestSchemas['workflow.get'].parse({ workItemId: 'work-1' });

    // assert
    expect(actual).toEqual({
      workItemId: 'work-1',
    });
    expect(
      requestSchemas['workflow.get'].parse({ workItemId: 'work-1', auditLimit: 50 }).auditLimit,
    ).toBe(50);
    expect(() =>
      requestSchemas['workflow.get'].parse({ workItemId: 'work-1', auditLimit: 5_000 }),
    ).toThrow();
  });
});
