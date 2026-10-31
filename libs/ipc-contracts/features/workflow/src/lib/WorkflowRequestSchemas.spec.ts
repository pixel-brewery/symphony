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

  it('bounds the stage-change history read by an ISO instant and an optional workspace', () => {
    // arrange
    const schema = requestSchemas['workflow.stage-changes.list'];

    // act
    const scoped = schema.parse({ workspaceId: 'personal', since: '2026-10-17T00:00:00.000Z' });
    const active = schema.parse({ since: '2026-10-17T02:00:00+02:00' });

    // assert
    expect(scoped).toEqual({ workspaceId: 'personal', since: '2026-10-17T00:00:00.000Z' });
    expect(active).toEqual({ since: '2026-10-17T02:00:00+02:00' });
    expect(() => schema.parse({ since: 'last week' })).toThrow();
    expect(() => schema.parse({ workspaceId: '', since: '2026-10-17T00:00:00.000Z' })).toThrow();
  });
});
