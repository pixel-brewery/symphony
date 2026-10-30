// #region Imports

import { describe, expect, it } from 'vitest';
import { mobileIssueDraftRequestSchema } from '@symphony/mobile-contracts';

// #endregion

describe('MobileIssueDraftRequestSchema', () => {
  it('rejects an invalid repository input', () => {
    // act
    const actual = mobileIssueDraftRequestSchema.safeParse({
      operationId: 'draft-1',
      workspaceId: 'workspace-1',
      repository: 'not-a-repository',
      prompt: 'Draft this work item with AI.',
    });

    // assert
    expect(actual.success).toBe(false);
  });
});
