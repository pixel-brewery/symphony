// #region Imports

import { describe, expect, it } from 'vitest';
import { resolveRequestedWorkspaceIds } from './resolveRequestedWorkspaceIds';

// #endregion

const settings = {
  workspaces: [{ id: 'personal' }, { id: 'team' }],
  activeViewScope: { workspaceIds: ['personal', 'team'] },
} as unknown as Parameters<typeof resolveRequestedWorkspaceIds>[0];

describe('resolveRequestedWorkspaceIds', () => {
  it('reads the active scope unless one configured workspace is requested', () => {
    // arrange
    // act
    const scope = resolveRequestedWorkspaceIds(settings, undefined);
    const single = resolveRequestedWorkspaceIds(settings, 'team');

    // assert
    expect(scope).toEqual(['personal', 'team']);
    expect(single).toEqual(['team']);
  });

  it('rejects a workspace that is not configured', () => {
    // arrange
    // act
    const act = (): unknown => resolveRequestedWorkspaceIds(settings, 'unknown');

    // assert
    expect(act).toThrow('not configured');
  });
});
