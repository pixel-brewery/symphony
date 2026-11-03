// #region Imports

import { describe, expect, it } from 'vitest';
import { repositoryRuntimeStatusSchema } from './RepositoryRuntimeStatusSchema';

// #endregion

const status = {
  repositoryBindingId: 'repository-one',
  workspaceId: 'workspace-one',
  displayName: 'Example',
  repositoryIdentity: 'example/repository',
  preparation: { state: 'unprepared' },
  trust: { state: 'restricted', capabilities: [] },
};

describe('repositoryRuntimeStatusSchema', () => {
  it('retains a bounded inspection diagnostic on an unprepared status', () => {
    // arrange
    const payload = {
      ...status,
      preparation: { state: 'unprepared', inspectionError: 'fatal: not a git repository' },
    };

    // act
    const parsed = repositoryRuntimeStatusSchema.parse(payload);

    // assert
    expect(parsed.preparation).toEqual(payload.preparation);
  });

  it.each(['', 'x'.repeat(2_001)])('rejects an invalid diagnostic', (inspectionError) => {
    // arrange
    const payload = { ...status, preparation: { state: 'unprepared', inspectionError } };

    // act
    const parsed = repositoryRuntimeStatusSchema.safeParse(payload);

    // assert
    expect(parsed.success).toBe(false);
  });
});
