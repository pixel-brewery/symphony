// #region Imports

import { describe, expect, it } from 'vitest';
import { mobileWorkItemCreateRequestSchema } from '@symphony/mobile-contracts';

// #endregion

describe('MobileWorkItemCreateRequestSchema', () => {
  it('validates a bounded work-item creation input', () => {
    // act
    const actual = mobileWorkItemCreateRequestSchema.safeParse({
      workspaceId: 'workspace-1',
      title: 'Create from mobile',
      body: 'Details',
      repository: 'example/symphony',
      projectFields: [],
      labels: [],
      assignees: [],
    });

    // assert
    expect(actual.success).toBe(true);
  });
});
