// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import { describe, expect, it } from 'vitest';
import { resolveActionRunControls } from './index';

// #endregion

describe('resolveActionRunControls', () => {
  it('preserves the exact page controls for a queued rail Action', () => {
    // arrange
    const current = run('queued');

    // act
    const actual = resolveActionRunControls(current, true, undefined);

    // assert
    expect(actual).toEqual({
      canCancelRemote: true,
      canRerunRemote: false,
      canRunLocally: true,
      canStopLocal: false,
    });
  });

  it('offers rerun and local execution for a terminal Action', () => {
    // arrange
    const current = run('failed');

    // act
    const actual = resolveActionRunControls(current, true, undefined);

    // assert
    expect(actual).toEqual({
      canCancelRemote: false,
      canRerunRemote: true,
      canRunLocally: true,
      canStopLocal: false,
    });
  });

  it('replaces local start with stop while the underlying run remains rerunnable', () => {
    // arrange
    const current = run('succeeded');

    // act
    const actual = resolveActionRunControls(current, true, 'ci-1');

    // assert
    expect(actual).toEqual({
      canCancelRemote: false,
      canRerunRemote: true,
      canRunLocally: false,
      canStopLocal: true,
    });
  });
});

function run(status: ICiRun['status']): ICiRun {
  return {
    id: 'ci-1',
    workspaceId: 'workspace-1',
    ciBindingId: 'ci-binding-1',
    repositoryBindingId: 'repository-1',
    name: 'Validate',
    status,
  };
}
